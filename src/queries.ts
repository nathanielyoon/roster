import type { Data } from "@libn/json/schema";
import { TABLES } from "./tables.ts";

export type Statement = {
  sql: string;
  args: (null | number | string)[];
};
const repeat = ($: string, length: number) =>
  Array.from({ length }, () => $).join(", ");
export const insert = <A extends keyof typeof TABLES>(
  into: A,
  rows: readonly Omit<
    Data<typeof TABLES[A]>,
    "id" | "created" | "updated" | "note"
  >[],
): Statement => {
  const keys = Object.keys(TABLES[into].properties).filter(($) =>
    !/^(?:id|created|updated)$/.test($)
  ) as (keyof typeof rows[number])[];
  const values = `(${repeat("?", keys.length)})`;
  return {
    sql: `INSERT INTO ${into} (${keys.join(", ")}) VALUES ${
      repeat(values, rows.length)
    }`,
    args: rows.flatMap(($) => keys.map((key) => $[key] ?? null)),
  } as Statement;
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
  return `SELECT ${selected.replace(/, $/, "")} FROM ${table}`;
};
