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
  const source='fn Option()->u8{7} fn Result()->u8{8} fn Vec()->u8{9} fn String()->u8{10} pub fn sum()->u8{Option()+Result()+Vec()+String()} pub fn maybe(value:Option<u8>)->Option<u8>{value} pub fn answer(value:Result<u8,u16>)->Result<u8,u16>{value} pub fn bytes(value:Vec<u8>)->Vec<u8>{value} pub fn owned(value:String)->String{value}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.sum(),34n);assert.deepEqual(api.maybe(some(3n)),some(3n));assert.deepEqual(api.maybe(none),none);assert.deepEqual(api.answer({$:'Err',field0:300n}),{$:'Err',field0:300n});assert.deepEqual(api.bytes([1n,2n]),[1n,2n]);assert.equal(api.owned('text'),'text');assert.throws(()=>api.maybe(some(256n)),{name:'TypeError',message:/machine-integer value out of range/u});});
  const local=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});assert.equal(local.ir.counts.executableFunctions,9);
  await verifyTypedTargets(local,api=>{assert.equal(api.sum(),34n);assert.deepEqual(api.maybe(some(5n)),some(5n));});
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
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'&&/scope collision/u.test(item.message)),source);}
});

test('actual type shadows unknown imports and procedural expansion never acquire standard source identity',()=>{
  for(const source of [
    'mod Option{} pub fn bad(value:Option<u8>)->Option<u8>{value}',
    'mod std{} pub fn bad(value:std::option::Option<u8>)->std::option::Option<u8>{value}',
    'type std=u8; pub fn bad(value:std::option::Option<u8>)->std::option::Option<u8>{value}',
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


test('source parameters and sequential locals precede value aliases without changing qualified type owners',async()=>{
  const result=project('fn value()->u8{7} fn String()->u8{9} pub fn parameter(value:u8)->u8{value} pub fn initializer()->u8{let value=value();value+1} pub fn shadow()->u8{let value=3u8;let value=value+1;value} pub fn inner()->u8{let n={let value=2u8;value};value()+n} pub fn qualified(String:u8)->String{String::from("text")}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.parameter(4n),4n);assert.equal(api.initializer(),8n);assert.equal(api.shadow(),4n);assert.equal(api.inner(),9n);assert.equal(api.qualified(5n),'text');});
});

test('simple closure binders are isolated and preserve outer capture plus initializer order',async()=>{
  const result=project('fn item()->u8{10} pub fn closure(value:Option<u8>)->u8{let extra=2u8;value.map_or(0u8,|item|item+extra)} pub fn after(value:Option<u8>)->u8{let n=value.map_or(0u8,|item|item);item()+n}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.closure(some(3n)),5n);assert.equal(api.closure(none),0n);assert.equal(api.after(some(3n)),13n);});
});

test('lexical callable erasure and unchecked pattern activation remain explicit refusals',()=>{
  for(const source of [
    'fn value()->u8{7} pub fn bad(value:u8)->u8{value()}',
    'fn value()->u8{7} pub fn bad()->u8{let value=3u8;value()}',
    'fn value()->u8{7} pub fn bad(value:Option<u8>)->u8{value.map_or(0u8,|value|value())}',
    'fn item(v:u8)->u8{v+1} pub fn bad(item:u8,value:Option<u8>)->Option<u8>{value.map(item)}',
    'fn item()->u8{7} pub fn bad(value:Option<u8>)->u8{if let Some(item)=value{item}else{0}}',
    'fn item()->u8{7} pub fn bad()->u8{for item in 0u8..2u8{let seen=item;}0}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);}
});


test('unchanged verification Run Area helpers and AREAS preserve field and lexical namespaces in both targets',async()=>{
  const source=readFileSync(new URL('../../../src/verification.rs',import.meta.url),'utf8');
  assert.equal(hash(source),'839dc354baff84b057fd6ec5c84d1f52d9dd4e0ed657843626a500425ef2ffa4');
  const pins={Run:'10d003eb79e8bbc05829dafe0b06c6d0d2d9005cfa50ee8346eeee28004da9ef',Area:'37a0ff6e05a6449fd0defe819cd1c6ef55f95b325792b2272f96b6b17214d82e',tests:'14f0e1f4a6111faa1ecb4032d9be28c5ee872cde1b7f237812a594b1228404eb',unit:'4ed0ef7ea0423e468281f1bfd3e3932589d47406a815434d7130fb4e4bf08732',AREAS:'183095f1a2687fd6d2e084b465f9dee667f7a77ea86189b49c8b92abf97295d3'};
  const selected=sourceItems(source).filter(item=>['struct','fn','const'].includes(item.term)&&Object.hasOwn(pins,item.name));
  assert.deepEqual(selected.map(item=>item.name),['Run','Area','tests','unit','AREAS']);
  for(const item of selected)assert.equal(hash(source.slice(item.start,item.end)),pins[item.name]);
  const declarations=selected.map(item=>source.slice(item.start,item.end)).join('\n'),result=project(declarations);
  assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.runtimeParity,false);
  assert.deepEqual(result.meta.executable.map(item=>item.name),['tests','unit','AREAS']);
  await verifyTypedTargets(result,api=>{
    const targets=Object.freeze(['integration']),units=Object.freeze(['--lib']);
    assert.deepEqual(api.tests(targets).targets,targets);assert.deepEqual(api.tests(targets).unit,[]);
    assert.deepEqual(api.unit(units,'scope').unit,units);assert.deepEqual(api.unit(units,'scope').filter,{$:'Some',field0:'scope'});
    assert.deepEqual(api.AREAS.map(area=>area.name),['catalogs','real-clients','zai-only-entitlements','anthropic-mock-contracts','anthropic-entitlements','request-logs','backup-reset-restore','rolling-updates','deploy-configuration','staging']);
    assert.deepEqual(api.AREAS[0].runs[1].unit,['--lib']);assert.deepEqual(api.AREAS[0].runs[1].filter,{$:'Some',field0:'model_catalog'});assert.ok(Object.isFrozen(api.AREAS));
  });
});


test('actual async fn parameter modifiers retain lexical precedence in both lazy emitted targets',async()=>{
  const result=project('fn value()->u8{7} pub async fn shadow(value:u8)->u8{value} pub async fn sequence()->u8{let value=value();value+1}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,async api=>{assert.equal(await api.shadow(3n),3n);assert.equal(await api.sequence(),8n);});
  const rejected=project('fn value()->u8{7} pub async fn bad(value:u8)->u8{value()}');
  assert.equal(rejected.meta.executable.some(item=>item.name==='bad'),false);assert.ok(rejected.meta.refused.some(item=>item.name==='bad'&&/lexical callable/u.test(item.message)));
});
