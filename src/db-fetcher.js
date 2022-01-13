import { reportRefs } from './helper.js';
import Database from 'better-sqlite3';

const QUERY = 'SELECT target FROM dupes WHERE target NOT LIKE \'%\' || source AND passType = ?';

/**
 * Process database produced by the PASS duplicate checker tool.
 * 
 * After the duplicate checker runs, we need to determine which User objects are safe to delete
 * in order to remediate our database. This tool will query the Elasticsearch index to check for
 * references to User IDs from the dupe checker database. As well as any any objects that the 
 * original object may reference. Any objects that neither reference anything or are referenced
 * by anything should be safe to delete.
 * 
 * Due to differences in environment in which the tool is run, it may mis-fire and mark more
 * entities as duplicates than anticipated. To double-check the work of the tool, craft a query
 * against the database to remove a common class of mistakes -- we ignore all rows where the
 * source URL is contained fully in the target URL.
 * 
 * An example of this mistake that we want to ignore looks like:
 *  source: /users/71/b3/52/68/71b35268-091d-462b-ba51-b8ba27082e03
 *  target: http://fcrepo-test.pass.local:8080/fcrepo/rest/users/71/b3/52/68/71b35268-091d-462b-ba51-b8ba27082e03
 * In this case, the source _would_ match the target if it had the right prefix
 * 
 * @returns {object} user IDs with associated references.
 * {
 *    '<entity_id>': {
 *      references: [],   // List of IDs that the original entity points to
 *      referencedBy: []  // List of IDs for entities that point to the original entity
 *    }
 * }
 */
export function processDB(type = 'User') {
  const filepath = process.env.DATA;

  console.log(`Using database: "${filepath}"`);

  const db = new Database(filepath, {
    readonly: true,
    fileMustExist: true,
  });

  const stmt = db.prepare(QUERY);
  const rows = stmt.all(type);
  db.close();

  // Remove potential duplicate user IDs
  const targets = [...new Set(rows.map(row => row.target))];

  return reportRefs(targets);
}
