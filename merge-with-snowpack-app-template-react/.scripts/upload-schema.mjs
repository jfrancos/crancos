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

// why not just use dotenv instead of ini?

const envPath = join(topLevel, '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const { FAUNA_SECRET } = parse(envFile);
const client = new faunadb.Client({ secret: FAUNA_SECRET });
const schemaPath = join(topLevel, 'schema.gql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
const types = parseSchema(schema)
  .definitions.map((item) => item.name.value)
  .filter((item) => !['User', 'Query'].includes(item));

const {
  CreateRole,
  Collection,
  Query,
  Lambda,
  Equals,
  CurrentIdentity,
  Select,
  Get,
  Var,
  And,
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
  

  if (result.status !== 200) {
    return;
  }
  const roles = types.map((type) =>
    CreateRole({
      name: `${type}Role`,
      privileges: [
        {
          resource: Collection(type),
          actions: {
            read: Query(
              Lambda(
                'ref',
                Equals(
                  CurrentIdentity(),
                  Select(['data', 'owner'], Get(Var('ref'))),
                ),
              ),
            ),
            write: Query(
              Lambda(
                ['oldData', 'newData'],
                And(
                  Equals(
                    CurrentIdentity(),
                    Select(['data', 'owner'], Var('oldData')),
                  ),
                  Equals(
                    Select(['data', 'owner'], Var('oldData')),
                    Select(['data', 'owner'], Var('newData')),
                  ),
                ),
              ),
            ),
            create: Query(
              Lambda(
                'values',
                Equals(
                  CurrentIdentity(),
                  Select(['data', 'owner'], Var('values')),
                ),
              ),
            ),
            delete: Query(
              Lambda(
                'ref',
                Equals(
                  CurrentIdentity(),
                  Select(['data', 'owner'], Get(Var('ref'))),
                ),
              ),
            ),
            history_read: false,
            history_write: false,
            unrestricted_read: false,
          },
        },
        {
          resource: Index(`${type.toLowerCase()}_owner_by_user`),
          actions: {
            unrestricted_read: false,
            read: Query(
              Lambda('terms', Equals(Var('terms'), [CurrentIdentity()])),
            ),
          },
        },
        {
          resource: Collection('User'),
          actions: {
            read: Query(
              Lambda(
                'ref',
                Equals(CurrentIdentity(), Select(['ref'], Get(Var('ref')))),
              ),
            ),
            write: false,
            create: false,
            delete: false,
            history_read: false,
            history_write: false,
            unrestricted_read: false,
          },
        },
      ],
      membership: [
        {
          resource: Collection('User'),
        },
      ],
    }),
  );
  console.log('Configuring roles for', types);
  try {
    let result = await client.query(roles);
    console.log(result);
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
  }
})();
