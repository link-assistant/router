// Independent receiving/refusal case SOURCE. Entire file UNRUN during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeAsyncControlBulk20261101,ASYNC_CONTROL_BULK_20261101_OPERATIONS} from '../async-control-bulk-20261101.mjs';
import {asyncControlReceivingInput,verifyAsyncControlTargets,requireAsyncControlBulkCompilerVersion} from '../js-to-rust/test/async-control-bulk-20261101.mjs';
import {translateAsyncControlCallerJavaScript,readAsyncControlCallerMeta} from '../js-to-rust/async-control-callers.mjs';
const limits={timeout:60000};
function input(){const {options}=asyncControlReceivingInput();return {
 operations:[{operation:'exchange',name:'transfer'},{operation:'receiveBeforeDeadline',name:'boundedReceive'},
 {operation:'closeAndDrain',name:'drain'},{operation:'waitThenSleep',name:'afterCancellation'},{operation:'signalAndObserve',name:'signal'}],
 javascriptPath:'caller.mjs',typescriptPath:'caller.mts',rustPath:'rust/src/caller.rs',
 runtimePath:options.runtimePath,runtimeSource:options.runtimeSource,nativeRootSource:options.nativeRootSource,nativeSource:options.nativeSource,
};}
const ok=value=>({$:'Ok',field0:value}),err=value=>({$:'Err',field0:{$:value}}),some=value=>({$:'Some',field0:value});
test('one selection retains five whole callers and every complete source inverse',limits,()=>{
 const result=proposeAsyncControlBulk20261101(input());
 assert.equal(result.operations.length,5);assert.equal(ASYNC_CONTROL_BULK_20261101_OPERATIONS.length,5);
 assert.deepEqual([...new Set(result.trace.map(row=>row.phase))],['language','repository']);
 assert.equal(result.sources.JavaScript,result.checked.javascript.javascript);
 assert.equal(result.sources.TypeScript,result.checked.typescript.typescript);
 for(const [index,language]of ['JavaScript','TypeScript','Rust'].entries())assert.equal(result.equations[index].inverse,result.sources[language]);
 assert.equal(result.checked.reverse.asyncControlRustSourceHistory.source,result.sources.Rust);
 for(const field of ['sourceAuthority','semanticAuthority','runtimeParity','rustExecuted','receivingExecuted','wholeRouterSynchronization','crossInvocationCache'])assert.equal(result[field],false);
});
test('fresh and reverse generated JS and strict TS preserve close drain cancellation and nested Results',limits,async()=>{
 const result=proposeAsyncControlBulk20261101(input()),receipts=[];
 for(const targets of [{javascript:result.sources.JavaScript,typescript:result.sources.TypeScript},result.checked.reverse])await verifyAsyncControlTargets(targets,async(api,runtime)=>{
  const token=runtime.router_cancel_new();
  for(const encoded of ['', 'aGk=', '8J+YgA=='])assert.deepEqual(await api.transfer(encoded,token),ok(some(encoded)));
  assert.deepEqual(await api.transfer('invalid base64',token),err('InvalidInput'));
  const pair=runtime.router_async_channel(1n);assert.equal(pair.$,'Ok');const [sender,receiver]=pair.field0;
  assert.deepEqual(await runtime.router_async_send(sender,'aGk=',token),ok(null));
  assert.deepEqual(await api.boundedReceive(receiver,token),ok(ok(some('aGk='))));
  assert.deepEqual(await runtime.router_async_send(sender,'',token),ok(null));
  assert.deepEqual(await api.drain(receiver,token),ok(some('')));
  assert.deepEqual(await api.drain(receiver,token),ok({$:'None'}));
  assert.deepEqual(await runtime.router_async_send(sender,'',token),err('Closed'));
  runtime.router_async_dispose(receiver);
  const cold=api.afterCancellation(token);assert.equal(runtime.router_cancel_is_set(token),false);
  assert.equal(api.signal(token),true);assert.equal(api.signal(token),true);
  assert.deepEqual(await cold,err('Cancelled'));
  assert.deepEqual(await api.transfer('',token),err('Cancelled'));
  assert.deepEqual(await api.boundedReceive(receiver,token),err('Cancelled'));
 },{record:row=>receipts.push(row)});
 assert.equal(receipts.filter(row=>row.stage==='compiler-version').length,2);
 assert.ok(receipts.every(row=>row.version==='5.9.3'&&row.passed));
 assert.equal(receipts.filter(row=>row.stage==='target-runtime').length,4);
});
test('complete current source binding and cleanup refusals survive family generation',limits,()=>{
 const specification=input(),result=proposeAsyncControlBulk20261101(specification),options={sourcePath:specification.javascriptPath,runtimePath:specification.runtimePath,runtimeSource:specification.runtimeSource,nativeRootSource:specification.nativeRootSource,nativeSource:specification.nativeSource};
 for(const changed of [
  result.sources.JavaScript.replace('controlDispose(receiver); return sent;','return sent;'),
  result.sources.JavaScript.replace('controlDispose(receiver);\n return received;','return received;'),
  result.sources.JavaScript.replace('controlReceive(receiver, child)','controlReceive(receiver, token)'),
  result.sources.JavaScript.replace('controlWait(token);','controlWait(token);\n const pending = controlSleep(0n, token);'),
  result.sources.JavaScript.replace('router_async_send as controlSend','router_async_sleep as controlSend'),
 ]){assert.notEqual(changed,result.sources.JavaScript);assert.throws(()=>translateAsyncControlCallerJavaScript(changed,options));}
 assert.throws(()=>readAsyncControlCallerMeta(result.checked.javascript.meta,result.sources.JavaScript.replace('controlChannel(1n)','controlChannel(2n)'),options));
 for(const key of ['runtimeSource','nativeSource'])assert.throws(()=>proposeAsyncControlBulk20261101({...specification,[key]:specification[key]+'\n// stale\n'}));
 assert.throws(()=>proposeAsyncControlBulk20261101({...specification,nativeRootSource:specification.nativeRootSource+'\npub mod translation_async_control_core;\n'}));
});
test('unregistered operations duplicate imports metadata and accessor descriptions grant no admission',limits,()=>{
 const specification=input();
 for(const operations of [[{operation:'fetch',name:'work'}],[{operation:'exchange',name:'controlSend'}],[{operation:'exchange',name:'work'},{operation:'exchange',name:'other'}],[{operation:'exchange',name:'work'},{operation:'closeAndDrain',name:'work'}]])assert.throws(()=>proposeAsyncControlBulk20261101({...specification,operations}));
 let invoked=false;const descriptor={name:'work'};Object.defineProperty(descriptor,'operation',{enumerable:true,get(){invoked=true;return 'exchange';}});
 assert.throws(()=>proposeAsyncControlBulk20261101({...specification,operations:[descriptor]}));assert.equal(invoked,false);
 assert.throws(()=>proposeAsyncControlBulk20261101({...specification,sourceAuthority:true}));
 assert.throws(()=>proposeAsyncControlBulk20261101({...specification,javascriptPath:'../caller.mjs'}));
 assert.throws(()=>proposeAsyncControlBulk20261101({...specification,operations:Array(1)}));
});

