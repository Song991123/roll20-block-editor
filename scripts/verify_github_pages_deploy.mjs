#!/usr/bin/env node

const DEFAULT_REPOSITORY = 'Song991123/roll20-block-editor';
const DEFAULT_BRANCH = 'main';
const DEFAULT_WORKFLOW = 'deploy.yml';
const DEFAULT_SITE = 'https://song991123.github.io/roll20-block-editor/';

function readOption(args, name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function normalizeSha(value) {
  return String(value ?? '').trim().toLowerCase();
}

function shortSha(value) {
  const sha = normalizeSha(value);
  return sha ? sha.slice(0, 12) : 'unknown';
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'roll20-block-editor-pages-verifier',
    },
  });
  const body = await response.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    data = { message: body.slice(0, 300) };
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${data.message ?? 'GitHub API request failed'}`);
  }
  return data;
}

async function checkSite(site) {
  const response = await fetch(site, {
    redirect: 'follow',
    headers: { 'user-agent': 'roll20-block-editor-pages-verifier' },
  });
  return {
    status: response.status,
    url: response.url,
    ok: response.ok,
  };
}

export function evaluateDeployment({ branchSha, expectedSha, latestDeploySha, siteOk }) {
  const targetSha = normalizeSha(expectedSha || branchSha);
  const deployedSha = normalizeSha(latestDeploySha);
  const shaMatch = Boolean(targetSha && deployedSha && targetSha === deployedSha);
  return {
    pass: Boolean(siteOk && shaMatch),
    siteOk: Boolean(siteOk),
    shaMatch,
    expectedSha: targetSha,
    deployedSha,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (hasFlag(args, '--self-test')) {
    const result = evaluateDeployment({
      branchSha: 'ABC123',
      latestDeploySha: 'abc123',
      siteOk: true,
    });
    if (!result.pass) throw new Error('self-test expected a matching deployment');
    return { pass: true, selfTest: true };
  }

  const repository = readOption(args, '--repo', process.env.GITHUB_REPOSITORY ?? DEFAULT_REPOSITORY);
  const branch = readOption(args, '--branch', DEFAULT_BRANCH);
  const workflow = readOption(args, '--workflow', DEFAULT_WORKFLOW);
  const site = readOption(args, '--site', DEFAULT_SITE);
  const expectedSha = readOption(args, '--sha', '');
  const apiBase = `https://api.github.com/repos/${repository}`;

  const branchData = await getJson(`${apiBase}/commits/${encodeURIComponent(branch)}`);
  const runsData = await getJson(
    `${apiBase}/actions/workflows/${encodeURIComponent(workflow)}/runs?branch=${encodeURIComponent(branch)}&status=completed&per_page=20`,
  );
  const successfulRun = (runsData.workflow_runs ?? []).find(
    (run) => run.conclusion === 'success' && run.status === 'completed',
  );
  const siteResult = await checkSite(site);
  const result = evaluateDeployment({
    branchSha: branchData.sha,
    expectedSha,
    latestDeploySha: successfulRun?.head_sha,
    siteOk: siteResult.ok,
  });

  const output = {
    ...result,
    repository,
    branch,
    workflow,
    site: siteResult.url,
    siteStatus: siteResult.status,
    branchSha: branchData.sha,
    latestSuccessfulRun: successfulRun
      ? {
          id: successfulRun.id,
          sha: successfulRun.head_sha,
          createdAt: successfulRun.created_at,
          url: successfulRun.html_url,
        }
      : null,
  };
  console.log(JSON.stringify(output, null, 2));
  if (!result.pass) process.exitCode = 1;
  return output;
}

main().catch((error) => {
  console.error(`Pages verification failed: ${error.message}`);
  process.exitCode = 1;
});
