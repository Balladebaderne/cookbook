// Shared data-layer query helpers.

// Find a row by its unique `name` in `table`, inserting it if absent.
// Returns the row id. `name` is expected to be already validated/trimmed by
// the caller. `table` is an internal constant ("ingredients" / "tags"), never
// user input.
export async function findOrCreateByName(conn, table, name) {
  const existing = await conn.prepare(`SELECT id FROM ${table} WHERE name = ?`).get(name);
  if (existing) return existing.id;
  const created = await conn.prepare(`INSERT INTO ${table} (name) VALUES (?)`).run(name);
  return created.lastInsertRowid;
}

// Group rows into an object keyed by row[key]: { [value]: row[] }.
export function groupBy(rows, key) {
  const out = {};
  for (const row of rows) (out[row[key]] ??= []).push(row);
  return out;
}
