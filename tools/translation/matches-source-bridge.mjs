// The original rule is interpreted by the generic TT matcher/transcriber.
// Its output is parsed as Rust match syntax with private opaque AST slots.
import {HostRustParser} from './extensions/host-contracts.mjs';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {parseOrderedMatch} from './extensions/ordered-matches.mjs';
import {TranslationError,unsupported} from './vendor/meta-language/translation/diagnostics.js';
import {metadataDigest} from './extensions/source-links.mjs';
import {originalMacroInvocation,freezeMacroTree} from './macro-token-trees.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,isDeclarativeExpansion,declarativeExpansionLineage} from './declarative-macros.mjs';
import {standardMatchesOriginalDefinition} from './matches-source-profile.mjs';
import {createOriginalMacroFragmentContext,originalMacroFragmentAst,originalMacroFragmentTokens,originalMacroFragmentParser} from './source-macro-fragments.mjs';
import {sourceMatchesCandidate,proveOriginalMatchesCall,originalMatchesCallFacts} from './matches-macro-context.mjs';
const slots=new WeakMap(),proofs=new WeakMap(),active=new WeakMap();
const pairs={'(':')','[':']','{':'}'};
export function projectOriginalMatchesExpansion(fragmentContext,expansion,callProof) {
  if(!isDeclarativeExpansion(expansion))throw new TypeError('Matches projection requires a private original declarative expansion');
  const {state,start,end}=originalMatchesCallFacts(callProof),originalParser=originalMacroFragmentParser(fragmentContext),profile=state.facts.profile;
  if(state.captured.source.slice(start,end)!==callProof.originalInvocation||originalParser.cursor.tokens!==state.tokens)throw new TypeError('Matches expansion call/parser source association differs');
  const lineage=declarativeExpansionLineage(expansion),definitionSource=standardMatchesOriginalDefinition(profile);
  if(lineage.parent!==null||lineage.depth!==0||lineage.definition.name!==profile.name||lineage.definition.sourceSha256!==profile.definition.sha256||JSON.stringify(lineage.definition.owner)!==JSON.stringify(['core'])||expansion.input.kind!=='original-source'||expansion.input.sha256!==callProof.originalInvocationSha256)throw new TypeError('Matches expansion differs from its original pinned definition/input lineage');
  const generated=[],origins=[];let anchor=start,cells=0;
  const origin=(tree,index,range)=>{const span=range??tree.span??tree.sourceSyntax?.span;if(!span||span.start<0||span.end>definitionSource.length)throw new TypeError('Generated token is outside its original definition source');return {tokenIndex:index,definitionSourcePath:profile.definition.sourcePath,definitionSourceSha256:profile.sources.find(pin=>pin.sourcePath===profile.definition.sourcePath).sha256,definitionSpan:{start:profile.definition.span.start+span.start,end:profile.definition.span.start+span.end}};};
  const token=(kind,value,tree,range)=>{
    if(++cells>8192)throw new TypeError('Matches generated token projection exceeds its bound');
    const result={kind,value,start:anchor,end:anchor};const span=range??tree.span??tree.sourceSyntax?.span;if(definitionSource.slice(span.start,span.end)!==value)throw new TypeError('Generated token differs from its original definition spelling');origins.push(origin(tree,generated.length,range));generated.push(result);return result;
  };
  const visit=tree=>{
    if(tree.kind==='fragment') {
      const capture=tree.sourceAstCapture,ast=originalMacroFragmentAst(fragmentContext,capture);
      if(capture.fragment!==tree.fragment||!['expr','pat'].includes(tree.fragment)||capture.originalSourceSha256!==expansion.input.sha256||capture.span.start<anchor||capture.span.end>end)throw new TypeError('Matches opaque capture order/source kind differs');
      const result={kind:'sourceMacroAst',value:'<'+tree.fragment+'>',start:capture.span.start,end:capture.span.end};
      slots.set(result,{ast,fragment:tree.fragment,capture});generated.push(result);origins.push({tokenIndex:generated.length-1,callSite:true,fragment:tree.fragment,originalSpan:{...capture.span},originalSourceSha256:capture.originalSourceSha256});anchor=capture.span.end;return;
    }
    if(tree.kind==='token'){token(tree.type==='ident'||/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tree.text)?'identifier':'punct',tree.text,tree);return;}
    if(tree.kind==='group'){const span=tree.span??tree.sourceSyntax?.span;token('punct',tree.delimiter,tree,{start:span.start,end:span.start+1});tree.children.forEach(visit);token('punct',pairs[tree.delimiter],tree,{start:span.end-1,end:span.end});return;}
    throw new TypeError('Matches generated owner/hygiene requires another checked source profile');
  };
  expansion.trees.forEach(visit);generated.push({kind:'eof',value:'',start:end,end});
  class OriginalMatchParser extends HostRustParser {
    primary(path,options) {
      const slot=slots.get(this.cursor.peek());
      if(slot){if(slot.fragment!=='expr')throw new TypeError('Pattern AST cannot be projected as a Rust expression');this.cursor.next();return slot.ast;}
      return super.primary(path,options);
    }
    controlPattern(path,first) {
      const slot=slots.get(this.cursor.peek());
      if(slot){if(slot.fragment!=='pat')throw new TypeError('Expression AST cannot be projected as a Rust pattern');this.cursor.next();return slot.ast;}
      return super.controlPattern(path,first);
    }
    match(path){return parseOrderedMatch(this,path);}
  }
  const parser=new OriginalMatchParser([]);
  for(const name of ['modulePath','aliases','sourceNamespaceAliases','sourceNamespaceShadows','sourceNamespaceEvidence','sourceNamespaceBindingEvidence','sourceLexicalValues','shadowedPreludeTypes','shadowedEffectRoots','shadowedBuiltinMacros','shadowedImportedBindings','unresolvedImportScope','unresolvedMacroScope','unresolvedAttributeMacroScope','compilationProfile','genericTypes'])if(Object.hasOwn(originalParser,name))parser[name]=originalParser[name];
  parser.cursor=new TokenCursor(generated,'Rust');const parsed=parser.expr(state.module.path);
  if(!parser.cursor.atEnd()||parsed.k!=='routerOrderedMatch')throw new TypeError('Original macro output did not fully parse as the checked Rust match production');
  // Each opaque source pattern was parsed before transcription. Preserve its
  // actual caller tokens instead of the generated private-slot vocabulary.
  for(const row of parsed.rows){const slot=[...generated].map(token=>slots.get(token)).find(slot=>slot?.fragment==='pat'&&slot.ast===row.pattern);if(slot)row.sourcePattern={pattern:row.pattern,tokens:originalMacroFragmentTokens(fragmentContext,slot.capture),span:{...slot.capture.span}};}
  parsed.span={start,end};const syntaxSha256=metadataDigest(parsed);
  const evidence=freezeMacroTree({schema:'original-matches-expansion-source-proof-v1',call:callProof,definition:{sourcePath:profile.definition.sourcePath,originalSpan:profile.definition.span,sha256:profile.definition.sha256,bytes:profile.definition.bytes},definitionEdition:profile.definitionEdition,definitionEditionSource:{sourcePath:profile.definitionEditionSource.sourcePath,originalSpan:profile.definitionEditionSource.span,sha256:profile.definitionEditionSource.sha256,edition:profile.definitionEditionSource.edition},profileDigest:profile.digest,expansionDigest:expansion.digest,definitionDigest:expansion.definitionDigest,origins,parsedSyntaxSha256:syntaxSha256,originalRuleInterpreted:true,opaqueAstProjectionChecked:true,rustcMacroExecutionObserved:false,macroOwnerResolved:true,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false,constEligible:false});
  proofs.set(evidence,{callProof,expansion,syntaxSha256});
  return {...parsed,constEligible:false,sourceMacro:{name:profile.name,owner:'original-standard-source',span:{start,end},sourceMatchesProof:evidence}};
}
export function isOriginalMatchesExpansionProof(proof){return !!proof&&proofs.has(proof);}
export function parseOriginalMatchesCandidate(parser,path) {
  const c=parser.cursor,first=c.peek();if(!['identifier','macro'].includes(first.kind))return null;
  const segments=[first.value];let tail=c.index;
  while(c.tokens[tail]?.kind==='identifier'&&c.tokens[tail+1]?.value==='::'&&['identifier','macro'].includes(c.tokens[tail+2]?.kind)){tail+=2;segments.push(c.tokens[tail].value);}
  const attached=c.tokens[tail]?.kind==='macro',bang=attached?tail:tail+1;
  if(!attached&&c.tokens[bang]?.value!=='!'||!sourceMatchesCandidate(parser,segments))return null;
  const opening=bang+1,stack=[];let last=opening;
  if(!pairs[c.tokens[opening]?.value])throw unsupported('matches! delimiter','requires original delimited invocation',first);
  for(;last<c.tokens.length;last++){const value=c.tokens[last].value;if(pairs[value])stack.push(pairs[value]);else if(Object.values(pairs).includes(value)){if(stack.pop()!==value)throw new TypeError('Matches original delimiter mismatch');if(!stack.length)break;}}
  if(stack.length||last>=c.tokens.length)throw new TypeError('Matches original delimiter is unterminated');
  const depth=active.get(parser)??0;if(depth>=16)throw new TypeError('Matches original expansion recursion bound exceeded');active.set(parser,depth+1);
  try {
    const start=first.start,end=c.tokens[last].end,call=proveOriginalMatchesCall(parser,{segments,start,end}),facts=originalMatchesCallFacts(call),input=originalMacroInvocation(call.originalInvocation).trees;
    const fragments=createOriginalMacroFragmentContext(parser,input,{sourceStart:start,modulePath:facts.state.module.path,definitionProfile:facts.state.facts.profile});
    const definition=compileDeclarativeMacro(standardMatchesOriginalDefinition(facts.state.facts.profile),{name:facts.state.facts.profile.name,owner:['core'],sourceFragments:fragments});
    const expanded=expandDeclarativeMacro(definition,input),parsed=projectOriginalMatchesExpansion(fragments,expanded,call);
    c.index=last+1;return parsed;
  } catch(error){if(error instanceof TranslationError)throw error;if(!(error instanceof TypeError))throw error;throw unsupported('matches! original source contract',error.message,first);}
  finally {if(depth)active.set(parser,depth);else active.delete(parser);}
}
