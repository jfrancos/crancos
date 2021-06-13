#!/usr/bin/env node

import faunadb from 'faunadb';
import { join, basename } from 'path';
import { parse, stringify } from 'ini';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';

let env = {};

const topLevel = execSync('git rev-parse --show-toplevel', {
  encoding: 'utf-8',
}).trim();
const envPath = join(topLevel, '.env');
const dbName = process.argv[2] ?? basename(topLevel)

try {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  env = parse(envFile);
} catch {
  console.log('Creating .env');
}

const createDB = async () => {
  const path = join(os.homedir(), '.fauna-shell');
  const file = fs.readFileSync(path, 'utf-8');
  const config = parse(file);
  const defaultSection = config.default;
  const secret = config[defaultSection].secret;
  const q = faunadb.query;
  const client = new faunadb.Client({ secret });

  return await client.query(
    q.Select(
      ['secret'],
      q.CreateKey({
        database: q.Select(['ref'], q.CreateDatabase({ name: dbName })),
        role: 'admin',
      }),
    ),
  );
};

if (env.FAUNA_SECRET) {
  console.log('.env already contains FAUNA_SECRET');
} else {
  (async () => {
    env.FAUNA_SECRET = await createDB();
    console.log(`Created database "${dbName}", writing FAUNA_SECRET to .env`)
    fs.writeFileSync(envPath, stringify(env));
  })();
}
