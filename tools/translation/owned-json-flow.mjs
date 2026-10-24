// A closed per-function linear/lexical-loan analysis for actual owned JSON
// operations. Its caller authenticates the original declaration and checked body.
// This grants no public IR, arbitrary Drop, or source lifetime authority.
import {JSON_CONTRACTS,JSON_DATA,JSON_TYPES} from './extensions/json-contracts.mjs';
import {sameType} from './checked-types.mjs';
import {jsonIterationContract} from './json-iteration-contracts.mjs';
import {jsonStateContract} from './owned-forward-contracts.mjs';
import {canonicalResult} from './extensions/result-iterators.mjs';
import {isForwardOwnedCarrier} from './owned-forward-domain.mjs';
import {hasOriginalCallbackLoan,hasOriginalSourceFrame,originalCallbackLoanInputMatches} from './extensions/standard-source-frame.mjs';
import {hasOriginalSharedDomainGuard} from './extensions/standard-borrowed-body.mjs';
import {sharedReferenceCopyIdentity} from './shared-reference-copy-source.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
const linear=kind=>kind==='json'||kind==='linear'||kind==='json-vector'||kind==='owned-text'||kind==='loan-result',path=parts=>JSON.stringify(parts);
const empty=()=>({loans:new Map(),tags:null});
const copy=value=>({loans:new Map([...value.loans].map(([key,roots])=>[key,new Set(roots)])),tags:value.tags&&new Set(value.tags),...(value.localLoanType?{localLoanType:value.localLoanType,localLoanOrigin:value.localLoanOrigin}:{})});
function union(left,right){const result=copy(left);for(const [key,roots]of right.loans)result.loans.set(key,new Set([...(result.loans.get(key)??[]),...roots]));result.tags=left.tags&&right.tags?new Set([...left.tags,...right.tags]):null;return result;}
function prefix(value,part){return {loans:new Map([...value.loans].map(([key,roots])=>[path([part,...JSON.parse(key)]),new Set(roots)])),tags:null};}
function project(value,part){return {loans:new Map([...value.loans].filter(([key])=>JSON.parse(key)[0]===part).map(([key,roots])=>[path(JSON.parse(key).slice(1)),new Set(roots)])),tags:null};}
const roots=value=>new Set([...value.loans.values()].flatMap(value=>[...value]));
// Failure diagnostics only: never used to accept a type, call or source body.
// The existing guard has already failed before this bounded traversal runs.
export function describeOwnedJsonDifference(actual,expected,{propertyOrder=false}={}){
 let remaining=4096;
 const preview=value=>value===undefined?'undefined':value===null?'null':typeof value==='string'?value.slice(0,120):typeof value==='object'?(Array.isArray(value)?'array':'object'):String(value);
 const visit=(a,b,path,depth)=>{
  if(--remaining<0||depth>64)return {path,reason:'diagnostic bound'};
  if(a===b)return null;
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return {path,actual:preview(a),expected:preview(b)};
  if(Array.isArray(a)!==Array.isArray(b))return {path,actual:preview(a),expected:preview(b)};
  const names=Object.keys(a),wanted=Object.keys(b);if(!propertyOrder){names.sort();wanted.sort();}
  if(names.length!==wanted.length)return {path,reason:'own key count',actual:names.length,expected:wanted.length};
  for(let at=0;at<names.length;at++)if(names[at]!==wanted[at])return {path,reason:'own key',actual:names[at].slice(0,120),expected:wanted[at].slice(0,120)};
  for(const name of names){const found=visit(a[name],b[name],path+'/'+name.slice(0,48),depth+1);if(found)return found;}
  return null;
 };
 return visit(actual,expected,'',0);
}
export function validateOwnedJsonFlow(checker,entry,{genuine,genuineTextMatch,closedErrors=null,closedOption=null}) {
 const refuse=(detail,node,comparison=null)=>{const diagnostic=comparison??closedErrors?.diagnostic?.(node);throw unsupported('owned JSON flow',detail+(diagnostic?' [comparison '+JSON.stringify(diagnostic)+']':''),node?.span??entry.span);};
 const standardContext=closedErrors??closedOption;
 let cells=100000,callCount=0,selectedOptionTypes=null,optionalParseBoundary=null,ownedStateVectorBoundary=null;
 const hasOptionalParse=()=>{
  if(optionalParseBoundary!==null)return optionalParseBoundary;
  const visit=(node,depth=0)=>{if(!node||typeof node!=='object')return false;if(--cells<0||depth>160)refuse('optional parser source boundary bound',entry);if(node.k==='routerHostCall'&&['router_core_json_parse','router_core_json_parse_bytes'].includes(node.id)&&genuine(node,entry))return true;for(const [key,value]of Object.entries(node))if(!['type','span','compatibilityCore','pinnedStandardBodyProof','sourceFrameProof','originalCallbackProof','originalLoanProof','sharedBodyProof','sourceSharedPatternProof'].includes(key))for(const child of Array.isArray(value)?value:[value])if(visit(child,depth+1))return true;return false;};
  return optionalParseBoundary=visit(entry.body);
 };
 const hasOwnedStateVectorBoundary=()=>{
  if(ownedStateVectorBoundary!==null)return ownedStateVectorBoundary;
  const visit=(node,depth=0)=>{if(!node||typeof node!=='object')return false;if(--cells<0||depth>160)refuse('owned state Vec source boundary bound',entry);const row=node.k==='routerHostCall'?jsonStateContract(node.id):null;if(row&&(row.returns==='owned-json-list'||row.parameters.includes('owned-json-list'))&&genuine(node,entry))return true;for(const [key,value]of Object.entries(node))if(!['type','span','compatibilityCore','pinnedStandardBodyProof','sourceFrameProof','originalCallbackProof','originalLoanProof','sharedBodyProof','sourceSharedPatternProof'].includes(key))for(const child of Array.isArray(value)?value:[value])if(visit(child,depth+1))return true;return false;};
  return ownedStateVectorBoundary=visit(entry.body);
 };
 let ownedCarrierBoundary=null;
 const hasOwnedCarrierBoundary=()=>{
  if(ownedCarrierBoundary!==null)return ownedCarrierBoundary;
  const visit=(node,depth=0)=>{if(!node||typeof node!=='object')return false;if(--cells<0||depth>160)refuse('owned carrier source-bound flow census exceeded',entry);if(node.k==='routerHostCall'&&jsonStateContract(node.id)?.family==='carrier'&&genuine(node,entry))return true;for(const [key,value]of Object.entries(node))if(!['type','span','compatibilityCore','pinnedStandardBodyProof','sourceFrameProof','originalCallbackProof','originalLoanProof','sharedBodyProof','sourceSharedPatternProof'].includes(key))for(const child of Array.isArray(value)?value:[value])if(visit(child,depth+1))return true;return false;};return ownedCarrierBoundary=visit(entry.body);
 };
 const carrierType=(type,node)=>{
  const owner=type?.kind==='data'?checker.items.get(type.name):null,source=type?.rustStandardGeneric??owner?.standardGeneric;if(!['Option','Result'].includes(source?.kind)||!source.arguments?.length)return false;
  const payload=checker.resolveType(source.arguments[0],owner?.modulePath??entry.modulePath,node?.span??entry.span);if(canonical(payload,node)!=='serde_json::Value')return false;
  return isForwardOwnedCarrier(checker,type,entry.modulePath,node?.span??entry.span,(_checker,type,span,shared)=>{if(shared||canonical(type,node)!=='serde_json::Value')refuse('actual owned carrier canonical JSON payload required',node);});
 };
 const ownedText=type=>type?.kind==='string'&&!type.rustReference&&!type.rustBorrowingUnresolved&&!type.rustGenericIdentityUnresolved&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String'&&[undefined,'ownership-bearing String type','owned String source type','owned String formatting'].includes(type.patternOwnershipRefusal);
 const resultOwner=(type,node)=>{const result=canonicalResult(checker,type,entry.modulePath,node?.span??entry.span,false);if(!result||!ownedText(result.error))refuse('requires actual canonical Result with owned standard String error',node);return result;};
 const canonical=(type,node)=>{
  if(type?.kind!=='data'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return null;
  const owner=checker.items.get(type.name),name=owner?.hostTypePath?.join('::');
  if(!['serde_json::Value','serde_json::Map_String_Value'].includes(name))return null;
  const original=JSON_DATA[0].items.find(item=>item.name===owner.hostTypePath[1]);
  if(owner.generated!=='router-json-contract'||!original||owner.ctors?.length!==original.ctors.length)refuse('canonical reader owner layout changed',node);
  for(let at=0;at<original.ctors.length;at++){
   const wanted=original.ctors[at],actual=owner.ctors[at];if(actual.name!==wanted.name||actual.fields.length!==wanted.fields.length)refuse('canonical reader constructor layout changed',node);
   for(let index=0;index<wanted.fields.length;index++)if(actual.fields[index].name!==wanted.fields[index].name||!sameType(checker.resolveType(actual.fields[index].type,owner.modulePath,node?.span??entry.span),checker.hostType(wanted.fields[index].type,owner.modulePath,node?.span??entry.span)))refuse('canonical reader field layout changed',node);
  }
  return name;
 };
 // Metadata recovery is confined to exact type objects in a body whose
 // existing private source/call issuer was just revalidated, never a public flag.
 const selectedBody=(body,run)=>{
  const previous=selectedOptionTypes,types=new WeakSet();
  const collect=(value,depth=0)=>{if(!value||typeof value!=='object')return;if(--cells<0||depth>160)refuse('selected original body type bound',body);if(value.type?.kind==='data')types.add(value.type);for(const [key,child]of Object.entries(value))if(!['type','span','compatibilityCore','pinnedStandardBodyProof','originalCallbackProof','sourceFrameProof','originalLoanProof','sharedBodyProof','sourceSharedPatternProof'].includes(key))Array.isArray(child)?child.forEach(item=>collect(item,depth+1)):collect(child,depth+1);};collect(body);
  selectedOptionTypes=types;try{return run();}finally{selectedOptionTypes=previous;}
 };
 const option=(type,node)=>{
  const owner=type?.kind==='data'?checker.items.get(type.name):null,recovered=type&&!Object.hasOwn(type,'rustStandardGeneric')&&closedOption?closedOption.optionSource(type,node,entry):null,source=type&&!Object.hasOwn(type,'rustStandardGeneric')&&selectedOptionTypes?.has(type)&&owner?.standardGeneric?.kind==='Option'?owner.standardGeneric:recovered?.source??type?.rustStandardGeneric;
  const stringSummary=closedOption&&type?.patternOwnershipRefusal==='ownership-bearing String type'&&source?.kind==='Option'&&source.arguments?.length===1&&ownedText(checker.resolveType(source.arguments[0],owner?.modulePath??entry.modulePath,node?.span??entry.span));
  if(type?.rustReference||type?.rustOwnership||type?.patternOwnershipRefusal&&!stringSummary&&!recovered?.summary||type?.rustGenericIdentityUnresolved||type?.rustBorrowingUnresolved||owner?.k!=='data'||owner.fullName!==type.name||owner.standardGeneric?.kind!=='Option'||source?.kind!=='Option'||source.arguments?.length!==1||owner.standardGeneric.arguments?.length!==1||owner.ctors?.length!==2)return null;
  const some=owner.ctors.find(ctor=>ctor.name==='Some'),none=owner.ctors.find(ctor=>ctor.name==='None');
  if(!some||some.fields?.length!==1||some.fields[0].name!=='field0'||!none||none.fields?.length)return null;
  const payload=checker.resolveType(source.arguments[0],owner.modulePath,node?.span??entry.span);
  for(const written of [owner.standardGeneric.arguments[0],some.fields[0].type]){const actual=checker.resolveType(written,owner.modulePath,node?.span??entry.span);if(!sameType(payload,actual))return null;checker.expectedOwnership(actual,payload,owner.modulePath,node?.span??entry.span);}
  return {owner,payload,type:type.rustStandardGeneric?type:{...type,rustStandardGeneric:{kind:'Option',arguments:[payload]}}};
 };
 const domain=(type,node,active=new Set())=>{
  if(!type||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)refuse('requires resolved source types',node);
  if(type.rustReference){
   if(type.rustReference.kind!=='shared'||!type.rustReference.pointee||!sharedReferenceCopyIdentity(type))refuse('mutable or unresolved reference',node);
   if(canonical(type.rustReference.pointee,node))return 'borrow';
   const pointee=type.rustReference.pointee;
   if(type.kind==='array'&&type.rustSourceType===true&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='slice'&&!type.rustFixedArray&&type.patternOwnershipRefusal==='shared source reference'&&type.rustReference.tokens?.[0]?.value==='&'&&Number.isInteger(type.rustReference.span?.start)&&Number.isInteger(type.rustReference.span?.end)&&type.rustReference.span.start>=0&&type.rustReference.span.end>=type.rustReference.span.start&&pointee.kind==='array'&&pointee.rustSourceType===true&&pointee.rustOwnership?.kind==='borrowed'&&pointee.rustOwnership.source==='slice'&&!pointee.rustReference&&!pointee.rustFixedArray&&!pointee.patternOwnershipRefusal&&!pointee.rustGenericIdentityUnresolved&&!pointee.rustBorrowingUnresolved&&sameType(type.element,pointee.element)&&canonical(type.element,node)==='serde_json::Value'&&canonical(pointee.element,node)==='serde_json::Value'){checker.expectedOwnership(type.element,pointee.element,entry.modulePath??[],node?.span??entry.span);return 'slice';}
   // A shared primitive u8 slice is Copy and parsing never returns a loan.
   // Keep owned vectors, mutable references and arbitrary aggregate slices out.
   const byte=t=>t?.kind==='fixed'&&t.bits===8&&t.signed===false&&t.rustPrimitiveName==='u8'&&t.rustSourceType===true&&!t.rustReference&&!t.rustOwnership&&!t.patternOwnershipRefusal&&!t.rustBorrowingUnresolved&&!t.rustGenericIdentityUnresolved;
   const bytes=t=>t?.kind==='array'&&t.rustSourceType===true&&t.rustOwnership?.kind==='borrowed'&&t.rustOwnership.source==='slice'&&!t.rustFixedArray&&!t.rustBorrowingUnresolved&&!t.rustGenericIdentityUnresolved&&byte(t.element);
   if(bytes(type)&&bytes(pointee)&&!pointee.rustReference&&!pointee.patternOwnershipRefusal&&type.patternOwnershipRefusal==='shared source reference'&&type.rustReference.tokens?.[0]?.value==='&'&&sameType(type.element,pointee.element)&&hasOptionalParse()){checker.expectedOwnership(type.element,pointee.element,entry.modulePath??[],node?.span??entry.span);checker.expectedPrimitiveIdentity(type.element,pointee.element,entry.modulePath??[],node?.span??entry.span);return 'copy';}
   if(hasOwnedCarrierBoundary()&&carrierType(pointee,node))return 'borrow';
   if(domain(type.rustReference.pointee,node,active)==='copy')return 'copy';
   refuse('aggregate reference requires a separate loan proof',node);
  }
  if(type.kind==='array'){
   if(!type.rustReference&&!type.rustFixedArray&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='Vec'&&(!type.patternOwnershipRefusal||type.rustSourceType===true&&type.patternOwnershipRefusal==='ownership-bearing Vec type'&&hasOwnedStateVectorBoundary())&&canonical(type.element,node)==='serde_json::Value')return 'json-vector';
   refuse('array ownership needs the exact owned Json collection contract',node);
  }
  if(type.kind==='data'){
   const owner=checker.items.get(type.name),abi=canonical(type,node);
   if(abi==='serde_json::Value')return 'json';if(abi)refuse('owned Map transfer has no Drop contract',node);
   if(active.has(type.name))refuse('recursive or unknown aggregate Drop',node);
   const generic=type.rustStandardGeneric??owner?.standardGeneric;
   if(!['Option','Result'].includes(owner?.standardGeneric?.kind)||generic?.kind!==owner.standardGeneric.kind)refuse('unknown aggregate Drop or ownership',node);
   if(closedOption&&generic.kind==='Result')refuse('owned Option flow grants no Result error or residual transfer',node);
   if(closedOption&&generic.kind==='Option'&&!option(type,node))refuse('owned Option source arguments or field layout changed',node,{join:'owned-option-layout',nodeKind:node?.k??null,perUse:Object.hasOwn(type,'rustStandardGeneric'),refusal:type.patternOwnershipRefusal??null,source:describeOwnedJsonDifference(type.rustStandardGeneric??null,owner?.standardGeneric??null)});
   const inner=new Set(active).add(type.name),arguments_=generic.arguments.map(argument=>domain(checker.resolveType(argument,owner.modulePath,node?.span??entry.span),node,inner));
   if(closedErrors&&generic.kind==='Result'){
    const actual=resultOwner(type,node);if(!sameType(actual.success,checker.resolveType(generic.arguments[0],owner.modulePath,node?.span??entry.span)))refuse('Result success source changed',node);
    return retainsLoan(actual.success)?'loan-result':arguments_.some(linear)?'linear':'copy';
   }
   if(arguments_.some(kind=>kind==='borrow'||kind==='loan-option')){
    const actual=option(type,node),proof=actual&&checker.sourceStandardFieldCopy({type:actual.type},node?.span??entry.span);
    if(arguments_.length!==1||arguments_[0]!=='borrow'||proof?.kind!=='source-standard-option-payload-copy'||proof.referenceDepth!==1||!proof.referenceSource||!sameType(proof.payload,actual.payload)||!canonical(actual.payload.rustReference?.pointee,node))refuse('stored JSON loan requires exact Option shared-payload Copy',node);
    return 'loan-option';
   }
   return arguments_.some(linear)?'linear':'copy';
  }
  if(type.kind==='string'){
   if((closedErrors||closedOption||hasOwnedCarrierBoundary())&&ownedText(type))return 'owned-text';
   if(type.rustOwnership&&!(type.rustOwnership.kind==='borrowed'&&type.rustOwnership.source==='str')||type.patternOwnershipRefusal)refuse('owned text or unknown Drop',node);
   return 'copy';
  }
  if(['unit','bool','char','fixed','int','nat','float','literal'].includes(type.kind))return 'copy';
  refuse('unknown aggregate, array, closure or effect domain',node);
 };
 const retainsLoan=(type,active=new Set())=>{
  if(type.rustReference||type.rustOwnership?.kind==='borrowed')return true;
  const owner=type.kind==='data'?checker.items.get(type.name):null,generic=type.rustStandardGeneric??owner?.standardGeneric;
  if(!generic||active.has(type.name))return false;const inner=new Set(active).add(type.name);
  return generic.arguments.some(argument=>retainsLoan(checker.resolveType(argument,owner.modulePath,entry.span),inner));
 };
 const clone=state=>({names:new Map(state.names),available:new Map(state.available),values:new Map([...state.values].map(([slot,value])=>[slot,copy(value)])),alive:state.alive,callbackCaptures:state.callbackCaptures,lambdaInputs:state.lambdaInputs,iterationOwnedInputs:state.iterationOwnedInputs,optionCallback:state.optionCallback,standardScope:state.standardScope,localReturns:state.localReturns,tailNode:state.tailNode,entry:state.entry,external:state.external,callPath:state.callPath,functionReturns:state.functionReturns});
 const bind=(state,name,type,mutable,node,value=empty(),input=false)=>{const local=value.localLoanType;if(local&&JSON.stringify(local)!==JSON.stringify(type))refuse('original callback loan type changed',node);const kind=local?'borrow':domain(type,node);if(kind==='loan-result')refuse('stored borrowed Result requires a separate retained-carrier proof',node);const slot={name,kind,type,mutable,input,...(local?{localLoanType:local,localLoanOrigin:value.localLoanOrigin}:{})};state.names.set(name,slot);state.available.set(slot,true);state.values.set(slot,copy(value));return slot;};
 const createState=(current,arguments_=null,external=new Set(),callPath=[])=>{
  const state={names:new Map(),available:new Map(),values:new Map(),alive:true,entry:current,external,callPath,functionReturns:[]};
  for(const [at,param]of current.params.entries()){
   const initial=arguments_?.[at]??empty(),slot=bind(state,param.name,param.type,false,current,initial),fact=state.values.get(slot);
   slot.input=slot.kind==='borrow'||slot.kind==='loan-option'||slot.kind==='slice';
   if(!arguments_){if(slot.kind==='borrow'||slot.kind==='slice')fact.loans.set(path([]),new Set([slot]));if(slot.kind==='loan-option'){fact.loans.set(path(['field0']),new Set([slot]));fact.tags=new Set(['Some','None']);}}
  }
  return state;
 };
 const state=createState(entry,null,new Set(),[entry.fullName]);
 const live=(state,root)=>[...state.values].some(([slot,value])=>state.available.get(slot)===true&&roots(value).has(root));
 const ensureRoots=(value,state,node)=>{for(const root of roots(value))if(!state.external.has(root)&&(!state.available.has(root)||state.available.get(root)!==true))refuse('loan outlived or followed the move of its lexical root',node);};
 const returnRoots=(value,node,state)=>{for(const root of roots(value))if(!root.input&&!state.external.has(root))refuse('a local JSON root loan cannot escape this function',node);};
 const merge=(target,left,right)=>{
  target.alive=left.alive||right.alive;
  for(const slot of target.available.keys()){
   target.available.set(slot,left.alive&&right.alive?left.available.get(slot)===true&&right.available.get(slot)===true:left.alive?left.available.get(slot)===true:right.alive?right.available.get(slot)===true:false);
   target.values.set(slot,left.alive&&right.alive?union(left.values.get(slot),right.values.get(slot)):copy((left.alive?left:right).values.get(slot)));
  }
 };
 const variable=(node,state,mode)=>{
  const slot=state.names.get(node.name);if(!slot)refuse('unbound lexical variable',node);
  if(state.callbackCaptures?.has(slot)&&(linear(slot.kind)||slot.mutable))refuse('collection callback cannot capture owned or mutable state',node);
  if(state.available.get(slot)!==true)refuse('use after move or possibly moved value: '+slot.name,node);
  if(!sameType(node.type,slot.type)||slot.localLoanType&&JSON.stringify(node.type)!==JSON.stringify(slot.localLoanType)||!slot.localLoanType&&mode!=='borrow'&&domain(node.type,node)!==slot.kind){
   if(!sameType(node.type,slot.type)||!state.standardScope||!slot.localLoanType||!slot.localLoanOrigin||slot.localLoanOrigin.type!==slot.localLoanType||!originalCallbackLoanInputMatches(slot.localLoanOrigin,node.type))refuse('lexical binding source ownership changed',node,{join:'lexical-variable',name:node.name.slice(0,120),mode,slotKind:slot.kind,type:describeOwnedJsonDifference(node.type,slot.type),localLoan:slot.localLoanType?describeOwnedJsonDifference(node.type,slot.localLoanType,{propertyOrder:true}):null});
   checker.expectedOwnership(node.type,slot.localLoanType,state.entry.modulePath,node.span);checker.expectedPrimitiveIdentity(node.type,slot.localLoanType,state.entry.modulePath,node.span);
  }
  const value=copy(state.values.get(slot));ensureRoots(value,state,node);
  if(mode==='borrow'&&slot.kind==='json')value.loans.set(path([]),new Set([slot]));
  if(mode!=='borrow'&&linear(slot.kind)){if(live(state,slot))refuse('moving an owned JSON root with a live lexical loan: '+slot.name,node);state.available.set(slot,false);}
  // Copying a genuine shared reference does not move its pointee. A by-value
  // operation still needs the separate canonical-ownership checker above us.
  return value;
 };
 const refine=(state,node,wanted)=>{
  if(node?.k==='routerPatternTag'&&node.object?.k==='var'){
   const slot=state.names.get(node.object.name),actual=option(slot?.type,node);
   if(!slot||!actual||node.data!==slot.type.name||!['Some','None'].includes(node.ctor))refuse('pattern tag has no current canonical Option owner',node);
   const previous=state.values.get(slot),allowed=wanted?node.ctor:node.ctor==='Some'?'None':'Some';
   const value=copy(previous);value.tags=new Set([allowed]);if(allowed==='None')value.loans.clear();state.values.set(slot,value);return;
  }
  if(node?.k==='binary'&&node.op==='and'&&wanted){refine(state,node.left,true);refine(state,node.right,true);}
  if(node?.k==='unary'&&node.op==='not')refine(state,node.arg,!wanted);
 };
 const readers=new Set(['serde_json_value_get_string','serde_json_value_get_usize','serde_json_value_pointer','serde_json_value_as_str','serde_json_value_as_object','serde_json_map_get']);
 const visit=(node,state,mode='move',depth=0)=>{
  if(--cells<0||depth>160)refuse('whole-function flow bound',node);
  if(!node||typeof node!=='object')refuse('missing checked expression',entry);
  const read=(value,how='move')=>visit(value,state,how,depth+1);
  if(node.k==='var')return variable(node,state,mode);
  if(standardContext&&node.k==='routerOriginalCallbackLoan'){
   if(!state.standardScope||!hasOriginalCallbackLoan(node))refuse('callback loan lacks its selected private standard frame',node);const value=read(node.value,'borrow');
   if(node.type.rustReference?.pointee?.rustReference){if(!canonical(node.type.rustReference.pointee.rustReference.pointee,node))refuse('callback loan cannot widen a noncanonical aggregate',node);value.localLoanType=node.type;value.localLoanOrigin=node;}return value;
  }
  const kind=domain(node.type,node);
  if(closedErrors){
   const format=closedErrors.format(node,state.entry);if(format){for(const argument of format)read(argument,'borrow');return empty();}
  }
  if(node.k==='routerLambdaInput'){
   if(state.iterationOwnedInputs?.has(node.position)){const value=state.lambdaInputs?.[node.position];if(kind!=='json'||!value||value.loans.size)refuse('owned iteration input requires its actual by-value Json domain',node);return copy(value);}
   const value=state.lambdaInputs?.[node.position];if(!value||kind!=='borrow'&&!(standardContext&&state.optionCallback&&kind==='copy'))refuse('callback item requires its actual shared slice root',node);ensureRoots(value,state,node);return copy(value);
  }
  if(node.k==='routerCoreJsonCollection'){
   const iteration=jsonIterationContract(node.id);
   if(iteration){
    if(!genuine(node,state.entry)||node.args.length!==iteration.parameters.length||state.callbackCaptures)refuse('iteration requires its actual source call and finite callback boundary',node);
    const receiver=node.args[0],callback=node.args.at(-1),wanted=iteration.returns==='owned-json-list'?'json-vector':iteration.returns==='bool'?'copy':iteration.returns==='owned-json'?'json':'linear';
    if(kind!==wanted||domain(receiver.type,receiver)!=='slice'||callback.k!=='routerLambda'||callback.arity!==iteration.callbackParameters.length)refuse('actual iteration receiver callback or result domain differs',node);
    const input=read(receiver,'borrow');ensureRoots(input,state,node);const inputRoots=input.loans.get(path([]));if(!inputRoots?.size)refuse('iteration input lacks its live shared slice root',node);
    if(iteration.parameters.length===3){if(domain(node.args[1].type,node.args[1])!=='json')refuse('fold initial value must be owned canonical Json',node);const initial=read(node.args[1],'move');if(initial.loans.size)refuse('fold initial value retains a loan',node);}
    if(iteration.callbackReturns==='bool'?callback.type.result.kind!=='bool':canonical(callback.type.result,node)!=='serde_json::Value')refuse('actual iteration callback result changed',node);
    if(iteration.returns==='owned-json-option'){const actual=option(node.type,node);if(!actual||canonical(actual.payload,node)!=='serde_json::Value')refuse('find result requires its actual owned Option<Json>',node);}
    const child=clone(state);child.callbackCaptures=new Set(state.names.values());child.iterationOwnedInputs=new Set();child.lambdaInputs=iteration.callbackParameters.map((role,index)=>{if(role==='owned-json'){child.iterationOwnedInputs.add(index);return empty();}return {loans:new Map([[path([]),new Set(inputRoots)]]),tags:null};});
    const result=selectedBody(callback.binding,()=>visit(callback.binding,child,'move',depth+1));if(result.loans.size)refuse('iteration callback cannot return a borrowed value',node);return empty();
   }

   if(!genuine(node,state.entry)||node.args.length!==2||kind!=='json-vector'||state.callbackCaptures)refuse('collection requires its actual source call and one closed callback boundary',node);
   const receiver=node.args[0],callback=node.args[1];if(domain(receiver.type,receiver)!=='slice'||callback.k!=='routerLambda'||callback.arity!==1)refuse('collection receiver or callback source ownership changed',node);
   const input=read(receiver,'borrow');ensureRoots(input,state,node);const inputRoots=input.loans.get(path([]));if(!inputRoots?.size)refuse('collection input has no live shared slice root',node);
   const resultType=callback.type.result,selected=node.id==='router_core_json_filter_map'?option(resultType,node):null;
   if(node.id==='router_core_json_filter_map'?(!selected||canonical(selected.payload,node)!=='serde_json::Value'):node.id!=='router_core_json_map'||canonical(resultType,node)!=='serde_json::Value')refuse('collection callback must return owned Json or its actual Option',node);
   const child=clone(state);child.callbackCaptures=new Set(state.names.values());child.lambdaInputs=[{loans:new Map([[path([]),new Set(inputRoots)]]),tags:null}];
   // The single enclosing cells/depth budget is charged by every nested visit;
   // no reset per callback or branch and no borrowing permission from IR tags.
   const result=selectedBody(callback.binding,()=>visit(callback.binding,child,'move',depth+1));if(result.loans.size)refuse('a collection callback cannot return a borrowed output',node);return empty();
  }

  if(['lit','unit'].includes(node.k)){if(linear(kind)||kind==='borrow'||kind==='loan-option')refuse('unproved JSON literal ownership',node);return empty();}
  if(node.k==='let'){
   const value=read(node.value);ensureRoots(value,state,node.value);
   if(node.mutable&&value.loans.size)refuse('mutable retained JSON loans are outside the lexical contract',node);
   const previous=state.names.get(node.name),slot=bind(state,node.name,node.value.type,node.mutable===true,node,value);
   const result=read(node.body);state.available.delete(slot);state.values.delete(slot);if(previous)state.names.set(node.name,previous);else state.names.delete(node.name);ensureRoots(result,state,node);return result;
  }
  if(node.k==='routerSet'){
   if(node.target.k!=='var')refuse('only direct local reinitialization is supported',node);
   const slot=state.names.get(node.target.name);
   if(state.callbackCaptures?.has(slot))refuse('collection callback cannot replace captured state',node);
   if(!slot?.mutable||slot.kind!=='json'||domain(node.value.type,node.value)!=='json')refuse('assignment needs its actual mutable canonical JSON binding',node);
   if(live(state,slot))refuse('reinitializing an owned JSON root with a live lexical loan: '+slot.name,node);
   read(node.value);state.available.set(slot,true);state.values.set(slot,empty());return read(node.body);
  }
  if(node.k==='routerOrderedMatchArms'){
   if((!state.callbackCaptures||!genuineTextMatch?.(node))&&!(closedErrors&&state.tailNode===node)||!Array.isArray(node.branches)||!node.branches.length||node.branches.length>256)refuse('ordered flow is limited to closed callback text alternatives',node);
   const functionTail=Boolean(closedErrors&&state.tailNode===node);
   let subject=null;const states=[],values=[];
   for(let at=0;at<node.branches.length;at++){
    const branch=node.branches[at],condition=branch.cond;let arm=branch.body;
    const wildcard=condition?.k==='lit'&&condition.type.kind==='bool'&&condition.value===true;
    if(wildcard){if(at!==node.branches.length-1)refuse('text fallback must be the final actual arm',node);}
    else{
     const value=condition?.left,literal=condition?.right,slot=value?.k==='var'?state.names.get(value.name):null;
     if(condition?.k!=='binary'||condition.op!=='eq'||!slot||slot.type.kind!=='string'||slot.type.rustReference||slot.type.patternOwnershipRefusal||slot.type.rustBorrowingUnresolved||slot.type.rustGenericIdentityUnresolved||slot.type.rustOwnership?.kind!=='borrowed'||slot.type.rustOwnership.source!=='str'||literal?.k!=='lit'||typeof literal.value!=='string'||subject&&subject!==slot)refuse('callback alternative requires one actual borrowed-text slot and literal',node);
     subject=slot;
    }
    const branchState=clone(state);visit(condition,branchState,'move',depth+1);
    // A privately checked function-tail text pattern may name its final
    // fallback subject. This copies only that same immutable borrowed str;
    // callback alternatives retain their existing no-binding contract.
    if(functionTail&&wildcard&&arm?.k==='let'){
     if(--cells<0||arm.mutable!==false||arm.value?.k!=='var'||!subject||state.names.get(arm.value.name)!==subject||!sameType(arm.value.type,subject.type))refuse('function-tail text fallback requires its actual immutable subject binding',node);
     const value=visit(arm.value,branchState,'borrow',depth+1);bind(branchState,arm.name,arm.value.type,false,arm,value);arm=arm.body;
    }
    if(arm?.k!=='routerOrderedArm'||arm.guard||!sameType(arm.type,node.type))refuse('callback text alternatives cannot introduce bindings or guards',node);
    values.push(visit(arm.body,branchState,'move',depth+1));states.push(branchState);
   }
   if(!subject||node.branches.at(-1).cond.k!=='lit'||node.branches.at(-1).cond.value!==true)refuse('callback text alternatives need an actual literal subject and final fallback',node);
   let joined=states[0],result=values[0];for(let at=1;at<states.length;at++){const next=clone(state);result=joined.alive&&states[at].alive?union(result,values[at]):copy(joined.alive?result:values[at]);merge(next,joined,states[at]);joined=next;}
   state.alive=joined.alive;for(const slot of state.available.keys()){state.available.set(slot,joined.available.get(slot));state.values.set(slot,copy(joined.values.get(slot)));}return result;
  }
  if(node.k==='if'||node.k==='routerIf'){
   read(node.cond);const left=clone(state),right=clone(state);refine(left,node.cond,true);refine(right,node.cond,false);
   const a=visit(node.then,left,'move',depth+1),b=visit(node.else,right,'move',depth+1),result=left.alive&&right.alive?union(a,b):copy(left.alive?a:b);
   merge(state,left,right);return node.k==='routerIf'?read(node.body):result;
  }
  if(node.k==='routerReturn'){
   const value=read(node.value);if(state.localReturns){state.localReturns.push({value:copy(value),state:clone(state)});}else{returnRoots(value,node,state);state.functionReturns.push(copy(value));}const unreachable=clone(state);unreachable.functionReturns=[];if(state.localReturns)unreachable.localReturns=[];visit(node.body,unreachable,'move',depth+1);state.alive=false;return empty();
  }
  if(node.k==='routerDiscard'){read(node.value);return read(node.body);}
  if(node.k==='routerTry'){
   const value=read(node.value);if(node.option)return project(value,'field0');
   if(closedErrors){const input=resultOwner(node.value.type,node),output=resultOwner(state.entry.ret,node);checker.expectedOwnership(input.error,output.error,state.entry.modulePath,node.span);checker.expectedPrimitiveIdentity(input.error,output.error,state.entry.modulePath,node.span);if(!sameType(input.error,output.error)||!sameType(input.success,node.type)||project(project(value,'Err'),'field0').loans.size)refuse('Result residual error or success differs from its actual source',node);return project(project(value,'Ok'),'field0');}
   if(value.loans.size)refuse('Result loan/error transfer remains unproved',node);return empty();
  }
  if(node.k==='routerPatternImmutable'||node.k==='routerPatternTag'){
   if(!option(node.object?.type,node))refuse('pattern observation requires the actual canonical Option layout',node);
   read(node.object,'borrow');if(node.k==='routerPatternTag'&&(node.data!==node.object.type.name||!['Some','None'].includes(node.ctor)))refuse('Option tag differs from its actual constructor',node);return empty();
  }
  if(node.k==='routerPatternProjection'){
   const object=node.object,slot=object?.k==='var'?state.names.get(object.name):null,actual=option(object?.type,node),fact=slot&&state.values.get(slot);
   if(!slot||!actual||node.field!=='field0'||!sameType(node.type,actual.payload)||fact?.tags?.size!==1||!fact.tags.has('Some'))refuse('Option loan projection requires a dominating actual Some branch',node);
   checker.expectedOwnership(node.type,actual.payload,actual.owner.modulePath,node.span);if(domain(node.type,node)!==domain(actual.payload,node))refuse('Option projection cannot erase its shared ownership',node);
   const value=project(read(object,'borrow'),'field0');if(linear(slot.kind)){if(live(state,slot))refuse('moving an owned Option payload with a live lexical loan',node);state.available.set(slot,false);}return value;
  }
  if(standardContext&&['routerPinnedStandardBody','routerPinnedOptionCallbackBody','routerOriginalMappedBody','routerOriginalSharedDomainGuard','routerOriginalStandardFrame','routerOriginalSharedPatternMatch'].includes(node.k)){
   if(node.k==='routerOriginalSharedDomainGuard'){if(!hasOriginalSharedDomainGuard(node))refuse('shared domain guard changed',node);return read(node.value,'borrow');}
   if(node.k==='routerOriginalSharedPatternMatch'){
    if(!closedErrors?.tail(node,state.entry))refuse('function-tail flow lacks its private original frame',node);const child=clone(state);let body=node.body;while(body?.k==='let')body=body.body;if(body?.k!=='routerOrderedMatchArms')refuse('function-tail flow requires its actual ordered arms',node);child.tailNode=body;const result=visit(node.body,child,mode,depth+1);merge(state,child,child);return result;
   }
   if(node.k==='routerOriginalStandardFrame'){
    if(!state.standardScope||!hasOriginalSourceFrame(node))refuse('local return frame lacks its original standard body',node);const child=clone(state);child.localReturns=[];const value=visit(node.body,child,mode,depth+1),completions=[...(child.alive?[{state:child,value}]:[]),...child.localReturns];if(!completions.length)refuse('standard local frame has no closed continuation',node);let joined=completions[0].state,result=completions[0].value;for(const next of completions.slice(1)){const target=clone(state);merge(target,joined,next.state);joined=target;result=union(result,next.value);}joined.alive=true;merge(state,joined,joined);return result;
   }
   const body=standardContext.standard(node,state.entry);if(!body)refuse('standard wrapper lacks its current private source body',node);const child=clone(state);child.standardScope=true;const value=selectedBody(body,()=>visit(body,child,mode,depth+1));merge(state,child,child);return value;
  }
  if(closedErrors&&node.k==='routerOptionCallback'){
   const actual=option(node.value.type,node);if(!actual||node.op!=='and_then'||node.callback?.k!=='routerLambda'||node.callback.arity!==1||!option(node.type,node))refuse('only the actual checked readonly Option and_then is supported',node);
   const value=read(node.value),child=clone(state);child.callbackCaptures=new Set(state.names.values());child.optionCallback=true;child.lambdaInputs=[project(value,'field0')];const result=visit(node.callback.binding,child,'move',depth+1);ensureRoots(result,state,node);return union(result,{loans:new Map(),tags:new Set(['None'])});
  }
  if(standardContext&&node.k==='match'){
   if(!state.standardScope||!Array.isArray(node.cases)||node.cases.length!==2)refuse('aggregate match needs its privately selected standard frame',node);const actual=option(node.scrutinee.type,node);if(!actual)refuse('standard match requires actual canonical Option',node);const subject=read(node.scrutinee),states=[],values=[],seen=new Set();
   for(const arm of node.cases){const pattern=arm.pattern,ctor=actual.owner.ctors.find(row=>row.name===pattern.ctor);if(pattern.k!=='ctor'||pattern.data!==actual.owner.fullName||!ctor||seen.has(ctor.name)||!Array.isArray(pattern.binds)||pattern.binds.length!==ctor.fields.length||arm.guard)refuse('standard match constructor or field changed',node);seen.add(ctor.name);const child=clone(state);if(node.scrutinee.k==='var'){const slot=child.names.get(node.scrutinee.name),fact=copy(child.values.get(slot));fact.tags=new Set([ctor.name]);if(ctor.name==='None')fact.loans.clear();child.values.set(slot,fact);}for(const [at,name]of pattern.binds.entries())if(name){if(typeof name!=='string')refuse('standard match binder changed',node);const field=checker.resolveType(ctor.fields[at].type,actual.owner.modulePath,node.span);bind(child,name,field,false,node,project(subject,ctor.fields[at].name));}values.push(visit(arm.body,child,mode,depth+1));states.push(child);}
   if(!seen.has('Some')||!seen.has('None'))refuse('standard Option match is not exhaustive',node);merge(state,states[0],states[1]);return states[0].alive&&states[1].alive?union(values[0],values[1]):copy(states[0].alive?values[0]:values[1]);
  }
  if(standardContext&&node.k==='routerStringOperation'&&node.op==='is_empty'){
   if(node.string?.type.kind!=='string'||node.string.type.rustOwnership?.kind!=='borrowed'||node.string.type.rustOwnership.source!=='str')refuse('string predicate requires its actual borrowed str',node);read(node.string,'borrow');return empty();
  }
  if(closedOption&&node.k==='routerStringOperation'&&['trim','trim_start','trim_end'].includes(node.op)){
   if(!closedOption.readOnlyString(node,state.entry)||node.args.length!==0||domain(node.type,node)!=='copy'||domain(node.string.type,node.string)!=='copy')refuse('string trim requires its actual source-bound borrowed str',node);
   return read(node.string,'borrow');
  }
  if(closedOption&&node.k==='routerStandardMethod'){
   const proof=closedOption.map(node,state.entry),input=option(node.value?.type,node),output=option(node.type,node),callback=node.callback;
   if(!proof||!input||!output||!sameType(proof.input,input.payload)||!sameType(proof.result,output.payload)||!ownedText(output.payload))refuse('Option map needs its actual standard allocating source callback',node);
   checker.expectedOwnership(output.payload,proof.result,state.entry.modulePath,node.span);
   const value=read(node.value),child=clone(state);child.callbackCaptures=new Set(state.names.values());child.optionCallback=true;child.lambdaInputs=[project(value,'field0')];
   const result=visit(callback.binding,child,'move',depth+1);if(result.loans.size)refuse('owned String allocation cannot retain its borrowed input',node);return {loans:new Map(),tags:new Set(['Some','None'])};
  }
  if(closedOption&&node.k==='routerAllocatingStringItem'){
   if(!closedOption.allocate(node,state.entry)||!ownedText(node.type)||domain(node.object.type,node.object)!=='copy')refuse('allocation needs its actual source-bound borrowed str function item',node);
   ensureRoots(read(node.object,'borrow'),state,node);return empty();
  }
  if(node.k==='routerJsonMacro'){
   if(kind!=='json')refuse('JSON construction requires its actual canonical result',node);
   for(const argument of node.args){const value=argument.value;if(!value?.k)refuse('missing checked JSON interpolation',node);read(value,value.k==='var'?'borrow':'move');}return empty();
  }
  if(node.k==='routerHostCall'){
   const stateOperation=jsonStateContract(node.id);
   if(stateOperation?.family==='field'){
    if(!genuine(node,state.entry)||node.args.length!==stateOperation.parameters.length)refuse('field operation requires its actual original whole-call receipt',node);
    const receiver=read(node.args[0],'borrow');for(const value of node.args.slice(1))read(value,'borrow');ensureRoots(receiver,state,node);
    if(retainsLoan(node.type)){
     if(!['json-option-ref','str-option-ref'].includes(stateOperation.returns)||!receiver.loans.get(path([]))?.size||!['copy','loan-option'].includes(kind))refuse('field loan requires a live actual canonical receiver and optional layout',node);
     return {loans:new Map([[path(['field0']),new Set(receiver.loans.get(path([])))]]),tags:new Set(['Some','None'])};
    }
    if(kind!=='copy')refuse('scalar field reader ownership differs',node);return {loans:new Map(),tags:new Set(['Some','None'])};
   }
   if(stateOperation?.family==='carrier'){
    const wanted=stateOperation.returns==='json'?'json':'linear';if(!genuine(node,state.entry)||node.args.length!==stateOperation.parameters.length||kind!==wanted)refuse('carrier operation needs its private actual call and owned result',node);
    for(let index=0;index<node.args.length;index++){
     const value=node.args[index],role=stateOperation.parameters[index],actual=domain(value.type,value);if(role==='shared-json'?!['json','borrow'].includes(actual):role==='shared-json-result'||role==='shared-json-option'?!['linear','borrow'].includes(actual):actual!=='copy')refuse('carrier operand ownership differs',value);
     const observed=read(value,'borrow');ensureRoots(observed,state,value);
    }
    return {loans:new Map(),tags:stateOperation.returns==='json-owned-option'?new Set(['Some','None']):null};
   }
   if(stateOperation){
    const wanted=stateOperation.returns==='owned-json'?'json':stateOperation.returns==='owned-json-list'?'json-vector':'copy';
    if(!genuine(node,state.entry)||node.args.length!==stateOperation.parameters.length||kind!==wanted)refuse('state operation requires its genuine checked call and result domain',node);
    for(let index=0;index<node.args.length;index++){
     const value=node.args[index],role=stateOperation.parameters[index],actual=domain(value.type,value),expected=role==='owned-json'?'json':role==='owned-json-list'?'json-vector':role==='shared-json-list'?'slice':role==='shared-json'?null:'copy';
     if(expected!==null&&actual!==expected||role==='shared-json'&&!['json','borrow'].includes(actual))refuse('state operation operand ownership differs',value);
     const observed=read(value,role.startsWith('shared-')?'borrow':role.startsWith('owned-')?'move':'copy');ensureRoots(observed,state,value);
    }
    return empty();
   }

   if(['router_core_json_index_str','router_core_json_index_usize','router_core_json_map_index'].includes(node.id)){
    if(!genuine(node,state.entry)||node.args.length!==2||kind!=='borrow')refuse('projection requires its private actual borrowed-call receipt',node);
    const receiver=read(node.args[0],'borrow');read(node.args[1],'borrow');ensureRoots(receiver,state,node);
    if(!receiver.loans.get(path([]))?.size)refuse('projection requires its live canonical receiver root',node);
    return {loans:new Map([[path([]),new Set(receiver.loans.get(path([])))]]),tags:null};
   }

   if(['router_core_json_parse','router_core_json_parse_bytes'].includes(node.id)){
    const actual=option(node.type,node);
    if(!genuine(node,state.entry)||node.args.length!==1||!actual||canonical(actual.payload,node)!=='serde_json::Value'||kind!=='linear'||domain(node.args[0].type,node)!=='copy')refuse('optional parser needs its genuine owned canonical result and borrowed input',node);
    const input=read(node.args[0],'borrow');ensureRoots(input,state,node);return {loans:new Map(),tags:new Set(['Some','None'])};
   }
   if(['router_core_json_copy','router_core_json_with_field'].includes(node.id)){
    if(!genuine(node,state.entry))refuse('new operation has no private checked source receipt',node);
    if(node.id==='router_core_json_copy'){if(node.args.length!==1)refuse('copy arity',node);read(node.args[0],'borrow');}
    else{if(node.args.length!==3)refuse('update arity',node);if(domain(node.args[0].type,node)!=='json'||domain(node.args[2].type,node)!=='json')refuse('an owned update cannot move a shared pointee',node);read(node.args[0]);read(node.args[1],'borrow');read(node.args[2]);}
    if(kind!=='json')refuse('new operation result is not canonical JSON',node);return empty();
   }
   const contract=JSON_CONTRACTS.find(row=>row.id===node.id);
   if(contract?.kind==='method'&&['serde_json::Value','serde_json::Map'].includes(contract.rustPath.slice(0,-1).join('::'))){
    if(contract.params.length!==node.args.length)refuse('reader signature arity changed',node);
    let receiverType=node.args[0].type;const local=node.args[0].k==='var'&&state.names.get(node.args[0].name)?.localLoanType;if(local)receiverType=receiverType.rustReference.pointee;const source=canonical(receiverType.rustReference?.pointee??receiverType,node);
    if(source!==contract.receiver.path.join('::'))refuse('reader receiver differs from its actual registered owner',node);
    const value=read(node.args[0],'borrow');for(const argument of node.args.slice(1))read(argument,'borrow');
    if(retainsLoan(node.type)){
     if(!readers.has(node.id)||!value.loans.get(path([]))?.size)refuse('reader loan needs an existing live canonical lexical root',node);
     if(!sameType(checker.hostType(contract.ret,entry.modulePath,node.span),node.type))refuse('reader result differs from its actual registered signature',node);
     if(kind!=='loan-option'&&!(option(node.type,node)&&node.id==='serde_json_value_as_str'))refuse('reader payload is outside the closed shared JSON/text domain',node);
     return {loans:new Map([[path(['field0']),new Set(value.loans.get(path([])))]]),tags:new Set(['Some','None'])};
    }
    if(linear(kind)||kind==='borrow'||kind==='loan-option')refuse('reader projection needs a separate owned/loan proof',node);return empty();
   }
   refuse('unknown host ownership or effect contract',node);
  }
  if(node.k==='ctor'){
   const declaration=checker.items.get(node.data),ctor=declaration?.ctors.find(row=>row.name===node.ctor);
   if(!ctor||ctor.fields.length!==node.args.length)refuse('unknown constructor source layout',node);
   if(kind==='json'){if(node.ctor!=='Null'||node.args.length)refuse('direct JSON constructors require the checked literal operation',node);return empty();}
   if(!['Option','Result'].includes(declaration.standardGeneric?.kind))refuse('unknown aggregate constructor Drop',node);
   if(kind==='loan-option'&&node.ctor==='Some'){const actual=option(node.type,node);checker.expectedOwnership(node.args[0].type,actual.payload,declaration.modulePath,node.span);if(domain(node.args[0].type,node)!=='borrow')refuse('Some shared payload cannot consume an owned pointee',node);}
   let value=empty();for(const argument of node.args)value=union(value,read(argument));
   if(declaration.standardGeneric.kind==='Result'){if(closedErrors){const result=resultOwner(node.type,node),wanted=node.ctor==='Ok'?result.success:node.ctor==='Err'?result.error:null;if(!wanted||node.args.length!==1||!sameType(node.args[0].type,wanted))refuse('Result constructor does not match its actual payload',node);checker.expectedOwnership(node.args[0].type,wanted,declaration.modulePath,node.span);if(node.ctor==='Err'&&value.loans.size)refuse('owned String error cannot retain loans',node);value=prefix(prefix(value,'field0'),node.ctor);value.tags=new Set([node.ctor]);}else if(value.loans.size)refuse('Result loan/error transfer remains unproved',node);}
   if(declaration.standardGeneric.kind==='Option'){value=prefix(value,'field0');value.tags=new Set([node.ctor]);}return value;
  }
  if(node.k==='call'){
   if(closedErrors){
    const target=closedErrors.callee(node,state.entry);if(!target||target.params.length!==node.args.length||++callCount>128||state.callPath.length>=32||state.callPath.includes(target.fullName))refuse('readonly helper needs a fresh bounded acyclic original body',node);
    const arguments_=[];for(const [at,arg]of node.args.entries()){const wanted=target.params[at].type,part=domain(arg.type,arg),expected=domain(wanted,arg);if(!['copy','borrow','loan-option'].includes(part)||part!==expected||!sameType(arg.type,wanted))refuse('helper arguments may not transfer owned or mutable storage',node);checker.expectedOwnership(arg.type,wanted,target.modulePath,node.span);checker.expectedPrimitiveIdentity(arg.type,wanted,target.modulePath,node.span);arguments_.push(read(arg,'borrow'));}
    const child=createState(target,arguments_,new Set(arguments_.flatMap(value=>[...roots(value)])),[...state.callPath,target.fullName]),previousSelected=selectedOptionTypes;let value;selectedOptionTypes=null;try{value=visit(target.body,child,'move',depth+1);}finally{selectedOptionTypes=previousSelected;}for(const returned of child.functionReturns)value=union(value,returned);returnRoots(value,node,child);closedErrors.callee(node,state.entry);ensureRoots(value,state,node);return value;
   }
   const target=checker.items.get(node.fn);
   if(!target?.params||target.params.length!==node.args.length||linear(kind)||kind==='borrow'||kind==='loan-option')refuse('source call needs a separate JSON transfer/return proof',node);
   if(node.args.some(argument=>domain(argument.type,argument)!=='copy')||target.params.some(param=>domain(param.type,node)!=='copy'))refuse('source call cannot transfer or retain JSON in this contract',node);
   for(const argument of node.args)if(read(argument).loans.size)refuse('source call may retain a JSON-derived text loan',node);return empty();
  }
  if(node.k==='routerTextReference')refuse('retained or escaped explicit JSON aliases are not supported',node);
  if(node.k==='binary'&&['eq','ne'].includes(node.op)&&node.left.type.kind==='string'&&node.right.type.kind==='string'){
   for(const value of [node.left,node.right]){if(value.type.rustReference||value.type.patternOwnershipRefusal||!(value.type.rustOwnership?.kind==='borrowed'&&value.type.rustOwnership.source==='str'||value.k==='lit'&&typeof value.value==='string'&&!value.type.rustOwnership))refuse('text equality needs actual borrowed scalar text',node);ensureRoots(read(value),state,node);}return empty();
  }
  if(['unary','binary','cast','routerConstObligation','routerBuiltinConversion','routerPrimitiveDereference','routerStandardSharedReceiver'].includes(node.k)){
   if(kind!=='copy'&&!(node.k==='routerStandardSharedReceiver'&&kind==='borrow'))refuse('aggregate projection or coercion needs a transfer proof',node);
   let result=empty();for(const key of ['arg','left','right','value','object'])if(node[key]){
    if(domain(node[key].type,node[key])!=='copy'&&node.k!=='routerStandardSharedReceiver')refuse('an unproved scalar projection cannot hide a JSON move',node);
    const value=read(node[key],node.k==='routerStandardSharedReceiver'?'borrow':'move');if(node.k==='routerStandardSharedReceiver')result=value;else if(value.loans.size)refuse('unknown scalar operation on a JSON-derived loan',node);
   }return result;
  }
  refuse('unsupported control/escape node '+node.k,node);
 };
 let result=visit(entry.body,state);for(const returned of state.functionReturns)result=union(result,returned);returnRoots(result,entry,state);return result;
}
