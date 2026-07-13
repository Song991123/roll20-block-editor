#!/usr/bin/env node
/**
 * Check for leftover local project servers before/after browser smokes.
 *
 * This intentionally treats Roll20 CDP (default 9222) as an allowed listener
 * and only ever kills node.exe processes on known project dev/smoke ports when
 * --kill-project is explicitly supplied.
 */

import { execFileSync } from 'node:child_process';
import process from 'node:process';

const args = process.argv.slice(2);

function hasFlag(name) {
  return args.includes(name);
}

function readOption(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function parsePortSet(spec) {
  const ports = new Set();
  for (const part of String(spec ?? '').split(',')) {
    const token = part.trim();
    if (!token) continue;
    const range = token.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let port = start; port <= end; port += 1) ports.add(port);
      continue;
    }
    const port = Number(token);
    if (Number.isInteger(port) && port > 0) ports.add(port);
  }
  return ports;
}

function parseNetstat(text) {
  const rows = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const m = line.match(/^\s*TCP\s+(.+):(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i);
    if (!m) continue;
    rows.push({
      localAddress: m[1],
      localPort: Number(m[2]),
      pid: Number(m[3]),
      raw: line.trim(),
    });
  }
  return rows;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === ',' && !quoted) {
      cells.push(cell);
      cell = '';
      continue;
    }
    cell += ch;
  }
  cells.push(cell);
  return cells;
}

function parseTasklist(text) {
  const processes = new Map();
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [imageName, pid] = parseCsvLine(line);
    const numericPid = Number(pid);
    if (!Number.isInteger(numericPid)) continue;
    processes.set(numericPid, { pid: numericPid, imageName });
  }
  return processes;
}

function readListeners() {
  const netstatText = execFileSync('netstat.exe', ['-ano', '-p', 'tcp'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let processLookupUnavailable = false;
  let processes = new Map();
  try {
    const taskText = execFileSync('tasklist.exe', ['/FO', 'CSV', '/NH'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    processes = parseTasklist(taskText);
  } catch {
    processLookupUnavailable = true;
  }
  const listeners = parseNetstat(netstatText).map((row) => ({
    ...row,
    processName: processes.get(row.pid)?.imageName ?? 'unknown',
  }));
  return { listeners, processLookupUnavailable };
}

function classify(listeners, projectPorts, cdpPorts) {
  const project = [];
  const cdp = [];
  for (const row of listeners) {
    if (projectPorts.has(row.localPort)) project.push(row);
    if (cdpPorts.has(row.localPort)) cdp.push(row);
  }
  return { project, cdp };
}

function killProjectListeners(projectRows) {
  const killed = [];
  const skipped = [];
  const seen = new Set();
  for (const row of projectRows) {
    if (seen.has(row.pid)) continue;
    seen.add(row.pid);
    const processName = String(row.processName ?? '').toLowerCase();
    if (processName !== 'node.exe') {
      skipped.push({ ...row, reason: processName === 'unknown' ? 'unknown-process-name' : 'non-node-process' });
      continue;
    }
    try {
      process.kill(row.pid, 'SIGTERM');
      killed.push(row);
    } catch (error) {
      skipped.push({ ...row, reason: error.message });
    }
  }
  return { killed, skipped };
}

function printSummary(summary) {
  console.log(JSON.stringify(summary, null, 2));
  if (summary.projectListeners.length === 0) {
    console.log('SERVER_HYGIENE_OK no project dev/smoke listener found');
  } else {
    console.log(`SERVER_HYGIENE_PROJECT_LISTENERS ${summary.projectListeners.length}`);
  }
  if (summary.cdpListeners.length > 0) {
    console.log(`SERVER_HYGIENE_CDP_PRESERVED ${summary.cdpListeners.map((row) => row.localPort).join(',')}`);
  }
}

function selfTest() {
  const netstat = `
  TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       111
  TCP    127.0.0.1:9222         0.0.0.0:0              LISTENING       222
  TCP    [::1]:4414             [::]:0                 LISTENING       333
`;
  const tasklist = `"node.exe","111","Console","1","10,000 K"
"chrome.exe","222","Console","1","10,000 K"
"node.exe","333","Console","1","10,000 K"`;
  const listeners = parseNetstat(netstat).map((row) => ({
    ...row,
    processName: parseTasklist(tasklist).get(row.pid)?.imageName ?? 'unknown',
  }));
  const result = classify(listeners, parsePortSet('3000,4300-4499'), parsePortSet('9222'));
  if (result.project.length !== 2) throw new Error('expected two project listeners');
  if (result.cdp.length !== 1) throw new Error('expected one cdp listener');
  if (result.cdp[0].processName !== 'chrome.exe') throw new Error('expected chrome cdp process');
  console.log('server_hygiene_check self-test passed');
}

if (hasFlag('--self-test')) {
  selfTest();
  process.exit(0);
}

const projectPortSpec = readOption('--project-ports', '3000,3001,3002,4300-4499');
const cdpPortSpec = readOption('--cdp-ports', '9222');
const projectPorts = parsePortSet(projectPortSpec);
const cdpPorts = parsePortSet(cdpPortSpec);
const killProject = hasFlag('--kill-project');
const allowProject = hasFlag('--allow-project');

const initialRead = readListeners();
const before = classify(initialRead.listeners, projectPorts, cdpPorts);
let killResult = { killed: [], skipped: [] };
let after = before;
let processLookupUnavailable = initialRead.processLookupUnavailable;

if (killProject && before.project.length > 0) {
  killResult = killProjectListeners(before.project);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const afterRead = readListeners();
  after = classify(afterRead.listeners, projectPorts, cdpPorts);
  processLookupUnavailable = processLookupUnavailable || afterRead.processLookupUnavailable;
}

const summary = {
  status: after.project.length === 0 ? 'OK' : 'PROJECT_LISTENER_FOUND',
  projectPortSpec,
  cdpPortSpec,
  killProject,
  processLookupStatus: processLookupUnavailable ? 'UNAVAILABLE' : 'OK',
  projectListeners: after.project,
  cdpListeners: after.cdp,
  killed: killResult.killed,
  skipped: killResult.skipped,
};

printSummary(summary);

if (after.project.length > 0 && !allowProject) {
  process.exit(1);
}
