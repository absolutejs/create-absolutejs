/**
 * Validates if a database engine is allowed for a given host.
 * Shared validation logic for compatibility testing.
 */
export const hostAllowsEngine = (host: string, engine: string) => {
  if (host === "turso") return engine === "sqlite";
  if (host === "neon") return engine === "postgresql";
  if (host === "planetscale") return engine === "postgresql" || engine === "mysql";

  return true; // 'none' or unknown host allows any engine
};