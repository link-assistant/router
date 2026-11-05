// Private source observations, not a public structural type/owner registry.
// Every observation is rejoined to its genuine original parser and full library.
import {withOrderedTextMapPairSourceCapture} from './ordered-text-map-callers-20261102-pair-types.mjs';
import {matchesParserFacts,originalMatchesDependencyProof} from './matches-macro-context.mjs';
import {requireOrderedTextMapNativeSourceABI} from './ordered-text-map-callers-20261102-native-abi.mjs';
import {requireOrderedTextMapNativeLibraryOwners} from './ordered-text-map-callers-20261102-native-owner.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {selectOriginalOrderedTextMapCore} from './ordered-text-map-20261102-interface.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {copyMetadata,metadataDigest,originalParsedDeclarationEvidence,originalParsedSyntaxNode} from './extensions/source-links.mjs';
import {requireOriginalPrimitiveTryFromChecker,originalJsonCaptureCheckerEligible,requireOriginalFromNamespaceCallbacks} from './extensions/host-contracts.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {freshlyCheckOrderedTextMapCaller,hasOrderedTextMapCaller} from './ordered-text-map-callers-20261102-requalification.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
const observations=new WeakMap(),capturedTypes=new WeakMap();
const kind='routerOrderedTextMap';
const words=['crate','::','translation_ordered_text_map_core','::','OrderedTextMap'];
const fail=()=>{throw TypeError('Ordered text map requires its genuine current opaque source type');};
function library(parser){
 requireOriginalFromNamespaceCallbacks(parser);
 const state=matchesParserFacts(parser),selected=selectOriginalOrderedTextMapCore({modules:state.facts.modules,sourceScopes:state.facts.evidence.scopes,compilationProfile:state.facts.compilationProfile});
 const module=state.facts.modules.find(row=>row.file===selected.file),owners=originalSourceModuleItems(module).filter(item=>item.term==='struct'&&item.name==='OrderedTextMap');
 const scope=state.facts.evidence.scopes.find(row=>row.file===module.file&&row.path.join('::')==='translation_ordered_text_map_core');
 const bindings=scope?.bindings.filter(row=>row.namespace==='type'&&row.name==='OrderedTextMap');
 if(owners.length!==1||bindings?.length!==1)fail();
 const owner=owners[0],binding=bindings[0];
 if(binding.status!=='resolved'||binding.kind!=='struct'||binding.via!=='declaration'||binding.source!==module.file||binding.target?.join('::')!=='crate::translation_ordered_text_map_core::OrderedTextMap'||binding.span.start!==owner.start||binding.span.end!==owner.end||binding.declaration?.source!==module.file||binding.declaration.span?.start!==owner.start||binding.declaration.span?.end!==owner.end)fail();
 // The complete library transports its serialized/reparsed lossless CST on
 // each call. A pin, registered spelling or catalogue entry is never enough.
 const view=module.sourceView,closeSource=()=>{const next=selectOriginalOrderedTextMapCore({modules:state.facts.modules,sourceScopes:state.facts.evidence.scopes,compilationProfile:state.facts.compilationProfile});if(next.source!==selected.source||next.file!==selected.file||next.rootFile!==selected.rootFile||next.span[0]!==selected.span[0]||next.span[1]!==selected.span[1])fail();},closeParser=()=>{if(matchesParserFacts(parser)!==state)fail();},closeOwner=()=>{if(module.sourceView!==view||!originalSourceModuleItems(module).includes(owner)||!scope.bindings.includes(binding))fail();};
 return withCompleteSourceClosingFence(()=>{const nativeAbi=requireOrderedTextMapNativeLibraryOwners({modules:state.facts.modules,sourceScopes:state.facts.evidence.scopes,compilationProfile:state.facts.compilationProfile,cargoEditionContext:state.facts.cargoEditionContext,deriveDependencies:originalMatchesDependencyProof(state.facts),parser});const stage=createRulePipeline([{phase:'language',rules:[{id:'ordered-map:complete-native-source-CST-roundtrip',apply:()=>{
  const concrete=transportConcreteSyntaxSource(selected.source,{language:'Rust'});
  if(concrete.source!==selected.source||transportConcreteSyntaxMeta(concrete.meta).source!==selected.source)fail();return concrete;
 }}]},{phase:'repository',rules:[{id:'router:actual-private-field-newtype-owner',apply:value=>value}]}]).run(null);
 return {state,selected,module,view,owner,binding,stage,nativeAbi};},[closeSource,closeParser,closeOwner]);
}
function current(row){
 if(row.sourceJoin)row.sourceJoin();
 requireOrderedTextMapNativeSourceABI(row.library.nativeAbi,{parser:row.parser});
 const next=library(row.parser);
 if(next.state!==row.library.state||next.module!==row.library.module||next.view!==row.library.view||next.owner!==row.library.owner||next.binding!==row.library.binding||next.selected.source!==row.library.selected.source||next.selected.rootFile!==row.library.selected.rootFile||metadataDigest(row.type)!==row.snapshot)fail();
 return row;
}
function remember(type,parser,selected,sourceJoin=null){const row={type,parser,library:selected,snapshot:metadataDigest(type),sourceJoin};observations.set(type,row);return type;}
export function parseOrderedTextMapOpaqueType(parser){
 const c=parser.cursor,start=c.index;let offset=0,shared=false;
 if(c.is('&')){shared=true;offset=1;}
 if(!words.every((word,at)=>c.is(word,offset+at)))return null;
 const first=c.peek(),last=c.peek(offset+4),span={start:first.start,end:last.end};
 if([0,2,4].some(at=>c.peek(offset+at)?.kind!=='identifier')||['<','::'].some(word=>c.is(word,offset+5)))throw unsupported('ordered text map type','requires its complete monomorphic qualified opaque type',span);
 let selected;try{selected=library(parser);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('ordered text map type',error.message,span);}
 const tokens=c.tokens,actual=tokens.slice(start,start+offset+5),pointee=remember(Object.freeze({kind,rustSourceType:true,rustOwnership:Object.freeze({kind:'owned',source:'crate::translation_ordered_text_map_core::OrderedTextMap'})}),parser,selected);
 let type=pointee;
 if(shared)type=remember(Object.freeze({...pointee,rustOwnership:Object.freeze({kind:'borrowed',source:'crate::translation_ordered_text_map_core::OrderedTextMap'}),patternOwnershipRefusal:'shared source reference',rustReference:Object.freeze({kind:'shared',pointee,span:Object.freeze(span),tokens:Object.freeze(actual.map(token=>Object.freeze({kind:token.kind,value:token.value,span:Object.freeze({start:token.start,end:token.end})})))})}),parser,selected);
 current(observations.get(type));
 if(parser.cursor!==c||c.tokens!==tokens||c.index!==start||actual.some((token,at)=>tokens[start+at]!==token))fail();c.index+=offset+5;return type;
}
// Type resolution may preserve this exact issued object. A clone cannot be
// resealed by copying kind, ownership, source bytes, span or a source digest.
export function requireOrderedTextMapOpaqueType(type,{shared=false}={}){
 const row=observations.get(type);if(!row)fail();current(row);
 if(shared?type.rustReference?.kind!=='shared'||!observations.has(type.rustReference.pointee):type.rustReference||type.rustOwnership?.kind!=='owned')fail();
 return type;
}
export function isOrderedTextMapOpaqueType(type,{shared=false}={}){
 if(!observations.has(type))return false;if(Boolean(type.rustReference)!==shared)return false;requireOrderedTextMapOpaqueType(type,{shared});return true;
}
// A parser operation can request its result's genuine opaque native owner. This
// returns a source type observation only, never a checked operation receipt.
export function orderedTextMapResultType(parser){
 const selected=library(parser);
 return remember(Object.freeze({kind,rustSourceType:true,rustOwnership:Object.freeze({kind:'owned',source:'crate::translation_ordered_text_map_core::OrderedTextMap'})}),parser,selected);
}
export function orderedTextMapTypeSource(type){
 const row=current(observations.get(type)??fail());
 return Object.freeze({file:row.library.module.file,source:row.library.module.source,trace:copyMetadata(row.library.stage.trace),sourceAuthority:false,semanticAuthority:false});
}

