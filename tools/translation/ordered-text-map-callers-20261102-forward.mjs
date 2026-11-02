// Receiving fragments for the existing private Host issuer. These functions
// return ordinary checked-candidate IR; only that issuer can grant executable IR.
import {actualOrderedTextMapPairVector} from './ordered-text-map-callers-20261102-pair-types.mjs';
import {checkedOrderedTextMapKeysType} from './ordered-text-map-callers-20261102-keys.mjs';
import {orderedTextMapContract} from './ordered-text-map-20261102-contracts.mjs';
import {selectOriginalOrderedTextMapCore} from './ordered-text-map-20261102-interface.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {forwardOwnedString} from './owned-forward-domain.mjs';
import {SOURCE_STRING,SOURCE_STR} from './extensions/source-contract-types.mjs';
import {requireBorrowedString} from './extensions/string-iterators.mjs';
import {BOOL,rustFixedType,sameType} from './checked-types.mjs';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {requireOrderedTextMapOpaqueType,orderedTextMapResultType,orderedTextMapTypeSource} from './ordered-text-map-callers-20261102-native-types.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
const calls=new WeakMap();
const fail=()=>{throw TypeError('Ordered text map requires its original private parsed call and native owner');};
const supported=new Set(['new','insert','remove','get','contains','len','copy','keys','from_pairs','pairs']);
function source(parser,row){
 const state=matchesParserFacts(parser),selected=selectOriginalOrderedTextMapCore({modules:state.facts.modules,sourceScopes:state.facts.evidence.scopes,compilationProfile:state.facts.compilationProfile}),module=state.facts.modules.find(module=>module.file===selected.file);
 const owners=originalSourceModuleItems(module).filter(item=>item.term==='fn'&&item.name===row.rustName);
 const scope=state.facts.evidence.scopes.find(scope=>scope.file===module.file&&scope.path.join('::')==='translation_ordered_text_map_core'),bindings=scope?.bindings.filter(binding=>binding.namespace==='value'&&binding.name===row.rustName);
 if(owners.length!==1||bindings?.length!==1)fail();const owner=owners[0],binding=bindings[0];
 if(binding.status!=='resolved'||binding.kind!=='fn'||binding.via!=='declaration'||binding.source!==module.file||binding.target?.join('::')!==row.rustPath||binding.span.start!==owner.start||binding.span.end!==owner.end||binding.declaration?.source!==module.file||binding.declaration.span?.start!==owner.start||binding.declaration.span?.end!==owner.end)fail();
 // Issuance of a map result also freshly checks the full native CST and private
 // newtype binding; this is not an operation-name or checksum acceptance path.
 const type=orderedTextMapResultType(parser);orderedTextMapTypeSource(type);
 return {state,module,view:module.sourceView,owner,binding,type};
}
function rejoin(parser,row,before){const after=source(parser,row);if(after.state!==before.state||after.module!==before.module||after.view!==before.view||after.owner!==before.owner||after.binding!==before.binding)fail();}
export function parseForwardOrderedTextMap(parser,path){
 const c=parser.cursor;
 if(!['crate','::','translation_ordered_text_map_core','::'].every((word,at)=>c.is(word,at)))return null;
 const row=orderedTextMapContract(c.peek(4)?.value);if(!row||row.rustName!==c.peek(4).value)return null;
 if(!supported.has(row.operation))throw unsupported('ordered text map caller','pair-list tuple ownership integration remains open',c.peek());
 const before=source(parser,row),tokens=c.tokens,start=c.index,first=c.peek();let end=null;
 return withCompleteSourceClosingFence(()=>{
  c.index+=5;c.expect('(','ordered text map call');const args=[];
  while(!c.is(')')){if(args.length>=row.parameters.length)throw typeError('ordered text map arity differs',c.peek());args.push(parser.expr(path));if(!c.eat(','))break;}
  const last=c.expect(')','ordered text map call');end=c.index;
  if(args.length!==row.parameters.length)throw typeError('ordered text map arity differs',first);
  const node={k:'routerCoreJsonUpdateCall',operation:row.javascriptName,args,span:{start:first.start,end:last.end}};
  calls.set(node,{parser,row,before,snapshot:metadataDigest(node)});return {node,trace:orderedTextMapTypeSource(before.type).trace};
 },[()=>{rejoin(parser,row,before);},()=>{if(parser.cursor!==c||c.tokens!==tokens||end!==null&&c.index!==end||!Number.isSafeInteger(c.index)||c.index<start||c.index>tokens.length)fail();}]);
}
const integer=()=>({...rustFixedType('u64'),rustPrimitiveName:'u64',rustSourceType:true});
function compatible(checker,actual,expected,path,span){if(!expected)return;if(!sameType(actual,expected))throw typeError('ordered text map result type differs',span);checker.expectedOwnership(actual,expected,path,span);checker.expectedPrimitiveIdentity(actual,expected,path,span);}
export function checkForwardOrderedTextMap(checker,node,env,path,expected,{current,sourceNode=node}){
 requireOriginalPrimitiveTryFromChecker(checker);current();const capture=calls.get(sourceNode),nodeSnapshot=metadataDigest(node);
 // Relocated syntax joins its actual original parsed node through the parent
 // issuer's private originalParsedSyntaxNode receipt, never a copied marker.
 if(!capture||metadataDigest(sourceNode)!==capture.snapshot||node.operation!==sourceNode.operation||node.args.length!==sourceNode.args.length)fail();const {parser,row,before}=capture;
 const close=()=>{requireOriginalPrimitiveTryFromChecker(checker);current();rejoin(parser,row,before);if(metadataDigest(sourceNode)!==capture.snapshot||metadataDigest(node)!==nodeSnapshot)fail();};
 return withCompleteSourceClosingFence(()=>{
  close();const args=[];
  for(let index=0;index<row.parameters.length;index++){
   const role=row.parameters[index],syntax=node.args[index],borrow=role==='text-map-ref'&&syntax?.k==='routerTextReference';
   if(borrow&&(syntax.sourceBorrowToken?.value!=='&'||syntax.sourceBorrowToken.span?.end-syntax.sourceBorrowToken.span?.start!==1||syntax.value?.k==='routerTextReference'))throw unsupported('ordered text map borrow','requires a single genuine written shared borrow',syntax.span);
   const value=checker.expr(borrow?syntax.value:syntax,env,path,role==='text-owned'?SOURCE_STRING:role==='str'?SOURCE_STR:undefined);close();
   if(role==='text-map')requireOrderedTextMapOpaqueType(value.type);
   else if(role==='text-map-ref')requireOrderedTextMapOpaqueType(value.type,{shared:!borrow});
   else if(role==='text-owned'){if(!forwardOwnedString(value.type))throw unsupported('ordered text map owned text','requires actual owned standard String',syntax.span);checker.expectedOwnership(value.type,SOURCE_STRING,path,syntax.span);}
   else if(role==='str'){requireBorrowedString(value.type,syntax.span);if(value.type.patternOwnershipRefusal)throw unsupported('ordered text map key','requires actual borrowed standard scalar text',syntax.span);checker.expectedOwnership(value.type,SOURCE_STR,path,syntax.span);}
   else if(role==='text-pairs-owned'){if(!actualOrderedTextMapPairVector(checker,value.type))throw unsupported('ordered map pair input','requires actual parsed Vec<(String,String)> signature and original checked tuple fields',syntax.span);}
   else throw unsupported('ordered text map argument','complete argument ownership integration remains open',syntax.span);
   args.push(value);
  }
  const type=row.returns==='text-map'?orderedTextMapResultType(parser):row.returns==='bool'?BOOL:row.returns==='u64'?integer():row.returns==='str-option-ref'?checker.instantiations.option(SOURCE_STR,node.span):row.operation==='keys'?checkedOrderedTextMapKeysType(checker,node,path):row.operation==='pairs'&&actualOrderedTextMapPairVector(checker,expected)?expected:null;
  if(!type)throw unsupported('ordered map pair result','requires an actual parsed Vec<(String,String)> result context; inferred owned products remain refused',node.span);compatible(checker,type,expected,path,node.span);close();
  return {k:'routerHostCall',id:row.javascriptName,args,type,span:node.span,constEligible:false};
 },[close]);
}
// No public map object or candidate checked node is accepted by emission.
// The existing parent's genuine current whole-body receipt must authorize it.
export function emitForwardOrderedTextMap(emitter,node,{requireCurrentPrivateCall}){
 requireCurrentPrivateCall(node);const row=orderedTextMapContract(node.id);
 if(node.k!=='routerHostCall'||!row||!supported.has(row.operation)||node.args.length!==row.parameters.length)fail();
 const text='ml_host_'+row.javascriptName+'('+node.args.map(argument=>emitter.expr(argument)).join(', ')+')';
 requireCurrentPrivateCall(node);(emitter.orderedTextMaps??=new Set()).add(row.javascriptName);return text;
}
export function orderedTextMapForwardImports(names,runtimeModule='./runtime/ordered-text-map-20261102-runtime.mjs'){
 if(!names?.size)return [];const imports=[...names].sort();for(const name of imports){const row=orderedTextMapContract(name);if(!row||row.javascriptName!==name||!supported.has(row.operation))fail();}
 const pairs=imports.filter(name=>['router_text_map_from_pairs','router_text_map_pairs'].includes(name)),raw=imports.filter(name=>!pairs.includes(name)),result=[];if(raw.length)result.push('import { '+raw.map(name=>name+' as ml_host_'+name).join(', ')+' } from '+JSON.stringify(runtimeModule)+';');if(pairs.length){const bridge=runtimeModule.replace(/ordered-text-map-20261102-runtime\.mjs$/u,'ordered-text-map-callers-20261102-pair-runtime.mjs');if(bridge===runtimeModule)fail();result.push('import { '+pairs.map(name=>(name==='router_text_map_pairs'?'router_text_map_tuple_pairs':'router_text_map_from_tuple_pairs')+' as ml_host_'+name).join(', ')+' } from '+JSON.stringify(bridge)+';');}return result;
}
