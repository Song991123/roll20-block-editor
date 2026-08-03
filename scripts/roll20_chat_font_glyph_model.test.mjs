import assert from 'node:assert/strict';
import { decideGlyphModel } from './roll20_chat_font_glyph_model.mjs';

const evidence = {
  widthDeltas: { root: 0, table: null, firstCell: null },
  fontSignals: {
    fontAvailabilityChanged: false,
    tableFontFamilyChanged: false,
    rootFontFamilyChanged: false,
  },
  textMeasureSignals: { missing: true, status: 'MISSING' },
  textWidthModel: { decision: 'TEXT_WIDTH_MODEL_MISSING' },
  rowGlyphMetrics: { meanAbsRowPxPerCharDelta: null },
  candidateEvidence: { fontCandidatesRejected: false },
  intrinsicFixture: { intrinsicDecision: 'INTRINSIC_CONSTRAINT_MODEL_REQUIRED' },
};

assert.equal(
  decideGlyphModel({ ...evidence, tableApplicable: false }),
  'GLYPH_MODEL_SECONDARY_OR_ACCEPTABLE',
);
assert.equal(
  decideGlyphModel({ ...evidence, tableApplicable: true }),
  'TEXT_MEASURE_RECAPTURE_REQUIRED',
);

console.log('roll20_chat_font_glyph_model test PASS');
