// Language-level fixed-point flow over an already privately checked whole body.
// No public node, source spelling, shape or loop summary grants admission.
import {sameType} from './checked-types.mjs';
const sameSet=(left,right)=>left===right||left instanceof Set&&right instanceof Set&&left.size===right.size&&[...left].every(value=>right.has(value));
function sameFact(left,right){return Boolean(left&&right)&&sameSet(left.tags,right.tags)&&left.loans.size===right.loans.size&&[...left.loans].every(([path,roots])=>sameSet(roots,right.loans.get(path)))&&left.localLoanType===right.localLoanType&&left.localLoanOrigin===right.localLoanOrigin;}
function sameState(left,right,slots){return slots.every(slot=>left.available.get(slot)===right.available.get(slot)&&sameFact(left.values.get(slot),right.values.get(slot)));}
function boundary(state,frame){return frame&&frame.entry===state.entry&&frame.captures===state.callbackCaptures&&frame.returns===state.localReturns&&frame.standard===state.standardScope;}
export function unreachableOwnedFlowState(state,clone){
 const result=clone(state),priorReturns=state.localReturns;result.functionReturns=[];if(priorReturns)result.localReturns=[];
 const detach=frame=>frame?{...frame,parent:detach(frame.parent),returns:frame.returns===priorReturns?result.localReturns:frame.returns,breaks:[],continues:[]}:null;
 result.loopFrame=detach(state.loopFrame);return result;
}
export function checkOwnedLoopExit(node,state,{clone,visit,depth,empty,refuse}){
 const frame=state.loopFrame;if(!boundary(state,frame))refuse('loop exit requires its actual enclosing function/callback loop boundary',node);
 if(state.alive)(node.k==='routerBreak'?frame.breaks:frame.continues).push(clone(state));
 // Original type/body qualification still sees every unreachable statement;
 // detached sinks prevent it from adding a live loop exit or return fact.
 visit(node.body,unreachableOwnedFlowState(state,clone),'move',depth+1);state.alive=false;return empty();
}
function checkedInput(node,state,helpers){
 const {visit,domain,ensureRoots,empty,refuse,depth}=helpers;
 if(node?.k==='routerRange'){
  if(node.type?.kind!=='routerIterator'||node.type.element?.kind!=='fixed'||node.start?.type?.kind!=='fixed'||node.end?.type?.kind!=='fixed')refuse('range loop requires actual checked bounded native integer operands',node);
  for(const value of [node.start,node.end]){if(domain(value.type,value)!=='copy')refuse('range endpoints cannot transfer storage',value);const fact=visit(value,state,'copy',depth+1);if(fact.loans.size)refuse('range endpoints cannot conceal retained loans',value);}return empty();
 }
 if(node?.k==='routerIteratorOperation'&&node.op==='iter'&&node.args?.length===0&&node.type?.kind==='routerIterator'){
  const kind=domain(node.object?.type,node.object);if(!['slice','json-vector'].includes(kind))refuse('JSON for loop needs its actual shared slice or borrowed Vec iterator',node);
  if(domain(node.type.element,node)!=='borrow')refuse('JSON for loop element needs its actual single shared canonical reference',node);
  const fact=visit(node.object,state,'borrow',depth+1);ensureRoots(fact,state,node);if(!fact.loans.get('[]')?.size)refuse('JSON for iterator has no live original receiver root',node);return fact;
 }
 refuse('loop iterator requires a separately checked range or shared JSON iterator rule',node);
}
export function checkOwnedLoop(node,state,helpers){
 const {clone,visit,merge,refine,domain,empty,copy,ensureRoots,refuse,depth}=helpers,outer=clone(state),slots=[...state.available.keys()],seed=clone(state),parent=state.loopFrame;
 let input=null;if(node.k==='routerFor'){
  if(node.loopBody?.k!=='let'||node.loopBody.value?.k!=='routerLoopInput'||node.loopBody.value.sourceReferencePattern)refuse('for binding needs its actual ordinary iterator input; reference patterns require a separate rule',node);
  input=checkedInput(node.object,seed,helpers);
  if(input.loans.size){const anchor={name:'<actual loop iterator>',kind:'borrow',input:false,mutable:false};seed.available.set(anchor,true);seed.values.set(anchor,copy(input));slots.push(anchor);}
 }
 let header=clone(seed),exits=[],converged=false;
 for(let round=0;round<128;round++){
  const condition=clone(header),frame={parent,entry:state.entry,captures:state.callbackCaptures,returns:state.localReturns,standard:state.standardScope,input,element:node.k==='routerFor'?node.object.type.element:null,breaks:[],continues:[]};condition.loopFrame=frame;
  if(node.k==='routerWhile'){
   if(node.cond?.type?.kind!=='bool'||domain(node.cond.type,node.cond)!=='copy')refuse('while condition needs its actual checked native Boolean',node);
   const fact=visit(node.cond,condition,'copy',depth+1);if(fact.loans.size)refuse('while condition cannot retain a temporary loan',node.cond);
  }
  const zero=clone(condition);if(node.k==='routerWhile')refine(zero,node.cond,false);
  const body=clone(condition);if(node.k==='routerWhile')refine(body,node.cond,true);body.loopFrame=frame;
  const value=visit(node.loopBody,body,'move',depth+1);if(value.loans.size)refuse('unit loop body cannot retain an unbound loan',node.loopBody);
  const back=[...(body.alive?[body]:[]),...frame.continues],next=clone(seed);
  for(const candidate of back){const joined=clone(next);merge(joined,next,candidate);for(const slot of slots){next.available.set(slot,joined.available.get(slot));next.values.set(slot,copy(joined.values.get(slot)));}}
  exits=[zero,...frame.breaks];
  if(sameState(header,next,slots)){header=next;converged=true;break;}header=next;
 }
 if(!converged)refuse('owned loop fixed point exceeded its bounded finite flow domain',node);
 // The condition-false/empty-iterator path and every actual break carry their
 // own availability. A continue is a backedge, never a completed loop exit.
 const joined=clone(outer);let first=true;for(const exit of exits){ensureRootsForOuter(exit);if(first){merge(joined,exit,exit);first=false;}else{const prior=clone(joined);merge(joined,prior,exit);}}
 function ensureRootsForOuter(exit){for(const slot of outer.available.keys())if(exit.available.get(slot)===true)ensureRoots(exit.values.get(slot),exit,node);}
 state.alive=joined.alive;for(const slot of outer.available.keys()){state.available.set(slot,joined.available.get(slot));state.values.set(slot,copy(joined.values.get(slot)));}state.loopFrame=parent;
 return visit(node.body,state,'move',depth+1);
}
export function ownedLoopInput(node,state,{checker,domain,ensureRoots,copy,refuse}){
 const frame=state.loopFrame;if(!boundary(state,frame)||frame.input===null||!sameType(node.type,frame.element)||!['copy','borrow'].includes(domain(node.type,node)))refuse('loop input requires its actual current range/shared iterator binding',node);
 checker.expectedOwnership(node.type,frame.element,state.entry.modulePath,node.span);checker.expectedPrimitiveIdentity(node.type,frame.element,state.entry.modulePath,node.span);
 ensureRoots(frame.input,state,node);return copy(frame.input);
}
