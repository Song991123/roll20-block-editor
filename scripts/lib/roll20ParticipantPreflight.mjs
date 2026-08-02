/**
 * Pure participant-evidence helpers shared by the read-only room preflight
 * and upload guard. Keep these independent from CDP so CI can exercise the
 * fail-closed policy without a browser.
 */

export function parseParticipantCounts(bodyText) {
  const lines = String(bodyText ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const matches = [];
  for (const line of lines) {
    // Roll20 may expose a compact localized member-count line. Keep this
    // narrow so unrelated room numbers and dates are ignored.
    const match = line.match(/(?:^|\s)(\d+)\s+(?:구성원|members?|participants?)\s*$/i);
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

export function classifyParticipantEvidence({ participantText, playerZoneVisible, visiblePlayerCards }) {
  const countEvidence = parseParticipantCounts(participantText);
  const cardCount = playerZoneVisible && Number.isInteger(visiblePlayerCards) && visiblePlayerCards >= 0
    ? visiblePlayerCards
    : null;

  if (countEvidence.counts.length > 0) {
    if (cardCount !== null && countEvidence.counts.some((count) => count !== cardCount)) {
      return {
        status: 'BLOCKED_AMBIGUOUS',
        counts: [...countEvidence.counts, cardCount],
        lines: countEvidence.lines,
        source: 'member-count-and-visible-player-cards',
      };
    }
    return { ...countEvidence, source: 'visible-member-count' };
  }

  if (cardCount === null) {
    return { status: 'BLOCKED_UNKNOWN', counts: [], lines: [], source: 'none' };
  }
  return {
    status: cardCount === 1 ? 'PASS_SOLO' : 'BLOCKED_NOT_SOLO',
    counts: [cardCount],
    lines: [],
    source: 'visible-player-cards',
  };
}
