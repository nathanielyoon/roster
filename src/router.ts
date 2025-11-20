import { obj } from "@libn/json/build";
import { compile, parse } from "@libn/json/check";
import { safe } from "@libn/result";
import { Router } from "@libn/router";
import type { Json } from "@libn/types";
import type { Env } from "./env.ts";
import { insert, select } from "./queries.ts";
import { PERSON } from "./tables.ts";

const person = compile(obj(PERSON.properties, { required: ["name", "info"] }));
const json = safe(<A = Json>($: Request) => $.json() as Promise<A>);

const router = new Router<[Env]>();
router.route("PUT", "/v1/person", async ({ req, res }, { DB }) => {
  const a = await json(req);
  if (!a.state) return res.error(a.value);
  const b = parse(person, a.value);
  if (!b.state) return res.error(Error("Invalid body", { cause: b.value }));
  const c = insert("person", b.value);
  return res.json(await DB.prepare(c.sql).bind(...c.replace).run());
});
router.route("GET", "/v1/person/?id", async ({ path, res }, { DB }) => {
  const id = +path.id;
  if (isNaN(id)) return res.error(Error("Invalid ID", { cause: path.id }));
  return res.json(
    await DB.prepare(
      `${
        select("person", { name: true, info: true, note: true })
      } WHERE person.id = ?;`,
    ).bind(id).raw(),
  );
});
export default router;
