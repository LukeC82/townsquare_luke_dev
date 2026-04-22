/**
 * Derives the effective alignment of a player.
 *
 * Explicit player.alignment takes precedence over role.team.
 * Returns "good", "evil", or null (traveler / no role assigned).
 *
 * @param {{ alignment: string|null, role: { team: string }|null }} player
 * @returns {"good"|"evil"|null}
 */
export function effectiveAlignment(player) {
  if (player.alignment) return player.alignment;
  if (!player.role || !player.role.team) return null;
  if (["townsfolk", "outsider"].includes(player.role.team)) return "good";
  if (["minion", "demon"].includes(player.role.team)) return "evil";
  return null;
}
