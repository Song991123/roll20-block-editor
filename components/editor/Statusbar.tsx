'use client';

import { useWorkspaceStore, totalBlockCount, anyDirty } from '@/lib/stores/workspaceStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useUiStore } from '@/lib/stores/uiStore';
import SfxToggle from './SfxToggle';

const APP_VERSION = 'v0.1.0';

const WORKSPACE_LABEL = {
  html: 'HTML',
  css: 'CSS',
  worker: 'Worker',
  i18n: '번역',
} as const;

export default function Statusbar() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const autosave = useSettingsStore((s) => s.autosave);
  const treeTab = useUiStore((s) => s.treeWorkspaceTab);
  const total = totalBlockCount(workspaces);
  const dirty = anyDirty(workspaces);

  return (
    <footer
      className="flex items-center gap-3 border-t border-border bg-[var(--bg-elevated)] px-3 text-[11px] text-muted-foreground"
      style={{ height: 'var(--statusbar-h)' }}
      data-testid="statusbar"
    >
      <span className="tabular-nums">
        블록 <span className="font-medium text-foreground">{total.toLocaleString()}</span>개
      </span>
      <span className="text-border">|</span>
      <span>
        {dirty ? (
          <span className="text-warning">저장 필요</span>
        ) : (
          <span className="text-success">저장됨</span>
        )}
      </span>
      <span className="text-border">|</span>
      <span>자동 저장 {autosave ? '켜짐' : '꺼짐'}</span>
      <span className="text-border">|</span>
      <span>작업공간: {WORKSPACE_LABEL[treeTab]}</span>
      <span className="flex-1" />
      <SfxToggle />
      <span className="text-border">|</span>
      <span className="tabular-nums opacity-70">{APP_VERSION}</span>
    </footer>
  );
}
