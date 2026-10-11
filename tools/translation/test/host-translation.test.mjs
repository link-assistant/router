import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {regenerate,trackedSource} from '../bulk.mjs';
import {fileURLToPath} from 'node:url';
import {loadJavaScript,writeRuntimeAssets} from './artifact-loader.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const strict=result=>{const dir=mkdtempSync(join(tmpdir(),'router-host-types-'));try{writeRuntimeAssets(dir);writeFileSync(join(dir,'src/module.ts'),result.typescript);execFileSync(process.env.ROUTER_TRANSLATION_TSC ?? 'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--noEmit',join(dir,'src/module.ts')],{encoding:'utf8'});}finally{rmSync(dir,{force:true,recursive:true});}};
const tagged=($,fields={})=>Object.freeze({$,...fields});
const string=value=>tagged('String',{field0:value});
const map=entries=>tagged('Object',{field0:tagged('Map',{entries:Object.freeze(entries.map(([key,value])=>tagged('MapEntry',{key,value})))})});
test('registered JSON paths and function-item callbacks execute checked typed bodies',async()=>{
 const result=project('use serde_json::Value as Json; pub fn classify(value:&Json)->bool { value.pointer("/chat/type").and_then(Json::as_str).is_some_and(|kind| kind == "private") }');
 assert.deepEqual(result.meta.refused,[]);strict(result);const api=(await loadJavaScript(result.javascript)).translated;
 assert.equal(api.classify(map([['chat',map([['type',string('private')]])]])),true);
 assert.equal(api.classify(map([['chat',map([['type',string('group')]])]])),false);
 assert.equal(api.classify(tagged('Null')),false);
 assert.equal(api.classify(map([['chat',map([['type',tagged('Bool',{field0:true})]])]])),false);
});
test('registered JSON refinements validate parameters even when no JSON operation is called',async()=>{
 const result=project('pub fn identity(value:&serde_json::Value)->&serde_json::Value { value }');assert.deepEqual(result.meta.refused,[]);strict(result);
 const api=(await loadJavaScript(result.javascript)).translated;
 const valid=tagged('Number',{field0:tagged('PosInt',{field0:18446744073709551615n})});assert.equal(api.identity(valid),valid);
 for(const invalid of [tagged('Number',{field0:tagged('Float',{field0:NaN})}),tagged('Number',{field0:tagged('Float',{field0:Infinity})}),tagged('Number',{field0:tagged('NegInt',{field0:0n})}),map([['b',tagged('Null')],['a',tagged('Null')]]),map([['a',tagged('Null')],['a',tagged('Null')]])])assert.throws(()=>api.identity(invalid),TypeError);
 let getters=0;assert.throws(()=>api.identity({$: 'Number',get field0(){getters++;return tagged('PosInt',{field0:1n});}}),TypeError);assert.equal(getters,0);
 const unicode=map([['\ue000',tagged('Null')],['\u{10000}',tagged('Null')]]);assert.equal(api.identity(unicode),unicode);assert.throws(()=>api.identity(map([['\u{10000}',tagged('Null')],['\ue000',tagged('Null')]])),TypeError);
});
test('Duration normalized refinement and general IEEE float domains remain distinct',async()=>{
 const result=project('pub fn same(value:&std::time::Duration)->&std::time::Duration {value} pub fn floating(value:f64)->f64 {value} pub fn limit(value:std::time::Duration)->std::time::Duration {value.min(std::time::Duration::from_secs(3))}');assert.deepEqual(result.meta.refused,[]);strict(result);const api=(await loadJavaScript(result.javascript)).translated;
 const value=tagged('Duration',{secs:2n,nanos:999999999n});assert.equal(api.same(value),value);assert.equal(api.limit(value),value);assert.deepEqual(api.limit(tagged('Duration',{secs:4n,nanos:0n})),tagged('Duration',{secs:3n,nanos:0n}));
 assert.throws(()=>api.same(tagged('Duration',{secs:2n,nanos:1000000000n})),RangeError);assert.throws(()=>api.same({$:'Duration',secs:2n,nanos:0n}),TypeError);
 assert.ok(Number.isNaN(api.floating(NaN)));assert.equal(api.floating(Infinity),Infinity);assert.equal(Object.is(api.floating(-0),-0),true);
});
test('pure runtime host calls do not satisfy non-const source obligations',()=>{
 const result=project('pub const BAD:std::time::Duration=std::time::Duration::default(); pub const GOOD:std::time::Duration=std::time::Duration::from_secs(2);');
 assert.equal(result.meta.executable.some(entry=>entry.name==='BAD'),false);assert.equal(result.meta.executable.some(entry=>entry.name==='GOOD'),true);assert.ok(result.meta.refused.some(entry=>/non-const/.test(entry.message)));
});
test('source exports and generated artifacts are stable across repeated translations in one process',async()=>{
 const source='pub fn add(a:u8,b:u8)->u8 {a+b} pub fn cap(value:u32)->u32 {if value>10 {10}else{value}}';const a=translateSource(source,'acceptance.rs');translateSource('pub fn unrelated()->u8 {5}');const b=translateSource(source,'acceptance.rs');assert.deepEqual(a,b);const api=(await loadJavaScript(a.javascript)).translated;assert.equal(api.cap(15n),10n);assert.equal(api.add(1n,2n),3n);
 const dir=mkdtempSync(join(tmpdir(),'router-host-repeat-'));try{mkdirSync(join(dir,'src'));writeFileSync(join(dir,'src/fixture.rs'),'pub fn observed()->u8 {5}');regenerate({root:dir,sources:['src/fixture.rs'],entries:[]});assert.deepEqual(regenerate({root:dir,sources:['src/fixture.rs'],entries:[],check:true}).failures,[]);}finally{rmSync(dir,{force:true,recursive:true});}
});

