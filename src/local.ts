import { DatabaseSync, type StatementSync } from "node:sqlite";
import type { Database, PreparedStatement } from "./env.ts";
import { router } from "./router.ts";
import { CREATE } from "./tables.ts";

class Prepared<A extends string[]> implements PreparedStatement<A> {
  private columns;
  private statement;
  private variables: (null | number | bigint | string)[] = [];
  constructor(columns: A, statement: StatementSync) {
    this.columns = columns;
    this.statement = statement;
  }
  bind(...variables: (null | number | bigint | string)[]) {
    this.variables.push(...variables);
    return this;
  }
  run<A>() {
    return Promise.resolve(this.statement.run() as A);
  }
  raw(
    options?: { columnNames?: boolean },
  ): ReturnType<PreparedStatement<A>["raw"]> {
    const all = this.statement.all(...this.variables);
    const rows = Array(all.length);
    for (let row, z = 0, y; z < all.length; ++z) {
      row = all[z], rows[z] = Array(this.columns.length);
      for (y = 0; y < this.columns.length; ++y) {
        rows[z][y] = row[this.columns[y]];
      }
    }
    if (options?.columnNames) rows.unshift(this.columns);
    return Promise.resolve<any>(rows);
  }
}
export class Sqlite implements Database {
  private database;
  constructor(path: string | URL) {
    this.database = new DatabaseSync(path);
  }
  prepare<A extends string[]>(query: string, columns?: string[]) {
    console.log(this.database.prepare(query));
    return new Prepared<A>((columns ?? []) as A, this.database.prepare(query));
  }
  exec(query: string) {
    const time = Date.now();
    const result = this.database.prepare(query).run();
    return Promise.resolve({
      count: Number(result.changes),
      duration: Date.now() - time,
    });
  }
}

const local = new Sqlite(":memory:");
await local.exec(CREATE.join("\n\n"));
export default {
  fetch: (request) => router.fetch(request, { DB: local }),
} satisfies Deno.ServeDefaultExport;
