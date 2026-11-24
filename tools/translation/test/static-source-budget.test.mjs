import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

test('complete lexer records retain the exact entry-cell boundary and fresh refusal results',{timeout:10000},()=>{
 const parser=new URL('../rust-structure.mjs',import.meta.url).href;
 const cache=new URL('../static-source-items.mjs',import.meta.url).href;
 const script=`
 import {Session} from 'node:inspector';
 import assert from 'node:assert/strict';
 import {sourceItems} from ${JSON.stringify(parser)};
 import {createStaticSourceItemReader} from ${JSON.stringify(cache)};
 const session=new Session();session.connect();
 const post=(method,args={})=>new Promise((resolve,reject)=>session.post(method,args,(error,result)=>error?reject(error):resolve(result)));
 const rows=[];
 try{
  await post('Profiler.enable');
  await post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});
  for(const extra of [-1,0,1]){
   // Root array + 7 cells per item + 5 per token: the middle source
   // accounts for precisely 200000 cells, including all scalar fields.
   const source=';'.repeat(16651+extra)+'x;'.repeat(11)+'\\n';
   const pin=Object.freeze({source}),read=createStaticSourceItemReader();
   await post('Profiler.takePreciseCoverage');
   const first=read(pin),second=read(pin);
   const coverage=await post('Profiler.takePreciseCoverage');
   const module=coverage.result.find(row=>row.url===${JSON.stringify(parser)});
   const method=module.functions.find(row=>row.functionName==='sourceItems');
   const calls=method.ranges[0].count;
   assert.equal(calls,extra<=0?1:2);
   const expected=sourceItems(source);
   assert.deepEqual(first,expected);assert.deepEqual(second,expected);
   assert.notEqual(first,second);assert.notEqual(first[0],second[0]);
   assert.equal(Object.isFrozen(first),false);
   assert.equal(Object.isFrozen(first[0].tokens[0]),false);
   first[0].tokens[0].text='caller mutation';
   assert.deepEqual(read(pin),expected);
   rows.push({cells:200000+12*extra,calls});
  }
 }finally{session.disconnect();}
 process.stdout.write(JSON.stringify(rows));`;
 const rows=JSON.parse(execFileSync('node',['--max-old-space-size=192','--input-type=module','--eval',script],{
  encoding:'utf8',timeout:8000,maxBuffer:1024*1024,
 }));
 assert.deepEqual(rows,[{cells:199988,calls:1},{cells:200000,calls:1},{cells:200012,calls:2}]);
});
