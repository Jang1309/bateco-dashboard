import sql from "mssql"

function env(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback
  if (v == null || v === "") {
    throw new Error(`Missing env ${name}`)
  }
  return v.replace(/^["']|["']$/g, "")
}

function config(): sql.config {
  return {
    server: env("SQLSERVER_HOST"),
    port: Number(env("SQLSERVER_PORT", "1433")),
    database: env("SQLSERVER_DATABASE"),
    user: env("SQLSERVER_USER"),
    password: env("SQLSERVER_PASSWORD"),
    options: {
      encrypt: env("SQLSERVER_ENCRYPT", "true") === "true",
      trustServerCertificate: env("SQLSERVER_TRUST_CERT", "true") === "true",
    },
    connectionTimeout: Number(env("SQLSERVER_CONNECTION_TIMEOUT", "15000")),
    requestTimeout: Number(env("SQLSERVER_REQUEST_TIMEOUT", "30000")),
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __batecoSqlPool: sql.ConnectionPool | undefined
}

export async function getSqlPool() {
  if (globalThis.__batecoSqlPool?.connected) {
    return globalThis.__batecoSqlPool
  }

  const pool = await new sql.ConnectionPool(config()).connect()
  globalThis.__batecoSqlPool = pool
  return pool
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  inputs?: Record<string, unknown>
) {
  const pool = await getSqlPool()
  const request = pool.request()
  if (inputs) {
    for (const [key, value] of Object.entries(inputs)) {
      request.input(key, value as string | number | boolean | Date | Buffer | null)
    }
  }
  return request.query<T>(text)
}

export { sql }
