// Qualified owned Vec construction; standard macro ownership stays separate.
// Library allocation and implementation internals remain intentionally native.
import {StringRustParser} from './extensions/strings.mjs';
import {requireRouterCoreFacade, requireRouterCoreFacadeCurrent, ROUTER_FORMATTING_FACADE_SHA256} from './router-core-formatting.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';

const descriptor = Object.getOwnPropertyDescriptor(StringRustParser.prototype, 'expressionMacro');
const owner = Object.freeze({kind: 'owned', source: 'Vec'});
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
  if (!['crate', '::', 'translation_core', '::', 'vec'].every((word, index) => c.is(word, index)) ||
      c.peek().kind !== 'identifier' || c.peek(2).kind !== 'identifier' || c.peek(4).kind !== 'macro') return null;
  const first = c.peek(), macro = c.peek(4), start = c.index, tokens = c.tokens;
  const location = {start: first.start, end: macro.end};
  const proof = sourceContract(() => { current(); return requireRouterCoreFacade(parser); }, location);
  c.index += 5;
  const output = createRulePipeline([
    {phase: 'language', rules: [{id: 'owned-vector:existing-comma-list-expression-grammar', apply: () => {
      const value = descriptor.value.call(parser, {...macro, value: 'vec', start: first.start}, path);
      if (value.k !== 'array' || value.items.length > 4096) throw unsupported('owned vector allocation', 'requires a comma list of at most 4096 checked elements', value.span);
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
    if (parser.cursor !== c || c.tokens !== tokens || c.index <= start + 5 || tokens[start] !== first || tokens[start + 4] !== macro) {
      throw new TypeError('Owned vector original qualified call changed');
    }
  }, output.value.span);
  return output.value;
}

export function checkRouterCoreVector(checker, node, env, path, expected, allowLiteral) {
  const value = checker.expr(node.value, env, path, expected, allowLiteral), type = value.type?.element;
  const scalar = type && !type.rustReference && !type.rustGenericIdentityUnresolved && !type.rustBorrowingUnresolved &&
    (type.kind === 'bool' || type.kind === 'fixed' && typeof type.rustPrimitiveName === 'string' ||
      type.kind === 'string' && ['String', 'str'].includes(type.rustOwnership?.source));
  if (value.k !== 'array' || value.type?.kind !== 'array' || !scalar || value.type.rustOwnership?.kind !== 'owned' || value.type.rustOwnership.source !== 'Vec') {
    throw unsupported('owned vector elements', 'requires checked primitive integers, bools, owned standard text or borrowed str; nominal, nested, mutable and erased elements remain refused', node.span);
  }
  return {...value, constEligible: false, compatibilityCore: node.value.compatibilityCore};
}
