export function inspectCurrentChatMetrics(domEvidence, { requireTextMeasure = false } = {}) {
  if (!domEvidence) {
    return {
      ok: false,
      status: 'MISSING_SIDECAR',
      missing: ['roll20-chat-dom-evidence.json'],
      note: 'Roll20 chat DOM sidecar is missing; current renderer metrics cannot be checked',
    };
  }

  const template = domEvidence.latestTemplate
    ?? [...(domEvidence.rolltemplates ?? [])].reverse().find((item) => item?.rect?.width)
    ?? null;
  const table = findTemplateChild(template, 'table');
  const tableStructure = synthesizeTableStructure(template, table);
  const tableApplicable = Boolean(
    table
    || tableStructure?.table
    || /<table\b/i.test(String(template?.htmlSnippet ?? '')),
  );
  const textMeasure = objectOrNull(template?.textMeasureEvidence)
    ?? objectOrNull(domEvidence.textMeasureEvidence);
  const textMeasureRecorded = Array.isArray(textMeasure?.samples);
  const textMeasureAvailable = textMeasureRecorded && textMeasure.samples.length > 0;
  const missing = [];

  if (!template?.computedStyle) missing.push('latestTemplate.computedStyle');
  if (!Array.isArray(template?.rowMetrics)) missing.push('latestTemplate.rowMetrics');
  if (template?.computedStyle && !hasTextRasterizationFields(template.computedStyle)) {
    missing.push('latestTemplate.computedStyle.textRasterization');
  }
  if (template?.computedStyle && !hasPaintFilterField(template.computedStyle)) {
    missing.push('latestTemplate.computedStyle.filter');
  }

  if (tableApplicable) {
    if (!tableStructure?.table?.boxMetrics) missing.push('latestTemplate.tableStructure');
    if (!table?.computedStyle) missing.push('table.computedStyle');
    if (!table?.boxMetrics) missing.push('table.boxMetrics');
    if (table?.computedStyle && !hasTextRasterizationFields(table.computedStyle)) {
      missing.push('table.computedStyle.textRasterization');
    }
    if (table?.computedStyle && !hasPaintFilterField(table.computedStyle)) {
      missing.push('table.computedStyle.filter');
    }
  }

  if (!Array.isArray(domEvidence.fontEvidence?.checks)) missing.push('fontEvidence.checks');
  if (requireTextMeasure && !textMeasureRecorded) missing.push('textMeasureEvidence.samples');
  if (!Number(domEvidence.viewportEvidence?.devicePixelRatio)) {
    missing.push('viewportEvidence.devicePixelRatio');
  }

  const ok = missing.length === 0;
  const status = ok
    ? (textMeasureAvailable ? 'PRESENT' : 'PRESENT_WITH_TEXT_MEASURE_UNAVAILABLE')
    : 'MISSING_CURRENT_METRICS';
  const tableStructureSource = !tableApplicable
    ? 'not-applicable'
    : template?.tableStructure?.table?.boxMetrics
      ? 'latestTemplate.tableStructure'
      : tableStructure?.table?.boxMetrics
        ? 'legacy-computedChildren'
        : '';
  const unavailableNote = textMeasureRecorded && !textMeasureAvailable
    ? ` Text measurement was recorded as ${textMeasure?.status ?? 'unavailable'}; computed styles and font checks remain available.`
    : '';

  return {
    ok,
    status,
    missing,
    templateClass: template?.className ?? '',
    tableApplicable,
    tableStructureSource,
    textMeasureStatus: textMeasure?.status ?? (textMeasureRecorded ? 'RECORDED' : 'MISSING'),
    note: missing.length
      ? `Roll20 chat DOM sidecar is missing current renderer fields: ${missing.join(', ')}`
      : tableApplicable
        ? `Roll20 chat DOM sidecar includes current table-aware renderer metrics.${unavailableNote}`
        : `Roll20 chat DOM sidecar includes current non-table renderer metrics; table fields are not applicable.${unavailableNote}`,
  };
}

function objectOrNull(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function hasTextRasterizationFields(style) {
  return Object.prototype.hasOwnProperty.call(style, 'textRendering')
    && Object.prototype.hasOwnProperty.call(style, 'webkitFontSmoothing')
    && Object.prototype.hasOwnProperty.call(style, 'mozOsxFontSmoothing');
}

function hasPaintFilterField(style) {
  return Object.prototype.hasOwnProperty.call(style, 'filter');
}

export function findTemplateChild(template, selector) {
  const rawChildren = template?.computedChildren ?? template?.elements ?? [];
  const children = Array.isArray(rawChildren)
    ? rawChildren
    : rawChildren && typeof rawChildren === 'object'
      ? Object.values(rawChildren)
      : [];
  return children.find((child) => child?.selector === selector) ?? null;
}

function synthesizeTableStructure(template, table = findTemplateChild(template, 'table')) {
  if (template?.tableStructure?.table?.boxMetrics) return template.tableStructure;
  if (!table?.boxMetrics) return null;
  const text = String(table.text ?? template?.text ?? '').replace(/\s+/g, ' ').trim();
  const tokens = text.split(/\s+/).filter(Boolean);
  const longestToken = tokens.reduce((best, token) => token.length > best.length ? token : best, '');
  return {
    source: 'legacy-computedChildren',
    table,
    textProfile: {
      textLength: text.length,
      tokenCount: tokens.length,
      longestToken: longestToken.slice(0, 120),
      longestTokenLength: longestToken.length,
    },
    columnGroups: [],
    columns: [],
    rows: Array.isArray(template?.rowMetrics) ? template.rowMetrics : [],
  };
}
