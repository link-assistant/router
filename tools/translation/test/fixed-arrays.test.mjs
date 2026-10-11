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
import {roundTripProgram} from '../semantic-meta.mjs';
import {typeKey,sameType} from '../checked-types.mjs';
import {encodeMonomorphicType} from '../monomorphic.mjs';
import {valueSchema} from '../type-layout.mjs';
import {validateRustValue} from '../type-layout-runtime.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';

const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function both(result,assertions) {
  assert.deepEqual(result.meta.refused,[]);
  const folder=mkdtempSync(join(tmpdir(),'router-fixed-array-'));
  try {
    writeRuntimeAssets(folder);
    const js=join(folder,'src/fixture.mjs'),ts=join(folder,'src/fixture.ts');
    writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    try {execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(folder,'compiled'),ts],{encoding:'utf8',timeout:30_000});}
    catch(error){throw new Error(error.stdout+error.stderr,{cause:error});}
    for(const path of [js,join(folder,'compiled/fixture.js')])await assertions((await import(pathToFileURL(path).href)).translated);
  } finally {rmSync(folder,{recursive:true,force:true});}
}

test('fixed arrays retain exact size through meta and both targets copy value boundaries',{timeout:45_000},async()=>{
  const source=`const WORDS:[&str;3]=["a","b","c"];
pub fn pair(value:[u8;2])->[u8;2]{value}
pub fn nested(value:[[u8;2];2])->[[u8;2];2]{value}
pub fn empty()->[u8;0]{[]}
pub fn hex()->[u8;0x2usize]{[3u8,4u8]}
struct Holder{values:[u8;2]}
pub fn from_holder(value:Holder)->[u8;2]{value.values}`;
  const checked=checkProgram(parseRust(source+' fn main(){}'));
  const restored=roundTripProgram(checked);
  assert.equal(typeKey(restored.declarations.get('pair').ret),'fixed-array:2:u8');
  assert.equal(restored.declarations.get('nested').params[0].type.element.rustFixedArray.length,2);
  assert.equal(restored.declarations.get('empty').ret.rustFixedArray.length,0);
  assert.equal(restored.declarations.get('WORDS').constantEvaluationProof.sourceLinksVerified,true);
  const result=project(source);
  assert.match(result.typescript,/readonly length: 2/u);
  await both(result,api=>{
    const original=[1n,2n],copy=api.pair(original);
    assert.deepEqual(copy,[1n,2n]);assert.notEqual(copy,original);assert.ok(Object.isFrozen(copy));
    original[0]=9n;assert.deepEqual(copy,[1n,2n]);
    const row=[3n,4n],matrix=[row,row],nested=api.nested(matrix);
    row[0]=8n;assert.deepEqual(nested,[[3n,4n],[3n,4n]]);
    assert.notEqual(nested[0],nested[1]);assert.ok(Object.isFrozen(nested[0]));
    const field=[5n,6n],fromHolder=api.from_holder({$:'Holder',values:field});
    field[0]=7n;assert.deepEqual(fromHolder,[5n,6n]);assert.ok(Object.isFrozen(fromHolder));
    assert.deepEqual(api.empty(),[]);assert.deepEqual(api.hex(),[3n,4n]);assert.deepEqual(api.WORDS,['a','b','c']);
    for(const wrong of [[1n],[1n,2n,3n],[1n,256n],[1,2]])assert.throws(()=>api.pair(wrong),TypeError);
  });
});

test('source length, ownership and unsupported array operands cannot be erased',()=>{
  for(const source of [
    'pub fn bad()->[u8;2]{[1u8]}',
    'pub fn bad(value:[u8;3])->[u8;2]{value}',
    'pub fn bad(value:Vec<u8>)->[u8;2]{value}',
    'pub fn bad(value:[u8;2])->Vec<u8>{value}',
    'pub fn bad()->Vec<u8>{[1u8,2u8]}',
    'pub fn bad()->[u8;2]{vec![1u8,2u8]}',
    'pub fn bad()->[u8;2u8]{[1u8,2u8]}',
    'pub fn bad()->[u8;4097]{[]}',
    'pub fn bad()->[u8;18446744073709551616usize]{[]}',
    'pub fn bad()->[u8;-1]{[]}',
    'const N:usize=2;pub fn bad()->[u8;N]{[1u8,2u8]}',
    'pub fn bad()->[u8;1+1]{[1u8,2u8]}',
    'pub fn bad()->[u8;2]{[1u8;2]}',
    'pub fn bad()->[String;1]{[String::from("owned")]}',
    'pub fn bad(value:&[u8;2])->[u8;2]{value}',
    'pub fn bad(value:Option<[u8;3]>)->Option<[u8;2]>{value}',
    'pub fn bad(flag:bool)->[u8;2]{if flag{[1u8,2u8]}else{[1u8]}}',
    'pub fn bad(flag:bool)->usize{let value=if flag{[1u8,2u8]}else{[1u8]};value.len()}',
    'pub fn bad()->[[u8;2];2]{[[1u8,2u8],[3u8]]}',
  ]) {
    const result=project(source);
    assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);
    assert.ok(!result.meta.executable.some(item=>item.name==='bad'),source);
  }
});

