import { DatabaseSync, type StatementSync } from "node:sqlite";
import type { Database, PreparedStatement } from "./env.ts";
import router from "./router.ts";
import { CREATE } from "./tables.ts";

class Prepared implements PreparedStatement {
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
}
export class Sqlite implements Database {
  private database;
  constructor(path: string | URL) {
    this.database = new DatabaseSync(path);
    this.database.exec(CREATE.join("\n\n"));
  }
  prepare(query: string) {
    return new Prepared(this.database.prepare(query));
  }
  exec(query: string) {
    const time = Date.now();
    const result = this.database.prepare(query).run();
    return Promise.resolve({
      count: Number(result.changes),
      duration: Date.now() - time,
    });
  }
  async batch(statements: PreparedStatement[]) {
    const a = {
      sql: `BEGIN;
${statements.map(($) => $.sql.replace(/(?<!;)$/, ";")).join("\n")}
END;`,
      args: statements.flatMap(($) => $.args),
    };
  }
}

const local = new Sqlite(":memory:");
export default {
  fetch: (request) => router.fetch(request, { DB: local }),
} satisfies Deno.ServeDefaultExport;
