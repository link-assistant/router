// Conservative source-candidate boundaries, never macro or semantic authority.
// An unresolved body macro can inspect its input tokens or introduce bindings
// for a later invocation. Its tokens cannot safely receive API substitutions.
export function macroAdoptionFunctionBarriers(tokens, bodyStart, family) {
  if (!Array.isArray(tokens) || !Number.isSafeInteger(bodyStart) || bodyStart < 0 ||
      bodyStart >= tokens.length || !['format', 'vec'].includes(family)) {
    throw new TypeError('Complete function tokens, body boundary and macro family required');
  }
  const barriers = [];
  const identifier = token => token?.type === 'ident' && /^(?:\p{ID_Start}|_)\p{ID_Continue}*$/u.test(token.text);
  for (let at = bodyStart + 1; at < tokens.length; at++) {
    const token = tokens[at];
    if (['comment', 'string', 'char'].includes(token.type)) continue;
    if (['#', 'use', 'extern', 'mod', 'macro', 'macro_rules!'].includes(token.text)) {
      barriers.push({kind: 'unclosed-local-source-producer', name: token.text, span: [token.start, token.end]});
      continue;
    }
    const combined = token.text.endsWith('!') && identifier({...token, text: token.text.slice(0, -1)});
    const separated = identifier(token) && tokens[at + 1]?.text === '!' &&
      ['(', '[', '{'].includes(tokens[at + 2]?.text);
    if (!combined && !separated) continue;
    const name = combined ? token.text.slice(0, -1) : token.text;
    const owned = at >= 4 && tokens.slice(at - 4, at).map(part => part.text).join('') === 'crate::translation_core::';
    if (name !== family || tokens[at - 1]?.text === '::' && !owned) {
      barriers.push({kind: 'unclosed-body-macro', name, span: [token.start, combined ? token.end : tokens[at + 1].end]});
    }
  }
  return barriers;
}
