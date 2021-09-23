import { useState, useEffect, useRef, useContext } from 'react';
import { RxDBValidatePlugin } from 'rxdb/plugins/validate';
import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { addPouchPlugin, getRxStoragePouch } from 'rxdb/plugins/pouchdb';
import {
  RxDBReplicationGraphQLPlugin,
  pullQueryBuilderFromRxSchema,
  pushQueryBuilderFromRxSchema,
  graphQLSchemaFromRxSchema,
} from 'rxdb/plugins/replication-graphql';
import idb from 'pouchdb-adapter-idb';
import { v4 as uuidv4 } from 'uuid';
import faunadb from 'faunadb';
import { Magic, RPCError } from 'magic-sdk';
import { UserMetadata } from './Auth';

const { MAGIC_PUBLISHABLE_KEY } = import.meta.env;
const q = faunadb.query;
const fauna = {};
let dbPromise = null;
let magic;

if (MAGIC_PUBLISHABLE_KEY) {
  magic = new Magic(MAGIC_PUBLISHABLE_KEY, { testMode: false });
}

const getAuth = async () => {
  console.log('getting auth');
  const response = await fetch('/api/token', {
    method: 'post',
    body: JSON.stringify(await magic.user.getIdToken({ lifespan: 15 })),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
};

const schema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    updatedAt: {
      type: 'number',
    },
    createdAt: {
      type: 'number',
    },
    stringData: {
      type: 'string',
    },
    booleanData: {
      type: 'boolean',
    },
    numberData: {
      type: 'number',
    },
    ts: {
      type: 'number',
    },
  },
  indexes: ['updatedAt', 'createdAt'],
  required: ['id', 'updatedAt', 'createdAt'],
};

const _create = async () => {
  addRxPlugin(RxDBValidatePlugin);
  addRxPlugin(RxDBReplicationGraphQLPlugin);
  addPouchPlugin(idb);

  // graphQLGenerationInput = {
  //   documents: {
  //     schema,
  //     feedKeys: ['id'],
  //     deletedFlag: 'deleted',
  //     ignoreInputKeys: ['ts'],
  //     // I don't know what this does, it was in the example:
  //     subscriptionParams: {
  //       token: 'String!',
  //     },
  //   },
  // };

  // gqlSchema = graphQLSchemaFromRxSchema(graphQLGenerationInput);

  // console.log(gqlSchema.asString)

  // how to make use of pullQueryBuilderFromRxSchema?
  // (ts: _ts is issue)

  console.log('creating db');
  const db = await createRxDatabase({
    name: 'documentdb',
    storage: getRxStoragePouch('idb'),
  });

  return db;
};

const cycleAuth = async ({ db, name, replicationState }) => {
  const { expires, secret } = await getAuth();

  const pullQueryBuilder = (doc) => {
    doc = doc || { id: '', ts: 0 };
    console.log('pulling');
    const query = `{
          feedDocuments(id: "${doc.id}", ts: ${doc.ts}, limit: 5) {
              id
              stringData
              numberData
              booleanData
              updatedAt
              createdAt
              deleted
              ts: _ts
          }
      }`;
    return {
      query,
      variables: {},
    };
  };

  const pushQueryBuilder = pushQueryBuilderFromRxSchema(
    'document',
    // graphQLGenerationInput.documents,
    // graphQLGenerationInput[name],
    {
      schema,
      feedKeys: ['id'],
      deletedFlag: 'deleted',
      ignoreInputKeys: ['ts'],
      // I don't know what this does, it was in the example:
      subscriptionParams: {
        token: 'String!',
      },
    },
  );

  const pushQueryBuilder2 = (doc) => {
    console.log('pushing', doc);
    return pushQueryBuilder(doc);
  };

  if (db) {
    // replicationState = db.documents.syncGraphQL({
    replicationState = db[name].syncGraphQL({
      url: 'https://graphql.fauna.com/graphql',
      push: {
        // batchSize,
        queryBuilder: pushQueryBuilder2,
      },
      pull: {
        queryBuilder: pullQueryBuilder,
      },
      live: true,
      liveInterval: 1000 * 60 * 10, // 10 minutes
      deletedFlag: 'deleted',
    });
    replicationState.error$.subscribe(async (err) => {
      console.log('replication error:', err.innerErrors);
      err.innerErrors.map(async ({ message, code }) => {
        console.log({ message });
        console.log({ code });
        if (expires && Date.now() > expires) {
          console.log('replication: cycling auth');
          await cycleAuth({ replicationState });
        }
        console.log(message);
      });
    });
  }
  replicationState.setHeaders({
    Authorization: `Bearer ${secret}`,
  });
  if (fauna.client) {
    await fauna.client.close();
  }
  fauna.client = new faunadb.Client({ secret });
  const setupStream = async () => {
    if (fauna.stream) {
      fauna.stream.close();
    }
    fauna.stream = fauna.client.stream
      .document(q.CurrentIdentity())
      .on('snapshot', () => {
        replicationState.run();
      })
      .on('version', (data) => {
        // console.log({ data });
        replicationState.run();
      })
      .on('error', async (error) => {
        if (Date.now() > expires) {
          fauna.stream.close();
          console.log('fauna stream: cycling auth:', error);
          await cycleAuth({ replicationState });
        } else {
          setTimeout(setupStream, 1000);
          console.log('fauna stream error:', error);
        }
      })
      .start();
  };
  setupStream();
  // We can setup token renews to happen in advance
  // but it's probably more trouble than it's worth
  await replicationState.awaitInitialReplication();
};

const getDatabase = () => {
  dbPromise = dbPromise || _create();
  return dbPromise;
};

const addCollection = async (db, name) => {
  await db.addCollections({
    [name]: {
      schema,
    },
  });
  db[name].preInsert((data) => {
    data.id = uuidv4();
    // data.updatedAt = Date.now();
    data.createdAt = data.updatedAt = Date.now();
  });
  db[name].preSave((data) => {
    data.updatedAt = Date.now();
  });
  db[name].preRemove((data) => {
    data.updatedAt = Date.now();
  })
};

const useCollection = (name) => {
  const [documents, setDocuments] = useState([]);
  const [collection, setCollection] = useState([]);
  const oldUser = useRef(null);
  const user = useContext(UserMetadata);

  useEffect(() => {
    (async () => {
      const loggingOff = user === null && oldUser.current !== null;
      const loggingOn = user !== null && oldUser.current === null;
      oldUser.current = user;

      let db = await getDatabase();
      if (loggingOff) {
        await db[name]?.remove();
        await db.remove();
        location.reload();
      }
      if (!db[name]) {
        await addCollection(db, name);
        db[name]
          // .find({ selector: {} })
          .find({ selector: {}, sort: [{ createdAt: 'asc' }] })
          .$.subscribe(setDocuments);
        setCollection(db[name]);
      }
      if (loggingOn) {
        await cycleAuth({ db, name });
      }
    })();
    return () => console.log('cleaning up effect');
  }, [user]);

  return [collection, documents];
};

export { useCollection, getDatabase, cycleAuth };
