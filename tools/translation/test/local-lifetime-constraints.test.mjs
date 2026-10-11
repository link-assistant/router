import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});

test('local static annotations constrain initializers even when returned values contain no borrow',()=>{
  for(const source of [
    "pub fn bad(value:&str)->u8{let held:&'static str=value;0}",
    "pub fn bad(value:&str)->u8{let held:[&'static str;1]=[value];0}",
    "pub fn bad(value:[&str;0])->u8{let held:[&'static str;0]=value;0}",
    "pub fn bad(value:&u64)->u8{let held:&'static u64=value;0}",
    "pub fn bad(value:&str)->u8{let held:Option<&'static str>=Some(value);0}",
    "pub fn bad(value:&str)->u8{let held:(&'static str,u8)=(value,0);0}",
  ]){
    const result=project(source);
    assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);
    assert.ok(result.meta.refused.some(item=>item.name==='bad'&&/static source parameter|static borrow constraint/.test(item.message)),source);
  }
});

test('static literal and input locals and ordinary empty arrays retain valid typed behavior',{timeout:30_000},async()=>{
  const result=project("pub fn literal()->u8{let held:&'static str=\"leaf\";1} pub fn input(value:&'static str)->u8{let held:&'static str=value;2} pub fn empty()->u8{let held:[&'static str;0]=[];3} pub fn elided(value:&str)->u8{let held:&str=value;4}");
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.literal(),1n);assert.equal(api.input('Ω'),2n);assert.equal(api.empty(),3n);assert.equal(api.elided('Ω'),4n);});
});
