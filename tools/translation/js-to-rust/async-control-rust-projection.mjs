// Canonical Rust syntax supplies source proposals only. The fixed consumer
// freshly checks the entire JS proposal and reproduces every original Rust token.
import {posix} from 'node:path';
import {ASYNC_CONTROL_CONTRACTS} from '../async-control-contracts.mjs';
import {asyncControlCallerName} from './async-control-caller-flow.mjs';
import {emitAsyncControlU64Guards} from './async-control-u64-guards.mjs';
import {UnsupportedOwnedRustSource} from './async-control-rust-syntax.mjs';
const fail=message=>{throw new UnsupportedOwnedRustSource('Async control proposal: '+message);};

export function projectAsyncControlRustFunctions(functions,{javascriptPath,runtimePath}={}){
 const imports=new Map(),used=new Set();let cells=0,sequence=0;
 const tick=depth=>{if(++cells>100000||depth>160)fail('complete canonical control source projection bound');};
 const name=value=>{try{return asyncControlCallerName(value);}catch(error){if(!(error instanceof TypeError))throw error;fail(error.message);}};
 const reserve=(value,depth=0)=>{tick(depth);if(typeof value==='string')used.add(value);else if(value&&typeof value==='object')for(const child of Object.values(value))reserve(child,depth+1);};reserve(functions);
 function imported(id,flow=false){
  const key=(flow?'flow:':'control:')+id;if(!imports.has(key)){let local;do{local='control_operation_'+sequence++;}while(used.has(local));used.add(local);imports.set(key,{name:id,local,flow});}return imports.get(key).local;
 }
 function inputType(text){
  text=text.replaceAll("&'a",'&');
  if(text==='&str')return 'string';if(text==='bool')return 'boolean';if(text==='u64')return 'bigint';
  const resources={'&crate::translation_async_control_core::Cancellation':['router_cancel_is_set',0],'&crate::translation_async_control_core::Sender':['router_async_send',0],'&mutcrate::translation_async_control_core::Receiver':['router_async_receive',0]};
  const resource=resources[text];if(!resource)fail('public input needs a matching original control ABI rule');return 'Parameters<typeof '+imported(resource[0])+'>['+resource[1]+']';
 }
 function unwrap(node,depth=0){tick(depth);return node?.kind==='temporary'?unwrap(node.value,depth+1):node;}
 function borrowed(node,depth=0){node=unwrap(node,depth);if(['borrow','dereference'].includes(node?.kind))return borrowed(node.value,depth+1);return node;}
 function expression(node,locals,asynchronous,depth=0){
  tick(depth);node=unwrap(node,depth+1);if(!node)fail('complete original control expression required');
  if(node.kind==='borrow'||node.kind==='dereference')return expression(borrowed(node,depth+1),locals,asynchronous,depth+1);
  if(node.kind==='name'){const id=name(node.name);return locals.has(id)?id+'.field0':id;}
  if(node.kind==='unit')return 'null';if(node.kind==='integer'){if(node.type!=='u64')fail('closed unsigned control count required');return node.value+'n';}
  if(node.kind==='boolean')return String(node.value);if(node.kind==='string')return JSON.stringify(node.value);
  if(node.kind==='not')return '(!'+expression(node.value,locals,asynchronous,depth+1)+')';
  if(node.kind==='binary'&&['&&','||','==','!=','<','<=','>','>='].includes(node.op))return '('+expression(node.left,locals,asynchronous,depth+1)+' '+({'==':'===','!=':'!=='}[node.op]??node.op)+' '+expression(node.right,locals,asynchronous,depth+1)+')';
  if(node.kind==='block'){if(node.statements.length||!node.tail)fail('only actual canonical capture-only blocks may be projected');return expression(node.tail,locals,asynchronous,depth+1);}
  if(node.kind==='async-lambda'){
   if(!node.moved||!node.futureMoved||node.parameters.length!==1)fail('complete canonical move/async/move deadline closure required');const child=name(node.parameters[0]);if(locals.has(child))fail('deadline child shadows an actual Result binding');return 'async ('+child+') => '+body(node.body,new Map(locals),true,depth+1);
  }
  let awaited=false;if(node.kind==='field'&&node.name==='await'){awaited=true;node=unwrap(node.value,depth+1);}
  if(node.kind!=='call')fail('registered original control call required');
  if(node.path==='Ok'){
   if(awaited||node.args.length!==1)fail('canonical successful Result wrapper required');const value=unwrap(node.args[0],depth+1);if(value?.kind!=='name'||!locals.has(value.name))fail('Ok must restore one actual guarded whole Result');return name(value.name);
  }
  const operation=ASYNC_CONTROL_CONTRACTS.find(row=>row.rustPath===node.path);if(!operation||operation.async!==awaited||awaited&&!asynchronous||node.args.length!==operation.parameters.length)fail('actual canonical operation/await/arity differs');
  return (awaited?'await ':'')+imported(operation.javascriptName)+'('+node.args.map((argument,index)=>expression(operation.parameters[index]==='deferred-callback'?argument:borrowed(argument,depth+1),locals,asynchronous,depth+1)).join(', ')+')';
 }
 function propagated(node,locals,asynchronous,depth){
  tick(depth);node=unwrap(node,depth+1);if(node.kind==='effect-try')return {value:expression(node.value,locals,asynchronous,depth+1),cleanup:[]};
  if(node.kind!=='match'||node.arms.length!==2) return null;
  const ok=node.arms.find(row=>row.pattern==='Ok(__ro_control_value)'),err=node.arms.find(row=>row.pattern==='Err(__ro_control_error)');if(!ok||!err)fail('whole canonical cleanup match arms required');
  const success=unwrap(ok.value,depth+1),failure=unwrap(err.value,depth+1);if(success?.kind!=='name'||success.name!=='__ro_control_value'||failure?.kind!=='block'||failure.tail||!failure.statements.length)fail('whole canonical successful/error branch required');
  const last=failure.statements.at(-1),returned=unwrap(last.value,depth+1);if(last.kind!=='return'||returned?.kind!=='call'||returned.path!=='Err'||returned.args.length!==1||unwrap(returned.args[0],depth+1)?.name!=='__ro_control_error')fail('cleanup must return the actual complete error');
  const cleanup=failure.statements.slice(0,-1).map(statement=>{const value=unwrap(statement.value,depth+1);if(statement.kind!=='effect'||value?.kind!=='call'||value.path!=='crate::translation_async_control_core::dispose')fail('canonical error cleanup supports only explicit receiver disposal');return expression(value,locals,asynchronous,depth+1)+';';});
  return {value:expression(node.value,locals,asynchronous,depth+1),cleanup};
 }
 function body(block,outer,asynchronous,depth=0){
  tick(depth);const locals=new Map(outer),lines=[];let terminal=false;
  for(let index=0;index<block.statements.length;index++){
   const statement=block.statements[index];tick(depth+1);if(terminal)fail('statement after a complete canonical return');
   if(statement.kind==='let'){
    const id=name(statement.name);if(locals.has(id))fail('canonical result binding shadow requires a separate rule');const propagatedValue=propagated(statement.value,locals,asynchronous,depth+1);
    if(propagatedValue){lines.push('const '+id+' = '+propagatedValue.value+';','if ('+id+'.$ === "Err") { '+propagatedValue.cleanup.join(' ')+' return '+id+'; }');locals.set(id,{source:statement.value});}
    else lines.push('const '+id+' = '+expression(statement.value,locals,asynchronous,depth+1)+';');continue;
   }
   if(statement.kind==='let-tuple'){
    const value=unwrap(statement.value,depth+1);if(statement.bindings.length!==2||value?.kind!=='name'||!locals.has(value.name))fail('complete canonical guarded channel split required');const names=statement.bindings.map(row=>name(row.name));lines.push('const ['+names.join(', ')+'] = '+name(value.name)+'.field0;');continue;
   }
   if(statement.kind==='effect'){lines.push(expression(statement.value,locals,asynchronous,depth+1)+';');continue;}
   if(statement.kind==='if-guard'){if(index===block.statements.length-1&&!block.tail)fail('native terminal guard requires its complete remaining return path');lines.push('if ('+expression(statement.condition,locals,asynchronous,depth+1)+') '+body(statement.yes,locals,asynchronous,depth+1));continue;}
   if(statement.kind==='if'){
    if(index!==block.statements.length-1||block.tail)fail('canonical control branches must terminate the whole block');lines.push('if ('+expression(statement.condition,locals,asynchronous,depth+1)+') '+body(statement.yes,locals,asynchronous,depth+1)+' else '+body(statement.no,locals,asynchronous,depth+1));terminal=true;continue;
   }
   if(statement.kind==='return'&&index===block.statements.length-1&&!block.tail){lines.push('return '+expression(statement.value,locals,asynchronous,depth+1)+';');terminal=true;continue;}
   fail('original control statement needs a complete source substitution rule');
  }
  if(block.tail){if(terminal)fail('competing complete source tails');lines.push('return '+expression(block.tail,locals,asynchronous,depth+1)+';');terminal=true;}
  if(!terminal)fail('every original control path needs a complete return');return '{\n'+lines.join('\n')+'\n}';
 }
 const sourceFunctions=functions.map(fn=>{
  const parameters=fn.parameters.map(parameter=>({name:name(parameter.name),type:inputType(parameter.type)}));if(new Set(parameters.map(row=>row.name)).size!==parameters.length)fail('duplicate original caller parameters');const rawBody=body(fn.body,new Map(),fn.asynchronous),guards=emitAsyncControlU64Guards(fn.parameters.filter(parameter=>parameter.type==='u64').map(parameter=>name(parameter.name))),inner=guards?'{\n'+guards+'\n'+rawBody.slice(1):rawBody,docs=parameters.map(row=>' * @param {'+row.type+'} '+row.name);
  return (docs.length?'/**\n'+docs.join('\n')+'\n */\n':'')+(fn.exported?'export ':'')+'function '+name(fn.name)+'('+parameters.map(row=>row.name).join(', ')+') '+(fn.asynchronous?'{ return '+imported('deferFilesystemFlow',true)+'(async () => '+inner+'); }':inner);
 }).join('\n\n');
 const edge=target=>{const relative=posix.relative(posix.dirname(javascriptPath),target);return relative.startsWith('.')?relative:'./'+relative;},flowPath=posix.dirname(runtimePath)+'/extensions/filesystem-effects-runtime.mjs';
 const source=[...imports.values()].map(row=>'import { '+row.name+' as '+row.local+' } from '+JSON.stringify(edge(row.flow?flowPath:runtimePath))+';').join('\n')+'\n\n'+sourceFunctions+'\n';if(source.length>2097152)fail('complete original source proposal byte bound');return {source,imports:[...imports.values()],sourceAuthority:false,semanticAuthority:false};
}
