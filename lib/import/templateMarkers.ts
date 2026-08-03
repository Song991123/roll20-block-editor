export type TemplateMarkerKind = 'jinja' | 'erb' | 'handlebars-structure';

export interface TemplateMarkerSummary {
  count: number;
  kinds: TemplateMarkerKind[];
}

const MARKER_PATTERNS: Array<{ kind: TemplateMarkerKind; pattern: RegExp }> = [
  // These are high-confidence build-template directives, not ordinary text.
  { kind: 'jinja', pattern: /\{%[\s\S]*?%\}|\{#[\s\S]*?#\}/g },
  { kind: 'erb', pattern: /<%[\s\S]*?%>/g },
  { kind: 'handlebars-structure', pattern: /\{\{\s*[#/>!]\s*[\s\S]*?\}\}/g },
];

const ROLLTEMPLATE_BLOCK_PATTERN = /<rolltemplate\b[^>]*>[\s\S]*?<\/rolltemplate\s*>/gi;

/** Detect unexpanded build-template syntax without retaining source snippets. */
export function detectTemplateMarkers(source: string): TemplateMarkerSummary {
  const text = String(source ?? '');
  // Roll20 result cards intentionally use Handlebars-like section helpers.
  // Exclude complete Rolltemplate definitions only from that detector while
  // still checking their contents for unrelated Jinja or ERB build syntax.
  const handlebarsScanText = text.replace(ROLLTEMPLATE_BLOCK_PATTERN, '');
  let count = 0;
  const kinds = new Set<TemplateMarkerKind>();
  for (const marker of MARKER_PATTERNS) {
    marker.pattern.lastIndex = 0;
    const scanText = marker.kind === 'handlebars-structure' ? handlebarsScanText : text;
    const matches = scanText.match(marker.pattern);
    if (!matches?.length) continue;
    count += matches.length;
    kinds.add(marker.kind);
  }
  return { count, kinds: Array.from(kinds) };
}
