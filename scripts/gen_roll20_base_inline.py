#!/usr/bin/env python3
"""
roll20_base_inline.ts 재생성 — D:\\훙냥냥\\마렌상\\legacy-sheet-corpus 시트 고치기\\roll20-base
의 CSS 파일들을 TypeScript 모듈로 inline.

usage:
    cd web && python3 scripts/gen_roll20_base_inline.py

source 폴더 (BASE_SRC) 는 사용자 환경에 맞춰 조정. 본 스크립트가
lib/preview/roll20_base/ 의 .css 들을 우선 사용하고, 없으면 BASE_SRC 에서
fetch.

본 inline 의 이유: Next.js (output: 'export') + Web Worker 안에서도 import 가능
해야 하므로 fs / static asset 불가. raw string 으로 박는다.

backslash / backtick / ${ 만 escape — String.raw 가 아닌 일반 template literal
사용 (CSS escape sequences 의 \\nnnn 을 보존하기 위해 backslash 를 \\\\ 로
double).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB_ROOT = os.path.dirname(HERE)
LOCAL_DIR = os.path.join(WEB_ROOT, "lib", "preview", "roll20_base")
WORKSPACE_ROLL20_BASE = os.path.abspath(os.path.join(WEB_ROOT, "..", "roll20-base"))
TS_OUT = os.path.join(WEB_ROOT, "lib", "preview", "roll20_base_inline.ts")

FILES = [
    ("roll20BaseCss",       "base.css"),
    ("roll20VttCss",        "vtt.css"),
    ("roll20CharsheetCss",  "charactersheet.css"),
    ("roll20JqueryCss",     "jquery.css"),
    ("roll20DarkmodeCss",   "editor-darkmode.css"),
]


def esc(s: str) -> str:
    """Regular template literal escape — backslash first, then ` and ${."""
    return s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def main():
    header = """/**
 * roll20_base_inline.ts — Roll20 sandbox CSS 의 사용자 큐레이션 ground truth.
 *
 * 출처: D:\\\\훙냥냥\\\\마렌상\\\\legacy-sheet-corpus 시트 고치기\\\\roll20-base\\\\
 *   - base.css (449KB) — Bootstrap + normalize + Roll20 grimoire color tokens
 *   - charactersheet.css (14KB) — .ui-dialog .charsheet / .characterdialog
 *   - jquery.css (43KB) — jQuery UI Bootstrap (dialog chrome)
 *   - editor-darkmode.css (36KB) — Roll20 dark mode (조건부 적용)
 *
 * 시스템 specific 0. Web Worker 안에서도 import 가능 (DOM API X).
 *
 * **AUTO-GENERATED — 직접 편집 X. scripts/gen_roll20_base_inline.py 로 재생성.**
 */
/* eslint-disable */
"""
    parts = [header]
    for varname, fname in FILES:
        path = os.path.join(LOCAL_DIR, fname)
        if not os.path.exists(path):
            path = os.path.join(WORKSPACE_ROLL20_BASE, fname)
        if not os.path.exists(path):
            print(f"WARN: {path} not found — skipping", file=sys.stderr)
            parts.append(f"export const {varname} = '';\n\n")
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        parts.append(f"export const {varname} = `")
        parts.append(esc(content))
        parts.append("`;\n\n")
    with open(TS_OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("".join(parts))
    print(f"Wrote {TS_OUT}: {os.path.getsize(TS_OUT)} bytes")


if __name__ == "__main__":
    main()
