const RESOURCE_CONSOLE_CATEGORIES = new Set([
  'cors',
  'csp',
  'network',
  'resource-load',
]);

const RESOURCE_TYPES = new Set([
  'document',
  'font',
  'image',
  'manifest',
  'media',
  'script',
  'stylesheet',
  'xhr',
  'fetch',
]);

function classifyRuntimeText(value) {
  const text = String(value ?? '').toLowerCase();
  if (/content security policy|\bcsp\b|violat(?:e|es|ed).*policy/.test(text)) return 'csp';
  if (/cors policy|cross-origin request blocked|access-control-allow-origin/.test(text)) return 'cors';
  if (/failed to load resource|net::err_|loading failed for the .* resource/.test(text)) return 'resource-load';
  if (/referenceerror|is not defined|cannot access .* before initialization/.test(text)) return 'reference-error';
  if (/typeerror|cannot read propert|is not a function/.test(text)) return 'type-error';
  if (/syntaxerror|unexpected token|invalid or unexpected token/.test(text)) return 'syntax-error';
  if (/unhandled.*(?:rejection|promise)|uncaught \(in promise\)/.test(text)) return 'promise-rejection';
  if (/networkerror|network error|failed to fetch|connection (?:refused|reset|closed)/.test(text)) return 'network';
  return 'other';
}

function increment(counts, category) {
  counts[category] = (counts[category] ?? 0) + 1;
}

export function summarizeRuntimeIssueCategories(consoleErrors, pageErrors) {
  const counts = {};
  let applicationConsoleErrorCount = 0;
  let resourceConsoleErrorCount = 0;
  for (const message of Array.isArray(consoleErrors) ? consoleErrors : []) {
    const category = classifyRuntimeText(message);
    increment(counts, category);
    if (RESOURCE_CONSOLE_CATEGORIES.has(category)) resourceConsoleErrorCount += 1;
    else applicationConsoleErrorCount += 1;
  }
  const safePageErrors = Array.isArray(pageErrors) ? pageErrors : [];
  for (const message of safePageErrors) increment(counts, classifyRuntimeText(message));
  return {
    categories: Object.keys(counts).sort(),
    counts: Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right))),
    applicationErrorCount: applicationConsoleErrorCount + safePageErrors.length,
    resourceConsoleErrorCount,
  };
}

export function summarizeResourceIssueCategories(resourceIssues, resourceStatus) {
  const categories = new Set();
  for (const issue of Array.isArray(resourceIssues) ? resourceIssues : []) {
    if (issue?.kind === 'failed') categories.add('request-failed');
    if (issue?.kind === 'http') {
      const status = Number(issue.status);
      if (status >= 400 && status < 500) categories.add('http-client');
      else if (status >= 500 && status < 600) categories.add('http-server');
      else categories.add('http-other');
    }
    const resourceType = RESOURCE_TYPES.has(issue?.resourceType) ? issue.resourceType : 'other';
    categories.add(`type:${resourceType}`);
    if (
      Array.isArray(issue?.failures)
      && issue.failures.length > 0
      && issue.failures.every((failure) => failure === 'net::ERR_ABORTED')
    ) categories.add('transient-abort');
  }
  const classification = resourceStatus?.classification;
  if (classification === 'transient-aborted-images-final-rendered') categories.add('final-rendered');
  else if (classification === 'request-issues-final-rendered') categories.add('final-rendered-with-request-issues');
  else if (classification === 'final-rendered-resource-failure') categories.add('final-render-failure');
  return [...categories].sort();
}

