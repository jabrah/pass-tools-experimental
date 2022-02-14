import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

/**
 * Check entries in the NIHMS loader log to compare entities
 * it created against the list of duplicate entities in Fedora
 * 
 * DB_PATH : filepath to duplicates DB
 * LOG_PATH : filepath to the nihms loader log
 */

const creationKey = 'Creation status and location: 201';

function processEnv() {
  if (!process.env.DB_PATH) {
    console.log('No DB path provided. Please specify the DB_PATH env variable');
    process.exit(1);
  }
  if (!process.env.LOG_PATH) {
    console.log('No log path provided. Please specify the LOG_PATH env variable');
    process.exit(1);
  }
}

function parseNihmsLog() {
  const logfile = readFileSync(process.env.LOG_PATH, { encoding: 'utf-8', flag: 'r' });
  const lines = logfile.split(/\r?\n/);

  console.log(`Log length: ${lines.length} lines`);
  return lines
    .filter(line => line.includes(creationKey))
    .map(line => line.slice(line.indexOf(creationKey) + creationKey.length + 2));
}

function main() {
  processEnv();
  // Parse out list of created entities from the log
  // Compare against IDs in the dupes DB
  const creationMsgs = parseNihmsLog();
  console.log(`NIHMS loader creation messages: ${creationMsgs.length}`);

  const db = new Database(process.env.DB_PATH, { fileMustExist: true });

  const query = 'SELECT EXISTS(SELECT 1 FROM filtered_dupes WHERE target LIKE ? OR source LIKE ?)';
  const stmt = db.prepare(query).pluck(true);

  const results = new Map();
  creationMsgs.forEach((entry) => {
    const hostless = `/${new URL(entry).pathname.split('/').slice(3).join('/')}`;
    const queryRes = stmt.get(entry, hostless);
    results.set(entry, queryRes);
    // console.log(`${entry} [${hostless}] : ${queryRes}`);
  });

  db.close();

  const total = Array.from(results.values()).reduce((sum, val) => sum + val, 0);
  console.log(`\n\tTotal matches: ${total}\n`);

  Array.from(results.entries())
    .filter(entry => entry[1] === 1)
    .forEach(entry => console.log(entry[0]));
}

main();
