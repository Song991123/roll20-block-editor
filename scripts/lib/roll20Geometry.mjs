/**
 * Keep Roll20 wrapper geometry separate from the authored sheet canvas.
 * Values are CSS pixels and every child layer is expressed relative to its
 * immediate parent when both rectangles provide an origin.
 */

const LAYERS = ['iframe', 'dialog', 'form', 'root', 'content'];

export function normalizeRoll20Geometry(input = {}) {
  const viewport = normalizeRect(input.viewport);
  const iframe = normalizeRect(input.iframeRect ?? input.iframe) ??
    (viewport ? { x: 0, y: 0, width: viewport.width, height: viewport.height, synthetic: true } : null);
  const dialog = normalizeRect(input.dialogRect ?? input.dialog);
  const form = normalizeRect(input.formRect ?? input.form ?? input.sheetform);
  const root = normalizeRect(input.rootRect ?? input.sheetRoot ?? input.root);
  const contentSource = input.contentRect ?? input.sheetCanvas ?? input.contentBox ?? input.content;
  const content = normalizeContentRect(contentSource, root, input.rootStyle ?? input.style);
  const rects = { iframe, dialog, form, root, content };
  const layers = {};

  for (const [index, layerName] of LAYERS.entries()) {
    const rect = rects[layerName];
    const parentName = LAYERS[index - 1];
    const parent = parentName ? rects[parentName] : null;
    layers[layerName] = {
      rect: rect ? withoutSynthetic(rect) : null,
      relativeTo: parentName ?? null,
      relativeRect: rect && parent ? relativeRect(rect, parent) : null,
      available: Boolean(rect),
    };
  }

  const outerRoot = root ? { width: root.width, height: root.height } : null;
  const authoredCanvas = content ? { width: content.width, height: content.height } : null;
  return {
    schema: 'roll20-geometry/v1',
    coordinateSpace: 'css-px,parent-relative',
    viewport: viewport ? withoutSynthetic(viewport) : null,
    layers,
    outerRoot,
    authoredCanvas,
    availability: Object.fromEntries(LAYERS.map((name) => [name, Boolean(rects[name])])),
  };
}

export function compareRoll20Geometry(localInput, actualInput, { tolerance = 1 } = {}) {
  const local = localInput?.schema === 'roll20-geometry/v1'
    ? localInput
    : normalizeRoll20Geometry(localInput);
  const actual = actualInput?.schema === 'roll20-geometry/v1'
    ? actualInput
    : normalizeRoll20Geometry(actualInput);

  const authoredCanvas = compareDimensions(local.authoredCanvas, actual.authoredCanvas, tolerance);
  const outerRoot = compareDimensions(local.outerRoot, actual.outerRoot, tolerance);
  const chain = {};
  for (const layer of ['dialog', 'form', 'root', 'content']) {
    chain[layer] = compareRects(
      local.layers?.[layer]?.relativeRect,
      actual.layers?.[layer]?.relativeRect,
      tolerance,
    );
  }

  const allChecks = [authoredCanvas, outerRoot, ...Object.values(chain)];
  const hasFailure = allChecks.some((item) => item.status === 'FAIL');
  const hasContextDelta = outerRoot.status === 'FAIL' || Object.values(chain)
    .some((item) => item.status === 'FAIL');
  const hasMissingEvidence = allChecks.some((item) => item.status === 'NOT_COMPARABLE');
  const status = authoredCanvas.status === 'FAIL'
    ? 'FAIL'
    : hasContextDelta
      ? 'PASS_WITH_CONTEXT_DELTA'
      : hasMissingEvidence
        ? 'HOLD'
        : hasFailure
          ? 'FAIL'
          : 'PASS';

  return {
    schema: 'roll20-geometry-comparison/v1',
    status,
    promotable: status === 'PASS',
    local,
    actual,
    authoredCanvas,
    outerRoot,
    chain,
    notes: buildNotes({ status, authoredCanvas, outerRoot, chain }),
  };
}

