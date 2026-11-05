// Emission/evaluation only after the copied private whole-source check.
import {ownedIterationOperation} from './owned-iteration-contracts.mjs';
const fail=message=>{throw new TypeError('Owned JSON iteration emission: '+message);};
export function emitOwnedIterationCall(value,{rust,expr,body,rustName,imports,sequence}){
 const operation=ownedIterationOperation(value.name);if(!operation||value.type!==operation.result||value.callback.returns!==operation.returns||value.callback.parameters.length!==operation.parameters.length)fail('complete checked operation differs');
 imports.add(value.name);const names=value.callback.parameters.map(name=>rust?rustName(name):name),receiver=expr(value.receiver);
 if(!rust){const parameters=names.map(name=>name+': JsonValue').join(', ');return '__ro_'+value.name+'('+receiver+(value.initial?', '+expr(value.initial):'')+', ('+parameters+') => {\n'+body(value.callback.body,4)+'\n})';}
 const input='__ro_iteration_'+sequence(),result='__ro_iteration_'+sequence(),initial=value.initial?'__ro_iteration_'+sequence():null;
 const borrow=value.receiver.type==='json-list-owned'?(value.receiver.kind==='variable'?expr(value.receiver,true):'&'+receiver):receiver;
 const initialSource=initial?(value.initial.type==='json-ref'?'__ro_copy('+expr(value.initial)+')':expr(value.initial)):null;
 const initialBinding=initial?' let '+initial+' = '+initialSource+';':'';
 const call=operation.namespace+'::'+operation.rust+'('+input+(initial?', '+initial:'')+', |'+names.join(', ')+'| {\n'+body(value.callback.body,4)+'\n})';
 const check=operation.result==='json-list-owned'?'__ro_domain(&::serde_json::Value::Array('+result+'.clone()));':operation.result==='json-owned-option'?'if let Some(value) = &'+result+' { __ro_domain(value); }':operation.result==='json'?'__ro_domain(&'+result+');':'';
 return '{ let '+input+' = '+borrow+';'+initialBinding+' assert!('+input+'.len() <= 4096, "owned JSON iteration input bound"); for value in '+input+'.iter() { __ro_domain(value); } let '+result+' = '+call+'; '+check+' '+result+' }';
}
export function evaluateOwnedIterationCall(value,{state,scope,get,run}){
 const operation=ownedIterationOperation(value.name),module=operation?.runtime==='json-iteration'?state.modules.iteration:state.modules.collections;if(!operation||!module)fail('unissued runtime operation');
 const input=get(value.receiver,scope),initial=value.initial?get(value.initial,scope):undefined;
 const callback=(...args)=>{if(args.length!==value.callback.parameters.length)fail('actual callback arity differs');const local=new Map(scope);value.callback.parameters.forEach((name,index)=>local.set(name,args[index]));return run(value.callback.body,local);};
 return Reflect.apply(module[value.name],undefined,value.initial?[input,initial,callback]:[input,callback]);
}
