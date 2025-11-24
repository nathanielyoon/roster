import { arr, obj, type Type } from "@libn/json/schema";
import { compile, parse } from "@libn/json/check";
import { Router } from "@libn/router";
import type { Database, Env } from "./env.ts";
import { insert, select, type Statement, transact } from "./queries.ts";
import { PERSON } from "./tables.ts";
import { exec, safe } from "@libn/result";

const person = obj(PERSON.properties, { required: ["name", "info"] });
const body = safe(async <A extends Type>(type: A, request: Request) => {
  const result = parse(compile(type), await request.json());
  if (result.state) return result.value;
  throw Error("Invalid body", { cause: result.value });
});
const run = safe(<A>(db: Database, query: Statement) =>
  db.prepare(query.sql).bind(...query.args).run<A>()
);
export default new Router<[Env]>().route(
  "POST /v1/person",
  exec(async function* ({ request }, { DB }) {
    const rows = yield* await body(arr(person), request);
    const query = transact(rows.map(($) => insert("person", $)));
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "GET /v1/person/#id",
  exec(async function* ({ path }, { DB }) {
    const query = select("person", {
      id: true,
      created: true,
      updated: true,
      name: true,
      info: true,
      note: true,
    });
    const result = yield* await run(DB, {
      sql: `${query} WHERE person.id = ?;`,
      args: [path.id],
    });
    return Response.json(result);
  }),
).route(
  "PUT /v1/person",
  exec(async function* ({ request }, { DB }) {
    const row = yield* await body(person, request);
    const query = insert("person", row);
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "DELETE /v1/person/#id",
  exec(async function* ({ path }, { DB }) {
    const result = yield* await run(DB, {
      sql: "DELETE FROM person WHERE person.id = ?;",
      args: [path.id],
    });
    return Response.json(result);
  }),
);
