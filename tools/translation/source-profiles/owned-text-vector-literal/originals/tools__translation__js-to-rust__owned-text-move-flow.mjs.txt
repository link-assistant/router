// Language move/loan analysis over the parent's freshly typed complete function.
// This public helper cannot issue caller IR, resolve an owner or grant authority.
import {ownedTextVectorOperationShape} from '../owned-text-vector-call-shape.mjs';
import {primitiveOwnedVectorOperationShape} from '../primitive-owned-vector-call-shape.mjs';
import {primitiveSequenceOperationShape} from '../primitive-sequence-call-shape.mjs';
import {ownedTextOperation} from './owned-text-contracts.mjs';
import {ownedJsonFieldOperation} from './owned-json-fields.mjs';
import {ownedIntegerOperation} from './owned-integer-contracts.mjs';
import {ownedSseOperation} from './owned-sse-contracts.mjs';
import {ownedOutcomeOperation} from './owned-outcome-contracts.mjs';
import {ownedPrimitiveOptionOperation} from './owned-primitive-option-contracts.mjs';
import {ownedPrimitiveResultOperation} from './owned-primitive-result-contracts.mjs';
import {ownedStateOperation} from './owned-state-contracts.mjs';
const CORE_ROLES=Object.freeze({router_core_json_copy:['json'],router_core_json_with_field:['json','str','json'],router_core_json_index_str:['json','str'],router_core_json_index_usize:['json','usize'],router_core_json_map_index:['map-ref','str'],json_macro_value:['json'],json_macro_null:[],json_macro_bool:['bool'],json_macro_string:['str'],json_macro_u64:['u64'],json_macro_i64:['i64']});
const linear=type=>['text-owned','text-owned-option','vec:text-owned'].includes(type);
const borrowed=type=>type==='str'||type==='str-text-result'||typeof type==='string'&&type.endsWith('-ref');
function contract(value){
 const select={'owned-text-vector-call':ownedTextVectorOperationShape,'primitive-owned-vector-call':primitiveOwnedVectorOperationShape,'primitive-sequence-call':primitiveSequenceOperationShape,'text-call':ownedTextOperation,'json-field-call':ownedJsonFieldOperation,'json-state-call':ownedStateOperation,'integer-call':ownedIntegerOperation,'sse-call':ownedSseOperation,'outcome-call':ownedOutcomeOperation,'primitive-option-call':ownedPrimitiveOptionOperation,'primitive-result-call':ownedPrimitiveResultOperation}[value.kind];return select?.(value.name)??null;
}
/** No cached verdict or input survives this invocation. */
export function verifyOwnedTextFunctionMoves(item){
 const fail=message=>{throw new TypeError('Owned text move flow: '+message);};let work=0,version=0;
 const tick=depth=>{if(++work>100000||depth>160)fail('complete function ownership bound');};
 const charge=count=>{work+=count;if(work>100000)fail('complete function ownership state/merge bound');};
 const stateCost=state=>{let size=state.bindings.size+state.alive.size+state.temporaries.size;for(const row of state.bindings.values())size+=row.roots.size;for(const roots of state.loans)size+=1+roots.size;return size;};
 const fresh=()=>({bindings:new Map(),alive:new Map(),loans:[],temporaries:new Set()});
 const clone=state=>{charge(stateCost(state));return {bindings:new Map([...state.bindings].map(([name,row])=>[name,{...row,roots:new Set(row.roots)}])),alive:new Map(state.alive),loans:state.loans.map(roots=>new Set(roots)),temporaries:new Set(state.temporaries)};};
 const token=state=>{if(++version>100000)fail('owned place version bound');state.alive.set(version,true);return version;};
 function rootsLive(state,roots){for(const root of roots)if(state.alive.get(root)!==true)fail('borrowed owned place moved, dropped or replaced');}
 function invalidate(state,row){if(row.owner!==null){if(state.loans.some(roots=>roots.has(row.owner)))fail('owned place moved or replaced during a call-duration shared loan');state.alive.set(row.owner,false);}row.available=false;}
 function bind(state,name,type,roots=new Set()){
  const old=state.bindings.get(name);if(old&&linear(old.type)&&old.available)invalidate(state,old);
  state.bindings.set(name,{type,available:true,owner:linear(type)?token(state):null,roots:new Set(roots)});
 }
 function join(states,names){
  if(!states.length)return null;for(const state of states)charge(stateCost(state));const output=fresh(),keys=new Set(states.flatMap(state=>[...state.alive.keys()]));for(const key of keys)output.alive.set(key,states.every(state=>!state.alive.has(key)||state.alive.get(key)===true));
  if(states.some(state=>state.loans.length!==states[0].loans.length))fail('unbalanced actual call loan frames');output.loans=states[0].loans.map((_,index)=>new Set(states.flatMap(state=>[...state.loans[index]])));output.temporaries=new Set(states.flatMap(state=>[...state.temporaries]));
  for(const name of names){const rows=states.map(state=>state.bindings.get(name));if(rows.some(row=>!row||row.type!==rows[0].type))fail('original binding/type differs across continuing branches');const row={...rows[0],available:rows.every(value=>value.available),roots:new Set(rows.flatMap(value=>[...value.roots]))};if(linear(row.type)&&row.available&&rows.some(value=>value.owner!==row.owner))row.owner=token(output);output.bindings.set(name,row);}return output;
 }
 function adopt(state,next){state.bindings=next.bindings;state.alive=next.alive;state.loans=next.loans;state.temporaries=next.temporaries;}
 function endExpression(state){for(const key of state.temporaries)state.alive.set(key,false);state.temporaries.clear();}
 function unknownHasLinear(state,value,depth=0){
  tick(depth);if(!value||typeof value!=='object')return false;if(value.kind==='variable'&&(linear(value.type)||state.bindings.get(value.name)?.roots.size))return true;if(Array.isArray(value))return value.some(child=>unknownHasLinear(state,child,depth+1));return Object.values(value).some(child=>child&&typeof child==='object'&&unknownHasLinear(state,child,depth+1));
 }
 function rootOf(state,value){const row=typeof value.root==='string'?state.bindings.get(value.root):null;if(!row)return new Set();return row.owner!==null?new Set([row.owner]):new Set(row.roots);}
 function call(state,value,roles,root,depth){
  if(!Array.isArray(value.args)||roles.length!==value.args.length)fail('complete actual operation argument roles required');const index=state.loans.length;state.loans.push(new Set());const inputs=[];
  try{for(let at=0;at<value.args.length;at++){const roots=expression(state,value.args[at],borrowed(roles[at])?'borrow':'move',depth+1);inputs.push(roots);if(borrowed(roles[at]))for(const key of roots)state.loans[index].add(key);}const roots=borrowed(value.type)?(Number.isSafeInteger(root)?new Set(inputs[root]??[]):rootOf(state,value)):new Set();rootsLive(state,roots);return roots;}
  finally{if(state.loans.length!==index+1)fail('unbalanced nested actual call loans');state.loans.pop();}
 }
 function expression(state,value,mode='move',depth=0){
  const roots=expressionBody(state,value,mode,depth);if(value.kind!=='variable'&&linear(value.type)&&mode!=='move'){const key=token(state);state.temporaries.add(key);return new Set([key]);}return roots;
 }
 function expressionBody(state,value,mode='move',depth=0){
  tick(depth);if(!value||typeof value!=='object'||typeof value.kind!=='string')fail('actual typed expression required');
  if(value.kind==='variable'){
   const row=state.bindings.get(value.name);if(!row||(linear(row.type)||linear(value.type))&&row.type!==value.type)fail('actual complete lexical binding required');rootsLive(state,row.roots);if(linear(row.type)){if(!row.available)fail('owned String, optional String or Vec used after move');if(mode==='move'){invalidate(state,row);return new Set();}return new Set([row.owner]);}return new Set(row.roots);
  }
  if(value.kind==='local-call')return call(state,value,value.parameters,null,depth);
  if(value.kind==='owned-call'&&Object.hasOwn(CORE_ROLES,value.name))return call(state,value,CORE_ROLES[value.name],null,depth);
  if(['primitive-arithmetic-call','primitive-bitwise-call','primitive-method-call','primitive-not-call','primitive-cast-call','primitive-shift-call'].includes(value.kind)){if(value.args.some(argument=>linear(argument.type)||borrowed(argument.type)))fail('actual primitive scalar operand required');return call(state,value,value.args.map(argument=>argument.type),null,depth);}
  const row=contract(value);if(row)return call(state,value,row.parameters??row.args,row.root,depth);
  if(value.kind==='owned-text-copy'){const index=state.loans.length;state.loans.push(new Set());try{const roots=expression(state,value.value,'borrow',depth+1);for(const root of roots)state.loans[index].add(root);return new Set();}finally{state.loans.pop();}}
  if(value.kind==='option-test'){expression(state,value.value,'read',depth+1);return new Set();}
  if(value.kind==='option-field'){const roots=expression(state,value.value,value.value.type==='text-owned-option'?'move':'read',depth+1);return borrowed(value.type)?roots:new Set();}
  if(value.kind==='option-some'){const roots=expression(state,value.value,borrowed(value.type)?'borrow':'move',depth+1);return borrowed(value.type)?roots:new Set();}
  if(value.kind==='outcome-test'||value.kind==='outcome-field'){const roots=expression(state,value.value,'read',depth+1);return borrowed(value.type)?roots:new Set();}
  if(value.kind==='not'){expression(state,value.value,'read',depth+1);return new Set();}
  if(value.kind==='binary'){
   if(['&&','||'].includes(value.op)){expression(state,value.left,'read',depth+1);const skipped=clone(state),taken=clone(state);expression(taken,value.right,'read',depth+1);adopt(state,join([skipped,taken],state.bindings.keys()));}
   else{const index=state.loans.length;state.loans.push(new Set());try{for(const key of expression(state,value.left,'borrow',depth+1))state.loans[index].add(key);expression(state,value.right,'borrow',depth+1);}finally{state.loans.pop();}}return new Set();
  }
  if(value.kind==='choose'){
   expression(state,value.cond,'read',depth+1);const yes=clone(state),no=clone(state),a=expression(yes,value.then,mode,depth+1),b=expression(no,value.else,mode,depth+1);adopt(state,join([yes,no],state.bindings.keys()));return new Set([...a,...b]);
  }
  if(['string','bool','integer','option-none'].includes(value.kind))return new Set();
  // Existing copied operations without a tracked operand retain their parent
  // proof. Unknown operations containing an owned place are never assumed read-only.
  if(unknownHasLinear(state,value,depth+1))fail('operation needs a declared owned-text argument/move rule');return rootOf(state,value);
 }
 function mergeExits(exits,names){names=[...names];const result=new Map();for(const kind of ['next','return','break','continue']){const selected=exits.filter(row=>row.kind===kind).map(row=>row.state);if(selected.length)result.set(kind,kind==='return'?selected[0]:join(selected,names.filter(name=>selected.every(state=>state.bindings.has(name)))));}return [...result].map(([kind,state])=>({kind,state}));}
 function loop(state,statement,depth){
  const names=[...state.bindings.keys()],baseline=clone(state),condition=clone(state);if(statement.kind==='while')expression(condition,statement.cond,'read',depth+1);else if(statement.kind==='for-range'){expression(condition,statement.start,'move',depth+1);expression(condition,statement.end,'move',depth+1);}else expression(condition,statement.value,'borrow',depth+1);
  endExpression(condition);const bodyState=clone(condition);if(statement.name)bind(bodyState,statement.name,statement.kind==='for-range'?'u64':statement.kind==='for-scalar'?'untracked-loop-scalar':'json-ref');const paths=block(bodyState,statement.body,depth+1),exits=[{kind:'next',state:condition}];
  for(const path of paths){if(path.kind==='next'||path.kind==='continue'){for(const name of names){const before=(statement.kind==='while'?baseline:condition).bindings.get(name),after=path.state.bindings.get(name);if(linear(before.type)&&before.available&&!after?.available)fail('outer owned place must be available at every actual loop backedge');}exits.push({kind:'next',state:path.state});}else exits.push({kind:path.kind==='break'?'next':path.kind,state:path.state});}return mergeExits(exits,names);
 }
 function block(input,statements,depth=0){
  tick(depth);if(!Array.isArray(statements))fail('actual complete typed statement block required');const names=new Set(input.bindings.keys());let next=input,exits=[];
  for(const statement of statements){tick(depth);if(!next)fail('unreachable statement outside original private source proof');const state=next;next=null;
   if(statement.kind==='let'){const roots=expression(state,statement.value,'move',depth+1);bind(state,statement.name,statement.value.type,roots);names.add(statement.name);next=state;}
   else if(statement.kind==='assign'){const old=state.bindings.get(statement.name);if(!old||old.type!==statement.value.type)fail('actual assigned binding/type differs');const roots=expression(state,statement.value,'move',depth+1);bind(state,statement.name,old.type,roots);next=state;}
   else if(statement.kind==='return'){const roots=expression(state,statement.value,'move',depth+1);if(borrowed(statement.value.type)&&roots.size)fail('borrow of an owned String/Vec cannot escape the function');exits.push({kind:'return',state});}
   else if(statement.kind==='break'||statement.kind==='continue')exits.push({kind:statement.kind,state});
   else if(statement.kind==='if'){expression(state,statement.cond,'read',depth+1);const paths=[...block(clone(state),statement.then,depth+1),...block(clone(state),statement.else,depth+1)],joined=mergeExits(paths,state.bindings.keys());for(const path of joined)if(path.kind==='next')next=path.state;else exits.push(path);}
   else if(['while','for-range','for-json','for-scalar'].includes(statement.kind)){for(const path of loop(state,statement,depth+1))if(path.kind==='next')next=path.state;else exits.push(path);}
   else fail('statement needs its declared native owned-text flow rule');
   if(next)endExpression(next);
  }if(next)exits.push({kind:'next',state:next});return mergeExits(exits,names);
 }
 try{const state=fresh();for(const parameter of item.params)bind(state,parameter.name,parameter.type);const exits=block(state,item.body);if(exits.some(row=>row.kind!=='return'))fail('complete function requires actual return paths');}
 finally{version=0;work=0;}
}
