export interface PreparedStatement<A extends string[]> {
  bind: (...use: (null | number | bigint | string)[]) => PreparedStatement<A>;
  run: <B>() => Promise<B>;
  raw: {
    <B extends unknown[]>(): Promise<B[]>;
    <B extends unknown[]>(options: { columnNames: true }): Promise<[A, ...B[]]>;
  };
}
export interface Database {
  prepare: <A extends string[] = []>(
    query: string,
    columns?: never,
  ) => PreparedStatement<A>;
  exec: (query: string) => Promise<{ count: number; duration: number }>;
}
export interface Env {
  DB: Database;
}
