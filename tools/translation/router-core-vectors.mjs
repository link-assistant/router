// Qualified owned Vec construction; standard macro ownership stays separate.
// Library allocation and implementation internals remain intentionally native.
import {StringRustParser} from './extensions/strings.mjs';
import {requireRouterCoreFacade, requireRouterCoreFacadeCurrent, ROUTER_FORMATTING_FACADE_SHA256} from './router-core-formatting.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';

const descriptor = Object.getOwnPropertyDescriptor(StringRustParser.prototype, 'expressionMacro');
const owner = Object.freeze({kind: 'owned', source: 'Vec'});
export {checkRouterCoreVector,hasCheckedRouterCoreVector} from './extensions/source-lifetimes.mjs';
function current() {
  const actual = Object.getOwnPropertyDescriptor(StringRustParser.prototype, 'expressionMacro');
  if (!actual || ['value', 'get', 'set', 'writable', 'enumerable', 'configurable'].some(key => actual[key] !== descriptor[key])) {
    throw new TypeError('Owned vector requires the original comma-list parser');
  }
}
function sourceContract(run, span) {
  try { return run(); }
  catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw unsupported('Router compatibility vector', error.message, span);
  }
}
export function parseRouterCoreVector(parser, path) {
  const c = parser.cursor;
  if (!['crate', '::', 'translation_core', '::'].every((word, index) => c.is(word, index)) ||
      c.peek().kind !== 'identifier' || c.peek(2).kind !== 'identifier' || c.peek(4).value !== 'vec') return null;
  const name = c.peek(4), separate = name.kind === 'identifier' && c.is('!', 5);
  if (name.kind !== 'macro' && !separate) return null;
  const first = c.peek(), macro = separate ? {...name, kind: 'macro', end: c.peek(5).end} : name, start = c.index, tokens = c.tokens, width = separate ? 6 : 5;
  const location = {start: first.start, end: macro.end};
  const proof = sourceContract(() => { current(); return requireRouterCoreFacade(parser); }, location);
  c.index += width;
  const output = createRulePipeline([
    {phase: 'language', rules: [{id: 'owned-vector:existing-comma-list-and-bounded-repeat-grammar', apply: () => {
      const value = parseOwnedVectorRepeat(parser,path,{...macro,start:first.start}) ?? descriptor.value.call(parser, {...macro, value: 'vec', start: first.start}, path);
      if (!['array','routerCoreVectorRepeat'].includes(value.k) || value.k==='array'&&value.items.length > 4096) throw unsupported('owned vector allocation', 'requires a bounded comma list or checked Copy repetition', value.span);
      return value;
    }}]},
    {phase: 'repository', rules: [{id: 'router-core:qualified-owned-vector-allocation', apply: value => ({
      k: 'routerCoreVector', value: {...value, sourceRustOwnership: owner,
        compatibilityCore: {id: 'router-core-vector-list-v1', symbol: 'crate::translation_core::vec',
          facadeSha256: ROUTER_FORMATTING_FACADE_SHA256, libraryImplementation: 'untranslated-rust-std-vec',
          domain: 'existing-checked-vector-elements-comma-list'}},
      constEligible: false, sourceFeature: 'router-core-vector', span: value.span,
    })}]},
  ]).run(null);
  sourceContract(() => {
    current(); requireRouterCoreFacadeCurrent(parser, proof);
    if (parser.cursor !== c || c.tokens !== tokens || c.index <= start + width || tokens[start] !== first || tokens[start + 4] !== name) {
      throw new TypeError('Owned vector original qualified call changed');
    }
  }, output.value.span);
  return output.value;
}



// Private checker association, consumed before checked-meta serialization.

import {parseOwnedVectorRepeat} from './owned-vector-repeat-source.mjs';
