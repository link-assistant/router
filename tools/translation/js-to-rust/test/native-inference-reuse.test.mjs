import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {regenerateNativeTypeScript,loadTypeScript,parseNativeJavaScript,sourceModules} from '../native-typescript.mjs';
import {inferenceProgram,createInferenceProgramReuse} from '../native-inference.mjs';
import {prepareReverseConcreteParsedSourceChunks} from '../concrete-source.mjs';

function fixture(){
 const root=mkdtempSync(join(tmpdir(),'router-native-inference-reuse-'));
 const write=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);};
 write('js/package.json',JSON.stringify({name:'native-inference-fixture',version:'1.0.0',type:'module',devDependencies:{typescript:'5.9.3'}}));
 write('js/catalog.json','[]\n');write('js/index.js','export * from "./src/core.js";\n');write('js/testing.js','export const enabled=true;\n');
 write('js/src/core.js','import {choose} from "fixture-dependency";export function read(){return choose();}\n');
 mkdirSync(join(root,'js/node_modules'),{recursive:true});
 for(const name of ['typescript','@types'])symlinkSync(resolve('js/node_modules',name),join(root,'js/node_modules',name),'dir');
 assert.equal(loadTypeScript(root).version,'5.9.3');
 const declaration=type=>{
  write('js/node_modules/fixture-dependency/package.json',JSON.stringify({name:'fixture-dependency',version:'1.0.0',type:'module',types:'index.d.ts'}));
  write('js/node_modules/fixture-dependency/index.d.ts',`export function choose(): ${type};\n`);
 };
 const generate=()=>regenerateNativeTypeScript(root);
 const meta=()=>JSON.parse(readFileSync(join(root,'tools/translation/js-to-rust/generated/native-typescript/src/core.js.meta.json'),'utf8'));
 return {root,write,declaration,generate,meta,remove:()=>rmSync(root,{recursive:true,force:true})};
}

test('regeneration observes changed external declarations with unchanged JavaScript',{timeout:60000},()=>{
 const f=fixture();try{
  f.declaration('string');f.generate();assert.equal(f.meta().annotations[0].returns.name,'string');
  assert.deepEqual(f.generate().changed,[]);
  f.declaration('number');assert.ok(f.generate().changed.length);assert.equal(f.meta().annotations[0].returns.name,'number');
 }finally{f.remove();}
});

test('previously missing package probes are rechecked before inference reuse',{timeout:60000},()=>{
 const f=fixture();try{
  f.generate();assert.equal(f.meta().annotations[0].returns,null);
  f.declaration('boolean');f.generate();assert.equal(f.meta().annotations[0].returns.name,'boolean');
 }finally{f.remove();}
});

test('source additions changes and exact asset bytes remain fresh on repeated regeneration',{timeout:60000},()=>{
 const f=fixture();try{
  f.declaration('string');f.generate();
  f.write('js/src/core.js','export function read(){return 7;}\n');
  f.write('js/src/added.js','export function added(){return false;}\n');
  f.write('js/catalog.json','{"complete":"Ω😀"}\r\n');f.generate();
  assert.equal(f.meta().annotations[0].returns.name,'number');
  assert.match(readFileSync(join(f.root,'ts/src/added.ts'),'utf8'),/added/u);
  assert.equal(readFileSync(join(f.root,'ts/catalog.json'),'utf8'),'{"complete":"Ω😀"}\r\n');
  assert.deepEqual(f.generate().changed,[]);
 }finally{f.remove();}
});

test('inference owner can release a completed phase and rebuild equivalent fresh inference',{timeout:60000},()=>{
 const f=fixture();try{
  f.declaration('string');
  const ts=loadTypeScript(f.root),paths=sourceModules(f.root),infer=createInferenceProgramReuse();
  const before=infer(ts,f.root,paths);assert.equal(infer(ts,f.root,paths),before);
  infer.release();infer.release();
  const after=infer(ts,f.root,paths);assert.notEqual(after,before);assert.notEqual(after.checker,before.checker);
  const path='js/src/core.js',source=readFileSync(join(f.root,path),'utf8');
  const meta=value=>parseNativeJavaScript(ts,path,source,{file:value.program.getSourceFile(join(f.root,path)),checker:value.checker});
  assert.deepEqual(meta(after),meta(before));assert.equal(infer(ts,f.root,paths),after);
  before.assertInputsCurrent();after.assertInputsCurrent();infer.release();
 }finally{f.remove();}
});

