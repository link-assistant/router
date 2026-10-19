import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const tagged=($,field0)=>Object.freeze({$,...(field0===undefined?{}:{field0})});
test('whole checked programs retain actual Option and Result pointer integer identities',async()=>{
  const source='pub fn words(v:Option<u64>)->u64{if let Some(n)=v{n}else{0}} pub fn indexes(v:Option<usize>)->usize{if let Some(n)=v{n}else{0}} pub fn signed(v:Result<i64,bool>)->i64{if let Ok(n)=v{n}else{0}} pub fn offsets(v:Result<isize,bool>)->isize{if let Ok(n)=v{n}else{0}}';
  const checked=roundTripProgram(checkProgram(parseRust(source+' fn main(){}')));
  const layouts=['words','indexes','signed','offsets'].map(name=>checked.declarations.get(checked.declarations.get(name).params[0].type.name));
  assert.equal(layouts.length,4);assert.equal(new Set(layouts.map(entry=>entry.fullName)).size,4);
  for(const [name,primitive] of [['words','u64'],['indexes','usize'],['signed','i64'],['offsets','isize']]){
    const type=checked.declarations.get(name).params[0].type,entry=checked.declarations.get(type.name);
    assert.equal(entry.standardGeneric.arguments[0].rustPrimitiveName,primitive);
  }
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const name of ['words','indexes']){assert.equal(api[name](tagged('Some',9n)),9n);assert.equal(api[name](tagged('None')),0n);}
    for(const name of ['signed','offsets']){assert.equal(api[name](tagged('Ok',-9n)),-9n);assert.equal(api[name](tagged('Err',false)),0n);}
    assert.throws(()=>api.indexes(tagged('Some',-1n)),TypeError);assert.throws(()=>api.offsets(tagged('Ok',1n<<63n)),TypeError);
  });
});

test('portable generic layout reuse cannot prove invalid source primitive conversions',()=>{
  const fixtures=[
    ['pub fn first(v:Option<u64>)->u64{if let Some(n)=v{n}else{0}}','pub fn bad(v:Option<usize>)->u64{if let Some(n)=v{n}else{0}}'],
    ['pub fn first(v:Result<i64,bool>)->i64{if let Ok(n)=v{n}else{0}}','pub fn bad(v:Result<isize,bool>)->i64{if let Ok(n)=v{n}else{0}}'],
    ['pub fn first(v:Option<u64>)->u64{match v{Some(n)=>n,None=>0}}','pub fn bad(v:Option<usize>)->u64{match v{Some(n)=>n,None=>0}}'],
    ['pub fn first(v:Option<usize>)->usize{if let Some(n)=v{n}else{0}}','pub fn bad(v:Option<u64>)->usize{if let Some(n)=v{n}else{0}}'],
    ['pub fn first(v:Option<usize>)->usize{match v{Some(n)=>n,None=>0}}','pub fn bad(v:Option<u64>)->usize{match v{Some(n)=>n,None=>0}}'],
    ['pub fn first(v:Result<isize,bool>)->isize{if let Ok(n)=v{n}else{0}}','pub fn bad(v:Result<i64,bool>)->isize{if let Ok(n)=v{n}else{0}}'],
  ];
  for(const [first,bad] of fixtures)for(const source of [first+bad,bad+first]){
    assert.throws(()=>checkProgram(parseRust(source+' fn main(){}')),/primitive integer identities/,source);
    const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);
    assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('standard reader and arithmetic instantiations preserve source pointer primitives',async()=>{
  const source='pub fn parse_index(v:&str)->Result<usize,std::num::ParseIntError>{v.parse::<usize>()} pub fn parse_offset(v:&str)->Result<isize,std::num::ParseIntError>{v.parse::<isize>()} pub fn inc(v:usize)->Option<usize>{v.checked_add(1)} pub fn previous(v:isize)->isize{v.saturating_sub(1)} pub fn bytes(v:&str)->usize{v.len()} pub fn scalar_count(v:&str)->usize{v.chars().count()} pub fn integer(v:&serde_json::Value)->Option<u64>{v.as_u64()} pub fn line(v:&serde_json::Error)->usize{v.line()}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.deepEqual(api.parse_index('9'),tagged('Ok',9n));assert.deepEqual(api.parse_offset('-9'),tagged('Ok',-9n));
    assert.deepEqual(api.inc(9n),tagged('Some',10n));assert.deepEqual(api.inc((1n<<64n)-1n),tagged('None'));
    assert.equal(api.previous(-(1n<<63n)),-(1n<<63n));assert.equal(api.bytes('😀Ω'),6n);assert.equal(api.scalar_count('😀Ω'),2n);
    const number=tagged('Number',tagged('PosInt',9n));assert.deepEqual(api.integer(number),tagged('Some',9n));
    assert.equal(api.line(Object.freeze({$:'JsonError',category:tagged('Syntax'),line:3n,column:2n,message:'bad'})),3n);
  });
});

test('standard operation adapters cannot erase invalid primitive result identities',()=>{
  for(const source of [
    'pub fn bad(v:&str)->u64{v.len()}',
    'pub fn bad(v:&str)->u64{v.chars().count()}',
    'pub fn bad(v:&str)->Result<u64,std::num::ParseIntError>{v.parse::<usize>()}',
    'pub fn bad(v:usize)->Option<u64>{v.checked_add(1)}',
    'pub fn bad(v:u64)->Option<usize>{v.checked_add(1)}',
    'pub fn bad(v:usize)->usize{v.saturating_add(1u64)}',
    'pub fn bad(v:&serde_json::Value)->Option<usize>{v.as_u64()}',
    'pub fn bad(v:&serde_json::Error)->u64{v.line()}',
    'pub fn bad(v:std::time::Duration)->usize{v.as_secs()}',
  ]){
    const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');assert.equal(item.status,'carried',source);
    assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});
