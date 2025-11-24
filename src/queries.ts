import type { Data } from "@libn/json/schema";
import { type COURSE, type PERSON, TABLES } from "./tables.ts";

// 1. Student/family info, from bulk data or individual application
// 2. Create different courses
// 3. Sign up
// 4. Take attendance (by phone?)
// 5. Generate spreadsheet of attendance

declare const BRAND: unique symbol;
type Branded<A, B extends string> = A & { [BRAND]: B };
const brand = <A, B extends string>($: A, value: B) => $ as Branded<A, B>;
const filter = (columns: { [_: string]: boolean | undefined }) =>
  Object.entries(columns).filter(($) => $[1]).map(($) => $[0]);
export type Statement = {
  sql: string;
  args: (null | number | string)[];
};
export const insert = <A extends keyof typeof TABLES>(
  into: A,
  row: Omit<Data<typeof TABLES[A]>, "id" | "created" | "updated" | "note">,
) => {
  const entries = Object.entries<any>({ note: "", ...row });
  return {
    sql: `INSERT INTO ${into} (${
      entries.map(($) => $[0]).join(", ")
    }) VALUES (${"?, ".repeat(entries.length).replace(/, $/, "")});`,
    args: entries.map(($) => $[1]),
  } satisfies Statement;
};
export const select = <A extends keyof typeof TABLES>(
  table: A,
  columns: { [_ in keyof Data<typeof TABLES[A]>]?: boolean },
) => {
  const keys = Object.keys(columns) as (keyof typeof columns & string)[];
  let selected = "";
  for (let z = 0; z < keys.length; ++z) {
    if (columns[keys[z]]) selected += `${table}.${keys[z]}, `;
  }
  return brand(
    `SELECT ${selected.replace(/, $/, "")} FROM ${table}`,
    `select ${table}`,
  );
};
export const selectLowers = (
  upperId: number,
  select: Branded<string, "select person">,
) => ({
  sql:
    `${select} INNER JOIN family ON family.upper = ? AND family.lower = person.id;`,
  args: [upperId],
} satisfies Statement);
export const selectUppers = (
  lowerId: number,
  select: Branded<string, "select person">,
) => ({
  sql:
    `${select} INNER JOIN family ON family.lower = ? AND family.upper = person.id;`,
  replace: [lowerId],
});
