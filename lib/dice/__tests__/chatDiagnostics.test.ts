import assert from 'node:assert/strict';
import {
  canEnableChatDiagnostics,
  CHAT_DIAGNOSTICS_STORAGE_KEY,
} from '../chatDiagnostics';

assert.equal(CHAT_DIAGNOSTICS_STORAGE_KEY, '__r20ChatDiagnostics');
assert.equal(canEnableChatDiagnostics('production', '1'), false);
assert.equal(canEnableChatDiagnostics('development', '1'), true);
assert.equal(canEnableChatDiagnostics('test', '1'), true);
assert.equal(canEnableChatDiagnostics('development', null), false);
assert.equal(canEnableChatDiagnostics('development', '0'), false);

console.log('chat diagnostics policy test PASS');
