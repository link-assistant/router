import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const some=value=>({$:'Some',field0:value}),none={$:'None'};
const hash=source=>createHash('sha256').update(source).digest('hex');

test('actual value-only names preserve prelude types and their own callable bodies in both targets',async()=>{
  const source='fn Option()->u8{7} fn Result()->u8{8} fn Vec()->u8{9} fn String()->u8{10} pub fn value()->u8{Option()+Result()+Vec()+String()} pub fn maybe(value:Option<u8>)->Option<u8>{value} pub fn answer(value:Result<u8,u16>)->Result<u8,u16>{value} pub fn bytes(value:Vec<u8>)->Vec<u8>{value} pub fn owned(value:String)->String{value}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.value(),34n);assert.deepEqual(api.maybe(some(3n)),some(3n));assert.deepEqual(api.maybe(none),none);assert.deepEqual(api.answer({$:'Err',field0:300n}),{$:'Err',field0:300n});assert.deepEqual(api.bytes([1n,2n]),[1n,2n]);assert.equal(api.owned('text'),'text');assert.throws(()=>api.maybe(some(256n)),RangeError);});
  const local=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});assert.equal(local.ir.counts.executableFunctions,9);
  await verifyTypedTargets(local,api=>{assert.equal(api.value(),34n);assert.deepEqual(api.maybe(some(5n)),some(5n));});
});

test('standard type aliases and qualified owners remain independent from actual same-spelled value functions',async()=>{
  const result=project('use std::option::Option as Maybe; fn Maybe()->u8{7} fn String()->u8{9} pub fn count()->u8{Maybe()+String()} pub fn create(value:u8)->Maybe<u8>{Maybe::Some(value)} pub fn empty()->std::option::Option<u8>{std::option::Option::None} pub fn text()->String{String::from("literal")}');
  assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,api=>{assert.equal(api.count(),16n);assert.deepEqual(api.create(2n),some(2n));assert.deepEqual(api.empty(),none);assert.equal(api.text(),'literal');});
});

test('bare Some and None resolve real value shadows while qualified standard variants retain checked owners',async()=>{
  const result=project('fn Some(value:u8)->u8{value+1} fn None()->u8{11} fn std()->u8{7} pub fn count(value:u8)->u8{Some(value)+None()} pub fn create(value:u8)->std::option::Option<u8>{std::option::Option::Some(value)}');
  assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,api=>{assert.equal(api.count(3n),15n);assert.equal(api.std(),7n);assert.deepEqual(api.create(3n),some(3n));});
});

test('ambiguous lexical value collisions carry before any module alias call is emitted',()=>{
  for(const source of [
    'use std::option::Option::Some; pub fn bad(Some:u8)->u8{Some}',
    'use std::option::Option::None; pub fn bad(None:Option<u8>)->Option<u8>{None}',
    'use std::option::Option::Some as Present; pub fn bad(Present:u8)->u8{Present}',
    'fn String()->u8{7} pub fn bad(String:u8)->u8{String}',
    'fn value()->u8{7} pub fn bad()->u8{let value=3u8;value}',
    'use std::option::Option as Maybe; fn Maybe()->u8{7} pub fn bad(Maybe:u8)->u8{Maybe}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'&&/scope collision/u.test(item.message)),source);}
});

test('actual type shadows unknown imports and procedural expansion never acquire standard source identity',()=>{
  for(const source of [
    'mod Option{} pub fn bad(value:Option<u8>)->Option<u8>{value}',
    'struct String{value:u8} pub fn bad()->String{String::from("x")}',
    'use unknown::Option; pub fn bad(value:Option<u8>)->Option<u8>{value}',
    'use unknown::*; fn std()->u8{7} pub fn bad(value:std::option::Option<u8>)->std::option::Option<u8>{value}',
    '#[derive(custom::Expand)] struct S; fn std()->u8{7} pub fn bad(value:std::option::Option<u8>)->std::option::Option<u8>{value}',
  ])assert.equal(project(source).meta.executable.some(item=>item.name==='bad'),false,source);
});

test('unchanged tracked non_empty body is a pinned namespace regression rather than a whole-module recovery',async()=>{
  const original=readFileSync(new URL('../../../src/account_http.rs',import.meta.url),'utf8');assert.equal(hash(original),'876e7e38985d93f896c9d191f9d7591abb66697f93504a202d4fd208217bdd09');
  const item=sourceItems(original).find(item=>item.name==='non_empty'),body=original.slice(item.start,item.end);assert.equal(hash(body),'4c1bb4cb6df8b811efb497fc5266ca0ae5cc6da15e216231283c009fe89b12b4');
  const result=project('fn Result()->u8{7}\n'+body);assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.runtimeParity,false);
  const entry=result.executableDeclarations.find(entry=>entry.name==='non_empty');assert.ok(entry);assert.equal(hash(('fn Result()->u8{7}\n'+body).slice(entry.span.start,entry.span.end)),hash(body));
  const alias=`\nexport {rp_${Buffer.from('non_empty').toString('hex')} as originalNonEmpty};`;
  await verifyTypedTargets({...result,javascript:result.javascript+alias,typescript:result.typescript+alias},(_api,_result,module)=>{assert.deepEqual(module.originalNonEmpty(' value ','option'),{$:'Ok',field0:'value'});assert.deepEqual(module.originalNonEmpty(' \n','option'),{$:'Err',field0:'option needs a value'});assert.throws(()=>module.originalNonEmpty(7,'option'),TypeError);});
});
