export interface PreparedStatement {
  bind: (...use: (null | number | bigint | string)[]) => PreparedStatement;
  run: <B>() => Promise<B>;
}
export interface Database {
  prepare: (query: string) => PreparedStatement;
  exec: (query: string) => Promise<{ count: number; duration: number }>;
  batch: (statements: PreparedStatement[]) => Promise<void>;
}
export interface Env {
  DB: Database;
}