test('paired source locations and compiler versions refuse unsupported inputs',limits,()=>{
 const specification=input();
 for(const typescriptPath of ['other/caller.mts','different.mts'])assert.throws(()=>proposeAsyncControlBulk20261101({...specification,typescriptPath}),/same directory and stem/u);
 assert.equal(requireAsyncControlBulkCompilerVersion('Version 5.9.3\n'),'5.9.3');
 for(const output of ['Version 5.9.2\n','Version 6.0.0\n','5.9.3','Version 5.9.3\nunexpected',null])assert.throws(()=>requireAsyncControlBulkCompilerVersion(output),/lockfile TypeScript 5.9.3/u);
});
test('strict target diagnostics retain the failing compiler command version and original failure',limits,async()=>{
 const records=[];
 await assert.rejects(()=>verifyAsyncControlTargets({javascript:'export const value = 1;\n',typescript:'export const value: number = "wrong";\n'},()=>assert.fail('invalid TypeScript must not execute'),{record:row=>records.push(row)}));
 const version=records.find(row=>row.stage==='compiler-version');assert.equal(version.version,'5.9.3');assert.equal(version.passed,true);
 const failure=records.find(row=>row.stage==='strict-typescript');assert.equal(failure.version,'5.9.3');assert.equal(failure.passed,false);assert.ok(failure.args.includes('--strict'));assert.ok((failure.stdout+failure.stderr).includes('TS2322'));assert.equal(records.some(row=>row.stage==='target-runtime'),false);
});
