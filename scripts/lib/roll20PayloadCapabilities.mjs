export function payloadRequiresChat(html) {
  const source = String(html ?? '');
  return /<rolltemplate\b/i.test(source)
    || /<(?:button|input)\b[^>]*\btype\s*=\s*(?:["']roll["']|roll(?=[\s/>]))/i.test(source);
}
