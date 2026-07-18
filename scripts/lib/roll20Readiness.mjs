export const ROLL20_READINESS = Object.freeze({
  CAPTURE_READY: 'CAPTURE_READY',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  CHALLENGE_OR_WAITING: 'CHALLENGE_OR_WAITING',
  UNKNOWN_ROLL20_PAGE: 'UNKNOWN_ROLL20_PAGE',
});

export const ROLL20_PAGE_HOSTS = Object.freeze(['app.roll20.net', 'roll20.net']);

export function isRoll20PageUrl(url) {
  try {
    const parsed = new URL(String(url ?? ''));
    return ROLL20_PAGE_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function isRoll20PageTarget(target) {
  if (target?.type && target.type !== 'page') return false;
  return isRoll20PageUrl(target?.url);
}

export function classifyRoll20Target(target) {
  const url = String(target?.url ?? '');
  const title = String(target?.title ?? '');
  if (/\/login(?:$|[?#/])/.test(url)) return ROLL20_READINESS.LOGIN_REQUIRED;
  if (/__cf_chl_|Just a moment|잠시|기다/i.test(url) || /Just a moment|잠시|기다/i.test(title)) {
    return ROLL20_READINESS.CHALLENGE_OR_WAITING;
  }
  if (/\/editor(?:$|[?#/])/.test(url) || /\/campaigns\/details\//.test(url)) {
    return ROLL20_READINESS.CAPTURE_READY;
  }
  return ROLL20_READINESS.UNKNOWN_ROLL20_PAGE;
}

export function isRoll20CaptureReady(status) {
  return status === ROLL20_READINESS.CAPTURE_READY;
}

export function nextActionForReadiness(status, { pageMatch = 'app.roll20.net', captureVerb = 'capture' } = {}) {
  if (status === ROLL20_READINESS.LOGIN_REQUIRED) {
    return `Log in to Roll20 inside the CDP-enabled browser, open the dedicated Sandbox/test room, then rerun ${captureVerb}.`;
  }
  if (status === ROLL20_READINESS.CHALLENGE_OR_WAITING) {
    return `Wait for the Roll20/Cloudflare challenge to finish in the CDP-enabled browser, then rerun ${captureVerb}.`;
  }
  if (status === ROLL20_READINESS.UNKNOWN_ROLL20_PAGE) {
    return `Navigate the CDP-enabled browser to the dedicated Roll20 Sandbox/test room matching ${pageMatch}, then rerun ${captureVerb}.`;
  }
  return `Open the dedicated Roll20 Sandbox/test room matching ${pageMatch} in the CDP-enabled browser, then rerun ${captureVerb}.`;
}

export function selfTestRoll20Readiness() {
  const cases = [
    {
      name: 'login',
      target: { url: 'https://app.roll20.net/login', title: 'Login' },
      expected: ROLL20_READINESS.LOGIN_REQUIRED,
    },
    {
      name: 'cloudflare',
      target: { url: 'https://app.roll20.net/editor?__cf_chl_rt_tk=abc', title: 'Just a moment...' },
      expected: ROLL20_READINESS.CHALLENGE_OR_WAITING,
    },
    {
      name: 'editor',
      target: { url: 'https://app.roll20.net/editor', title: 'Codex Roll20 Verify | Roll20' },
      expected: ROLL20_READINESS.CAPTURE_READY,
    },
    {
      name: 'campaign',
      target: { url: 'https://app.roll20.net/campaigns/details/123/test', title: 'Test Campaign' },
      expected: ROLL20_READINESS.CAPTURE_READY,
    },
    {
      name: 'welcome',
      target: { url: 'https://roll20.net/welcome', title: 'Welcome' },
      expected: ROLL20_READINESS.UNKNOWN_ROLL20_PAGE,
    },
    {
      name: 'unknown',
      target: { url: 'https://app.roll20.net/account', title: 'Account' },
      expected: ROLL20_READINESS.UNKNOWN_ROLL20_PAGE,
    },
    {
      name: 'stripe-referrer',
      target: { type: 'iframe', url: 'https://js.stripe.com/v3/foo.html#referrer=https%3A%2F%2Fapp.roll20.net%2Feditor', title: 'Stripe' },
      expectedPageTarget: false,
    },
  ];
  return cases.flatMap((testCase) => {
    const failures = [];
    if (testCase.expected) {
      const actual = classifyRoll20Target(testCase.target);
      if (actual !== testCase.expected) failures.push({ ...testCase, actual });
    }
    if ('expectedPageTarget' in testCase) {
      const actualPageTarget = isRoll20PageTarget(testCase.target);
      if (actualPageTarget !== testCase.expectedPageTarget) failures.push({ ...testCase, actualPageTarget });
    }
    return failures;
  });
}
