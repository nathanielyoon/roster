import { int, nil, obj, str } from "@libn/json/build";

const DATE = {
  created: str({ format: "date-time" }),
  updated: str({ format: "date-time" }),
};
const META = {
  key: int({ minimum: 0, maximum: 0xffffffff }),
  ...DATE,
  name: str({ minLength: 1, maxLength: 255 }),
  info: str({ pattern: "^\\{.*\\}$" }),
  notes: nil(str()),
};
export const person = obj({
  ...META,
});
export const place = obj({
  ...META,
  address: str(),
  room: str(),
});
export const thing = obj({
  ...META,
});
export const relation = obj({
  ...DATE,
  parent: int(),
  child: int(),
});
export const enrollment = obj({
  ...DATE,
  person: int(),
  course: int(),
});
export const session = obj({
  ...DATE,
  course: int(),
  place: int(),
  start: str({ format: "date-time" }),
  end: str({ format: "date-time" }),
});
export const record = obj({
  ...DATE,
  person: int(),
  session: int(),
});
