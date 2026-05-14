'use client';

export default function EditorHeader() {
  return (
    <header className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-b from-neutral-900 to-neutral-950 border-b-2 border-neutral-800">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg shadow-[0_2px_6px_rgba(245,158,11,0.35)]">
          📦
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-wide">Roll20 Block Editor</div>
          <div className="text-[11px] text-neutral-400">블록 코딩으로 시트 만들기</div>
        </div>
      </div>
      <div className="flex-1" />
      <div className="text-xs text-neutral-500">Phase 1 — bootstrap</div>
    </header>
  );
}
