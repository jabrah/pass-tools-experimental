import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

/**
 * Check entries in the NIHMS loader log to compare entities
 * it created against the list of duplicate entities in Fedora
 * 
 * DB_PATH : filepath to duplicates DB
 * LOG_PATH : filepath to the nihms loader log
 */

const CREATION_KEY = 'Creation status and location: 201';

const OPTIONS = {
  MODE: 'count'
};

function processEnv() {
  if (!process.env.DB_PATH) {
    console.log('No DB path provided. Please specify the DB_PATH env variable');
    process.exit(1);
  }
  if (!process.env.LOG_PATH) {
    console.log('No log path provided. Please specify the LOG_PATH env variable');
    process.exit(1);
  }

  console.log(process.argv);
  if (process.argv.includes('--check-dates')) {
    OPTIONS.MODE = 'date';
  }
}

function parseNihmsLog() {
  const logfile = readFileSync(process.env.LOG_PATH, { encoding: 'utf-8', flag: 'r' });
  const lines = logfile.split(/\r?\n/);

  console.log(`Log length: ${lines.length} lines`);
  console.log(`Looking for keyphrase: ${CREATION_KEY}`)
  return lines
    .filter(line => line.includes(CREATION_KEY));
}

const PRESENCE_QUERY = 'SELECT EXISTS(SELECT 1 FROM filtered_dupes WHERE target LIKE ? OR source LIKE ?)'
function countNihmsCreatedAgainstDupes() {
  // Parse out list of created entities from the log
  // Compare against IDs in the dupes DB

  // Parse the logs for "creation" messages, then slice off the ID from the message
  const creationMsgs = parseNihmsLog()
    .map(line => line.slice(line.indexOf(CREATION_KEY) + CREATION_KEY.length + 2));
  console.log(`NIHMS loader creation messages: ${creationMsgs.length}`);

  const db = new Database(process.env.DB_PATH, { fileMustExist: true });

  const stmt = db.prepare(PRESENCE_QUERY).pluck(true);

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

function toISODate(dateStr) {
  if (!dateStr) {
    return null;
  }
  return new Date(dateStr).toISOString();
}

function timeParts(timeStr) {
  const parts = timeStr.split(':');
  if (parts.length != 3) {
    return '';
  }
  return [parts[0], parts[1], ...parts[2].split('\.')];
}

function checkTimestamps() {
  const creationMsgs = parseNihmsLog();
  console.log(`NIHMS loader creation messages: ${creationMsgs.length}`);

  /**
   * Parse ID from nihms log
   * Parse timestamp from nihms log
   * Add a row to a new table including
   *  - Entity ID
   *  - (fedora) creation date
   *  - (fedora) last modified date
   *  - (NIHMS Loader) creation date
   */

  const db = new Database(process.env.DB_PATH, { fileMustExist: true });

  db
    .prepare('CREATE TABLE IF NOT EXISTS nihms_dupes (id TEXT PRIMARY KEY, nihmsCreated TEXT, fedoraCreated TEXT, lastModified TEXT, createDifference INTEGER);')
    .run();

  const getSrc = db.prepare('SELECT source, sourceCreated, sourceLastModified FROM filtered_dupes WHERE source = ?;');
  const getTar = db.prepare('SELECT target, targetCreated, targetLastModified FROM filtered_dupes WHERE target = ?;');
  const insert = db.prepare('INSERT OR REPLACE INTO nihms_dupes VALUES (@id, @nihmsCreated, @fedoraCreated, @lastModified, @createDifference);');

  const nihms_date = new Date(2022, 1, 1); // Why does 'month' start from 0? -- This is a Feb 1 date
  console.log(`Assuming log start date: ${nihms_date}`);

  // Ex: INFO 14:50:26.684 (FedoraPassCrudClient) Creation status and location: 201: http://fcrepo-prod.pass.local:8080/fcrepo/rest/publications/8e/97/45/b6/8e9745b6-732b-4c3c-a74c-106a11eeaeb6
  const timestamp_regex = /\s([\d:\.]*)\s/;
  creationMsgs.forEach((message) => {
    const id = message.slice(message.indexOf(CREATION_KEY) + CREATION_KEY.length + 2);
    const idPath = `/${new URL(id).pathname.split('/').slice(3).join('/')}`;
    
    const match = message.match(timestamp_regex);
    if (!Array.isArray(match) || match.length < 2) {
      return;
    }
    
    const time = timeParts(match[1]);
    // console.log(`${nihms_date.toISOString()} : ${time} :: ${nihms_date.getUTCHours()} :: ${nihms_date.getUTCHours() >= 23}`);

    // Increment the NIHMS timestamp DAY if the hours roll over back to 0
    if (nihms_date.getHours() >= 23 && time[0] == 0) {
      const newDate = nihms_date.getDate() + 1;
      nihms_date.setDate(newDate);
    }

    nihms_date.setHours(...time);
    
    const srcMatch = getSrc.get(idPath);
    const tarMatch = getTar.get(id);

    let data = {
      id,
      nihmsCreated: nihms_date.toISOString()
    };

    /**
     * It will likely be the case that there will be a matching source AND matching target
     * as the data tends captures the relationship both ways. Not sure if it's guarnateed though
     *    src >> target dupe AND
     *    target >> src dupe
     */
    if ((!!srcMatch && !!tarMatch)) {
      if (!tarMatch.targetCreated) {
        data = Object.assign(data, {
          fedoraCreated: toISODate(srcMatch.sourceCreated),
          lastModified: toISODate(srcMatch.sourceLastModified)
        });
      } else {
        data = Object.assign(data, {
          fedoraCreated: toISODate(tarMatch.targetCreated),
          lastModified: toISODate(tarMatch.targetLastModified)
        });
      }
    } else if (!!srcMatch && !tarMatch) {
      data = Object.assign(data, {
        fedoraCreated: toISODate(srcMatch.sourceCreated),
        lastModified: toISODate(srcMatch.sourceLastModified)
      });
    } else {
      // No valid matches
      return;
    }

    const nTime = new Date(data.nihmsCreated);
    const fTime = new Date(data.fedoraCreated);

    const diff = Math.abs(fTime - nTime) / 1000;

    data = Object.assign(data, {
      createDifference: diff
    });

    // console.log(match[1]);
    // console.log(`>> ${nihms_date.getDate()} : ${nihms_date.getHours()} : ${nihms_date.getMinutes()} : ${nihms_date.getSeconds()}`);
    // console.log(`>> ${nihms_date.getUTCDate()} : ${nihms_date.getUTCHours()} : ${nihms_date.getUTCMinutes()} : ${nihms_date.getUTCSeconds()}`);
    // console.log(data);

    const rez = insert.run(data);
    console.log(`  - ${JSON.stringify(data)} :: ${JSON.stringify(rez)}`);
  });
  
  db.close();
}

function main() {
  processEnv();
  console.log(OPTIONS);
  
  switch (OPTIONS.MODE) {
    case 'date':
      checkTimestamps();
      break;
    default:
      countNihmsCreatedAgainstDupes();
      break;
  }
}

main();