test('user enum shapes, host namespace shadows and imported generic shadows never select standard contracts',()=>{
 for(const source of [
  'enum Fake {None,Some(u8)} pub fn invented(x:Fake)->bool{x.is_some_and(|v|v>0)}',
  'enum Fake {None,Some(u8)} pub fn invented(x:Fake)->Option<u8>{x.and_then(|v|Some(v))}',
  'enum Fake {Err(u8),Ok(u8)} pub fn invented(x:Fake)->Fake{let v=x?;Fake::Ok(v)}',
  'enum Fake {None,Some(u8)} pub fn invented(x:Option<u8>)->Fake{x.and_then(|v|Fake::Some(v))}',
  'mod std {pub mod time {pub struct Duration {secs:u64,nanos:u32}}} pub fn invented(x:&std::time::Duration)->&std::time::Duration{x}',
  'mod other {pub enum Option {None,Some(u8)}} use crate::other::Option;pub fn invented(x:Option<u8>)->bool{x.is_some_and(|v|v>0)}',
  'enum Option {None,Some(u8)} pub fn invented(x:Option<u8>)->bool{x.is_some_and(|v|v>0)}',
  'mod Option {} pub fn invented(value:u8)->Option<u8>{Option::Some(value)}',
  'mod Result {} pub fn invented(value:u8)->Result<u8,u8>{Result::Ok(value)}',
 ]){const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='invented'),false,source);assert.ok(result.meta.refused.length,source);}
});

test('overlapping registered imports coalesce once across genuine source dependency closures',async()=>{
 const root=fileURLToPath(new URL('../../../',import.meta.url));const path='src/request_routing.rs';
 const source=trackedSource(root,path),checked=translateProject({entry:path,paths:[path],readSource:()=>source}),result=translateSource(source,path,{projectDeclarations:checked.executableDeclarations});assert.ok(result.ir.items.some(item=>item.name==='bounded_retry_after'&&item.status==='executable'));strict(result);await loadJavaScript(result.javascript);
 const imported=result.javascript.match(/std_time_duration_from_secs as ml_host_std_time_duration_from_secs/g)??[];assert.equal(imported.length,1);
});

test('constructor spelling preserves actual source owners, function calls and dependencies',async()=>{
 const files={'src/lib.rs':'mod foo; pub fn run(value:u8)->Option<u8>{foo::Some(value)}', 'src/foo.rs':'pub fn Some(value:u8)->Option<u8>{Option::Some(value + 1)}'};
 const checked=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(checked.meta.refused,[]);strict(checked);const api=(await loadJavaScript(checked.javascript)).translated;assert.deepEqual(api.run(1n),tagged('Some',{field0:2n}));assert.throws(()=>api.run(255n),RangeError);
 const local=project('pub fn Some(value:u8)->Option<u8>{Option::Some(value + 2)} pub fn run(value:u8)->Option<u8>{Some(value)}');assert.deepEqual(local.meta.refused,[]);assert.deepEqual((await loadJavaScript(local.javascript)).translated.run(1n),tagged('Some',{field0:3n}));
 for(const source of [
  'enum Fake {None,Some(u8)} pub fn invented(value:u8)->Option<u8>{Fake::Some(value)}',
  'enum Fake {Err(u8),Ok(u8)} pub fn invented(value:u8)->Result<u8,u8>{Fake::Ok(value)}',
  'enum Fake {None,Some(u8)} pub fn invented(value:Option<u8>)->u8{match value {Fake::Some(x)=>x,Fake::None=>0}}',
  'mod foo {pub fn Some(value:u8)->Option<u8>{Option::Some(value+1)}} pub fn invented(value:u8)->Option<u8>{foo::Some(value)}',
 ]){const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='invented'),false,source);assert.ok(result.meta.refused.length,source);}
 const refused=translateProject({entry:'src/lib.rs',paths:['src/lib.rs','src/foo.rs'],readSource:path=>path==='src/foo.rs'?'pub fn Some(value:u8)->Option<u8>{missing(value)}':files[path]});assert.equal(refused.meta.executable.some(entry=>entry.name==='run'),false);
});
