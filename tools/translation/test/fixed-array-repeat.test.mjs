import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {checkProgram,parseRust} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});

test('non-const repeated operands evaluate once including zero in emitted JS and strict TS',{timeout:30_000},async()=>{
  const result=project('fn seed()->u8{let checked=std::fs::read_to_string("seed").is_ok();7} pub fn repeated()->[u8;3]{[seed();3]} pub fn zero()->[u8;0]{[seed();0]}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,(api,_result,{withEffectCapabilities})=>{
    let calls=0;
    const capabilities={fs:{sync:{readFileSync(path){assert.equal(path,'seed');calls++;return new Uint8Array();}}}};
    assert.deepEqual(withEffectCapabilities(capabilities,()=>api.repeated()),[7n,7n,7n]);assert.equal(calls,1);
    assert.deepEqual(withEffectCapabilities(capabilities,()=>api.zero()),[]);assert.equal(calls,2);
  });
});

test('repeat copies nested values and retains actual borrowed string origins',{timeout:30_000},async()=>{
  const source='pub fn nested(value:[u8;2])->[[u8;2];2]{[value;2]} pub fn text(value:&str)->[&str;2]{[value;2]} pub fn static_text()->[&\'static str;2]{["leaf";2]} pub fn hexadecimal()->[u8;2]{[3u8;0x2usize]}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    const input=[1n,2n],output=api.nested(input);input[0]=9n;
    assert.deepEqual(output,[[1n,2n],[1n,2n]]);assert.notEqual(output[0],output[1]);
    assert.ok(Object.isFrozen(output));assert.ok(Object.isFrozen(output[0]));
    assert.deepEqual(api.text('Ω'),['Ω','Ω']);assert.deepEqual(api.static_text(),['leaf','leaf']);assert.deepEqual(api.hexadecimal(),[3n,3n]);
  });
});

test('literal repetitions retain original constant evaluation source proof',{timeout:30_000},async()=>{
  const source='pub const COPIES:[u8;3]=[7u8;3]; pub const EMPTY:[u8;0]=[7u8;0];';
  const program=roundTripProgram(checkProgram(parseRust(source+'fn main(){}')));
  for(const name of ['COPIES','EMPTY'])assert.equal(program.declarations.get(name).constantEvaluationProof.sourceLinksVerified,true);
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.COPIES,[7n,7n,7n]);assert.deepEqual(api.EMPTY,[]);});
});

test('repeat count ownership and const evaluation categories remain actual source obligations',()=>{
  for(const source of [
    'pub fn bad()->[u8;2]{[1u8;3]}',
    'pub fn bad()->[u8;2]{[1u8;2u8]}',
    'pub fn bad()->[u8;2]{[1u16;2]}',
    'pub fn bad()->[u8;2]{[1u8;1+1]}',
    'pub fn bad()->Vec<u8>{[1u8;2]}',
    'pub fn bad()->[String;2]{[String::from("owned");2]}',
    'pub fn bad(value:&str)->[&\'static str;2]{[value;2]}',
    'const VALUE:u8=1; pub fn bad()->[u8;2]{[VALUE;2]}',
    'pub fn bad()->[u8;2]{[const{1u8};2]}',
    'pub fn bad()->[u8;2]{[return [1u8,2u8];2]}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);}
});
