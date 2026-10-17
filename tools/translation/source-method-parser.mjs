// Only this high consumer constructs the actual Host parser. Public generic
// parser factories and recomputable JSON digests cannot issue its parse brand.
import {HostRustParser,originalHostParserIdentitySnapshot} from './extensions/host-contracts.mjs';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from './extensions/text.mjs';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {assertOriginalParserIdentity} from './original-parser-identity.mjs';
import {originalMethodTransformFacts,originalMethodTokenTransformSnapshot,originalMethodParserTokens,originalMethodParserTokenFacts} from './source-method-transforms.mjs';
import {originalMethodParserNamespace,configureMatchesMethodParser} from './matches-macro-context.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {captureOriginalMethodValidation,originalMethodValidationDigest} from './source-method-validation.mjs';
import {requestImmutableNamespaceTargets} from './source-scopes.mjs';
const parses=new WeakMap();
function identity(parser) {
  // Read only during an actual call, after cyclic module initialization. The
  // snapshot itself was already sealed at the real class definition.
  const snapshot=originalHostParserIdentitySnapshot();
  assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));
  assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});
}
export function parseOriginalMethodTransform(transform,{immutableNamespaceTargets=false}={}) {
  const state=originalMethodTransformFacts(transform),namespace=originalMethodParserNamespace(state.context,state.method),tokens=originalMethodParserTokens(transform);
  const parser=new HostRustParser(tokens);identity(parser);
  if(immutableNamespaceTargets)requestImmutableNamespaceTargets(parser);
  configureMatchesMethodParser(parser,state.context,state.method);
  parser.shadowedEffectRoots=new Set(namespace.shadowedEffectRoots);
  const namespaceValidation=captureOriginalMethodValidation(parser.sourceNamespaceEvidence),namespaceDigest=namespaceValidation.digest,attributes=parser.attributes(),visibility=parser.visibility();
  const qualifier=parser.cursor.is('const')?parser.cursor.next():null;
  const entry=parser.fn(namespace.modulePath);
  if(qualifier)entry.constFunction=true;
  if(!parser.cursor.atEnd())throw new TypeError('Original method parser did not consume the complete original member');
  identity(parser);originalMethodParserTokenFacts(parser.cursor.tokens);originalMethodTransformFacts(transform);
  if(metadataDigest(parser.sourceNamespaceEvidence)!==namespaceDigest)throw new TypeError('Original method source namespace evidence changed during parsing');
  const proof=freezeMacroTree({schema:'original-method-host-parse-v1',transform:originalMethodTokenTransformSnapshot(transform),parsedSurfaceSha256:metadataDigest(entry),attributes:copyMetadata(attributes),visibility:copyMetadata(visibility),parsedTokenTransformVerified:true,checkedSourceAssociation:false,namespaceAuthority:false,copyAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  const validation=captureOriginalMethodValidation(entry);
  const result=Object.freeze({entry,proof});parses.set(result,Object.freeze({transform,parser,entry,proof,digest:validation.digest,validation:validation.capture,namespaceValidation:namespaceValidation.capture,namespaceDigest}));return result;
}
export function originalMethodParsedFacts(result) {
  const state=parses.get(result);if(!state)throw new TypeError('Original method Host parse is copied, unsealed or caller fabricated');
  const source=originalMethodTransformFacts(state.transform);identity(state.parser);originalMethodParserTokenFacts(state.parser.cursor.tokens);
  originalMethodParserNamespace(source.context,source.method);
  if(result.entry!==state.entry||result.proof!==state.proof||originalMethodValidationDigest(state.entry,state.validation)!==state.digest||originalMethodValidationDigest(state.parser.sourceNamespaceEvidence,state.namespaceValidation)!==state.namespaceDigest)throw new TypeError('Original method parsed body/signature/source namespace changed');
  return state;
}
