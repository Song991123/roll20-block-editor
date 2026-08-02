import assert from 'node:assert/strict';
import {
  useWorkspaceStore,
  WORKSPACE_KEYS,
  type WorkspaceKey,
} from '../workspaceStore';

const seededVersions: Record<WorkspaceKey, number> = {
  html: 7,
  css: 11,
  i18n: 13,
  js: 17,
  worker: 19,
};

useWorkspaceStore.setState((state) => ({
  workspaces: Object.fromEntries(
    WORKSPACE_KEYS.map((key) => [
      key,
      {
        ...state.workspaces[key],
        structureVersion: seededVersions[key],
        blockCount: 3,
        dirty: true,
      },
    ]),
  ) as typeof state.workspaces,
}));

useWorkspaceStore.getState().clearAll();

for (const key of WORKSPACE_KEYS) {
  const workspace = useWorkspaceStore.getState().workspaces[key];
  assert.equal(
    workspace.structureVersion,
    seededVersions[key] + 1,
    `${key} clear must advance the cache identity`,
  );
  assert.equal(workspace.blockCount, 0, `${key} clear must reset the block count`);
}

const cssVersionAfterClear = useWorkspaceStore.getState().workspaces.css.structureVersion;
useWorkspaceStore.getState().resetWorkspace('css');
assert.equal(
  useWorkspaceStore.getState().workspaces.css.structureVersion,
  cssVersionAfterClear + 1,
  'single-workspace reset must advance the cache identity',
);

console.log('WORKSPACE GENERATION TEST PASS');
