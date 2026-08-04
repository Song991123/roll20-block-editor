const TEST_OR_DOC_PATTERN = /(^|\/)(?:docs|__tests__)(?:\/|$)|(?:^|\/)(?:AGENTS|README)\.md$|\.(?:test|spec)\.[cm]?[jt]sx?$/i;

function normalizePath(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\//, '');
}

function selector({ modes = [], artifacts = [], features = [] } = {}) {
  return {
    modes: [...new Set(modes)].sort(),
    artifacts: [...new Set(artifacts)].sort(),
    features: [...new Set(features)].sort(),
  };
}

export function classifyCorpusCodeImpact(paths) {
  if (!Array.isArray(paths)) throw new TypeError('changed paths must be an array');

  const selectors = [];
  let all = false;
  for (const rawPath of paths) {
    const filePath = normalizePath(rawPath);
    if (!filePath || TEST_OR_DOC_PATTERN.test(filePath) || filePath.startsWith('.github/')) continue;

    if (filePath === 'lib/emit/sanitize.ts') {
      selectors.push(selector({ modes: ['legacy'], artifacts: ['css'] }));
      continue;
    }
    if (filePath.startsWith('lib/import/')) {
      if (/i18n|translation/i.test(filePath)) {
        selectors.push(selector({ artifacts: ['translation'] }));
      } else if (/worker/i.test(filePath)) {
        selectors.push(selector({ artifacts: ['worker'] }));
      } else if (/css/i.test(filePath)) {
        selectors.push(selector({ artifacts: ['css'] }));
      } else {
        selectors.push(selector({ artifacts: ['html'] }));
      }
      continue;
    }
    if (filePath.startsWith('lib/dice/')) {
      selectors.push(selector({ features: ['html:rolltemplate', 'html:roll-button', 'css:rolltemplate'] }));
      continue;
    }
    if (filePath.startsWith('lib/export/')) continue;
    if (
      filePath.startsWith('scripts/')
      && !/(?:corpus_harness|corpus_change_impact|imported_edit_sync_smoke|browser_roundtrip_smoke)/i.test(filePath)
    ) continue;

    all = true;
    break;
  }

  if (all) return { scope: 'all', selectors: [] };
  if (selectors.length === 0) return { scope: 'none', selectors: [] };
  return { scope: 'selective', selectors };
}

export function corpusRowAffected(impact, row) {
  if (!impact || !['none', 'selective', 'all'].includes(impact.scope)) {
    throw new TypeError('invalid corpus impact');
  }
  if (impact.scope === 'all') return true;
  if (impact.scope === 'none') return false;

  const mode = String(row?.mode ?? '');
  const artifacts = new Set(Object.entries(row?.artifacts ?? {})
    .filter(([, present]) => present === true)
    .map(([name]) => name));
  const features = new Set(Array.isArray(row?.features) ? row.features : []);

  return impact.selectors.some((candidate) => {
    if (candidate.modes.length > 0 && !candidate.modes.includes(mode)) return false;
    if (candidate.artifacts.length > 0 && !candidate.artifacts.some((name) => artifacts.has(name))) {
      return false;
    }
    if (candidate.features.length > 0 && !candidate.features.some((name) => features.has(name))) {
      return false;
    }
    return true;
  });
}
