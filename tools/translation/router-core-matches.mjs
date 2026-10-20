// Generated from complete ordered-match source; prepare-core-matches-sources.mjs owns this file.
import {typeError,unsupported} from './vendor/meta-language/translation/diagnostics.js';
import {ORDERED_MATCH_PROFILE} from './extensions/ordered-matches.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent,ROUTER_FORMATTING_FACADE_SHA256} from './router-core-formatting.mjs';
const tokens=(cursor,start)=>cursor.tokens.slice(start,cursor.index).map(token=>({kind:token.kind,value:token.value,...(token.raw?{raw:token.raw}:{}),span:{start:token.start,end:token.end}}));
function sourcePattern(parser,path) {
  const c=parser.cursor,start=c.index;
  const pattern=parser.controlPattern(path,c.peek());
  if(c.index-start>4096)throw unsupported('ordered match pattern','exceeds the checked source token bound',pattern.span);
  return {pattern,sourcePattern:{pattern,tokens:tokens(c,start),span:pattern.span}};
}
function parseOriginalOwnedMatchesBody(parser,token,path) {
  // This is only reached after the highest source resolver proves the ordinary
  // unshadowed standard macro. Qualified/custom/macro-expanded owners refuse.
  const c=parser.cursor,open=c.next(),close={'(':')','[':']','{':'}'}[open.value];
  if(!close)throw typeError('matches! requires an original delimited token group',open);
  const subject=parser.expr(path);c.expect(',','matches! pattern');
  const parsed=sourcePattern(parser,path),guard=c.eat('if')?parser.expr(path):null;
  c.eat(',');const end=c.expect(close,'matches!');
  const span={start:token.start,end:end.end},literal=value=>({k:'bool',value,span});
  return {k:'routerOrderedMatch',subject,rows:[{...parsed,guard,body:literal(true),span},{pattern:{k:'wild',span},sourcePattern:{pattern:{k:'wild',span},tokens:[],span},guard:null,body:literal(false),span}],sourceMacro:{name:'matches',owner:'standard-prelude',profile:ORDERED_MATCH_PROFILE.id,span},span};
}

const fail = (message, span) => { throw unsupported('Router compatibility matches', message, span); };
export function parseRouterCoreMatches(parser, path) {
  const c = parser.cursor;
  if (!['crate', '::', 'translation_core', '::'].every((word, index) => c.is(word, index)) ||
      c.peek().kind !== 'identifier' || c.peek(2).kind !== 'identifier' || c.peek(4).value !== 'matches') return null;
  const name = c.peek(4), separate = name.kind === 'identifier' && c.is('!', 5);
  if (name.kind !== 'macro' && !separate) return null;
  const first = c.peek(), sourceTokens = c.tokens, start = c.index, width = separate ? 6 : 5;
  const macro = separate ? {...name, kind: 'macro', end: c.peek(5).end} : name;
  const location = {start: first.start, end: macro.end};
  let proof;
  try { proof = requireRouterCoreFacade(parser); }
  catch (error) { if (!(error instanceof TypeError)) throw error; fail(error.message, location); }
  c.index += width;
  const node = createRulePipeline([
    {phase: 'language', rules: [{id: 'literal-matches:existing-ordered-source-pattern-parser', apply: () => parseOriginalOwnedMatchesBody(parser, {...macro, start: first.start}, path)}]},
    {phase: 'repository', rules: [{id: 'router-core:qualified-owned-literal-matches', apply: node => {
      if (node.rows[0].guard) fail('guarded patterns require a separate owned domain', node.span);
      let cells = 0;
      const literal = pattern => {
        if (++cells > ORDERED_MATCH_PROFILE.alternativeLimit) fail('literal alternative bound exceeded', pattern.span);
        if (pattern.k === 'or') { for (const child of pattern.alternatives) literal(child); return; }
        if (!['numLit', 'boolLit', 'strLit'].includes(pattern.k)) fail('requires literal scalar patterns without bindings', pattern.span);
      };
      literal(node.rows[0].pattern);
      node.sourceMacro = {name: 'matches', owner: 'owned-router-compatibility', profile: ORDERED_MATCH_PROFILE.id,
        span: node.span, compatibilityCore: {id: 'router-core-literal-matches-v1', symbol: 'crate::translation_core::matches',
          facadeSha256: ROUTER_FORMATTING_FACADE_SHA256, libraryImplementation: 'untranslated-rust-std-matches',
          domain: 'existing-checked-scalar-literal-patterns-without-guards'}};
      return {...node, constEligible: false};
    }}]},
  ]).run(null).value;
  try { requireRouterCoreFacadeCurrent(parser, proof); }
  catch (error) { if (!(error instanceof TypeError)) throw error; fail(error.message, node.span); }
  if (parser.cursor !== c || c.tokens !== sourceTokens || c.index <= start + width || sourceTokens[start] !== first || sourceTokens[start + 4] !== name) fail('original qualified source call changed', node.span);
  return node;
}
