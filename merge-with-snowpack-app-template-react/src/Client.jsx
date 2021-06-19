import React from 'react';
import { Provider as UrqlProvider } from 'urql';
import {
  createClient,
  dedupExchange,
  cacheExchange,
  fetchExchange,
} from 'urql';
import { authExchange } from '@urql/exchange-auth';
import { makeOperation, gql } from '@urql/core';
import { Magic, RPCError } from 'magic-sdk';
import { cloneDeepWith } from 'lodash';
const { MAGIC_PUBLISHABLE_KEY } = import.meta.env;

let magic;

if (MAGIC_PUBLISHABLE_KEY) {
  magic = new Magic(MAGIC_PUBLISHABLE_KEY, { testMode: false });
}

// add the other datas to this and create
const DocsByUser = () => gql`
  query DocsByUser {
    findUserByID(id: __FUSERID__) {
      docs {
        data {
          stringData
        }
      }
    }
  }
`;

const CreateDoc = () => gql`
  mutation CreateDoc($stringData: String) {
    createDoc(
      data: { owner: { connect: __FUSERID__ }, stringData: $stringData }
    ) {
      stringData
    }
  }
`;

const getAuth = async () => {
  let response = await fetch('/api/token', {
    method: 'post',
    body: JSON.stringify(await magic.user.getIdToken({ lifespan: 15 })),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return await response.json();
};

const addAuthToOperation = ({ authState: { token, fauna_id }, operation }) => {
  if (!token) {
    return operation;
  }
  const fetchOptions =
    typeof operation.context.fetchOptions === 'function'
      ? operation.context.fetchOptions()
      : operation.context.fetchOptions || {};
  // this might do something interesting were a user to specify
  // "__FUSERID__" in their input (we can surely tweak CUSTOMIZER to
  // make this more specific)
  operation.query.definitions = cloneDeepWith(
    operation.query.definitions,
    (item) => (item === '__FUSERID__' ? fauna_id : undefined),
  );
  return makeOperation(operation.kind, operation, {
    ...operation.context,
    fetchOptions: {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        Authorization: 'Bearer ' + token,
      },
    },
  });
};

const client = createClient({
  url: 'https://graphql.fauna.com/graphql',
  exchanges: [
    dedupExchange,
    cacheExchange,
    authExchange({
      getAuth,
      addAuthToOperation,
    }),
    fetchExchange,
  ],
});
console.log(client);
const Provider = ({ children }) => {
  return <UrqlProvider value={client}>{children}</UrqlProvider>;
};

export { Provider, CreateDoc, DocsByUser };
