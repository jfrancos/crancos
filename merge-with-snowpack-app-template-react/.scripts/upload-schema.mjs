#!/usr/bin/env node

import { parse } from 'ini';
import { join } from 'path';
import { execSync } from 'child_process';
import fs from 'fs';
import fetch from 'node-fetch';
import { parse as parseSchema } from 'graphql';
// require('dotenv').config();
import faunadb from 'faunadb';
const { query: q } = faunadb;

const topLevel = execSync('git rev-parse --show-toplevel', {
  encoding: 'utf-8',
}).trim();

// NOT USED ANYMORE

// why not just use dotenv instead of ini?

const envPath = join(topLevel, '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const { FAUNA_SECRET } = parse(envFile);
const client = new faunadb.Client({ secret: FAUNA_SECRET });
const schemaPath = join(topLevel, 'schema.gql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
// const types = parseSchema(schema)
//   .definitions.map((item) => item.name.value)
//   .filter((item) => !['User', 'Query'].includes(item));

const {
  CreateRole,
  CreateFunction,
  Collection,
  Query,
  Lambda,
  Equals,
  Match,
  CurrentIdentity,
  Map,
  Select,
  Get,
  If,
  Var,
  Range,
  Let,
  Replace,
  Add,
  Create,
  Ref,
  Paginate,
  And,
  Exists,
  Index,
} = q;

// should make sure this won't disturb existing data (?)

(async () => {
  process.stdout.write('Sending schema... ');
  // fetch('https://graphql.fauna.com/import?mode=override', {
  let result = await fetch('https://graphql.fauna.com/import?mode=replace', {
    body: schema,
    headers: {
      Authorization: 'Bearer ' + FAUNA_SECRET,
    },
    method: 'POST',
  });
  console.log(result.statusText);

  const FQL = [
    CreateCollection({
      name: 'user',
    }),
    CreateCollection({
      name: 'document',
    }),
    CreateIndex({
      name: 'user_by_magic_id',
      unique: true,
      source: 'User',
      terms: [
        {
          field: ['data', 'magic_id'],
        },
      ],
    }),
    CreateIndex({
      name: 'ts',
      source: 'document',
      terms: [
        {
          field: ['data', 'owner'],
        },
      ],
      values: [
        {
          field: ['ts'],
        },
        {
          field: ['ref'],
        },
      ],
    }),
    CreateIndex({
      name: 'id',
      source: 'document',
      terms: [
        {
          field: ['data', 'owner'],
        },
        {
          field: ['data', 'id'],
        },
      ],
    }),
    CreateFunction({
      name: 'set_document',
      role: 'server',
      body: Query(
        Lambda(
          ['newdoc'],
          Let(
            {
              document: Match(Index('id'), [
                CurrentIdentity(),
                Select('id', Var('newdoc')),
              ]),
              _: Update(CurrentIdentity(), {}),
            },
            If(
              Exists(Var('document')),
              Update(Select('ref', Get(Var('document'))), {
                data: Var('newdoc'),
              }),
              Create(Collection('document'), {
                data: Merge(Var('newdoc'), { owner: CurrentIdentity() }),
              }),
            ),
          ),
        ),
      ),
    }),
    CreateFunction({
      name: 'feed_documents',
      role: 'server',
      body: Query(
        Lambda(
          ['id', 'ts', 'limit'],
          Map(
            Select(
              'data',
              Paginate(
                Range(
                  Match(Index('ts'), CurrentIdentity()),
                  Add(1, Var('ts')),
                  [],
                ),
              ),
            ),
            Lambda('item', Get(Select(1, Var('item')))),
          ),
        ),
      ),
    }),
    CreateRole({
      name: 'user-role',
      privileges: [
        {
          resource: Ref(Ref('functions'), 'feed_documents'),
          actions: {
            call: true,
          },
        },
        {
          resource: Ref(Ref('functions'), 'set_document'),
          actions: {
            call: true,
          },
        },
        {
          resource: Collection('user'),
          actions: {
            read: Query(Lambda('ref', Equals(CurrentIdentity(), Var('ref')))),
          },
        },
      ],
      membership: [
        {
          resource: Collection('user'),
        },
      ],
    }),
  ];

  if (result.status !== 200) {
    return;
  }

  try {
    let result = await client.query(functions);
    console.log(result);
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
  }
  
  // console.log('Configuring roles for', types);

  // next up -- try out downloading schema
  // result = await fetch('https://graphql.fauna.com/graphql', {
  //   body: JSON.stringify({
  //     variables: {},
  //     query: getIntrospectionQuery({ descriptions: false }),
  //   }),
  //   headers: {
  //     Authorization: 'Bearer ' + FAUNA_SECRET,
  //     'Content-Type': 'application/json',
  //   },
  //   method: 'POST',
  // });
  // console.log(JSON.stringify(await result.json(), null, 2));
  // return
  

  // const roles = types.map((type) =>
  //   CreateRole({
  //     name: `${type}Role`,
  //     privileges: [
  //       {
  //         resource: Collection(type),
  //         actions: {
  //           read: Query(
  //             Lambda(
  //               'ref',
  //               Equals(
  //                 CurrentIdentity(),
  //                 Select(['data', 'owner'], Get(Var('ref'))),
  //               ),
  //             ),
  //           ),
  //           write: Query(
  //             Lambda(
  //               ['oldData', 'newData'],
  //               And(
  //                 Equals(
  //                   CurrentIdentity(),
  //                   Select(['data', 'owner'], Var('oldData')),
  //                 ),
  //                 Equals(
  //                   Select(['data', 'owner'], Var('oldData')),
  //                   Select(['data', 'owner'], Var('newData')),
  //                 ),
  //               ),
  //             ),
  //           ),
  //           create: Query(
  //             Lambda(
  //               'values',
  //               Equals(
  //                 CurrentIdentity(),
  //                 Select(['data', 'owner'], Var('values')),
  //               ),
  //             ),
  //           ),
  //           delete: Query(
  //             Lambda(
  //               'ref',
  //               Equals(
  //                 CurrentIdentity(),
  //                 Select(['data', 'owner'], Get(Var('ref'))),
  //               ),
  //             ),
  //           ),
  //           history_read: false,
  //           history_write: false,
  //           unrestricted_read: false,
  //         },
  //       },
  //       {
  //         resource: Index(`${type.toLowerCase()}_owner_by_user`),
  //         actions: {
  //           unrestricted_read: false,
  //           read: Query(
  //             Lambda('terms', Equals(Var('terms'), [CurrentIdentity()])),
  //           ),
  //         },
  //       },
  //       {
  //         resource: Collection('User'),
  //         actions: {
  //           read: Query(
  //             Lambda(
  //               'ref',
  //               Equals(CurrentIdentity(), Select(['ref'], Get(Var('ref')))),
  //             ),
  //           ),
  //           write: false,
  //           create: false,
  //           delete: false,
  //           history_read: false,
  //           history_write: false,
  //           unrestricted_read: false,
  //         },
  //       },
  //     ],
  //     membership: [
  //       {
  //         resource: Collection('User'),
  //       },
  //     ],
  //   }),
  // );

 
})();
