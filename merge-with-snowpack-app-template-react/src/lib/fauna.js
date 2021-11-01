import faunadb, { query as q } from "faunadb";
import { magic, RPCError } from "./magic.js";

let secretPromise = null;
let expires = null;
let client = null;
let handleOnVersion = null;
let stream = null;

const onVersion = (callback) => {
  handleOnVersion = callback;
};

const getClient = () => {
  if (expires !== null && Date.now() > expires) {
    secretPromise = null;
    expires = null;
  }
  secretPromise = secretPromise || _getClient();
  return secretPromise;
};

const _getClient = async () => {
  console.log("getting new client");
  if (client) {
    // returns promise but I don't think we need to wait
    client.close();
  }
  try {
    const magicToken = await magic.user.getIdToken({ lifespan: 15 });
    const response = await (
      await fetch("/api/token", {
        method: "post",
        body: JSON.stringify(magicToken),
        headers: {
          "Content-Type": "application/json",
        },
      })
    ).json();
    const { secret } = response;
    ({ expires } = response);
    client = new faunadb.Client({ secret });
    if (stream === null) {
      setupStream();
    }
    return client;
  } catch {
    secretPromise = null;
  }
};

const setupStream = async () => {
  const client = await getClient();
  console.log({ client });
  stream = client.stream
    .document(q.CurrentIdentity())
    .on("version", handleOnVersion)
    .on("error", (error) => {
      console.log("fauna stream error:", error);
      stream.close();
      setTimeout(async () => {
        await setupStream();
        handleOnVersion();
      }, 1000);
    })
    .start();
};

export { getClient, onVersion, q };
