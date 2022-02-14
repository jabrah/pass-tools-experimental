#!/usr/bin/env node

/**
 * Assumptions:
 *  - You have opened SSH tunnels to FCREPO and ELASTICSEARCH
 */
import { processDB } from './src/db-fetcher.js';

let ENV;
let ES_URL;

function parseEnv() {
  const [,, ...args] = process.argv;

  const env = {
    ES_URL: process.env.ES_URL,
    CSV_MODE: process.env.CSV || false,
    SQL_MODE: process.env.SQL || true,
    DATA_PATH: process.env.DATA || undefined,
    TYPE: 'User'
  };

  ES_URL = env.ES_URL;

  if (args.includes('--help')) {
    env.HELP_MODE = true;
  }
  if (args.includes('--type')) {
    const index = args.indexOf('--type');
    env.TYPE = args[index + 1];
  }

  if (!process.env.ES_URL) {
    process.env.ES_URL = 'http://localhost:9200/pass/_search';
  }
  if (!process.env.TYPE) {
    process.env.TYPE = env.TYPE;
  }

  const max_concurrent = process.env.MAX_CONCURRENT;
  if (!!max_concurrent && typeof max_concurrent !== 'number') {
    console.log('### MAX_CONCURRENT must be an integer (default: 5) ###');
    process.exit(3);
  }

  return env;
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
  console.log('Please specify where to find data using DATA: \n  DATA=<./path/to/data> node ./index.js');
  process.exit(1);
}

if (ENV.CSV_MODE) {
  console.log('CSV mode not implemented');
  process.exit(2);
}

if (ENV.SQL_MODE) {
  processDB(ENV.TYPE).then((results) => console.log(JSON.stringify(results, null, 2)));
}