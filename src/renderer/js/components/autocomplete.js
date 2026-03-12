/**
 * Returns true if all characters of `query` appear in order (subsequence)
 * within `str` (case-insensitive).
 */
function isSubsequence(str, query) {
  str = str.toLowerCase();
  query = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < str.length && qi < query.length; i++) {
    if (str[i] === query[qi]) qi++;
  }
  return qi === query.length;
}

/**
 * Filter items whose `name` field fuzzy-matches `query`.
 * Items that start with the query rank first; subsequence matches follow.
 *
 * @param {Array<{id: number, name: string}>} items
 * @param {string} query
 * @param {number} limit
 * @returns {Array<{id: number, name: string}>}
 */
export function fuzzySearch(items, query, limit = 8) {
  if (!query.trim()) return items.slice(0, limit);

  const q = query.toLowerCase();
  const starts = [];
  const rest = [];

  for (const item of items) {
    const name = (item.name || '').toLowerCase();
    if (name.startsWith(q)) {
      starts.push(item);
    } else if (isSubsequence(name, q)) {
      rest.push(item);
    }
  }

  return [...starts, ...rest].slice(0, limit);
}
