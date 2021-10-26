import { useContext, useEffect } from 'react';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { useCollection } from './Collection';
import { UserContext } from './UserContext';
import faunadb, { query as q } from 'faunadb';
import { magic, RPCError } from './magic.js';

const replicationStates = {};
let expires = 0;
let client;
let stream;

const cycleAuth = async () => {
  console.log('cycling auth');
  const magicToken = await magic.user.getIdToken({ lifespan: 15 });
  const response = await (
    await fetch('/api/token', {
      method: 'post',
      body: JSON.stringify(magicToken),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  ).json();
  ({ expires } = response);
  const { secret } = response;
  // since we can't specify per-stream secrets (or update them)
  // we have to close and reopen clients
  if (stream) {
    stream.close();
  }
  if (client) {
    await client.close();
  }
  client = new faunadb.Client({ secret });
  setupStream();
};

const setupStream = () => {
  stream = client.stream
    .document(q.CurrentIdentity())
    .on('version', () => {
      console.log('new version');
      // how can we make this less coarse
      Object.values(replicationStates).forEach((item) => item.run());
    })
    .on('error', async (error) => {
      if (Date.now() > expires) {
        cycleAuth();
      } else {
        stream.close();
        setTimeout(setupStream, 1000);
        console.log('fauna stream error:', error);
      }
    })
    .start();
};

const replicate = async (collection) => {
  console.log('replicate');
  const { name } = collection;
  replicationStates[name] = await replicateRxCollection({
    collection,
    replicationIdentifier: name,
    live: true,
    liveInterval: 14400000, // four hours
    pull: {
      handler: async (lastPull) => {
        console.log('pulling', { lastPull });
        const { ts, id } = lastPull || { ts: 0, id: null };
        const result = await client.query(q.Call('feed', null, ts, name));
        return result;
      },
    },
    push: {
      // there seems to be an extra push
      handler: async (docs) => {
        console.log('pushing', { docs });
        if (docs.length === 0) {
          return;
        }
        await client.query(
          q.Call(
            'set',
            docs.map((item) => ({ ...item, ts: undefined })),
            name,
          ),
        );
      },
      batchSize: 64,
    },
  });
  replicationStates[name].error$.subscribe(async (err) => {
    console.log('Replication error:', err);
    if (Date.now() > expires) {
      cycleAuth();
    }
  });
  await replicationStates[name].awaitInitialReplication();
};

const useReplicatedCollection = (name, subs, indices) => {
  const [collection, queries] = useCollection(name, subs, indices);
  const [user, setUser] = useContext(UserContext);

  useEffect(() => {
    if (!replicationStates[name] && collection && user) {
      console.log('creating replication for', name);
      (async () => await replicate(collection))();
    }
  }, [collection, user]);
  return [collection, queries];
};

export { useReplicatedCollection as useCollection };
