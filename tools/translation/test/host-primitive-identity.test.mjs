import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {translateProject} from '../project.mjs';
import {assertRustPrimitiveIdentity,checkProgram,parseRust,hasIntegerFrom,INTEGER_FROM_PROFILE} from '../extensions/host-contracts.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function both(result,assertions) {
  assert.deepEqual(result.meta.refused,[]);
  const folder=mkdtempSync(join(tmpdir(),'router-host-primitive-'));
  try {
    writeRuntimeAssets(folder);const js=join(folder,'src/fixture.mjs'),ts=join(folder,'src/fixture.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30_000});
    try{execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(folder,'compiled'),ts],{encoding:'utf8',timeout:30_000});}catch(error){throw new Error(error.stdout+error.stderr,{cause:error});}
    for(const path of [js,join(folder,'compiled/fixture.js')])await assertions((await import(pathToFileURL(path).href)).translated);
  } finally {rmSync(folder,{recursive:true,force:true});}
}
test('known primitive identity compares recursively without guessing missing source evidence',()=>{
  const range={start:12,end:20},u64={kind:'fixed',bits:64,signed:false,rustPrimitiveName:'u64'},usize={...u64,rustPrimitiveName:'usize'},array=element=>({kind:'array',element});
  for(const [actual,expected]of [[u64,usize],[usize,u64],[array(u64),array(usize)],[array(array(usize)),array(array(u64))]])assert.throws(()=>assertRustPrimitiveIdentity(actual,expected,range),error=>error.kind==='type'&&error.span.start===12);
  for(const [actual,expected]of [[u64,u64],[usize,usize],[array(u64),array(u64)],[{kind:'fixed',bits:64,signed:false},usize]])assert.doesNotThrow(()=>assertRustPrimitiveIdentity(actual,expected,range));
  assert.throws(()=>assertRustPrimitiveIdentity({...usize,patternOwnershipRefusal:'shared source reference'},usize,range),error=>error.kind==='type');
  const option=element=>({kind:'data',name:'same-portable-key',rustStandardGeneric:{kind:'Option',arguments:[element]}});
  assert.throws(()=>assertRustPrimitiveIdentity(option(u64),option(usize),range),error=>error.kind==='type');
});
test('host methods casts conversions contextual literals and never returns preserve actual source identities',{timeout:30_000},async()=>{
  const source='pub fn secs(v:&std::time::Duration)->u64{v.as_secs()} pub fn nanos(v:&std::time::Duration)->u32{v.subsec_nanos()} pub fn line(v:&serde_json::Error)->usize{v.line()} pub fn column(v:&serde_json::Error)->usize{v.column()} pub fn number(v:&serde_json::Value)->Option<u64>{v.as_u64()} pub fn widen(v:u8)->u64{u64::from(v)} pub fn pointer(v:u8)->usize{usize::from(v)} pub fn cast(v:usize)->u64{v as u64} pub fn literal()->usize{7} pub fn never()->usize{panic!("never")} pub fn vector(v:Vec<usize>)->Vec<usize>{v} pub fn nested(v:Vec<Vec<u64>>)->Vec<Vec<u64>>{v}';
  await both(project(source),api=>{
    const duration=Object.freeze({$:'Duration',secs:9n,nanos:23n});assert.equal(api.secs(duration),9n);assert.equal(api.nanos(duration),23n);
    const error=Object.freeze({$:'JsonError',category:Object.freeze({$:'Syntax'}),line:3n,column:7n,message:'fixture'});assert.equal(api.line(error),3n);assert.equal(api.column(error),7n);
    assert.deepEqual(api.number(Object.freeze({$:'Number',field0:Object.freeze({$:'PosInt',field0:23n})})),{$:'Some',field0:23n});
    assert.equal(api.widen(255n),255n);assert.equal(api.pointer(255n),255n);assert.equal(api.cast(13n),13n);assert.equal(api.literal(),7n);assert.throws(()=>api.never(),{message:'never'});assert.deepEqual(api.vector([1n,2n]),[1n,2n]);assert.deepEqual(api.nested([[1n,2n]]),[[1n,2n]]);
  });
  const checked=checkProgram(parseRust('pub fn widen(v:u8)->u64{u64::from(v)} fn main(){}'));
  assert.equal(checked.declarations.get('widen').body.type.rustPrimitiveName,'u64');
});
test('all Host return paths and overload argument checks reject equal-width Rust type substitutions',()=>{
  for(const source of [
    'pub fn bad(v:&serde_json::Error)->u64{v.line()}',
    'pub fn bad(v:&serde_json::Error)->u64{v.column()}',
    'pub fn bad(v:&std::time::Duration)->usize{v.as_secs()}',
    'pub fn bad(v:usize)->std::time::Duration{std::time::Duration::from_secs(v)}',
    'pub fn bad(v:&serde_json::Value)->Option<usize>{v.as_u64()}',
    'pub fn bad(v:u8)->usize{u64::from(v)}',
    'pub fn bad(v:u8)->u64{usize::from(v)}',
    'pub fn bad(v:u16)->isize{isize::from(v)}',
    'pub fn bad(v:Vec<usize>)->Vec<u64>{v}',
    'pub fn bad(v:Vec<Vec<usize>>)->Vec<Vec<u64>>{v}',
    'fn source(v:Vec<usize>)->Vec<usize>{v} pub fn bad(v:Vec<usize>)->Vec<u64>{source(v)}',
    'pub fn bad(v:&usize)->usize{v}',
    'pub fn bad(v:&u8)->u64{u64::from(v)}',
    'pub fn bad(v:Box<u8>)->u64{u64::from(v)}',
    "pub fn bad()->&'static usize{1}",
    'pub fn bad(v:Option<u8>)->usize{v.map_or(u64::from(1u8),|n|usize::from(n))}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'),source);}
});
test('integer From acquisition uses the pinned trait table rather than current pointer bounds',{timeout:30_000},async()=>{
  assert.equal(INTEGER_FROM_PROFILE.rust,'1.89.0');assert.equal(INTEGER_FROM_PROFILE.sha256,'270e0801e5e23cba89fec51eed416be60743034a6f02c5fe64be2e8f2e8ca958');
  const pairs=[['u8','isize',255n],['i8','isize',-128n],['i16','isize',-32768n],['u16','usize',65535n],['usize','usize',9n],['isize','isize',-9n],['u8','i16',255n],['u64','u128',(1n<<64n)-1n]];
  const source=pairs.map(([input,output],index)=>`pub fn convert_${index}(v:${input})->${output}{${output}::from(v)}`).join(' ');
  await both(project(source),api=>{for(const [index,[input,output,value]]of pairs.entries()){assert.equal(hasIntegerFrom(input,output),true);assert.equal(api['convert_'+index](value),value);}});
  for(const [input,output]of [['u16','isize'],['u32','isize'],['i8','usize'],['i16','usize'],['usize','u64'],['usize','u128'],['isize','i128']]) {
    assert.equal(hasIntegerFrom(input,output),false);assert.equal(project(`pub fn bad(v:${input})->${output}{${output}::from(v)}`).meta.executable.some(entry=>entry.name==='bad'),false);
  }
});
