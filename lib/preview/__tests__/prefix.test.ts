import { autoPrefixCssClasses, autoPrefixHtmlClasses } from '../prefix';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testRoll20RuntimeClassesStayUnprefixed(): void {
  const css = autoPrefixCssClasses(
    '.rolltemplate-coc .inlinerollresult.fullcrit, .rolltemplate-coc .fullfail { color: red; }',
  );

  assert(
    css.includes('.sheet-rolltemplate-coc .inlinerollresult.fullcrit'),
    'rolltemplate author class is prefixed while runtime classes remain canonical',
  );
  assert(!css.includes('.sheet-inlinerollresult'), 'inline roll runtime class is not prefixed');
  assert(!css.includes('.sheet-fullcrit'), 'critical runtime class is not prefixed');
  assert(!css.includes('.sheet-fullfail'), 'failure runtime class is not prefixed');
}

function testRuntimeClassesStayCanonicalInHtmlButIdsRemainScoped(): void {
  const html = autoPrefixHtmlClasses(
    '<div class="rolltemplate-coc inlinerollresult fullcrit"><span id="fullcrit">x</span></div>',
  );

  assert(
    html.includes('class="sheet-rolltemplate-coc inlinerollresult fullcrit"'),
    'runtime classes stay canonical in HTML',
  );
  assert(html.includes('id="sheet-fullcrit"'), 'ordinary IDs remain scoped');
}

function testScriptSourceAndAttributesStayByteStable(): void {
  const script =
    '<script class="runtime" id="runtime" data-role="page">' +
    'window.template = \'<div class="card" id="root">\';' +
    '</script>';
  const html = autoPrefixHtmlClasses(
    '<div class="card" id="root"></div>' + script,
  );

  assert(
    html.includes('<div class="sheet-card" id="sheet-root"></div>'),
    'sheet markup is still prefixed outside scripts',
  );
  assert(html.includes(script), 'authored script tag and body remain unchanged');
  assert(
    !html.includes('window.template = \'<div class="sheet-card"'),
    'script string markup is not prefixed as sheet HTML',
  );
}

testRoll20RuntimeClassesStayUnprefixed();
testRuntimeClassesStayCanonicalInHtmlButIdsRemainScoped();
testScriptSourceAndAttributesStayByteStable();
console.log('Preview prefix Roll20 runtime-class tests passed.');
