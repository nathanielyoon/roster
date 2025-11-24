import { arr, obj, type Type } from "@libn/json/schema";
import { type Check, compile, parse } from "@libn/json/check";
import { Router } from "@libn/router";
import type { Database, Env } from "./env.ts";
import { insert, select, type Statement } from "./queries.ts";
import { COURSE, FAMILY, PERSON, RECORD, SIGNUP } from "./tables.ts";
import { exec, fail, safe, some } from "@libn/result";

const partial = <A extends { [_: string]: Type }>($: { properties: A }) =>
  obj($.properties, {
    required: Object.keys($.properties).filter(($) =>
      !/^(?:id|created|updated)$/.test($)
    ) as (Exclude<keyof A & string, "id" | "created" | "updated" | "note">)[],
  });
const CHECKS = {
  persons: compile(arr(partial(PERSON))),
  person: compile(partial(PERSON)),
  courses: compile(arr(partial(COURSE))),
  course: compile(partial(COURSE)),
  family: compile(partial(FAMILY)),
  signup: compile(partial(SIGNUP)),
  records: compile(arr(partial(RECORD))),
  record: compile(partial(RECORD)),
};
const body = safe(async <A extends Type>(type: Check<A>, request: Request) => {
  const result = parse(type, await request.json());
  if (result.state) return result.value;
  throw Error("Invalid body", { cause: result.value });
});
const run = safe(async <A>(db: Database, query: Statement) =>
  await db.prepare(query.sql).bind(...query.args).run<A>()
);
export default new Router<[Env]>().route(
  "POST /v1/person",
  exec(async function* ({ request }, { DB }) {
    const rows = yield* await body(CHECKS.persons, request);
    const query = insert("person", rows);
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "PUT /v1/person/#id",
  exec(async function* ({ path, request }, { DB }) {
    const row = { ...yield* await body(CHECKS.person, request), id: path.id };
    const query = insert("person", [row]);
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "GET /v1/person/#id",
  exec(async function* ({ path }, { DB }) {
    const id = +path.id;
    const person = yield* await run(DB, {
      sql: `${
        select("person", {
          id: true,
          created: true,
          updated: true,
          note: true,
          name: true,
          info: true,
        })
      } WHERE person.id = ?;`,
      args: [id],
    });
    const lowers = yield* await run(DB, {
      sql: `${
        select("person", { id: true, name: true })
      } INNER JOIN family ON family.upper = ? AND family.lower = person.id;`,
      args: [id],
    });
    const uppers = yield* await run(DB, {
      sql: `${
        select("person", { id: true, name: true })
      } INNER JOIN family ON family.lower = ? AND family.upper = person.id;`,
      args: [id],
    });
    const signups = yield* await run(DB, {
      sql: `${
        select("course", { id: true, name: true })
      } INNER JOIN signup ON signup.person = ? AND signup.course = course.id;`,
      args: [id],
    });
    return Response.json({ person, lowers, uppers, signups });
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
).route(
  "POST /v1/course",
  exec(async function* ({ request }, { DB }) {
    const rows = yield* await body(CHECKS.courses, request);
    const query = insert("course", rows);
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "PUT /v1/course/#id",
  exec(async function* ({ path, request }, { DB }) {
    const row = { ...yield* await body(CHECKS.course, request), id: path.id };
    const query = insert("course", [row]);
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "GET /v1/course/#id",
  exec(async function* ({ path }, { DB }) {
    const id = +path.id;
    const course = yield* await run(DB, {
      sql: `${
        select("course", {
          id: true,
          created: true,
          updated: true,
          note: true,
          name: true,
          info: true,
        })
      } WHERE course.id = ?;`,
      args: [id],
    });
    const signups = yield* await run(DB, {
      sql: `${
        select("person", { id: true, name: true })
      } INNER JOIN signup ON signup.course = ? AND signup.person = person.id;`,
      args: [id],
    });
    return Response.json({ course, signups });
  }),
).route(
  "DELETE /v1/course/#id",
  exec(async function* ({ path }, { DB }) {
    const result = yield* await run(DB, {
      sql: "DELETE FROM course WHERE course.id = ?;",
      args: [path.id],
    });
    return Response.json(result);
  }),
).route(
  "PUT /v1/family/#upper/#lower",
  exec(async function* ({ path }, { DB }) {
    const query = insert("family", [{
      upper: +path.upper,
      lower: +path.lower,
    }]);
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "DELETE /v1/family/#upper/#lower",
  exec(async function* ({ path }, { DB }) {
    const query: Statement = {
      sql: "DELETE FROM family WHERE family.upper = ? AND family.lower = ?;",
      args: [+path.upper, +path.lower],
    };
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "PUT /v1/signup/#course/#person",
  exec(async function* ({ path }, { DB }) {
    const query = insert("signup", [{
      course: +path.course,
      person: +path.person,
    }]);
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "DELETE /v1/signup/#course/#person",
  exec(async function* ({ path }, { DB }) {
    const query: Statement = {
      sql: "DELETE FROM signup WHERE signup.course = ? AND signup.person = ?;",
      args: [+path.course, +path.person],
    };
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "POST /v1/record",
  exec(async function* ({ request }, { DB }) {
    const rows = yield* await body(CHECKS.records, request);
    const query = insert("record", rows);
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "GET /v1/record/#id",
  exec(async function* ({ path, url }, { DB }) {
    const id = url.searchParams.get("by") ?? "";
    if (!/^(?:person|course)$/.test(id)) {
      yield* fail(Error("Invalid search parameter", { cause: id }));
    }
    const query: Statement = {
      sql: `${
        select("record", {
          id: true,
          created: true,
          updated: true,
          note: true,
          signup: true,
          began: true,
          ended: true,
        })
      } INNER JOIN signup WHERE signup.${id} = ? AND signup.id = record.id;`,
      args: [+path.id],
    };
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "PUT /v1/record/#id",
  exec(async function* ({ request, path }, { DB }) {
    const row = { ...yield* await body(CHECKS.record, request), id: path.id };
    const query = insert("record", [row]);
    return Response.json(yield* await run(DB, query));
  }),
).route(
  "DELETE /v1/record/#id",
  exec(async function* ({ path }, { DB }) {
    const query: Statement = {
      sql: "DELETE FROM record WHERE record.id = ?;",
      args: [+path.id],
    };
    return Response.json(yield* await run(DB, query));
  }),
);
