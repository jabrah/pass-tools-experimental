import Database from 'better-sqlite3';

const UPDATE_STMT = 'UPDATE filtered_dupes SET targetCreated = ?, targetCreatedBy = ?, targetLastModified = ?, targetLastModifiedBy = ? WHERE target = ?;';

function getDB() {
  const dbPath = process.env.DB_PATH;
  return new Database(dbPath, { fileMustExist: true });
}

export function maybeCreateFilteredTable() {
  const db = getDB();

  const stmt = db.prepare('select name from sqlite_master where type=\'table\'');
  const res = stmt.all();
  
  if (res.find(row => row.name === 'filtered_dupes')) {
    db.close();
    return;
  }

  db.exec('CREATE TABLE filtered_dupes AS SELECT * FROM dupes WHERE target NOT LIKE \'%\' || source;');
  db.close();
}

export function getDistinctTargets() {
  const db = getDB();

  const stmt = db.prepare('SELECT DISTINCT target from filtered_dupes;');
  const rows = stmt.all();

  db.close();

  return rows;
}

export function update(targetWithTimes) {
  const db = getDB();

  const stmt = db.prepare(UPDATE_STMT);
  const info = stmt.run(
    targetWithTimes.created,
    targetWithTimes.createdBy,
    targetWithTimes.lastModified,
    targetWithTimes.lastModifiedBy,
    targetWithTimes.target
  );

  db.close();

  console.log(`    - Update complete (${targetWithTimes.target}) :: (${JSON.stringify(info)})`);
}