/**
 * Read in duplicates DB
 * For each row in 'dupes' table:
 *  "localize" the URI (change host to ENV var value)
 *  Fetch the 'created', 'lastModified', 'createdBy', and 'lastModifiedBy' 
 *    props from Fedora
 *  Update the row in the DB
 */

import { getDistinctTargets, update } from './src/db-helper.js';
import { checkUri, fetchTimestamps } from './src/fcrepo.js';

function processEnv() {
  if (!process.env.DB_PATH) {
    console.log('No DB path provided');
    process.exit(1);
  }
  if (!process.env.FCREPO) {
    process.env.FCREPO = 'http://localhost:8080';
  }
  if (!process.env.username || !process.env.password) {
    console.log('Must include username and password');
  }
}

async function main() {
  processEnv();

  // maybeCreateFilteredTable(db);
  const targets = getDistinctTargets().map(obj => obj.target);

  for (const target of targets) {
    const withTimes = await checkUri(target);
    console.log(`    > Found ${target}: ${JSON.stringify(withTimes)}`);
    update(withTimes);
  }

}

main();

