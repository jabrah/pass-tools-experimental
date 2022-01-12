import { isValidUser } from './helper.js';
import Database from 'better-sqlite3';

const QUERY = 'SELECT target FROM dupes WHERE target NOT LIKE \'%\' || source AND passType = \'User\'';

/**
 * Process database produced by the PASS duplicate checker tool.
 * 
 * After the duplicate checker runs, we need to determine which User objects are safe to delete
 * in order to remediate our database. This tool will query the Elasticsearch index to check for
 * references to User IDs from the dupe checker database. The tool will report all User IDs that
 * are referenced by other objects in ES as "valid" while any User ID that is not referenced by
 * other objects (according to ES) are regarded as "invalid," suggesting that those objects may
 * be safe to delete.
 * 
 * Due to differences in environment in which the tool is run, it may mis-fire and mark more
 * entities as duplicates than anticipated. To double-check the work of the tool, craf a query
 * against the database to remove a common class of mistakes -- we ignore all rows where the
 * source URL is contained fully in the target URL.
 * 
 * An example of this mistake that we want to ignore looks like:
 *  source: /users/71/b3/52/68/71b35268-091d-462b-ba51-b8ba27082e03
 *  target: http://fcrepo-test.pass.local:8080/fcrepo/rest/users/71/b3/52/68/71b35268-091d-462b-ba51-b8ba27082e03
 * In this case, the source _would_ match the target if it had the right prefix
 * 
 * @returns {object} user IDs sorted by status. Valid IDs have one or more Submission or Grant
 * objects referencing them. Invalid IDs have no other object referencing them, suggesting that
 * they are safe to delete.
 * 
 * {
 *    valid: [],    // array of valid user IDs
 *    invalid: [],  // array of invalid user IDs
 * }
 */
export function processDB() {
  const filepath = process.env.DATA;
  console.log(`Using database: "${filepath}"`);

  const db = new Database(filepath, {
    readonly: true,
    fileMustExist: true,
  });

  const stmt = db.prepare(QUERY);
  const rows = stmt.all();
  db.close();

  // Now we can process the data
  const result = { valid: [], invalid: [] };
  // Remove potential duplicate user IDs
  const targets = [...new Set(rows.map(row => row.target))];

  const resolvers = new Map();
  targets.forEach(user => resolvers.set(
    user,
    isValidUser(user).then((valid) => {
      if (valid) {
        result.valid.push(user);
      } else {
        result.invalid.push(user);
      }
    })
  ));

  return Promise.all(Array.from(resolvers.values()))
    .then(() => Promise.resolve(result));
}
