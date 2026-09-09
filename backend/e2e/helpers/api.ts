import type { APIRequestContext } from "@playwright/test";

export type Engine = "postgres" | "mysql" | "sqlite";

export function postQuery(request: APIRequestContext, engine: Engine, sql: string, confirm?: boolean) {
  return request.post(`/sql-console-api/${engine}/query`, { data: { sql, confirm } });
}

export function postSiteQuery(request: APIRequestContext, siteId: string, sql: string, confirm?: boolean) {
  return request.post(`/sql-console-api/sites/${siteId}/query`, { data: { sql, confirm } });
}
