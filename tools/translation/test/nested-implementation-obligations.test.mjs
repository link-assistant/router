import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {originalNestedImplementationObligations} from '../nested-implementation-obligations.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
const views=source=>captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}).views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition}));
const cases=[
 ['Clone record nested destructor','#[derive(Clone)]pub struct Payload{value:u32}fn hidden(){impl Drop for Payload{fn drop(&mut self){}}}pub fn duplicate(x:&Payload)->Payload{x.clone()}','Payload.clone','duplicate'],
 ['Copy record nested alias destructor','#[derive(Copy,Clone)]pub struct Payload{value:u32}fn hidden(){type Alias=Payload;impl Drop for Alias{fn drop(&mut self){}}}pub fn duplicate(x:&Payload)->Payload{x.clone()}','Payload.clone','duplicate'],
 ['Copy unit nested destructor','#[derive(Copy,Clone)]pub enum Payload{A,B}fn hidden(){impl Drop for Payload{fn drop(&mut self){}}}pub fn duplicate(x:&Payload)->Payload{x.clone()}','Payload.clone','duplicate'],
 ['Clone record nested inherent method','#[derive(Clone)]pub struct Payload{value:u32}fn hidden(){impl Payload{fn clone(&self)->Self{Self{value:7}}}}pub fn duplicate(x:&Payload)->Payload{x.clone()}','Payload.clone','duplicate'],
 ['Default unit nested trait method','#[derive(Default)]pub enum Payload{#[default]A,B}fn hidden(){impl Default for Payload{fn default()->Self{Self::B}}}pub fn make()->Payload{Payload::default()}','Payload.default','make'],
 ['Default record nested alias method','#[derive(Default)]pub struct Payload{text:String}fn hidden(){type Alias=Payload;impl Default for Alias{fn default()->Self{Self{text:String::new()}}}}pub fn make()->Payload{Payload::default()}','Payload.default','make'],
 ['Default record nested inherent method','#[derive(Default)]pub struct Payload{value:u32}fn hidden(){impl Payload{fn default()->Self{Self{value:7}}}}pub fn make()->Payload{Payload::default()}','Payload.default','make'],
 ['Clone record const-block destructor','#[derive(Clone)]pub struct Payload{value:u32}const HIDDEN:()={impl Drop for Payload{fn drop(&mut self){}}};pub fn duplicate(x:&Payload)->Payload{x.clone()}','Payload.clone','duplicate'],
];
for(const [label,source,method,caller]of cases)test(label+' preserves its global original obligation while unrelated code executes',{timeout:60000},async()=>{
 const result=compile(source+'pub fn value()->u8{9}');
 assert.equal((result.meta.checkedGeneratedMethods??[]).some(row=>row.name===method),false);
 assert.equal(result.meta.executable.some(row=>row.name===caller),false);
 assert.ok(result.meta.refused.some(row=>row.name===method&&/nested|unresolved or overlapping/.test(row.message)),JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>assert.equal(api.value(),9n),{childTimeoutMs:20000});
});
test('nested census retains exact complete source identity and inner keyword spans',()=>{
 const source='pub struct Payload{value:u8}fn hidden(){impl Payload{fn value(&self)->u8{self.value}}}',module=views(source)[0],rows=originalNestedImplementationObligations(module);
 assert.equal(rows.length,1);assert.deepEqual(rows[0].span,{start:source.indexOf('impl'),end:source.indexOf('impl')+4});
 assert.equal(rows[0].sourceSha256,createHash('sha256').update(source).digest('hex'));assert.equal(rows[0].enclosingName,'hidden');assert.ok(Object.isFrozen(rows));assert.ok(Object.isFrozen(rows[0]));
 assert.throws(()=>originalNestedImplementationObligations({...module,source:source+' '}),/source.*changed|original/i);
 let reads=0;const accessor=Object.defineProperty({...module},'source',{get(){reads++;return source;}});
 assert.throws(()=>originalNestedImplementationObligations(accessor),/data property/);assert.equal(reads,0);
 assert.throws(()=>originalNestedImplementationObligations(new Proxy(module,{})),/ordinary original module/);
});
test('genuine child module impl headers retain their independent lexical views and useful Clone behavior',{timeout:60000},async()=>{
 const source='#[derive(Clone)]pub struct Payload{value:u32}mod other{pub struct Other{value:u8}impl Other{pub fn read(&self)->u8{self.value}}}pub fn duplicate(x:&Payload)->Payload{x.clone()}';
 for(const module of views(source))assert.deepEqual(originalNestedImplementationObligations(module),[]);
 const result=compile(source);assert.ok(result.meta.checkedGeneratedMethods.some(row=>row.name==='Payload.clone'));
 await verifyTypedTargets(result,api=>assert.deepEqual(api.duplicate(Object.freeze({$:'Payload',value:7n})),{$:'Payload',value:7n}),{childTimeoutMs:20000});
});
test('inactive original items and implementation words in literals do not invent active nested effects',{timeout:60000},async()=>{
 const source='#[derive(Default,Clone)]pub struct Payload{value:u32}#[cfg(any())]fn hidden(){impl Drop for Payload{fn drop(&mut self){}}}pub fn text()->&\'static str{"impl { }"}pub fn make()->Payload{Payload::default().clone()}';
 assert.deepEqual(originalNestedImplementationObligations(views(source)[0]),[]);
 const result=compile(source);assert.ok(result.meta.checkedGeneratedMethods.some(row=>row.name==='Payload.default'));assert.ok(result.meta.checkedGeneratedMethods.some(row=>row.name==='Payload.clone'));
 await verifyTypedTargets(result,api=>{assert.equal(api.text(),'impl { }');assert.deepEqual(api.make(),{$:'Payload',value:0n});},{childTimeoutMs:20000});
});
test('original opaque parameter and return types do not become implementation declarations',{timeout:60000},async()=>{
 const source='#[derive(Clone)]pub struct Payload{value:u32}mod other{pub struct Other;impl Other{pub fn receive(_:impl Into<u32>)->u8{7}pub fn result()->impl Copy{7u8}}}pub fn duplicate(x:&Payload)->Payload{x.clone()}';
 for(const module of views(source))assert.deepEqual(originalNestedImplementationObligations(module),[]);
 const result=compile(source);assert.ok(result.meta.checkedGeneratedMethods.some(row=>row.name==='Payload.clone'));
 await verifyTypedTargets(result,api=>assert.deepEqual(api.duplicate(Object.freeze({$:'Payload',value:7n})),{$:'Payload',value:7n}),{childTimeoutMs:20000});
});
test('borrowed opaque types retain their original reference lifetime and mutability grammar',()=>{
 for(const reference of ['&','&mut ','&\'a ','&\'a mut ','&\'static ','&\'static mut ']){
  const source="struct Other;impl Other{fn receive<'a>(&self,_:"+reference+'impl Copy){}}';
  for(const module of views(source))assert.deepEqual(originalNestedImplementationObligations(module),[],reference);
 }
 for(const source of ['fn hidden(){impl Drop for Payload{fn drop(&mut self){}}}','fn hidden(){let x=0;impl Payload{fn clone(&self)->Self{Self}}}'])assert.equal(originalNestedImplementationObligations(views(source)[0]).length,1);
});
test('whole unchanged Router reference-to-opaque headers retain an empty nested implementation census',()=>{
 for(const [path,sha256]of [['src/accounts_selection.rs','51157f36c992f5606066c6dee5346cf705a20c31ad4847bad1ee83417d4b8b2a'],['src/audit.rs','63e6f5520be013d18bca0ad1580f1e437fd869926b854e1bd1d30b98d35d3ff1']]){
  const source=readFileSync(repositorySourceURL(path,root),'utf8');assert.equal(createHash('sha256').update(source).digest('hex'),sha256);
  const captured=captureSourceModuleViews({source,sourcePath:path,compilationProfile:PRODUCTION_PROFILE});
  for(const sourceView of captured.views)assert.deepEqual(originalNestedImplementationObligations({file:path,path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition}),[],path);
 }
});