test('private regeneration preserves complete public metadata for dynamic gap syntax',{timeout:60000},()=>{
 const f=fixture();try{
  const source='/** Complete Unicode and trivia: Ω🐱. */\r\n'+Array.from({length:8},(_,at)=>`
export function run_${at}(input){function count(value){return arguments.length;}
 let observed;for(var key in {entry:1})observed=key;key=false;
 const values=new Map([['entry',1]]);const record={undefined:2};
 return [count(1,2,3),(0,count)(4,5),count.bind()(6),1+true,
 'unknown'===typeof __ROUTER_METADATA_HOST__,record[input],key,observed,
 values.get('entry'),Math.max(1,2),globalThis.__ROUTER_METADATA_HOST__];}
`).join('');
  f.write('js/src/core.js',source);f.generate();
  const ts=loadTypeScript(f.root),inference=inferenceProgram(ts,f.root,sourceModules(f.root));
  const original=parseNativeJavaScript(ts,'js/src/core.js',source,{file:inference.program.getSourceFile(join(f.root,'js/src/core.js')),checker:inference.checker});
  assert.deepEqual(f.meta(),JSON.parse(JSON.stringify(original)));
  for(const key of ['call','assignment','coercion','loopBinding','globalProperty'])assert.ok(original.gaps.some(gap=>gap[key]),key);
  assert.ok(original.globalGaps.includes('__ROUTER_METADATA_HOST__'));
  assert.deepEqual(f.generate().changed,[]);assert.deepEqual(f.meta(),JSON.parse(JSON.stringify(original)));
 }finally{f.remove();}
});

test('regeneration transports complete sources across private packing boundaries',{timeout:60000},()=>{
 const f=fixture();try{
  for(let at=0;at<70;at++)f.write(`js/src/part-${String(at).padStart(2,'0')}.js`,`// Complete Ω😀 row ${at}.\r\nexport function value(){return ${at};}\r\n`);
  const complete='/*'+' Ω😀 '.repeat(54000)+'*/\r\nexport function large(){return 71;}\r\n';
  f.write('js/src/z-large.js',complete);f.generate();
  for(let at=0;at<70;at++)assert.match(readFileSync(join(f.root,`ts/src/part-${String(at).padStart(2,'0')}.ts`),'utf8'),new RegExp(`return ${at};`,'u'));
  const ts=loadTypeScript(f.root),inference=inferenceProgram(ts,f.root,sourceModules(f.root));
  const original=parseNativeJavaScript(ts,'js/src/z-large.js',complete,{file:inference.program.getSourceFile(join(f.root,'js/src/z-large.js')),checker:inference.checker});
  assert.deepEqual(JSON.parse(readFileSync(join(f.root,'tools/translation/js-to-rust/generated/native-typescript/src/z-large.js.meta.json'),'utf8')),JSON.parse(JSON.stringify(original)));
  assert.deepEqual(f.generate().changed,[]);
 }finally{f.remove();}
});

test('dense native packing retries complete halves within unchanged aggregate bounds',{timeout:60000},()=>{
 const f=fixture();try{
  const rows=[0,1].map(at=>({source:`export const values_${at}=[`+'0,'.repeat(55000)+'];\n',language:'JavaScript'}));
  assert.throws(()=>prepareReverseConcreteParsedSourceChunks([rows]),/corpus aggregate node\/canonical budget/u);
  for(let at=0;at<rows.length;at++)f.write(`js/src/dense-${at}.js`,rows[at].source);
  f.generate();
  const manifest=JSON.parse(readFileSync(join(f.root,'tools/translation/js-to-rust/generated/native-typescript/manifest.json'),'utf8'));
  for(let at=0;at<rows.length;at++)assert.equal(manifest.modules.find(row=>row.source===`js/src/dense-${at}.js`).runtimeASTIdentity,'verified after type erasure and relative module-extension normalization');
  assert.deepEqual(f.generate().changed,[]);
 }finally{f.remove();}
});
