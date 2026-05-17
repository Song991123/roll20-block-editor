/**
 * IndexedDB wrapper — workspace XML autosave persistence.
 *
 * Anchor: docs/spec/22_autosave.md §3.
 *
 * 형태: { key: string (primary), xml: string, meta: SaveMeta } 1 row per workspace.
 *
 * 설계 원칙
 *   - 어떤 sheet 종류에도 의존 X (영시영/D&D/CoC 무관 — XML 그대로 저장)
 *   - 모든 IDB API 호출은 try/catch — quota/private-mode/Safari throttle 등
 *     graceful fallback. 호출자는 `ok:false` 로 실패를 감지.
 *   - SSR safe — `typeof indexedDB === 'undefined'` 시 즉시 null/no-op.
 *   - key escape — 사용자 input 이 key 에 흘러들지 않도록 hardcoded 만 허용.
 *     `isValidKey` 가 `^[a-z0-9][a-z0-9_\-]*$` 강제 (영문 소문자 + 숫자 + `_-` 만).
 */

export const DB_NAME = 'roll20-block-editor';
export const STORE = 'workspaces';
const DB_VERSION = 1;

/** 자동 저장 default key — 향후 multi-sheet 지원시 sheet name 별로 분리. */
export const AUTOSAVE_KEY = 'autosave-current';

/** payload size 상한 (10MB) — 넘으면 autosave skip + 토스트 안내 (spec §6 R-size). */
export const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024;

export interface SaveMeta {
  /** Date.now() in ms — UI "X초 전" 계산. */
  ts: number;
  /** 3 워크스페이스 (html/css/i18n) 합산 블록 수 — UI 표시용. */
  blockCount: number;
  /** payload byte size — quota 진단 / UI 표시. */
  bytes?: number;
  /** spec version / migration 용. */
  version?: number;
}

export interface SavedRecord {
  key: string;
  xml: string;
  meta: SaveMeta;
}

/**
 * key escape — hardcoded set + future-proof regex.
 * 사용자 입력이 직접 key 가 되는 일이 없도록 caller 가 보장해야 하지만,
 * 한 번 더 방어. 빈/길이 초과/허용 문자 외 → false.
 */
const KEY_RE = /^[a-z0-9][a-z0-9_\-]{0,63}$/;
export function isValidKey(key: string): boolean {
  return typeof key === 'string' && KEY_RE.test(key);
}

function hasIdb(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** open + lazy upgrade — 호출당 새 connection (cheap; 어차피 idle 시점 1-2회). */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIdb()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
    req.onblocked = () => reject(new Error('IDB open blocked'));
  });
}

function byteLength(s: string): number {
  // 정확한 UTF-8 byte 길이 (대안 = TextEncoder).
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(s).length;
  }
  // SSR / 매우 오래된 환경 fallback — 2x char 추정 (UTF-16).
  return s.length * 2;
}

/**
 * Autosave error kinds — caller 가 토스트 메시지 분기에 사용.
 */
export type SaveError =
  | 'idb-unavailable'
  | 'invalid-key'
  | 'too-large'
  | 'quota-exceeded'
  | 'unknown';

export interface SaveResult {
  ok: boolean;
  error?: SaveError;
  bytes?: number;
}

/**
 * 워크스페이스 XML 저장. 성공 시 ok:true, 실패 시 ok:false + error kind.
 *
 * 에러 케이스
 *   - IDB 미지원 환경 → idb-unavailable
 *   - 잘못된 key (regex 어김) → invalid-key
 *   - payload 10MB 초과 → too-large (저장하지 않음)
 *   - QuotaExceededError → quota-exceeded
 *   - 그 외 → unknown
 */
export async function saveWorkspace(
  key: string,
  xml: string,
  meta?: Partial<SaveMeta>,
): Promise<SaveResult> {
  if (!hasIdb()) return { ok: false, error: 'idb-unavailable' };
  if (!isValidKey(key)) return { ok: false, error: 'invalid-key' };
  const bytes = byteLength(xml);
  if (bytes > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: 'too-large', bytes };
  }
  const fullMeta: SaveMeta = {
    ts: meta?.ts ?? Date.now(),
    blockCount: meta?.blockCount ?? 0,
    bytes,
    version: meta?.version ?? 1,
  };
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const rec: SavedRecord = { key, xml, meta: fullMeta };
      const req = store.put(rec);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error('IDB put failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IDB tx aborted'));
    });
    return { ok: true, bytes };
  } catch (e) {
    const name = (e as { name?: string })?.name ?? '';
    if (name === 'QuotaExceededError') {
      return { ok: false, error: 'quota-exceeded', bytes };
    }
    return { ok: false, error: 'unknown', bytes };
  } finally {
    try { db?.close(); } catch { /* noop */ }
  }
}

/**
 * key 에 저장된 워크스페이스 로드. 없으면 null.
 * 에러 (IDB 미지원, 권한, 손상 등) 도 null — 호출자는 "복구 대상 없음" 으로 처리.
 */
export async function loadWorkspace(key: string): Promise<SavedRecord | null> {
  if (!hasIdb()) return null;
  if (!isValidKey(key)) return null;
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const rec = await new Promise<SavedRecord | null>((resolve, reject) => {
      const tx = db!.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as SavedRecord | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('IDB get failed'));
    });
    return rec;
  } catch {
    return null;
  } finally {
    try { db?.close(); } catch { /* noop */ }
  }
}

/** 저장된 모든 워크스페이스 메타 나열 (xml payload 는 제외 — 가벼움). */
export async function listSaved(): Promise<Array<{ key: string; meta: SaveMeta }>> {
  if (!hasIdb()) return [];
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const all = await new Promise<SavedRecord[]>((resolve, reject) => {
      const tx = db!.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as SavedRecord[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error('IDB getAll failed'));
    });
    return all.map((r) => ({ key: r.key, meta: r.meta }));
  } catch {
    return [];
  } finally {
    try { db?.close(); } catch { /* noop */ }
  }
}

/** 특정 key 삭제. 없거나 에러여도 throw 하지 않음 (caller 가 신경 쓸 일 없음). */
export async function deleteWorkspace(key: string): Promise<boolean> {
  if (!hasIdb()) return false;
  if (!isValidKey(key)) return false;
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error('IDB delete failed'));
    });
    return true;
  } catch {
    return false;
  } finally {
    try { db?.close(); } catch { /* noop */ }
  }
}
