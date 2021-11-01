import { PouchDB } from 'rxdb';
import pouchdbDebug from 'pouchdb-debug';
import { useState, useEffect, useContext, useRef } from 'react';
import { RxDBValidatePlugin } from 'rxdb/plugins/validate';
import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { addPouchPlugin, getRxStoragePouch } from 'rxdb/plugins/pouchdb';
import idb from 'pouchdb-adapter-idb';
import { v4 as uuidv4 } from 'uuid';

let dbPromise = null;

const _create = async () => {
  addRxPlugin(RxDBValidatePlugin);
  addPouchPlugin(idb);
  // uncomment the following lines for pouchdb debugging:

  // addPouchPlugin(pouchdbDebug);
  // PouchDB.debug.enable('pouchdb:find');
  // PouchDB.debug.enable('*');

  console.log('creating db');
  const db = await createRxDatabase({
    name: 'documentdb',
    storage: getRxStoragePouch('idb'),
  });
  return db;
};

const getDatabase = () => {
  dbPromise = dbPromise || _create();
  return dbPromise;
};

const addCollection = async (name, indices) => {
  console.log('adding collection');
  const schema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
      },
      updatedAt: {
        type: 'number', // browser timestamp for conflict resolution
      },
      createdAt: {
        type: 'number', // browser timestamp
      },
      ts: {
        type: 'number', // server timestamp for replication
      },
      data: {
        type: 'object', // app data
      },
    },
    indexes: ['createdAt', ...indices],
    required: ['id', 'updatedAt', 'createdAt'],
  };
  const db = await getDatabase();
  const { [name]: collection } = await db.addCollections({
    [name]: {
      schema,
    },
  });
  collection.preInsert((data) => {
    data.id = uuidv4();
    data.createdAt = data.updatedAt = Date.now();
  });
  collection.preSave((data) => {
    data.updatedAt = Date.now();
  });
  collection.preRemove((data) => {
    data.updatedAt = Date.now();
  });
  return collection;
};

const useCollection = (name, queries, indices) => {
  const queryStates = [];
  queries.forEach(() => {
    queryStates.push(useState([]));
  });
  const [collection, setCollection] = useState();
  useEffect(() => {
    (async () => {
      const newCollection = await addCollection(name, indices);
      queries.forEach((sub, i) => {
        newCollection.find(sub).$.subscribe(queryStates[i][1]); // i.e. setState
      });
      setCollection(newCollection);
    })();
  }, []);

  return [collection, queryStates.map((item) => item[0])];
};

const useUser = () => {
  const [userObject, setUserObject] = useState();

  const updateUser = async (replacementObject) => {
    (await getDatabase()).userdoc.upsert({
      data: replacementObject,
      updatedAt: 0,
    });
  };

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      const { userdoc } = await db.addCollections({
        userdoc: {
          schema: {
            version: 0,
            primaryKey: {
              key: 'email',
              fields: ['data.email'],
            },
            type: 'object',
            properties: {
              updatedAt: {
                type: 'number',
              },
              email: {
                type: 'string',
              },
              data: {
                type: 'object',
              },
            },
          },
        },
      });
      userdoc
        .findOne({ selector: {} })
        .$.subscribe((item) => setUserObject(item?.toJSON().data));
    })();
  }, []);

  return [userObject, updateUser];
};

export { useCollection, getDatabase, useUser };