function normalizeContentRect(source, root, style) {
  const explicit = normalizeRect(source);
  if (explicit) return explicit;
  if (!root) return null;
  const padding = boxEdges(style?.padding, {
    top: style?.paddingTop,
    right: style?.paddingRight,
    bottom: style?.paddingBottom,
    left: style?.paddingLeft,
  });
  const border = boxEdges(style?.borderWidth, {
    top: style?.borderTopWidth,
    right: style?.borderRightWidth,
    bottom: style?.borderBottomWidth,
    left: style?.borderLeftWidth,
  });
  return {
    x: Number.isFinite(root.x) ? root.x + padding.left + border.left : null,
    y: Number.isFinite(root.y) ? root.y + padding.top + border.top : null,
    width: Math.max(0, root.width - padding.left - padding.right - border.left - border.right),
    height: Math.max(0, root.height - padding.top - padding.bottom - border.top - border.bottom),
  };
}

function normalizeRect(value) {
  if (!value || typeof value !== 'object') return null;
  const width = firstNumber(value.width, value.rectWidth, value.w);
  const height = firstNumber(value.height, value.rectHeight, value.h);
  if (width === null || height === null) return null;
  return {
    x: number(value.x ?? value.left),
    y: number(value.y ?? value.top),
    width,
    height,
    synthetic: value.synthetic === true,
  };
}

function relativeRect(child, parent) {
  return {
    x: finitePair(child.x, parent.x) ? round(child.x - parent.x) : null,
    y: finitePair(child.y, parent.y) ? round(child.y - parent.y) : null,
    width: round(child.width),
    height: round(child.height),
  };
}

function compareDimensions(local, actual, tolerance) {
  if (!local || !actual) return { status: 'NOT_COMPARABLE', local, actual };
  const width = compareNumber(local.width, actual.width, tolerance);
  const height = compareNumber(local.height, actual.height, tolerance);
  return {
    status: width.status === 'FAIL' || height.status === 'FAIL' ? 'FAIL' : 'PASS',
    width,
    height,
  };
}

function compareRects(local, actual, tolerance) {
  if (!local || !actual) return { status: 'NOT_COMPARABLE', local, actual };
  const fields = {
    x: compareNumber(local.x, actual.x, tolerance),
    y: compareNumber(local.y, actual.y, tolerance),
    width: compareNumber(local.width, actual.width, tolerance),
    height: compareNumber(local.height, actual.height, tolerance),
  };
  const comparable = Object.values(fields).filter((item) => item.status !== 'NOT_COMPARABLE');
  return {
    status: comparable.some((item) => item.status === 'FAIL') ? 'FAIL' : comparable.length ? 'PASS' : 'NOT_COMPARABLE',
    ...fields,
  };
}

function compareNumber(local, actual, tolerance) {
  if (!Number.isFinite(local) || !Number.isFinite(actual)) {
    return { status: 'NOT_COMPARABLE', local, actual, delta: null };
  }
  const delta = round(local - actual);
  return { status: Math.abs(delta) <= tolerance ? 'PASS' : 'FAIL', local, actual, delta };
}

function boxEdges(shorthand, explicit = {}) {
  const values = String(shorthand ?? '').trim().split(/\s+/).filter(Boolean).map(parsePixels);
  const [top, right = top, bottom = top, left = right] = values;
  return {
    top: parsePixels(explicit.top) ?? top ?? 0,
    right: parsePixels(explicit.right) ?? right ?? 0,
    bottom: parsePixels(explicit.bottom) ?? bottom ?? 0,
    left: parsePixels(explicit.left) ?? left ?? 0,
  };
}

function parsePixels(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value ?? '').trim().match(/^(-?\d+(?:\.\d+)?)px$/i);
  return match ? Number(match[1]) : null;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(...values) {
  for (const value of values) {
    const parsed = number(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function finitePair(left, right) {
  return Number.isFinite(left) && Number.isFinite(right);
}

function round(value) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

function withoutSynthetic(rect) {
  const { synthetic, ...result } = rect;
  return result;
}

function buildNotes({ status, authoredCanvas, outerRoot, chain }) {
  const notes = [];
  if (status === 'PASS_WITH_CONTEXT_DELTA') {
    notes.push('authored canvas dimensions are comparable but wrapper/context geometry differs');
  }
  if (outerRoot.status === 'FAIL') notes.push('outer root dimensions differ; do not treat wrapper padding as authored sheet width');
  if (chain.root?.status === 'FAIL') notes.push('root-to-form coordinates differ; compare iframe/dialog/form insets before changing sheet CSS');
  if (authoredCanvas.status === 'FAIL') notes.push('authored content canvas dimensions differ');
  if (status === 'HOLD') notes.push('capture the missing parent-relative layer geometry before promoting parity');
  return notes;
}