test('hostile arrays are refused before getters or proxy traps in emitted JS and strict TS',{timeout:45_000},async()=>{
  await both(project('pub fn pair(value:[u8;2])->[u8;2]{value}'),api=>{
    let reads=0;
    const proxy=new Proxy([1n,2n],Object.fromEntries(['get','ownKeys','getOwnPropertyDescriptor','getPrototypeOf'].map(name=>[name,()=>{reads++;throw new Error('hostile proxy');}])));
    assert.throws(()=>api.pair(proxy),TypeError);assert.equal(reads,0);
    const getter=[1n,2n];Object.defineProperty(getter,'0',{get(){reads++;throw new Error('hostile getter');}});
    assert.throws(()=>api.pair(getter),TypeError);assert.equal(reads,0);
    const extra=[1n,2n];extra.hidden=3n;
    const hidden=[1n,2n];Object.defineProperty(hidden,'extra',{value:3n});
    const symbol=[1n,2n];symbol[Symbol('extra')]=3n;
    for(const wrong of [new Array(2),extra,hidden,symbol])assert.throws(()=>api.pair(wrong),TypeError);
    const cyclic=[];cyclic.push(cyclic,cyclic);assert.throws(()=>api.pair(cyclic),TypeError);
  });
});

test('runtime validation and monomorphic identities distinguish nested and zero array sizes',()=>{
  const u8={kind:'fixed',bits:8,signed:false},array=length=>({kind:'array',element:u8,rustFixedArray:{length},rustOwnership:{kind:'value',source:'array'}});
  assert.equal(sameType(array(2),array(3)),false);
  assert.notEqual(encodeMonomorphicType(array(0)),encodeMonomorphicType(array(2)));
  const schema={schemaVersion:1,types:{Holder:{kind:'data',name:'Holder',ctors:[{name:'Holder',fields:[{name:'left',type:array(2)},{name:'right',type:array(3)}]}]}};
  const shared=[1n,2n];
  assert.throws(()=>validateRustValue({$:'Holder',left:shared,right:shared},{kind:'data',name:'Holder'},schema),/fixed-array length/);
  assert.equal(validateRustValue([],array(0),schema),true);
  const checked=checkProgram(parseRust('struct Holder{values:[u8;2]} fn main(){}'));
  assert.equal(valueSchema(checked.declarations).types.Holder.ctors[0].fields[0].type.rustFixedArray.length,2);
});

test('derived Copy records retain proven sized-array fields and immutable runtime layouts',{timeout:45_000},async()=>{
  const source='#[derive(Clone,Copy)]struct Packet{bytes:[u8;2]} impl Packet{pub fn bytes(self)->[u8;2]{self.bytes}} pub fn packet(value:Packet)->[u8;2]{value.bytes()}';
  await both(project(source),api=>{
    const values=Object.freeze([7n,8n]),packet=Object.freeze({$:'Packet',bytes:values});
    assert.deepEqual(api.packet(packet),[7n,8n]);
    assert.throws(()=>api.packet(Object.freeze({$:'Packet',bytes:[7n,8n]})),TypeError);
    assert.throws(()=>api.packet(Object.freeze({$:'Packet',bytes:Object.freeze([7n])})),TypeError);
  });
});

test('six unchanged original constant declarations carry fresh source proofs and execute both targets',{timeout:45_000},async()=>{
  const fixtures=JSON.parse(readFileSync(new URL('../fixtures/rust-fixed-array-sources.json',import.meta.url),'utf8'));
  const declarations=[];
  for(const fixture of fixtures) {
    const source=readFileSync(new URL('../../../'+fixture.path,import.meta.url),'utf8');
    assert.equal(createHash('sha256').update(source).digest('hex'),fixture.fileSha256);
    const item=sourceItems(source).find(item=>item.term==='const'&&item.name===fixture.name);
    assert.equal(item.start,fixture.start);assert.equal(item.end,fixture.end);
    const declaration=source.slice(item.start,item.end);
    assert.equal(createHash('sha256').update(declaration).digest('hex'),fixture.declarationSha256);
    declarations.push(declaration);
  }
  const source=declarations.join('\n'),checked=checkProgram(parseRust(source+' fn main(){}'));
  for(const fixture of fixtures) {
    const entry=checked.declarations.get(fixture.name);
    assert.equal(entry.ret.rustFixedArray.length,fixture.expected.length);
    assert.equal(entry.constantEvaluationProof.sourceLinksVerified,true);
  }
  await both(project(source),api=>{for(const fixture of fixtures){assert.deepEqual(api[fixture.name],fixture.expected);assert.ok(Object.isFrozen(api[fixture.name]));}});
});
