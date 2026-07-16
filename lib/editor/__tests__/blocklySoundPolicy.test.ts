import assert from 'node:assert/strict';
import { shouldPlayBlockSnap } from '../blocklySoundPolicy.ts';

assert.equal(
  shouldPlayBlockSnap({ oldParentId: null, newParentId: 'frame', reason: ['drag', 'connect'] }),
  true,
  'a user drag into a parent should play snap feedback',
);

assert.equal(
  shouldPlayBlockSnap({ oldParentId: null, newParentId: 'frame', reason: ['create'] }),
  false,
  'programmatic import/create moves must stay silent',
);

assert.equal(
  shouldPlayBlockSnap({ oldParentId: 'frame', newParentId: 'frame', reason: ['drag'] }),
  false,
  'a drag without a parent change is not a snap',
);

assert.equal(
  shouldPlayBlockSnap({ oldParentId: 'frame', newParentId: null, reason: ['drag', 'disconnect'] }),
  false,
  'disconnecting from a parent should not play the connect sound',
);

console.log('blocklySoundPolicy: PASS');
