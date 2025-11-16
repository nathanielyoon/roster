import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(
  new URL(import.meta.resolve("./local.db")).pathname,
);

const update = (table: string, columns: string[]) =>
  `CREATE TRIGGER update_timestamp_${table} AFTER UPDATE OF ${columns} ON ${table}
BEGIN
  UPDATE ${table} SET updated = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;`;

db.exec(`CREATE TABLE IF NOT EXISTS person (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name VARCHAR(255),
  info TEXT NOT NULL,
  notes TEXT,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);`);

db.prepare(`INSERT INTO person (name, info) VALUES (?, ?);`).run(
  "Nathaniel",
  '{"age":23}',
);
console.log(db.prepare(`SELECT * FROM person;`).all());
