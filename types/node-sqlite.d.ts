// Minimal ambient types for Node's built-in `node:sqlite` module.
// Node 23 ships node:sqlite as an experimental API; @types/node@20 in this
// project predates these typings, so we declare only the surface we use.
declare module 'node:sqlite' {
  export interface StatementSync {
    run(...anonymousParameters: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...anonymousParameters: unknown[]): unknown;
    all(...anonymousParameters: unknown[]): unknown[];
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
    allowExtension?: boolean;
  }

  export interface DatabaseSync {
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export const DatabaseSync: new (path: string, options?: DatabaseSyncOptions) => DatabaseSync;
}
