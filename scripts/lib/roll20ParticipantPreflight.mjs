/**
 * Pure parser shared by the read-only room preflight and upload guard.
 * Keep this independent from CDP so the safety rule can be self-tested in CI.
 */

export function parseParticipantCounts(bodyText) {
  const lines = String(bodyText ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const matches = [];
  for (const line of lines) {
    // Roll20 currently exposes a compact line such as "- generic: 1 구성원".
    // Keep the parser narrow so unrelated numbers are ignored.
    const match = line.match(/(?:^|\s)(\d+)\s+(구성원|members?|participants?)\s*$/i);
    if (!match) continue;
    matches.push({ line, count: Number(match[1]) });
  }
  const counts = matches.map((match) => match.count);
  let status = 'BLOCKED_UNKNOWN';
  if (counts.length === 1 && counts[0] === 1) status = 'PASS_SOLO';
  else if (counts.some((count) => count !== 1)) status = 'BLOCKED_NOT_SOLO';
  else if (counts.length > 1) status = 'BLOCKED_AMBIGUOUS';
  return { status, counts, lines: matches.map((match) => match.line) };
}
