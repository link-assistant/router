// A synchronous private SOURCE ABI for one unrestricted borrowed map predicate.
// No opaque map issuer, container-size restriction or observed rustc claim.
import {fileURLToPath} from 'node:url';
import {matchesParserFacts,originalMatchesDependencyProof} from './matches-macro-context.mjs';
import {requireOriginalFromNamespaceCallbacks} from './extensions/host-contracts.mjs';
import {STANDARD_NAMESPACE_EVIDENCE,isStandardNamespaceEvidence} from './namespace-standard.mjs';
import {originalOrderedTextMapStandardSources,requireOriginalOrderedTextMapStandardSources,requireOriginalOrderedMapStandardNamespaceFact,sameOrderedMapSourceData} from './ordered-text-map-callers-20261102-standard-source.mjs';
import {proveBorrowedStandardMapNativeSourceContext,requireBorrowedStandardMapNativeSourceContext} from './borrowed-standard-map-20261103-native-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {createReconcileSourceCapture,requireReconcile as need} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation,withSourceFailureOperation} from './source-failure-operations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const BASE='tools/translation/source-profiles/borrowed-standard-map-native-20261103/';
const assets=[
 ['rust/src/borrowed_standard_map_20261102.rs','kernel.rs.txt','Rust'],
 ['tools/translation/borrowed-standard-map-20261102-runtime.mjs','runtime.mjs.txt','JavaScript'],
 ['tools/translation/borrowed-standard-map-20261102-runtime.d.mts','runtime.d.mts.txt','TypeScript'],
 ['rust/tests/borrowed_standard_map_20261102_test.rs','oracle.rs.txt','Rust'],
];
const issued=new WeakMap(),fail=message=>{throw TypeError('Borrowed standard-map native source ABI: '+message);};
const path='crate::borrowed_standard_map_20261102::borrowed_text_map_matches_literals';
const signature='pubfnborrowed_text_map_matches_literals(map:&::std::collections::BTreeMap<::std::string::String,::std::string::String>,key:&str,literals:&[&str],)->bool';
function actualMember(modules,sourceScopes,kernel){
 const leaves=modules.filter(module=>module.path.join('::')==='borrowed_standard_map_20261102');
 if(leaves.length!==1||leaves[0].source!==kernel)fail('one complete actual native kernel required');
 const leaf=leaves[0],members=originalSourceModuleItems(leaf).filter(item=>item.term==='fn'&&item.name==='borrowed_text_map_matches_literals');
 if(members.length!==1)fail('actual native function declaration required');
 const member=members[0],tokens=member.tokens.filter(token=>token.type!=='comment'),start=tokens.findIndex(token=>token.text==='pub'),open=tokens.findIndex((token,at)=>at>start&&token.text==='{');
 if(start<0||open<0||tokens.slice(start,open).map(token=>token.text).join('')!==signature)fail('complete monomorphic borrowed signature differs');
 const scopes=sourceScopes.filter(scope=>scope.file===leaf.file&&scope.path.join('::')===leaf.path.join('::'));
 if(scopes.length!==1)fail('actual native function scope required');
 const bindings=scopes[0].bindings.filter(binding=>binding.namespace==='value'&&binding.name===member.name);
 if(bindings.length!==1)fail('one original native function binding required');
 const binding=bindings[0];
 if(binding.status!=='resolved'||binding.kind!=='fn'||binding.via!=='declaration'||binding.source!==leaf.file||binding.target?.join('::')!==path||binding.span?.start!==member.start||binding.span?.end!==member.end)fail('actual function declaration binding differs');
 return {leaf,member,binding,scope:scopes[0]};
}
function standardOwners(sources){
 requireOriginalOrderedTextMapStandardSources(sources);
 for(const target of ['std::collections::BTreeMap','std::string::String']){
  const original=sources.facts.filter(fact=>fact.target.join('::')===target),facts=STANDARD_NAMESPACE_EVIDENCE.facts.filter(fact=>fact.target.join('::')===target);
  if(original.length!==1||facts.length!==1||!isStandardNamespaceEvidence(facts[0]))fail('genuine standard source owner required: '+target);
  requireOriginalOrderedMapStandardNamespaceFact(facts[0]);
  if(!sameOrderedMapSourceData(original[0].route,facts[0].route))fail('fresh original standard owner route differs');
 }
}
/** Receipt is usable only inside this original synchronous source operation. */
export function withBorrowedStandardMapNativeSourceABI(parser,run){
 requireSynchronousSourceCallback(run);
 return withSourceFailureOperation(()=>{
  const {frame,input,sources,context}=withSourceInputValidation(()=>{
   requireOriginalFromNamespaceCallbacks(parser);const frame=matchesParserFacts(parser),facts=frame.facts;
   const sources=originalOrderedTextMapStandardSources(),input={modules:facts.modules,sourceScopes:facts.evidence.scopes,compilationProfile:facts.compilationProfile,cargoEditionContext:facts.cargoEditionContext,deriveDependencies:originalMatchesDependencyProof(facts),standardSources:sources};
   return {frame,input,sources,context:proveBorrowedStandardMapNativeSourceContext(input)};
  });
  const capture=createReconcileSourceCapture(ROOT);let active=true,receipt;
  const current=()=>withSourceInputValidation(()=>{
   requireOriginalFromNamespaceCallbacks(parser);if(matchesParserFacts(parser)!==frame)fail('actual private parser frame changed');
   requireBorrowedStandardMapNativeSourceContext(context,input);standardOwners(sources);
   if(receipt){const next=actualMember(input.modules,input.sourceScopes,receipt.sources[0].source),row=issued.get(receipt);if(!row||next.leaf!==row.member.leaf||next.member!==row.member.member||next.binding!==row.member.binding||next.scope!==row.member.scope)fail('actual native member association changed');}
  });
  try{return withCompleteSourceClosingFence(()=>{
   const selected=withSourceInputValidation(()=>createRulePipeline([{phase:'language',rules:[{id:'language:actual-standard-map-source-and-kernel-CST',apply:()=>{
    current();return assets.map(([path,original,language])=>{
     const expected=capture.capture(BASE+original).source,source=capture.capture(path).source;need(typeof expected==='string'&&source===expected,'complete original borrowed-map ABI source differs');
     const concrete=transportConcreteSyntaxSource(source,{language});if(concrete.source!==source||transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete ABI source CST roundtrip differs');
     return Object.freeze({path,source,language,concreteMeta:concrete.meta});
    });
   }}]},{phase:'repository',rules:[{id:'repository:actual-router-borrowed-map-native-member',apply:rows=>{
    const member=actualMember(input.modules,input.sourceScopes,rows[0].source);
    receipt=Object.freeze({schema:'private-borrowed-standard-map-native-source-ABI-20261103-v1',path,parameters:Object.freeze(['shared-standard-BTreeMap-String-String','shared-str','shared-literal-str-slice']),returns:'bool',literalLimit:64,containerEntryLimit:null,valueByteLimit:null,returnsLoan:false,nativeInternalsUntranslated:true,actualInvocationObserved:false,nativeSysrootConformance:false,callerBodyQualified:false,runtimeParity:false,nativeOracleQualification:'UNRUN',sources:Object.freeze(rows)});
    issued.set(receipt,{parser,member,current,alive:()=>active});return receipt;
   }}]}]).run(null).value);
   current();return run(selected);
  },[current,()=>withSourceInputValidation(capture.close)]);}finally{active=false;if(receipt)issued.delete(receipt);}
 });
}
export function requireBorrowedStandardMapNativeSourceABI(value,{parser}={}){
 return withSourceInputValidation(()=>{const row=issued.get(value);if(!row||!row.alive()||row.parser!==parser)fail('foreign, copied or expired source ABI receipt');row.current();return value;});
}
