/**
 * Returns true when the input looks like a Pathbuilder JSON ID
 * (a string of one or more digits, optionally surrounded by whitespace).
 */
export function isPathbuilderId(input: string): boolean {
  return /^\d+$/.test(input.trim());
}

/**
 * Returns true when the input looks like a Pathbuilder build link ID:
 * exactly 7 digits. Build link IDs are used in sharing URLs
 * (pathbuilder2e.com/launch.html?buildjson=…) and cannot be used
 * with the JSON export endpoint. Users should use the JSON Export
 * function inside Pathbuilder instead.
 */
export function looksLikeBuildLinkId(input: string): boolean {
  return /^\d{7}$/.test(input.trim());
}
