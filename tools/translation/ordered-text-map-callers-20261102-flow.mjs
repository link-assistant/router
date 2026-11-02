// A conservative whole-body affine/lexical-loan receiving rule. The existing
// Host issuer supplies both genuine current-body and genuine-call predicates.
// A successful return is DATA; this module cannot issue an executable item.
import {actualOrderedTextMapKeysVector} from './ordered-text-map-callers-20261102-keys.mjs';
import {orderedTextMapContract} from './ordered-text-map-20261102-contracts.mjs';
import {isOrderedTextMapOpaqueType} from './ordered-text-map-callers-20261102-native-types.mjs';
import {forwardOwnedString,forwardOwnedCarrier} from './owned-forward-domain.mjs';
import {SOURCE_STR} from './extensions/source-contract-types.mjs';
import {requireBorrowedString} from './extensions/string-iterators.mjs';
import {sameType} from './checked-types.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
const union=(...sets)=>new Set(sets.flatMap(value=>[...value]));
const fact=(domain,roots=new Set(),loans=new Set(),tags=null)=>({domain,roots,loans,tags});
const clone=state=>({names:new Map([...state.names].map(([name,row])=>[name,{...row,value:fact(row.value.domain,new Set(row.value.roots),new Set(row.value.loans),row.value.tags&&new Set(row.value.tags))}])),pending:new Set(state.pending),impossible:state.impossible});
export function validateOrderedTextMapCallerFlow(checker,entry,{current,genuine}){
 requireOriginalPrimitiveTryFromChecker(checker);current();const snapshot=metadataDigest({params:entry.params,ret:entry.ret,body:entry.body});
 const close=()=>{requireOriginalPrimitiveTryFromChecker(checker);current();if(metadataDigest({params:entry.params,ret:entry.ret,body:entry.body})!==snapshot)throw TypeError('Ordered text map complete checked body changed');};
 const refuse=(message,node)=>{throw unsupported('ordered text map whole-body flow',message,node?.span??entry.span);};
 let cells=100000,serial=0;
 const domain=(type,node)=>{
  if(isOrderedTextMapOpaqueType(type))return 'map';
  if(type?.kind==='routerOrderedTextMap'&&isOrderedTextMapOpaqueType(type,{shared:true}))return 'map-ref';
  if(type?.kind==='routerOrderedTextMap')refuse('opaque type lost its actual private parser association',node);
  if(actualOrderedTextMapKeysVector(checker,type,node,entry.modulePath??[]))return 'text-vector';
  if(forwardOwnedString(type))return 'owned-text';
  if(type?.kind==='string'){requireBorrowedString(type,node.span);return 'text';}
  if(type?.kind==='bool'&&!type.rustReference&&!type.rustOwnership)return 'copy';
  if(type?.kind==='unit')return 'copy';
  if(type?.kind==='fixed'&&!type.rustReference&&!type.rustOwnership&&type.rustPrimitiveName)return 'copy';
  if(type?.kind==='data'){
   let actual=false;forwardOwnedCarrier(checker,type,'Option',entry.modulePath??[],node.span,(_checker,payload,span)=>{requireBorrowedString(payload,span);if(!sameType(payload,SOURCE_STR))refuse('loan payload differs from actual borrowed scalar text',node);actual=true;});if(actual)return 'loan-option';
  }
  refuse('unknown type, Copy, Drop, tuple, vector or nested ownership',node);
 };
 const state={names:new Map(),pending:new Set(),impossible:false},inputRoots=new Set();
 for(const parameter of entry.params){const part=domain(parameter.type,parameter),root='parameter:'+parameter.name;if(['map','map-ref'].includes(part)){inputRoots.add(root);state.names.set(parameter.name,{moved:false,value:fact(part,new Set([root]))});}else if(['copy','text','owned-text'].includes(part))state.names.set(parameter.name,{moved:false,value:fact(part)});else refuse('borrowed result inputs require their separate entry theorem',parameter);}
 const live=(state,roots,node)=>{for(const root of roots){const owner=[...state.names.values()].find(row=>!row.moved&&row.value.roots.has(root));if(!owner)refuse('borrowed result outlives a moved map root',node);}};
 const movable=(state,roots,node)=>{
  for(const root of roots){if(state.pending.has(root)||[...state.names.values()].some(row=>!row.moved&&row.value.loans.has(root)))refuse('map move/write while its returned loan or earlier call argument remains live',node);}
 };
 const refine=(state,node,truth)=>{
  if(node.k==='lit'&&typeof node.value==='boolean'){if(node.value!==truth)state.impossible=true;return;}
  if(node.k==='routerPatternTag'&&node.object?.k==='var'){
   const row=state.names.get(node.object.name);if(!row||row.value.domain!=='loan-option')refuse('tag refinement requires its actual borrowed-text Option binding',node);
   const tags=new Set([...(row.value.tags??new Set(['Some','None']))].filter(tag=>(tag===node.ctor)===truth));row.value.tags=tags;if(!tags.size)state.impossible=true;if(tags.size===1&&tags.has('None'))row.value.loans.clear();return;
  }
  if(node.k==='binary'&&(node.op==='and'&&truth||node.op==='or'&&!truth)){refine(state,node.left,truth);refine(state,node.right,truth);}
 };
 const visit=(node,state,mode='move',depth=0)=>{
  close();if(--cells<0||depth>160)refuse('complete caller exceeds original 100000-cell/depth160 flow bound',node);
  if(!node||typeof node!=='object')refuse('complete checked node required',entry);
  const part=domain(node.type,node),read=(child,how='move')=>visit(child,state,how,depth+1);
  if(node.k==='var'){
   if(part==='map-ref'&&mode!=='borrow')refuse('shared map aliases/results require their separate original reference Copy theorem',node);const row=state.names.get(node.name);if(!row||row.moved)refuse('missing or already moved binding',node);if(row.value.domain!==part)refuse('binding changed its actual type domain',node);live(state,row.value.loans,node);
   if(mode==='move'&&['map','owned-text','loan-option','text-vector'].includes(part)){movable(state,row.value.roots,node);row.moved=true;}
   return fact(part,new Set(row.value.roots),new Set(row.value.loans),row.value.tags&&new Set(row.value.tags));
  }
  if(node.k==='lit'){
   if(!['copy','text'].includes(part))refuse('literal cannot manufacture owned map or borrowed result',node);return fact(part);
  }
  if(node.k==='let'){
   if(node.mutable||state.names.has(node.name))refuse('mutable/rebound names require their separate source assignment theorem',node);
   const value=read(node.value),body=clone(state);body.names.set(node.name,{moved:false,value});
   const result=visit(node.body,body,mode,depth+1);for(const [name,row]of state.names){const after=body.names.get(name);row.moved=after.moved;}live(body,result.loans,node);
   if(result.loans.size&&value.domain==='map'&&[...result.loans].some(root=>value.roots.has(root)))refuse('a local owned map cannot escape through returned borrowed text',node);
   return result;
  }
  if(node.k==='if'){
   if(domain(node.cond.type,node.cond)!=='copy'||node.cond.type.kind!=='bool')refuse('branch predicate must be genuine checked bool',node);read(node.cond);
   const left=clone(state),right=clone(state),a=visit(node.then,left,mode,depth+1),b=visit(node.else,right,mode,depth+1);
   if(a.domain!==b.domain)refuse('branch result ownership differs',node);for(const [name,row]of state.names)row.moved=left.names.get(name).moved||right.names.get(name).moved;
   return fact(a.domain,union(a.roots,b.roots),union(a.loans,b.loans));
  }
  if(node.k==='routerDiscard'){read(node.value,'borrow');return read(node.body,mode);}
  if(node.k==='routerPatternImmutable'||node.k==='routerPatternTag'){
   if(domain(node.object?.type,node)!=='loan-option')refuse('pattern observation requires its genuine borrowed-text Option',node);
   const owner=checker.items.get(node.object.type.name);if(owner?.standardGeneric?.kind!=='Option'||node.k==='routerPatternTag'&&(node.data!==owner.fullName||!['Some','None'].includes(node.ctor)))refuse('pattern tag differs from the genuine Option owner',node);
   read(node.object,'borrow');return fact('copy');
  }
  if(node.k==='routerPatternProjection'){
   const row=node.object?.k==='var'&&state.names.get(node.object.name),owner=checker.items.get(node.object?.type?.name),some=owner?.ctors.find(ctor=>ctor.name==='Some');
   if(!row||row.moved||row.value.domain!=='loan-option'||row.value.tags?.size!==1||!row.value.tags.has('Some')||owner?.standardGeneric?.kind!=='Option'||node.field!=='field0'||some?.fields.length!==1||part!=='text')refuse('borrowed payload projection needs a dominating genuine Some tag',node);
   const payload=checker.resolveType(some.fields[0].type,owner.modulePath,node.span);if(!sameType(payload,node.type))refuse('projected borrowed text differs from actual Option payload',node);checker.expectedOwnership(node.type,payload,owner.modulePath,node.span);const value=read(node.object,'borrow');return fact('text',new Set(),new Set(value.loans));
  }
  if(node.k==='routerOrderedArm'){if(node.guard)refuse('guarded map matches require their separate lexical transfer theorem',node);return read(node.body,mode);}
  if(node.k==='routerOrderedMatchArms'){
   if(!Array.isArray(node.branches)||!node.branches.length||node.branches.length>4096)refuse('complete bounded checked match branches required',node);
   let remaining=clone(state);const branches=[],results=[];
   for(const branch of node.branches){if(remaining.impossible)break;visit(branch.cond,remaining,'borrow',depth+1);const selected=clone(remaining),rejected=clone(remaining);refine(selected,branch.cond,true);refine(rejected,branch.cond,false);if(!selected.impossible){results.push(visit(branch.body,selected,mode,depth+1));branches.push(selected);}remaining=rejected;}
   if(!remaining.impossible||!results.length||results.some(value=>value.domain!==results[0].domain))refuse('ordered match lacks complete genuine Some/None refinement or consistent ownership',node);
   for(const [name,row]of state.names)row.moved=branches.some(branch=>branch.names.get(name).moved);return fact(results[0].domain,union(...results.map(value=>value.roots)),union(...results.map(value=>value.loans)));
  }
  if(node.k==='match'){
   if(domain(node.scrutinee.type,node.scrutinee)!=='loan-option'||!Array.isArray(node.cases)||node.cases.length!==2)refuse('match requires the actual complete borrowed-text Option',node);
   const subject=read(node.scrutinee),owner=checker.items.get(node.scrutinee.type.name),states=[],results=[],seen=new Set();
   if(owner?.standardGeneric?.kind!=='Option')refuse('match requires the genuine standard Option owner',node);
   for(const arm of node.cases){const pattern=arm.pattern,ctor=owner.ctors.find(row=>row.name===pattern.ctor);if(pattern.k!=='ctor'||pattern.data!==owner.fullName||!ctor||seen.has(ctor.name)||arm.guard||pattern.binds.length!==ctor.fields.length)refuse('match constructor/arity differs from genuine Option layout',node);seen.add(ctor.name);const child=clone(state);
    for(const name of pattern.binds)if(name){if(child.names.has(name))refuse('match shadowing needs a separate hygienic binding theorem',node);child.names.set(name,{moved:false,value:fact('text',new Set(),new Set(subject.loans))});}
    results.push(visit(arm.body,child,mode,depth+1));states.push(child);
   }
   if(!seen.has('Some')||!seen.has('None')||results[0].domain!==results[1].domain)refuse('match must exhaust genuine Some/None with matching result ownership',node);
   for(const [name,row]of state.names)row.moved=states[0].names.get(name).moved||states[1].names.get(name).moved;
   return fact(results[0].domain,union(results[0].roots,results[1].roots),union(results[0].loans,results[1].loans));
  }
  if(node.k==='binary'&&['and','or'].includes(node.op)){
   if(node.type.kind!=='bool'||node.left.type.kind!=='bool'||node.right.type.kind!=='bool')refuse('logical operators require checked bool operands',node);
   read(node.left);const taken=clone(state);visit(node.right,taken,'move',depth+1);for(const [name,row]of state.names)row.moved=row.moved||taken.names.get(name).moved;return fact('copy');
  }
  if(node.k==='routerHostCall'){
   const row=orderedTextMapContract(node.id);if(!row||!genuine(node,entry)||node.args.length!==row.parameters.length)refuse('operation needs the parent issuer current private source receipt',node);
   if(['from_pairs','pairs'].includes(row.operation))refuse('pair-list tuple ownership has not been joined',node);
   const originalPending=new Set(state.pending),values=[];
   try{
    for(let index=0;index<row.parameters.length;index++){
     const role=row.parameters[index],value=read(node.args[index],row.shared.includes(index)?'borrow':'move');values.push(value);live(state,value.loans,node);
     const wanted=role==='text-map-ref'?['map','map-ref']:role==='text-map'?['map']:role==='text-owned'?['owned-text']:role==='str'?['text']:[];
     if(!wanted.includes(value.domain))refuse('checked operation argument domain differs from its actual native signature',node.args[index]);
     if(row.shared.includes(index))for(const root of union(value.roots,value.loans))state.pending.add(root);
    }
    for(const value of values)live(state,value.loans,node);
    if(row.returns==='text-map'){if(part!=='map')refuse('native map result lost opaque type identity',node);return fact('map',new Set(['temporary:'+serial++]));}
    if(row.operation==='keys'){if(part!=='text-vector')refuse('keys must retain its actual owned Vec<String> type',node);return fact(part,new Set(['keys-vector:'+serial++]));}
    if(row.operation==='get'){if(part!=='loan-option')refuse('lookup must return its genuine checked borrowed Option',node);const roots=values[0].roots;if(!roots.size)refuse('lookup needs a live map root',node);return fact(part,new Set(),new Set(roots),new Set(['Some','None']));}
    if(part!=='copy')refuse('membership/length must have its native scalar result',node);return fact(part);
   }finally{state.pending=originalPending;}
  }
  if(node.k==='ctor'){
   const owner=checker.items.get(node.data),constructor=owner?.ctors.find(row=>row.name===node.ctor);
   if(part!=='loan-option'||owner?.standardGeneric?.kind!=='Option'||!constructor||constructor.fields.length!==node.args.length)refuse('only genuine borrowed-text Option constructors are included',node);
   if(node.ctor==='None'&&!node.args.length)return fact(part,new Set(),new Set(),new Set(['None']));
   if(node.ctor!=='Some'||node.args.length!==1)refuse('actual Option layout differs',node);const value=read(node.args[0]);if(value.domain!=='text')refuse('Some requires actual borrowed scalar text',node);return fact(part,new Set(),value.loans,new Set(['Some']));
  }
  if(node.k==='toString'){if(part!=='owned-text'||domain(node.arg?.type,node)!=='text')refuse('allocation needs an actual checked standard borrowed-text receiver',node);const value=read(node.arg,'borrow');live(state,value.loans,node);return fact('owned-text');}
  if(node.k==='binary'&&['eq','ne'].includes(node.op)){
   const left=read(node.left,'borrow'),right=read(node.right,'borrow');if(!['copy','text'].includes(left.domain)||left.domain!==right.domain||part!=='copy')refuse('scalar equality cannot compare or copy opaque maps',node);live(state,union(left.loans,right.loans),node);return fact(part);
  }
  refuse('control, helper, projection, callback or escape requires its separate complete theorem: '+node.k,node);
 };
 return withCompleteSourceClosingFence(()=>{
  const result=visit(entry.body,state);if(result.domain==='map-ref')refuse('escaping shared map results remain outside this caller family',entry);live(state,result.loans,entry);
  if([...result.loans].some(root=>!inputRoots.has(root)))refuse('returned text loan must be rooted only in a live input map',entry);
  close();return Object.freeze({checkedCandidateOnly:true,resultDomain:result.domain,loanRoots:Object.freeze([...result.loans]),visitedCells:100000-cells,sourceAuthority:false,semanticAuthority:false});
 },[close]);
}
