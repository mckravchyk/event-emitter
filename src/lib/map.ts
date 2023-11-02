/**
 * Deletes all map entries.
 */
export function deleteAll(map: Map<unknown, unknown>): void {
  for (const key of Array.from(map.keys())) {
    map.delete(key);
  }
}
