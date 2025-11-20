import { DatabaseSync, type StatementSync } from "node:sqlite";
import type { Database, PreparedStatement } from "./env.ts";
import { router } from "./router.ts";
import { CREATE } from "./tables.ts";

class Prepared<A extends string[]> implements PreparedStatement<A> {
  private statement;
  private variables: (null | number | bigint | string)[] = [];
  constructor(statement: StatementSync) {
    this.statement = statement;
  }
  bind(...variables: (null | number | bigint | string)[]) {
    this.variables.push(...variables);
    return this;
  }
  run<A>() {
    return Promise.resolve(this.statement.run(...this.variables) as A);
  }
  raw(): ReturnType<PreparedStatement<A>["raw"]> {
    return Promise.resolve<any>(
      this.statement.all(...this.variables).map(($) => Object.values($)),
    );
  }
}
export class Sqlite implements Database {
  private database;
  constructor(path: string | URL) {
    this.database = new DatabaseSync(path);
    this.database.exec(CREATE.join("\n\n"));
  }
  prepare<A extends string[]>(query: string) {
    return new Prepared<A>(this.database.prepare(query));
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
export default {
  fetch: (request) => router.fetch(request, { DB: local }),
} satisfies Deno.ServeDefaultExport;
