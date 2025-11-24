import { arr, type Data, obj, type Type } from "@libn/json/schema";
import { compile, parse } from "@libn/json/check";
import { error, Router } from "@libn/router";
import type { Env } from "./env.ts";
import { insert, select } from "./queries.ts";
import { PERSON } from "./tables.ts";

const person = obj(PERSON.properties, { required: ["name", "info"] });
const body = async <A extends Type, B>(
  schema: A,
  request: Request,
  use: ($: Data<A>) => B,
): Promise<Awaited<B> | Response> => {
  const result = parse(compile(schema), await request.json());
  if (result.state) return await use(result.value);
  return error(Error("Invalid body", { cause: result.value }), 400);
};
export default new Router<[Env]>()
  .route(
    "POST /v1/person",
    async ({ request }, { DB }) =>
      body(arr(person), request, async ($) => {
        const queries = await Promise.all($.map((person) => {
          const query = insert("person", person);
          return DB.prepare(query.sql).bind(...query.args).run();
        }));
        return Response.json(queries);
      }),
  )
  .route(
    "PUT /v1/person",
    ({ request }, { DB }) =>
      body(person, request, async ($) => {
        const query = insert("person", $);
        return Response.json(
          await DB.prepare(query.sql).bind(...query.args).run(),
        );
      }),
  )
  .route("GET /v1/person", async ({ request }, { DB }) => {
    return Response.json(
      await DB.prepare(
        select("person", { id: true, name: true, info: true, note: true }),
      ).raw(),
    );
  })
  .route("GET /v1/person/#id", async ({ path }, { DB }) => {
    const id = +path.id;
    if (isNaN(id)) return error(Error("Invalid ID", { cause: path.id }), 400);
    return Response.json(
      await DB.prepare(
        `${
          select("person", { name: true, info: true, note: true })
        } WHERE person.id = ?;`,
      ).bind(id).raw(),
    );
  });
