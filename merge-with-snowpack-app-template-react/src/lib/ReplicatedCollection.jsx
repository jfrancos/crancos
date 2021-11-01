import { useEffect } from 'react';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { getDatabase, useCollection, useUser } from './Collection';
import { getClient, onVersion, q } from './fauna';

const replicationStates = {};
let userReplicationState = null;

onVersion(() => {
  Object.values(replicationStates).forEach((item) => item.run());
  userReplicationState.run();
});

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
        const client = await getClient();
        // console.log('pulling', { lastPull });
        const { ts, id } = lastPull || { ts: 0, id: null };
        const result = await client.query(q.Call('feed', null, ts, name));
        return result;
      },
    },
    push: {
      // there seems to be an extra push
      handler: async (docs) => {
        const client = await getClient();
        // console.log('pushing', { docs });
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
  });
  await replicationStates[name].awaitInitialReplication();
};

const useReplicatedCollection = (name, subs, indices) => {
  const [collection, queries] = useCollection(name, subs, indices);
  const [user, setUser] = useUser();

  useEffect(() => {
    if (replicationStates[name] || !collection || !user) {
      return;
    }
    console.log('creating replication for', name);
    (async () => await replicate(collection))();
  }, [collection, user]);
  return [collection, queries];
};

const useReplicatedUser = () => {
  const [user, setUser] = useUser();
  useEffect(() => {
    if (!user || userReplicationState) {
      return;
    }
    (async () => {
      console.log('initial rep');
      userReplicationState = await replicateRxCollection({
        collection: (await getDatabase()).userdoc,
        replicationIdentifier: 'userdoc',
        liveInterval: 14400000, // four hours
        live: true,
        pull: {
          handler: async (lastPull) => {
            console.log("getting client from")
            const client = await getClient();
            console.log("getting client afte")
            console.log('pulling userdoc', { lastPull });
            const result = await client.query(q.Call('feed_user'));
            return {
              documents: [{ email: result.email, data: result }],
              hasMoreDocuments: false,
            };
          },
        },
      });
      await userReplicationState.awaitInitialReplication();
    })();
  }, [user]);
  return [user, setUser];
};

export {
  useReplicatedCollection as useCollection,
  useReplicatedUser as useUser,
};
