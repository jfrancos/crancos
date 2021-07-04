import React from "react";
import { Provider as UrqlProvider } from "urql";
import { createClient, dedupExchange, fetchExchange } from "urql";
import { cacheExchange } from "@urql/exchange-graphcache";
import { authExchange } from "@urql/exchange-auth";
import { makeOperation, gql } from "@urql/core";
import { Magic, RPCError } from "magic-sdk";
import { cloneDeepWith } from "lodash";
const { MAGIC_PUBLISHABLE_KEY } = import.meta.env;

let magic;

if (MAGIC_PUBLISHABLE_KEY) {
  magic = new Magic(MAGIC_PUBLISHABLE_KEY, { testMode: false });
}

// Next up: downloading schema

// Things to run by the Formidable folk at some point:
// 1. Different `update` behavior for ___optimistic results
// 2. __FUSERID__ substitution

const DocsByUser = gql`
  query DocsByUser {
    findUserByID(id: __FUSERID__) {
      _id
      docs {
        data {
          _id
          stringData
          booleanData
          dateData
          floatData
          intData
          longData
        }
      }
    }
  }
`;

const DeleteDoc = gql`
  mutation DeleteDoc($id: ID!) {
    deleteDoc(id: $id) {
      _id
    }
  }
`;

const UpdateDoc = gql`
  mutation UpdateDoc(
    $id: ID!
    $stringData: String
    $booleanData: Boolean
    $dateData: Date
    $floatData: Float
    $intData: Int
    $longData: Long
  ) {
    updateDoc(
      id: $id
      data: {
        stringData: $stringData
        booleanData: $booleanData
        dateData: $dateData
        floatData: $floatData
        intData: $intData
        longData: $longData
      }
    ) {
      _id
      stringData
    }
  }
`;

const CreateDoc = gql`
  mutation CreateDoc(
    $stringData: String
    $booleanData: Boolean
    $dateData: Date
    $floatData: Float
    $intData: Int
    $longData: Long
  ) {
    createDoc(
      data: {
        owner: { connect: __FUSERID__ }
        stringData: $stringData
        booleanData: $booleanData
        dateData: $dateData
        floatData: $floatData
        intData: $intData
        longData: $longData
      }
    ) {
      _id
    }
  }
`;

const cacheOptions = {
  keys: { DocPage: () => null },
  optimistic: {
    // avoid destructuring error prior to magic login with defaults(?):
    createDoc: ({ data }) => {
      return {
        ___optimistic: true,
        __typename: "Doc",
        _id: Date.now(),
        stringData: data.stringData || null,
        booleanData: data.booleanData || null,
        dateData: data.dateData || null,
        longData: data.longData || null,
        intData: data.intData || null,
        floatData: data.floatData || null,
      };
    },
    updateDoc: ({ data, id }) => {
      return { ...data, _id: id, __typename: "Doc" };
    },
    deleteDoc: ({ id }) => {
      return { ___optimistic: true, __typename: "Doc", _id: id };
    },
  },
  updates: {
    Mutation: {
      deleteDoc: ({ deleteDoc }, args, cache) => {
        if (deleteDoc.___optimistic) {
          cache.updateQuery({ query: DocsByUser }, (data) => {
            data.findUserByID.docs.data = data.findUserByID.docs.data.filter(
              (item) => item._id !== deleteDoc._id
            );
            return data;
          });
        } else {
          cache.invalidate({
            __typename: "Doc",
            id: args.id,
          });
        }
      },
      createDoc: ({ createDoc }, args, cache) => {
        if (createDoc.___optimistic) {
          cache.updateQuery({ query: DocsByUser }, (data) => {
            data.findUserByID.docs.data.push({
              booleanData: null,
              stringData: null,
              dateData: null,
              floatData: null,
              intData: null,
              longData: null,
              ...createDoc,
            });
            return data;
          });
        } else {
          // hmm I wonder how this will go when offline? --
          // "Note: While optimistic mutations are waiting for results from the API all queries that may alter our optimistic data are paused (or rather queued up) and all optimistic mutations will be reverted at the same time. This means that optimistic results can stack but will never accidentally be confused with "real" data in your configuration."
          cache.invalidate({
            __typename: "User",
            id: args.data.owner.connect,
          });
        }
      },
    },
  },
};

const getAuth = async () => {
  console.log("getting auth");
  let response = await fetch("/api/token", {
    method: "post",
    body: JSON.stringify(await magic.user.getIdToken({ lifespan: 15 })),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return await response.json();
};

const addAuthToOperation = ({ authState: { token, fauna_id }, operation }) => {
  if (!token) {
    return operation;
  }
  const fetchOptions =
    typeof operation.context.fetchOptions === "function"
      ? operation.context.fetchOptions()
      : operation.context.fetchOptions || {};
  // this might do something interesting were a user to specify
  // "__FUSERID__" in their input (we can surely tweak CUSTOMIZER to
  // make this more specific)
  operation.query.definitions = cloneDeepWith(
    operation.query.definitions,
    (item) => (item === "__FUSERID__" ? fauna_id : undefined)
  );
  return makeOperation(operation.kind, operation, {
    ...operation.context,
    fetchOptions: {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        Authorization: "Bearer " + token,
      },
    },
  });
};

const client = createClient({
  url: "https://graphql.fauna.com/graphql",
  exchanges: [
    dedupExchange,
    cacheExchange(cacheOptions),
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

export { Provider, CreateDoc, DocsByUser, DeleteDoc, UpdateDoc };
