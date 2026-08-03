export function selectRolltemplateCaptureRect({ template, sidecar, clip }) {
  const layoutRect = normalizeRect(template?.rect);
  if (!layoutRect || !hasArea(clip)) return null;

  const paintCandidates = [
    ['template.templatePaintBounds', template?.templatePaintBounds],
    ['template.paintBounds', template?.paintBounds],
    ['sidecar.templatePaintBounds', sidecar?.templatePaintBounds],
  ];

  for (const [source, candidate] of paintCandidates) {
    const rect = normalizeRect(candidate);
    if (rect && rectIntersectsClip(rect, clip)) {
      return { rect, layoutRect, rectSource: source };
    }
  }

  if (!rectIntersectsClip(layoutRect, clip)) return null;
  return { rect: layoutRect, layoutRect, rectSource: 'template.rect' };
}

export function normalizeRect(rect) {
  if (!hasArea(rect)) return null;
  const x = Number(rect.x ?? rect.left ?? 0);
  const y = Number(rect.y ?? rect.top ?? 0);
  const width = Number(rect.width);
  const height = Number(rect.height);
  return {
    ...rect,
    x,
    y,
    left: Number(rect.left ?? x),
    top: Number(rect.top ?? y),
    width,
    height,
    right: Number(rect.right ?? x + width),
    bottom: Number(rect.bottom ?? y + height),
  };
}

function hasArea(rect) {
  return Number(rect?.width) > 0 && Number(rect?.height) > 0;
}

function rectIntersectsClip(rect, clip) {
  if (!hasArea(rect) || !hasArea(clip)) return false;
  const normalizedRect = normalizeRect(rect);
  const normalizedClip = normalizeRect(clip);
  return normalizedRect.right > normalizedClip.left
    && normalizedRect.left < normalizedClip.right
    && normalizedRect.bottom > normalizedClip.top
    && normalizedRect.top < normalizedClip.bottom;
}
