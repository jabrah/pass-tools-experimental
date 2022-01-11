/**
 * Assumptions:
 *  - You have opened SSH tunnels to FCREPO and ELASTICSEARCH
 */

import fetch from 'node-fetch';
import USERS from './target-users.js';

let ES_URL;

function parseEnv() {
  const env = {
    ES_URL: process.env.ES_URL || 'http://localhost:9200/pass/_search',
    CSV_MODE: process.env.CSV || false,
    SQL_MODE: process.env.SQL || true,
    DATA_PATH: process.env.DATA || undefined
  };

  ES_URL = env.ES_URL;

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

function getSubmissionsForUsers() {
  const results = {
    "valid": [],
    "invalid": []
  };
  
  const userResolver = USERS.map((user) => {
    const query = `submitter:"${user}"+pi:"${user}"+copi:"${user}"`;
    const url = `${ES_URL}?default_operator=OR&q=${query}`;

    return fetch(url)
      .then(resp => resp.json())
      .then((data) => {
        if (data.hits.total > 0) {
          results.valid.push(user);
        } else {
          results.invalid.push(user);
        }
      });
  });

  Promise.all(userResolver)
    .then(() => {
      console.log(results);
    });
}

const env = parseEnv();
console.log('Using environment:');
console.log(env);
console.log();

if (!!env.DATA_PATH) {
  throw new Error('Please specify where to find data using DATA: \n  DATA=<./path/to/data> node ./index.js');
}

if (env.CSV_MODE) {
  throw new Error('CSV mode not implemented');
}

getSubmissionsForUsers();