import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync,cpSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {checkedSourceContext,bindCheckedSourceLinks} from '../extensions/source-links.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const tuple=(...fields)=>Object.freeze({$:'Tuple',...Object.fromEntries(fields.map((value,index)=>['field'+index,value]))});

test('original boolean expression subjects infer products before exhaustive match checking',{timeout:60_000},async()=>{
  const result=project('pub fn choose(a:bool,b:bool)->u8{match(a,b){(true,true)=>1,(true,false)=>2,(false,true)=>3,(false,false)=>4}}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const [a,b,n]of [[true,true,1n],[true,false,2n],[false,true,3n],[false,false,4n]])assert.equal(api.choose(a,b),n);});
});

test('checked suffixes and typed call results infer actual singleton and nested tuple fields',{timeout:60_000},async()=>{
  const source='fn value()->u8{7} pub fn first()->u8{let t=(1u8,true);t.0} pub fn single()->u8{let(n,)=(value(),);n} pub fn nested()->u8{let t=((value(),false),9u16);(t.0).0} pub fn pair()->(u8,bool){let t=(value(),true);t}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.first(),1n);assert.equal(api.single(),7n);assert.equal(api.nested(),7n);assert.deepEqual(api.pair(),tuple(7n,true));});
});

test('inferred products preserve actual usize and u64 identities in either declaration order',{timeout:60_000},async()=>{
  const functions=['pub fn word(a:u64,b:u8)->u64{let t=(a,b);t.0}','pub fn index(a:usize,b:u8)->usize{let t=(a,b);t.0}'];
  for(const source of [functions.join(''),functions.toReversed().join('')]){
    const checked=roundTripProgram(checkProgram(parseRust(source+'fn main(){}'))),products=[...checked.declarations.values()].filter(entry=>entry.generated==='router-tuple-type');
    assert.equal(products.length,2);assert.equal(new Set(products.map(entry=>entry.fullName)).size,2);
    assert.deepEqual(products.map(entry=>entry.ctors[0].fields[0].type.rustPrimitiveName).sort(),['u64','usize']);
    const result=project(source);assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,api=>{assert.equal(api.word(7n,1n),7n);assert.equal(api.index(9n,2n),9n);});
  }
});

test('inferred local products reuse actual root layouts across original module boundaries',{timeout:60_000},async()=>{
  const files={'src/lib.rs':'mod inner; pub fn relay()->(u8,bool){inner::make()}','src/inner.rs':'pub fn make()->(u8,bool){let t=(3u8,true);t}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>assert.deepEqual(api.relay(),tuple(3n,true)));
});

test('source-derived inferred layouts survive checked semantic serialization without invented type tokens',()=>{
  const source='pub fn choose(a:bool,b:bool)->u8{match(a,b){(true,_)=>1,(false,_)=>0}}fn main(){}';
  const checked=checkProgram(parseRust(source)),reparsed=roundTripProgram(checked),layout=[...reparsed.declarations.values()].find(entry=>entry.tupleInference);
  assert.ok(layout);assert.equal(layout.generated,'router-tuple-type');assert.equal(layout.tupleInference.defaultedFields,false);
  assert.deepEqual(layout.ctors[0].fields.map(field=>field.type.kind),['bool','bool']);
  assert.ok(reparsed.items.some(entry=>entry.fullName===layout.fullName));
  assert.ok(layout.ctors[0].fields.every(field=>field.rustTypeSyntax===undefined));
  assert.match(source.slice(layout.tupleInference.sourceSpan.start,layout.tupleInference.sourceSpan.end),/^\(a,b\)/);
  assert.equal(checkedSourceContext(reparsed),null);
  assert.throws(()=>bindCheckedSourceLinks(reparsed,checkedSourceContext(checked),{targetProfile:{id:'inference-clone'}}),/genuine checked parser invocation/);
});

test('inferred tuple fields execute once in source order before only the selected arm',{timeout:60_000},async()=>{
  const source='fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()} pub fn choose()->u8{match(mark("first"),mark("second")){(true,true)=>{let arm=mark("selected");7},(_,_)=>{let arm=mark("fallback");8}}}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);const folder=mkdtempSync(join(tmpdir(),'router-tuple-inference-order-'));
  try{
    writeRuntimeAssets(folder);mkdirSync(join(folder,'src'),{recursive:true});
    const js=join(folder,'src/lib.mjs'),ts=join(folder,'src/lib.ts'),compiled=join(folder,'compiled');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30_000,stdio:'pipe'});
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',folder,'--outDir',compiled,ts],{timeout:30_000,stdio:'pipe'});
    cpSync(join(folder,'runtime'),join(compiled,'runtime'),{recursive:true});
    for(const [modulePath,runtimePath]of [[js,join(folder,'runtime/effects.mjs')],[join(compiled,'src/lib.js'),join(compiled,'runtime/effects.mjs')]]){
      const {translated:api}=await import(pathToFileURL(modulePath)),{withEffectCapabilities}=await import(pathToFileURL(runtimePath));
      const calls=[],capability={fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}};
      assert.equal(withEffectCapabilities(capability,()=>api.choose()),7n);assert.deepEqual(calls,['first','second','selected']);
    }
  }finally{rmSync(folder,{recursive:true,force:true});}
});

test('inference does not invent integer defaults, nominal copying, borrows or owned product behavior',()=>{
  for(const source of [
    'pub fn bad()->u8{let t=(1,true);t.0}',
    'pub fn bad(value:&u8)->bool{let t=(value,true);t.1}',
    'pub fn bad(value:&str)->bool{let t=(value,true);t.1}',
    'pub fn bad()->bool{let t=("x".to_string(),true);t.1}',
    'pub fn bad(value:[u8;1])->bool{let t=(value,true);t.1}',
    'struct S{n:u8} pub fn bad(value:S)->bool{let t=(value,true);t.1}',
    'pub fn bad(value:Option<u8>)->bool{let t=(value,true);t.1}',
    'pub fn bad(value:f64)->bool{let t=(value,true);t.1}',
    'pub fn bad(value:usize)->u64{let t=(value,true);t.0}',
    'pub fn bad()->bool{let mut t=(1u8,true);t.1}',
  ]){
    const result=project(source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);
  }
});

test('automatic inference retains actual match exhaustiveness and product bounds',()=>{
  const fields=Array(33).fill('true').join(',');
  for(const source of [
    'pub fn bad(a:bool,b:bool)->u8{match(a,b){(true,true)=>1}}',
    'pub const fn bad(a:bool,b:bool)->u8{match(a,b){(true,_)=>1,(false,_)=>0}}',
    'pub fn bad()->bool{let t=('+fields+');true}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);}
});
