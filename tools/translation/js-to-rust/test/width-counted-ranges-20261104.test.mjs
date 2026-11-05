// Complete actual receiving cases for the six reader proposals. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {ownedCancellationReceivingData} from './owned-cancellation-receiving-data.mjs';
import {ownedTextVectorReceivingData} from './owned-text-vector-receiving-data.mjs';
import {ownedTextVectorJoinReceivingData} from './owned-text-vector-join-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const SOURCE=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60000,concurrency:false};
const DOMAINS=[['u8','RustU8',0n,255n],['i8','RustI8',-128n,127n],['u16','RustU16',0n,65535n],['i16','RustI16',-32768n,32767n],['u32','RustU32',0n,4294967295n],['i32','RustI32',-2147483648n,2147483647n],['u64','RustU64',0n,18446744073709551615n],['i64','RustI64',-9223372036854775808n,9223372036854775807n],['u128','RustU128',0n,340282366920938463463374607431768211455n],['i128','RustI128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
const header='import {router_state_json_append as append} from "./runtime/json-state-runtime.mjs";\nimport {json_macro_array as array,json_macro_null as nil} from "./runtime/json-macro-runtime.mjs";\n';
const signature=alias=>'/** @param {import("./runtime/primitive-operator-runtime.mjs").'+alias+'} lower @param {import("./runtime/primitive-operator-runtime.mjs").'+alias+'} upper */\n';
const source=header+DOMAINS.map(([type,alias])=>signature(alias)+'export function ascending_'+type+'(lower,upper){let result=array([]);for(let index=lower;index<upper;index++){if(index===lower){continue;}result=append(result,nil());break;}return result;}\n'+signature(alias)+'export function descending_'+type+'(lower,upper){let result=array([]);for(let index=upper;index>=lower;index--){if(index===upper){continue;}result=append(result,nil());break;}return result;}\n'+signature(alias)+'export function early_'+type+'(lower,upper){for(let index=lower;index<upper;index++){return nil();}return array([]);}\n').join('');
const array=count=>({$:'Array',field0:Array.from({length:count},()=>({$:'Null'}))});
const CASES=DOMAINS.flatMap(([type,,low,high])=>[['ascending_'+type,[low,low],array(0)],['ascending_'+type,[high,low],array(0)],['ascending_'+type,[low,low+1n],array(0)],['ascending_'+type,[low,low+2n],array(1)],['ascending_'+type,[high-2n,high],array(1)],['descending_'+type,[low,low],array(0)],['descending_'+type,[high,low],array(0)],['descending_'+type,[low,low+1n],array(1)],['descending_'+type,[high-1n,high],array(1)],['early_'+type,[low,low],array(0)],['early_'+type,[low,low+1n],{$:'Null'}]]);
async function profile(stem,caller=source,path='caller.mjs'){
 const api=await import('../'+stem+'.mjs'),syntax=await import('../'+stem+'-source.mjs'),cancel=stem.endsWith('cancellation'),label=cancel?'Cancellation':'Outcome',family=cancel?'cancellation':'outcome',data=stem.includes('-join-')?ownedTextVectorJoinReceivingData(family,caller,path):stem.includes('-text-vector-')?ownedTextVectorReceivingData(family,caller,path):cancel?ownedCancellationReceivingData([{path,source:caller}]):ownedStateReceivingData([{path,source:caller}]),files=new Map(data.files.map(row=>[row.path,row]));
 for(const row of [...api['owned'+label+'RuntimeSources'](),...syntax.ownedPrimitiveOperatorRuntimeSources()]){const previous=files.get(row.path);assert.ok(!previous||previous.source===row.source,'complete receiving source conflict: '+row.path);files.set(row.path,row);}data.files=[...files.values()];data.primitiveOperators=true;
 return {api,data,create:api['createOwned'+label+'Context'],translate:api['translateOwned'+label+'JavaScript'],typed:api['translateOwned'+label+'TypeScript'],prepare:api['prepareOwned'+label+'Runtime'],evaluate:api['evaluateOwned'+label],batch:api['evaluateOwned'+label+'Batch']};
}
for(const stem of ['owned-outcome','owned-cancellation','owned-text-vector-outcome','owned-text-vector-cancellation','owned-text-vector-join-outcome','owned-text-vector-join-cancellation']){
 test(stem+' all ten widths preserve continue, break, early return, empty and extreme ranges in actual JS/strict TS and both interpreters',limits,async t=>{
  const p=await profile(stem),result=p.translate(source,{context:p.create(p.data),sourcePath:'caller.mjs'}),directory=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-width-ranges-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const put=(name,text)=>{fs.mkdirSync(dirname(join(directory,name)),{recursive:true});fs.writeFileSync(join(directory,name),text);};for(const file of p.data.files.filter(row=>/\.(?:mjs|mts|ts)$/u.test(row.path)))put(file.path,file.source);put('typed.mts',result.typescript);
  execFileSync(process.execPath,[join(SOURCE,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:directory,stdio:'pipe',timeout:20000});for(const file of p.data.files.filter(row=>row.path.startsWith('runtime/')))put('out/'+file.path,file.source);
  for(const name of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,name)).href);for(const [name,args,expected]of CASES)assert.deepEqual(api[name](...args),expected);}
  const token=await p.prepare(result.program);for(const [name,args,expected]of CASES)assert.deepEqual(p.evaluate(result.program,name,args,token),expected);assert.deepEqual(p.batch(result.program,CASES.map(([name,args])=>[name,args]),token),CASES.map(row=>row[2]));
 });
 test(stem+' complete typed and canonical Rust inverse reproduce the original full range bodies',limits,async()=>{
  const p=await profile(stem),result=p.translate(source,{context:p.create(p.data),sourcePath:'caller.mjs'}),typed=await profile(stem,result.typescript,'caller.mts'),replayed=p.typed(result.typescript,{context:typed.create(typed.data),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(result.rust,replayed.rust));
  const rust=await import('../'+stem+'-rust.mjs'),label=stem.endsWith('cancellation')?'Cancellation':'Outcome',inverse=rust['translateOwned'+label+'Rust'](result.rust,{context:p.create({...p.data,files:p.data.files.concat([{path:'caller.rs',source:result.rust}])}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));
 });
 test(stem+' changing bounds, widths, induction symbol, unit step or original unsupported comparison stays refused',limits,async()=>{
  const original=header+signature('RustU8')+'export function selected(lower,upper){let result=array([]);for(let index=lower;index<upper;index++){result=append(result,nil());}return result;}';
  for(const caller of [original.replace('RustU8} upper','RustI8} upper'),original.replace('index<upper','index<=upper'),original.replace('index++','index--'),original.replace('index++','index+=2n'),original.replace('index++','index+=1'),original.replace('let result=array([]);for','let changing=upper;let result=array([]);for').replace('index<upper','index<changing'),original.replace('result=append(result,nil());','index=lower;result=append(result,nil());'),original.replace('index<upper','index<nil()'),original.replace('index++','upper++')]){const p=await profile(stem,caller);assert.throws(()=>p.translate(caller,{context:p.create(p.data),sourcePath:'caller.mjs'}),TypeError);}
 });
}