export function orderedTextMapOpaqueTypeKey(type){
 if(type?.kind!=='routerOrderedTextMap')return null;
 requireOrderedTextMapOpaqueType(type,{shared:Boolean(type.rustReference)});
 return 'opaque:crate::translation_ordered_text_map_core::OrderedTextMap:'+ (type.rustReference?'shared':'owned');
}
export function preserveOrderedTextMapOpaqueResult(value){
 if(value?.type?.kind!=='routerOrderedTextMap')return null;
 requireOrderedTextMapOpaqueType(value.type,{shared:Boolean(value.type.rustReference)});return value;
}
// The ordinary source linker must retain type-node origins as well as call
// origins. The source successor below changes only custody, never authority.
// Native type observations are reissued from those original private nodes;
// copied tags/checksums and a public source span are insufficient.
export function withOrderedTextMapSourceTypeCapture(checker,surface,run){
 requireOriginalPrimitiveTryFromChecker(checker);
 if(!originalJsonCaptureCheckerEligible(checker)||capturedTypes.has(checker))fail();
 const records=new WeakMap(),sourceItems=[];capturedTypes.set(checker,records);let cells=200000;
 const capture=(item)=>{
  if(!originalParsedDeclarationEvidence(item))return;
  sourceItems.push({item,snapshot:metadataDigest(item)});
  const visit=(node,depth=0)=>{
   if(!node||typeof node!=='object')return;if(--cells<0||depth>160)fail();
   if(node.kind==='routerOrderedTextMap'){
    if(item.k==='data')throw unsupported('ordered text map aggregate','record/tuple/serde ownership integration remains open',item.span);
    const origin=originalParsedSyntaxNode(item,node),original=origin&&observations.get(origin.original);
    if(!origin||!original||origin.parser!==original.parser||origin.actual!==node||metadataDigest(origin.relocated)!==metadataDigest(node))fail();
    current(original);records.set(node,{item,node,original,origin,snapshot:metadataDigest(node)});
   }
   for(const [key,value]of Object.entries(node))if(key!=='span')for(const child of Array.isArray(value)?value:[value])visit(child,depth+1);
  };visit(item);
 };
 const items=(rows,depth=0)=>{if(--cells<0||depth>160)fail();for(const item of rows)if(item.k==='module')items(item.items,depth+1);else if(['fn','data'].includes(item.k))capture(item);};
 const close=()=>{requireOriginalPrimitiveTryFromChecker(checker);if(capturedTypes.get(checker)!==records)fail();for(const row of sourceItems)if(!originalParsedDeclarationEvidence(row.item)||metadataDigest(row.item)!==row.snapshot)fail();};
 try{return withCompleteSourceClosingFence(()=>{items(surface.items);close();return withOrderedTextMapPairSourceCapture(checker,surface,run);},[close]);}finally{capturedTypes.delete(checker);sourceItems.length=0;}
}
export function resolveOrderedTextMapOpaqueType(checker,type){
 if(type?.kind!=='routerOrderedTextMap')return null;
 requireOriginalPrimitiveTryFromChecker(checker);
 if(observations.has(type))return requireOrderedTextMapOpaqueType(type,{shared:Boolean(type.rustReference)});
 const row=capturedTypes.get(checker)?.get(type);if(!row)fail();
 const join=()=>{requireOriginalPrimitiveTryFromChecker(checker);const origin=originalParsedSyntaxNode(row.item,row.node);if(!originalParsedDeclarationEvidence(row.item)||!origin||origin.actual!==row.node||origin.parser!==row.origin.parser||origin.original!==row.origin.original||metadataDigest(origin.relocated)!==row.snapshot||metadataDigest(row.node)!==row.snapshot)fail();current(row.original);};
 join();let result={...copyMetadata(type)};
 if(result.rustReference){const pointee=resolveOrderedTextMapOpaqueType(checker,type.rustReference.pointee);result={...result,rustReference:Object.freeze({...result.rustReference,pointee})};}
 const value=remember(Object.freeze(result),row.original.parser,row.original.library,join);join();return value;
}

