import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';

const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function both(result,assertions) {
  assert.deepEqual(result.meta.refused,[]);
  const folder=mkdtempSync(join(tmpdir(),'router-array-borrow-'));
  try {
    writeRuntimeAssets(folder);const js=join(folder,'src/fixture.mjs'),ts=join(folder,'src/fixture.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30_000});
    try{execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(folder,'compiled'),ts],{encoding:'utf8',timeout:30_000});}catch(error){throw new Error(error.stdout+error.stderr,{cause:error});}
    for(const path of [js,join(folder,'compiled/fixture.js')])await assertions((await import(pathToFileURL(path).href)).translated);
  } finally {rmSync(folder,{recursive:true,force:true});}
}
const nodes=(node,kind)=>node&&typeof node==='object'?[...(node.k===kind?[node]:[]),...Object.entries(node).filter(([key])=>!['type','arrayBorrowProof','sourceArrayBorrow'].includes(key)).flatMap(([,value])=>Array.isArray(value)?value.flatMap(item=>nodes(item,kind)):nodes(value,kind))]:[];

test('literal promotion proves immutable array origin and static empty alternatives',{timeout:30_000},async()=>{
  const source="pub fn bytes()->&'static [u8]{&[1u8,2u8]} pub fn words()->&'static [&'static str]{&[\"a\",\"b\"]} pub fn empty()->&'static [u8]{&[]} fn accepts(v:Option<&'static str>)->u8{1} pub fn none()->u8{accepts(None)}";
  const program=checkProgram(parseRust(source+' fn main(){}'));
  const proof=nodes(program.declarations.get('bytes').body,'routerSharedArrayLiteral')[0];
  assert.equal(proof.arrayBorrowProof.rule,'rvalue-promotion');
  assert.equal(source.slice(proof.span.start,proof.span.end),'&[1u8,2u8]');
  assert.equal(proof.sourceArrayBorrow.tokens[0].value,'&');
  await both(project(source),api=>{assert.deepEqual(api.bytes(),[1n,2n]);assert.deepEqual(api.words(),['a','b']);assert.deepEqual(api.empty(),[]);assert.ok(Object.isFrozen(api.bytes()));assert.equal(api.none(),1n);});
});

test('constant extension preserves actual nominal constructors and written field paths',{timeout:30_000},async()=>{
  const source="struct A{n:u8} struct B{items:&'static [A]} const C:&[B]=&[B{items:&[A{n:7}]}]; struct Future{bytes:&'static [u8]} const FORWARD:&[Future]=&[later()]; const fn later()->Future{Future{bytes:&[9u8]}}";
  const program=checkProgram(parseRust(source+' fn main(){}'));
  const borrows=nodes(program.declarations.get('C').body,'routerSharedArrayLiteral');
  assert.equal(borrows.length,2);
  assert.ok(borrows.every(node=>node.arrayBorrowProof.rule==='constant-initializer-extension'));
  assert.ok(borrows.some(node=>node.arrayBorrowProof.extension.path.includes('items')));
  await both(project(source),api=>{assert.equal(api.C[0].items[0].n,7n);assert.ok(Object.isFrozen(api.C));assert.ok(Object.isFrozen(api.C[0].items));assert.deepEqual(api.FORWARD[0].bytes,[9n]);});
});

