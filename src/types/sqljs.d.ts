declare module "sql.js" {
  export type BindValue = string | number | Uint8Array | null;

  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  export interface Statement {
    bind(values?: BindValue[] | Record<string, BindValue>): void;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    run(values?: BindValue[] | Record<string, BindValue>): void;
    free(): void;
  }

  export interface Database {
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}
