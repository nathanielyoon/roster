import { type Data, int, nil, obj, str } from "@libn/json/schema";

const table =
  (name: string) =>
  ($: TemplateStringsArray, ...columns: (string | [string, string])[]) => {
    let sql = `CREATE TABLE IF NOT EXISTS ${name} (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT NOT NULL DEFAULT "",`;
    for (let z = 0; z < columns.length; ++z) {
      const column = columns[z];
      if (Array.isArray(column)) {
        sql += `${$[z]}${column[0]} INTEGER NOT NULL REFERENCES ${
          column[1]
        }(id) DEFERRABLE INITIALLY DEFERRED`;
      } else sql += $[z] + column;
    }
    return `${sql}${$[columns.length].replace(/,$/, "")}
);
CREATE TRIGGER IF NOT EXISTS update_timestamp_${name}
AFTER UPDATE OF ${columns.join(", ")} ON ${name}
BEGIN
  UPDATE ${name} SET updated = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;`;
  };
export const CREATE = [
  "PRAGMA foreign_keys = ON;",
  table("person")`
  ${"name"} VARCHAR(255),
  ${"info"} TEXT NOT NULL,`,
  table("course")`
  ${"name"} VARCHAR(255),
  ${"info"} TEXT NOT NULL,`,
  table("family")`
  ${["upper", "person"]},
  ${["lower", "person"]},
  UNIQUE(upper, lower),`,
  table("signup")`
  ${["course", "course"]},
  ${["person", "person"]},`,
  table("record")`
  ${["signup", "signup"]},
  ${"began"} TIMESTAMP,
  ${"ended"} TIMESTAMP,`,
];
const META = {
  id: int({ minimum: 0, maximum: 0xffffffff }),
  created: str({ format: "date-time" }),
  updated: str({ format: "date-time" }),
  note: str(),
};
export const PERSON = obj({
  ...META,
  name: str({ minLength: 1, maxLength: 255 }),
  info: str({ pattern: "^\\{.*\\}$" }),
});
export const COURSE = obj({
  ...META,
  name: str({ minLength: 1, maxLength: 255 }),
  info: str({ pattern: "^\\{.*\\}$" }),
});
export const FAMILY = obj({
  ...META,
  upper: int(),
  lower: int(),
});
export const SIGNUP = obj({
  ...META,
  course: int(),
  person: int(),
});
export const RECORD = obj({
  ...META,
  signup: int(),
  began: nil(str({ format: "date-time" })),
  ended: nil(str({ format: "date-time" })),
});
export const TABLES = {
  person: PERSON,
  course: COURSE,
  family: FAMILY,
  signup: SIGNUP,
  record: RECORD,
};
