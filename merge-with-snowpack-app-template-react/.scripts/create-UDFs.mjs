#!/usr/bin/env node

// import { parse } from 'ini';
import { join } from 'path';
import { execSync } from 'child_process';
import fs from 'fs';
import fetch from 'node-fetch';
// import { parse as parseSchema } from 'graphql';
// require('dotenv').config();
import dotenv from 'dotenv';
import faunadb from 'faunadb';

dotenv.config();
const { query: q } = faunadb;
const { FAUNA_SECRET } = process.env;

const topLevel = execSync('git rev-parse --show-toplevel', {
  encoding: 'utf-8',
}).trim();

// why not just use dotenv instead of ini?

// const envPath = join(topLevel, '.env');
// const envFile = fs.readFileSync(envPath, 'utf-8');
// const { FAUNA_SECRET } = parse(envFile);
const client = new faunadb.Client({ secret: FAUNA_SECRET });

const schemaPath = join(topLevel, 'schema.gql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
// const types = parseSchema(schema)
//   .definitions.map((item) => item.name.value)
//   .filter((item) => !['User', 'Query'].includes(item));

const {
  CreateRole,
  CreateFunction,
  CreateIndex,
  CreateCollection,
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
  Update,
  Merge,
  Range,
  Let,
  Add,
  Create,
  Ref,
  Paginate,
  Exists,
  Function,
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
  if (result.status !== 200) {
    return;
  }

  // need to create ts and id indeces
  // allow id and ts conditional perms (although should just use one for user + ts/ref)
  // set conditional perms for documents

  // check error messages in network for mysteries
  // so ... I think all perms

  const FQL = [
    CreateIndex({
      name: 'user_by_magic_id',
      unique: true,
      source: Collection('User'),
      terms: [
        {
          field: ['data', 'magic_id'],
        },
      ],
    }),
    CreateIndex({
      name: 'ts',
      source: Collection('Document'),
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
      source: Collection('Document'),
      terms: [
        {
          field: ['data', 'owner'],
        },
        {
          field: ['data', 'id'],
        },
      ],
    }),
    Update(Function('set_document'), {
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
              If(
                GT(
                  Select(['updatedAt'], Var('newdoc')),
                  Select(['data', 'updatedAt'], Get(Var('document'))),
                ),
                Update(Select('ref', Get(Var('document'))), {
                  data: Var('newdoc'),
                }),
                null,
              ),
              Create(Collection('Document'), {
                data: Merge(Var('newdoc'), { owner: CurrentIdentity() }),
              }),
            ),
          ),
        ),
      ),
    }),
    Update(Function('feed_documents'), {
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
      name: 'document-role',
      privileges: [
        {
          // resource: Ref(Ref('functions'), 'feed_documents'),
          resource: Function('feed_documents'),
          actions: {
            call: true,
          },
        },
        {
          // resource: Ref(Ref('functions'), 'set_document'),
          resource: Function('set_document'),
          actions: {
            call: true,
          },
        },
        {
          resource: Collection('User'),
          actions: {
            read: Query(Lambda('ref', Equals(CurrentIdentity(), Var('ref')))),
          },
        },
      ],
      membership: [
        {
          resource: Collection('User'),
        },
      ],
    }),
  ];

  // const roles = types.map((type) =>

  // );
  // console.log('Configuring roles for', types);

  //7

  try {
    let result = await client.query(
      CreateCollection({
        name: 'User',
      }),
    );
    // Collection can't be used in the same transaction
    // where it's created
    console.log(result);
    result = await client.query(FQL);
    console.log(result);
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
  }
})();

// next step upload schema??
