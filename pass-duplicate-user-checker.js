#!/usr/bin/env node

/**
 * Assumptions:
 *  - You have opened SSH tunnels to FCREPO and ELASTICSEARCH
 */

import fetch from 'node-fetch';
import { processDB } from './db-fetcher.js';

let ENV;
let ES_URL;

function parseEnv() {
  if (!process.env.ES_URL) {
    process.env.ES_URL = 'http://localhost:9200/pass/_search';
  }

  const env = {
    ES_URL: process.env.ES_URL,
    CSV_MODE: process.env.CSV || false,
    SQL_MODE: process.env.SQL || true,
    DATA_PATH: process.env.DATA || undefined
  };

  ES_URL = env.ES_URL;

  const [,, ...args] = process.argv;
  if (args.includes('--help')) {
    env.HELP_MODE = true;
  }

  return env;
}

async function findUser(id) {
  const userSearch = `${ES_URL}?default_operator=AND&q=@id:"${id}"`;
  const resp = await fetch(userSearch);
  const data = await resp.json();

  if (data.hits.total === 0) {
    return;
  }

  return data.hits.hits[0]['_source'];
}

ENV = parseEnv();

if (ENV.HELP_MODE) {
  console.log('>> Show help text <<');
  process.exit();
}

console.log('Using environment:');
console.log(ENV);
console.log();

if (!ENV.DATA_PATH) {
  throw new Error('Please specify where to find data using DATA: \n  DATA=<./path/to/data> node ./index.js');
  process.exit(1);
}

if (ENV.CSV_MODE) {
  throw new Error('CSV mode not implemented');
  process.exit(2);
}

if (ENV.SQL_MODE) {
  processDB().then(results => console.log(results));
}