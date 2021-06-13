#!/usr/bin/env node

import { parse } from 'ini';
import { join } from 'path';
import { execSync } from 'child_process';
import fs from 'fs';
import fetch from 'node-fetch';

const topLevel = execSync('git rev-parse --show-toplevel', {
  encoding: 'utf-8',
}).trim();

const envPath = join(topLevel, '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const env = parse(envFile);

const schemaPath = join(topLevel, 'schema.gql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

process.stdout.write("Sending file... ")

// should make sure this won't disturb existing data (?)

fetch('https://graphql.fauna.com/import', {
  body: schema,
  headers: {
    Authorization: 'Bearer ' + env.FAUNA_SECRET,
  },
  method: 'POST',
}).then((result) => console.log(result.statusText));
