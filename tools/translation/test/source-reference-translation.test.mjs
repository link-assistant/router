import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,sharedFixedPointee,sharedBooleanPointee} from '../extensions/host-contracts.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function both(result,assertions) {
  assert.deepEqual(result.meta.refused,[]);
  const folder=mkdtempSync(join(tmpdir(),'router-source-reference-'));
  try {
    writeRuntimeAssets(folder);const js=join(folder,'src/fixture.mjs'),ts=join(folder,'src/fixture.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30_000});
    try{execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(folder,'compiled'),ts],{encoding:'utf8',timeout:30_000});}catch(error){throw new Error(error.stdout+error.stderr,{cause:error});}
    const effects=await import(pathToFileURL(join(folder,'runtime/effects.mjs')).href);
    for(const path of [js,join(folder,'compiled/fixture.js')])await assertions((await import(pathToFileURL(path).href)).translated,effects);
  } finally {rmSync(folder,{recursive:true,force:true});}
}
test('reference metadata retains actual parsed and resolved pointees and exact source coordinates',()=>{
  const source="struct Item{value:u8} pub fn refs(a:&u64,b:&String,c:&Option<u8>,d:&Item,e:&&u64,f:&'static u16,g:&&str)->u8{0} fn main(){}";
  const surface=parseRust(source),params=surface.items.find(entry=>entry.name==='refs').params;
  for(const param of params) {
    const reference=param.type.rustReference;assert.equal(reference.kind,'shared');assert.equal(param.type.patternOwnershipRefusal,'shared source reference');
    assert.notEqual(reference.pointee,param.type);assert.equal(source.slice(reference.span.start,reference.span.end).startsWith('&'),true);
    for(const token of reference.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.value);
  }
  assert.equal(params[0].type.rustReference.pointee.rustPrimitiveName,'u64');
  assert.match(params[1].type.rustReference.pointee.patternOwnershipRefusal,/String/);
  assert.equal(params[4].type.rustReference.pointee.rustReference.pointee.rustPrimitiveName,'u64');
  assert.equal(params[6].type.rustReference.pointee.kind,'string');assert.equal(params[6].type.rustReference.pointee.rustReference,undefined);
  const checked=checkProgram(surface).declarations.get('refs');
  assert.equal(checked.params[2].type.rustReference.pointee.kind,'data');assert.equal(checked.params[2].type.rustReference.pointee.rustStandardGeneric.arguments[0].rustPrimitiveName,'u8');
  assert.equal(checked.params[3].type.rustReference.pointee.name,'Item');
  assert.deepEqual(JSON.parse(JSON.stringify(checked.params[4].type)),checked.params[4].type);
});
test('explicit fixed primitive dereferences and inherent receiver copies execute checked immutable values',{timeout:30_000},async()=>{
  const source='pub fn read(v:&u64)->u64{*v} pub fn nested(v:&&u64)->u64{**v} pub fn signed(v:&i16)->i16{*v} fn value(v:u64)->u64{v} fn reference(v:&u64)->&u64{v} pub fn call(v:&u64)->u64{value(*reference(v))} pub fn saturating(v:&u8)->u8{v.saturating_add(1)} pub fn nested_add(v:&&u64)->u64{v.saturating_add(1)} pub fn checked(v:&u8)->Option<u8>{v.checked_mul(2)} pub fn static_read(v:&\'static usize)->usize{*v} pub const fn constant(v:&u16)->u16{*v} pub fn logic(a:bool,b:bool)->bool{a&&b}';
  await both(project(source),api=>{
    for(const value of [0n,1n,(1n<<64n)-1n]){assert.equal(api.read(value),value);assert.equal(api.nested(value),value);assert.equal(api.call(value),value);}
    assert.equal(api.signed(-32768n),-32768n);assert.equal(api.saturating(255n),255n);assert.equal(api.saturating(7n),8n);assert.equal(api.nested_add((1n<<64n)-1n),(1n<<64n)-1n);
    assert.deepEqual(api.checked(127n),{$:'Some',field0:254n});assert.deepEqual(api.checked(128n),{$:'None'});assert.equal(api.static_read(9n),9n);assert.equal(api.constant(65535n),65535n);
    assert.equal(api.logic(true,false),false);assert.equal(api.logic(true,true),true);
    for(const invalid of [-1n,1n<<64n])assert.throws(()=>api.read(invalid),RangeError);
    for(const invalid of [1,{}])assert.throws(()=>api.read(invalid),TypeError);
    let reads=0;const hostile=new Proxy({}, {get(){reads++;throw Error('get');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');},ownKeys(){reads++;throw Error('keys');},getPrototypeOf(){reads++;throw Error('prototype');}});
    assert.throws(()=>api.read(hostile),TypeError);assert.equal(reads,0);
  });
  const checked=checkProgram(parseRust('pub fn read(v:&u64)->u64{*v} fn main(){}')).declarations.get('read').body;
  assert.equal(checked.k,'routerPrimitiveDereference');assert.equal(checked.dereferenceProof.kind,'shared-fixed-copy');assert.equal(checked.dereferenceProof.primitiveName,'u64');assert.equal(checked.type.rustReference,undefined);
});
test('actual shared boolean dereferences preserve reference depth and checked bool Copy',{timeout:30_000},async()=>{
  const source='pub fn read(v:&bool)->bool{*v} pub fn nested(v:&&bool)->bool{**v} fn identity(v:&bool)->&bool{v} pub fn negate(v:&bool)->bool{!*identity(v)}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await both(result,api=>{for(const value of [false,true]){assert.equal(api.read(value),value);assert.equal(api.nested(value),value);assert.equal(api.negate(value),!value);}for(const value of [0,1,null,{}])assert.throws(()=>api.read(value),TypeError);});
  const checked=checkProgram(parseRust(source+' fn main(){}')).declarations.get('read').body;
  assert.equal(checked.dereferenceProof.kind,'shared-bool-copy');
  assert.equal(checked.type.kind,'bool');assert.equal(checked.type.rustReference,undefined);
  const value={kind:'bool',rustSourceType:true},reference={...value,patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:value}},range={start:1,end:3};
  assert.equal(sharedBooleanPointee(reference,range),value);
  for(const type of [value,{...reference,rustReference:{kind:'mutable',pointee:value}},{...reference,rustReference:{kind:'shared',pointee:{kind:'fixed',bits:8,signed:false,rustPrimitiveName:'u8'}}},{...reference,rustGenericIdentityUnresolved:true},{...reference,rustReference:{kind:'shared',pointee:{...value,rustBorrowingUnresolved:true}}}])assert.throws(()=>sharedBooleanPointee(type,range),error=>error.kind==='unsupported'&&error.span.start===1);
  for(const input of ['pub fn bad(v:bool)->bool{*v}','pub fn bad(v:&mut bool)->bool{*v}','pub fn bad(v:&bool)->bool{v}','pub fn bad(v:&bool)->&bool{*v}',`pub fn bad(v:${'&'.repeat(34)}bool)->bool{${'*'.repeat(34)}v}`])assert.ok(project(input).meta.refused.some(item=>item.name==='bad'),input);
});
test('receiver and operand effects remain once each in original evaluation order',{timeout:30_000},async()=>{
  const source='fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()} fn receiver(v:&u64)->&u64{let ignored=mark("receiver");v} fn operand()->u64{let ignored=mark("operand");2} pub fn observed(v:&u64)->u64{receiver(v).saturating_add(operand())}';
  await both(project(source),(api,{withEffectCapabilities})=>{
    const calls=[];const result=withEffectCapabilities({fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}},()=>api.observed(5n));
    assert.equal(result,7n);assert.deepEqual(calls,['receiver','operand']);
  });
});
test('runtime layout arguments omit compiler reference metadata while checked evidence retains it',{timeout:30_000},async()=>{
  const source='pub fn reference(v:&Option<u8>)->&Option<u8>{v}',result=project(source);
  assert.equal(result.javascript.includes('"rustReference"'),false);assert.equal(result.javascript.includes('"rustStandardGeneric"'),false);
  assert.equal(checkProgram(parseRust(source+' fn main(){}')).declarations.get('reference').params[0].type.rustReference.pointee.kind,'data');
  await both(result,api=>{for(const value of [Object.freeze({$:'None'}),Object.freeze({$:'Some',field0:9n})])assert.equal(api.reference(value),value);assert.throws(()=>api.reference(Object.freeze({$:'Some',field0:256n})),TypeError);});
});
test('dereference never grants value coercions aggregate Copy trait Deref or reference Ord semantics',()=>{
  for(const source of [
    'fn value(v:u64)->u64{v} pub fn bad(v:&u64)->u64{value(v)}',
    'pub fn bad(v:&u64)->u64{v}',
    'pub fn bad(v:&u64)->usize{*v}',
    'pub fn bad(v:&usize)->u64{v.saturating_add(1)}',
    'pub fn bad(v:&u64)->&u64{*v}',
    'pub fn bad(v:&&u64)->&u64{v}',
    'pub fn bad(v:&u64)->&&u64{v}',
    'fn reference(v:&u64)->&u64{v} pub fn bad(v:&&u64)->&u64{reference(v)}',
    'pub fn bad(v:u64)->u64{*v}',
    'pub fn bad(v:&Box<u8>)->u8{*v}',
    'pub fn bad(v:Box<u8>)->u8{*v}',
    'struct Item{value:u8} pub fn bad(v:&Item)->Item{*v}',
    'pub fn bad(v:&u64)->u64{v.min(1)}',
    'pub fn bad(v:&u64)->u64{v.max(1)}',
    'pub fn bad(v:&u64)->u64{v.clamp(0,1)}',
    'pub fn bad(v:&mut u64)->u64{*v}',
    "pub fn bad<'a>(v:&'a u64)->u64{v}",
    'pub fn bad(v:&u64)->u64{*(return 1)}',
    'struct u64{value:u8} pub fn bad(v:&u64)->u8{*v}',
    `pub fn bad(v:${'&'.repeat(34)}u64)->u64{v}`,
  ]){const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'),source);}
  const fixed={kind:'fixed',bits:64,signed:false,rustPrimitiveName:'u64'},range={start:1,end:3};
  for(const type of [fixed,{...fixed,rustReference:{kind:'shared'}},{...fixed,rustReference:{kind:'mutable',pointee:fixed}},{...fixed,rustReference:{kind:'shared',pointee:{...fixed,rustGenericIdentityUnresolved:true}}},{...fixed,rustReference:{kind:'shared',pointee:{...fixed,rustPrimitiveName:'usize'}}}])assert.throws(()=>sharedFixedPointee(type,range),error=>error.kind==='unsupported'&&error.span.start===1);
});