// Meta decoding never preserves private handles. Reconstruct the genuine
// whole function first, compare all checked operands/body/signature, and only
// then associate corresponding opaque observations with the decoded type nodes.
export function reissueOrderedTextMapFunction(candidate,program=null){
 if(!hasOrderedTextMapCaller(candidate))return candidate;
 const checked=freshlyCheckOrderedTextMapCaller(candidate,{program});if(!checked)fail();
 let cells=200000;
 const visit=(actual,fresh,depth=0)=>{
  if(!actual||typeof actual!=='object')return;if(--cells<0||depth>160||!fresh||typeof fresh!=='object')fail();
  if(actual.kind==='routerOrderedTextMap'){
   const original=observations.get(fresh);if(!original||metadataDigest(actual)!==metadataDigest(fresh))fail();current(original);
   remember(actual,original.parser,original.library,()=>{current(original);});
  }
  for(const [key,value]of Object.entries(actual))if(value&&typeof value==='object')visit(value,fresh[key],depth+1);
 };
 visit(candidate.params,checked.fresh.params);visit(candidate.ret,checked.fresh.ret);visit(candidate.body,checked.fresh.body);return candidate;
}
export function reissueOrderedTextMapProgram(program){
 if(!(program?.declarations instanceof Map)||!Array.isArray(program.items))fail();
 const qualified=new Map();
 for(const [name,entry]of program.declarations)if(entry.k==='fn'&&hasOrderedTextMapCaller(entry)){reissueOrderedTextMapFunction(entry,program);qualified.set(name,entry);}
 for(const entry of program.items)if(entry.k==='fn'&&hasOrderedTextMapCaller(entry)){
  if(!qualified.has(entry.fullName))fail();reissueOrderedTextMapFunction(entry,program);
 }
 return program;
}

export function assertOrderedTextMapOpaqueBoundary(actual,expected){
 if(actual?.kind!=='routerOrderedTextMap'&&expected?.kind!=='routerOrderedTextMap')return false;
 const key=orderedTextMapOpaqueTypeKey(actual);if(key===null||expected&&orderedTextMapOpaqueTypeKey(expected)!==key)fail();return true;
}
