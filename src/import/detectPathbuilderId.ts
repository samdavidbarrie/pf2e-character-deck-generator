/**
 * Returns true when the input looks like a Pathbuilder JSON ID
 * (a string of one or more digits, optionally surrounded by whitespace).
 */
export function isPathbuilderId(input: string): boolean {
  return /^\d+$/.test(input.trim());
}