test('captures, nominal promotion, call arguments, ownership and const panics stay refused',()=>{
  for(const source of [
    "pub fn bad(v:u8)->&'static [u8]{&[v]}",
    "struct A{n:u8} pub fn bad()->&'static [A]{&[A{n:1}]}",
    "struct A{n:u8} const fn accepts(v:&'static [A])->u8{0} const bad:u8=accepts(&[A{n:1}]);",
    "struct A{n:u8} const fn bad()->&'static [A]{&[A{n:1}]}",
    "pub fn bad()->&'static [String]{&[String::from(\"owned\")]}",
    "pub fn bad()->&'static [u8]{&[255u8+1u8]}",
    "pub fn bad()->&'static [u8]{&[1u8/0u8]}",
    "pub fn bad()->&'static [u8]{&vec![1u8]}",
    "pub fn bad()->&'static [u8]{&mut [1u8]}",
    "pub fn bad()->&'static [u8]{&[1u8;2]}",
    "const bad:&[u8]={let unused=255u8+1u8;&[1u8]};",
    "const bad:&[u8]={let unused=1u8/0u8;&[1u8]};",
    "const fn overflows()->u8{255u8+1u8} const bad:&[u8]={let unused=overflows();&[1u8]};",
    "const fn divides()->u8{1u8/0u8} const bad:&[u8]={let unused=divides();&[1u8]};",
  ]){const result=project(source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.ok(!result.meta.executable.some(item=>item.name==='bad'),source);}
});

test('checked Option propagation retains static tuple payload leaf origins',{timeout:30_000},async()=>{
  const source="pub fn propagated(value:Option<(&'static str,&'static str)>)->Option<&'static str>{let (left,_)=value?;Some(left)}";
  await both(project(source),api=>{assert.deepEqual(api.propagated(Object.freeze({$:'None'})),{$:'None'});assert.deepEqual(api.propagated(Object.freeze({$:'Some',field0:Object.freeze({$:'Tuple',field0:'left',field1:'right'})})),{$:'Some',field0:'left'});let reads=0;assert.throws(()=>api.propagated(new Proxy({}, {get(){reads++;throw new Error('hostile');},ownKeys(){reads++;throw new Error('hostile');},getOwnPropertyDescriptor(){reads++;throw new Error('hostile');},getPrototypeOf(){reads++;throw new Error('hostile');}})),TypeError);assert.equal(reads,0);});
  assert.ok(project("pub fn bad(value:Option<(&str,&str)>)->Option<&str>{let (left,_)=value?;Some(left)}").meta.refused.some(item=>item.name==='bad'));
  assert.ok(project("pub fn bad(value:Result<u8,&str>)->Result<u8,&'static str>{let result=value?;Ok(result)}").meta.refused.some(item=>item.name==='bad'));
});

test('unchanged verification constant and its actual helpers run in both emitted targets',{timeout:30_000},async()=>{
  const source=readFileSync(new URL('../../../src/verification.rs',import.meta.url),'utf8');
  const pins={Run:'10d003eb79e8bbc05829dafe0b06c6d0d2d9005cfa50ee8346eeee28004da9ef',Area:'37a0ff6e05a6449fd0defe819cd1c6ef55f95b325792b2272f96b6b17214d82e',tests:'14f0e1f4a6111faa1ecb4032d9be28c5ee872cde1b7f237812a594b1228404eb',unit:'4ed0ef7ea0423e468281f1bfd3e3932589d47406a815434d7130fb4e4bf08732',AREAS:'183095f1a2687fd6d2e084b465f9dee667f7a77ea86189b49c8b92abf97295d3'};
  const selected=sourceItems(source).filter(item=>['struct','fn','const'].includes(item.term)&&['Run','Area','tests','unit','AREAS'].includes(item.name));
  assert.deepEqual(selected.map(item=>item.name),['Run','Area','tests','unit','AREAS']);
  for(const item of selected){const declaration=source.slice(item.start,item.end);assert.equal(createHash('sha256').update(declaration).digest('hex'),pins[item.name]);}
  const declarations=selected.map(item=>source.slice(item.start,item.end)).join('\n');
  const result=project(declarations);assert.deepEqual(result.meta.executable.map(item=>item.name),['tests','unit','AREAS']);
  await both(result,api=>{assert.deepEqual(api.AREAS.map(area=>area.name),['catalogs','real-clients','zai-only-entitlements','anthropic-mock-contracts','anthropic-entitlements','request-logs','backup-reset-restore','rolling-updates','deploy-configuration','staging']);assert.deepEqual(api.AREAS[0].runs[0].targets,['credential_carrier_test','synthetic_catalog_test','gemini_namespace_test','clients_split_origins_test','client_ownership_test','managed_server_test','lefine_live_test']);assert.deepEqual(api.AREAS[0].runs[1].unit,['--lib']);assert.deepEqual(api.AREAS[0].runs[1].filter,{$:'Some',field0:'model_catalog'});assert.equal(api.AREAS[1].runs[0].serial,true);assert.equal(api.AREAS[5].runs[0].serial,false);assert.ok(Object.isFrozen(api.AREAS));assert.ok(Object.isFrozen(api.AREAS[0].runs));});
});
