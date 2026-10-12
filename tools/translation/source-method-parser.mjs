// Only this high consumer constructs the actual Host parser. Public generic
// parser factories and recomputable JSON digests cannot issue its parse brand.
import {HostRustParser,originalHostParserIdentitySnapshot} from './extensions/host-contracts.mjs';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {originalTextCursorGuard} from './extensions/text.mjs';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {assertOriginalParserIdentity} from './original-parser-identity.mjs';
import {originalMethodTransformFacts,originalMethodTokenTransformSnapshot} from './source-method-transforms.mjs';
import {originalMethodParserNamespace} from './matches-macro-context.mjs';
import {configureParserSourceScope} from './source-scopes.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const parses=new WeakMap();
function identity(parser) {
  // Read only during an actual call, after cyclic module initialization. The
  // snapshot itself was already sealed at the real class definition.
  const snapshot=originalHostParserIdentitySnapshot();
  assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));
  assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});
}
function exactTokens(actual,expected) {
  let at=0;
  const equal=(a,b)=>metadataDigest(a)===metadataDigest(b);
  for(const token of expected){const first=actual[at++];if(equal(first,token))continue;
    const second=actual[at++];
    if(token.value!=='&&'||token.end!==token.start+2||!equal(first,{...token,value:'&',end:token.start+1})||!equal(second,{...token,value:'&',start:token.start+1}))throw new TypeError('Original method parser changed its exact transformed token stream');
  }
  if(at!==actual.length)throw new TypeError('Original method parser inserted or removed source tokens');
}
export function parseOriginalMethodTransform(transform) {
  const state=originalMethodTransformFacts(transform),namespace=originalMethodParserNamespace(state.context,state.method),tokens=copyMetadata(state.lowered.tokens);
  const parser=new HostRustParser(tokens);identity(parser);
  configureParserSourceScope(parser,namespace.scope,namespace.scopes,namespace.modulePath);parser.modulePath=[...namespace.modulePath];
  // Working legacy aliases must not mutate the actual namespace evidence.
  parser.aliases=new Map([...parser.sourceNamespaceAliases.type].map(([path,values])=>[path,new Map(values)]));
  const namespaceDigest=metadataDigest(parser.sourceNamespaceEvidence),attributes=parser.attributes(),visibility=parser.visibility();
  const qualifier=parser.cursor.is('const')?parser.cursor.next():null;
  const entry=parser.fn(namespace.modulePath);
  if(qualifier)entry.constFunction=true;
  if(!parser.cursor.atEnd())throw new TypeError('Original method parser did not consume the complete original member');
  identity(parser);exactTokens(parser.cursor.tokens,state.lowered.tokens);originalMethodTransformFacts(transform);
  if(metadataDigest(parser.sourceNamespaceEvidence)!==namespaceDigest)throw new TypeError('Original method source namespace evidence changed during parsing');
  const proof=freezeMacroTree({schema:'original-method-host-parse-v1',transform:originalMethodTokenTransformSnapshot(transform),parsedSurfaceSha256:metadataDigest(entry),attributes:copyMetadata(attributes),visibility:copyMetadata(visibility),parsedTokenTransformVerified:true,checkedSourceAssociation:false,namespaceAuthority:false,copyAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  const result=Object.freeze({entry,proof});parses.set(result,{transform,parser,entry,proof,digest:metadataDigest(entry),namespaceDigest});return result;
}
export function originalMethodParsedFacts(result) {
  const state=parses.get(result);if(!state)throw new TypeError('Original method Host parse is copied, unsealed or caller fabricated');
  const source=originalMethodTransformFacts(state.transform);identity(state.parser);exactTokens(state.parser.cursor.tokens,source.lowered.tokens);
  originalMethodParserNamespace(source.context,source.method);
  if(result.entry!==state.entry||result.proof!==state.proof||metadataDigest(state.entry)!==state.digest||metadataDigest(state.parser.sourceNamespaceEvidence)!==state.namespaceDigest)throw new TypeError('Original method parsed body/signature/source namespace changed');
  return state;
}
