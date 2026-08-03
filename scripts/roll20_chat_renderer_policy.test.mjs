import assert from 'node:assert/strict';
import { buildPolicy } from './roll20_chat_renderer_policy.mjs';

const baseInput = {
  runDir: 'self-test',
  chatParity: {
    fixtures: [
      {
        fixtureId: 'fixture-A',
        status: 'DIFFED',
        bestAlignedMismatchRatio: 0.09,
        mismatchPct: '9.5%',
        actualChatCss: { classification: 'EXPECTED_RULE_PRESENT' },
      },
      { fixtureId: 'fixture-B', status: 'NOT_APPLICABLE' },
    ],
  },
  chatStyle: {
    fixtures: [
      { id: 'fixture-A', status: 'COMPARED', findings: [], rootDelta: { width: 0 } },
      { id: 'fixture-B', status: 'MISSING', findings: [] },
    ],
  },
  chatCandidates: { candidates: [{ name: 'default', status: 'OK' }] },
  chatCandidateStyleProof: null,
};

const lowMismatch = buildPolicy(baseInput);
assert.equal(lowMismatch.summary.fixtures, 1);
assert.equal(lowMismatch.summary.compared, 1);
assert.equal(lowMismatch.summary.highMismatch, 0);
assert.equal(lowMismatch.policy.globalDecision, 'READY_FOR_REVIEW_NOT_AUTOMATIC');
assert.deepEqual(lowMismatch.policy.globalBlockers, []);
assert.deepEqual(lowMismatch.fixtures.map((fixture) => fixture.fixtureId), ['fixture-A']);

const highMismatch = buildPolicy({
  ...baseInput,
  chatParity: {
    fixtures: [
      {
        ...baseInput.chatParity.fixtures[0],
        bestAlignedMismatchRatio: 0.11,
      },
    ],
  },
});
assert.equal(highMismatch.summary.highMismatch, 1);
assert.equal(highMismatch.policy.globalDecision, 'HOLD_GLOBAL_CHAT_RENDERER_PATCH');
assert.ok(highMismatch.policy.globalBlockers.some((blocker) => blocker.includes('no chat renderer candidate')));

console.log('roll20_chat_renderer_policy test PASS');
