import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateSource,sha256} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const tagged=($,fields={})=>Object.freeze({$,...fields});
const tuple=(...values)=>tagged('Tuple',Object.fromEntries(values.map((value,index)=>['field'+index,value])));
async function sourceTargets(source,verify) {
  const result=translateSource(source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  assert.equal(result.ir.counts.carried,0,JSON.stringify(result.ir.items.filter(item=>item.status==='carried').map(item=>({name:item.name,diagnostic:item.diagnostic}))));
  await verifyTypedTargets(result,verify);
}

test('contextual tuple construction and numeric projections retain exact field types',async()=>{
  await sourceTargets('pub fn pair(v:u8)->(u8,bool){(v,true)} pub fn first(v:(u8,bool))->u8{v.0} pub fn second(v:(u8,bool))->bool{v.1}',api=>{
    assert.deepEqual(api.pair(3n),tuple(3n,true));assert.equal(api.first(tuple(7n,false)),7n);assert.equal(api.second(tuple(7n,false)),false);
    assert.throws(()=>api.first(tuple(256n,false)),TypeError);assert.throws(()=>api.first(tuple(1n,2n)),TypeError);
  });
});

test('single tuples, parentheses, unit and nested products remain distinct',async()=>{
  await sourceTargets('pub fn single(v:u8)->(u8,){(v,)} pub fn parenthesized(v:(u8))->u8{(v)} pub fn unit()->(){()} pub fn nested(v:u8)->((u8,bool),u16){((v,false),9)} pub fn project(v:((u8,bool),u16))->bool{(v.0).1}',api=>{
    assert.deepEqual(api.single(2n),tuple(2n));assert.equal(api.parenthesized(2n),2n);assert.equal(api.unit(),null);
    assert.deepEqual(api.nested(3n),tuple(tuple(3n,false),9n));assert.equal(api.project(tuple(tuple(3n,true),9n)),true);
  });
});

test('tuple types instantiate actual Option fields without moving generated types into another module',async()=>{
  const files={'src/lib.rs':'mod nested; pub fn relay(v:u8)->Option<(u8,bool)>{nested::make(v)}','src/nested.rs':'pub fn make(v:u8)->Option<(u8,bool)>{Some((v,true))}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.relay(4n),tagged('Some',{field0:tuple(4n,true)}));});
});

test('tuple layout field syntax survives checked semantic serialization',()=>{
  const checked=roundTripProgram(checkProgram(parseRust('pub fn pair(v:u8)->(u8,bool){(v,true)} fn main(){}')));
  const entry=[...checked.declarations.values()].find(entry=>entry.generated==='router-tuple-type');
  assert.equal(entry.tuple,true);assert.deepEqual(entry.ctors[0].fields.map(field=>field.rustTypeSyntax),[['u8'],['bool']]);
  assert.equal(entry.standardGeneric,undefined);assert.equal(entry.record,undefined);
});

test('original response content key functions execute unchanged through contextual tuple lowering',async()=>{
  for(const [file,name] of [['responses.rs','stream_content_key'],['anthropic_stream.rs','response_content_key']]) {
    const source=readFileSync(new URL('../../../src/'+file,import.meta.url),'utf8'),item=sourceItems(source).find(item=>item.term==='fn'&&item.name===name);
    assert.ok(item);const original=source.slice(item.start,item.end),fixture='use serde_json::Value;\n'+original;
    const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>fixture});
    assert.deepEqual(result.meta.refused,[]);const executable=result.meta.executable.find(item=>item.name===name);
    assert.ok(executable);assert.equal(sha256(fixture.slice(executable.span.start,executable.span.end)),sha256(original));
    await verifyTypedTargets(result,api=>{
      const number=value=>tagged('Number',{field0:tagged('PosInt',{field0:value})});
      const event=entries=>tagged('Object',{field0:tagged('Map',{entries:Object.freeze(entries.map(([key,value])=>tagged('MapEntry',{key,value})))})});
      assert.deepEqual(api[name](tagged('Null')),tuple(0n,0n));
      assert.deepEqual(api[name](event([['content_index',number(7n)],['output_index',number(3n)]])),tuple(3n,7n));
      assert.deepEqual(api[name](event([['content_index',tagged('String',{field0:'invalid'})],['output_index',number(18446744073709551615n)]])),tuple(18446744073709551615n,0n));
      assert.throws(()=>api[name](event([['output_index',number(18446744073709551616n)]])),TypeError);
    });
  }
});

test('tuple arity, projection ownership and mutable products stay source-bearing refusals',()=>{
  for(const source of [
    'pub fn bad()->(u8,bool){(1,)}',
    'pub fn bad(v:(u8,bool))->u8{v.2}',
    'pub fn bad(v:(u8,bool))->u8{v.1}',
    'pub fn bad(v:(u8,bool))->u8{v.0u8}',
    'struct Pair(u8,bool); pub fn bad(v:Pair)->u8{v.0}',
    'pub fn bad(mut v:(u8,bool))->u8{v.0}',
    'pub fn bad()->u8{let v=(1u8,true);v.0}',
    'pub fn bad(v:(Box<u8>,bool))->u8{v.0}',
    'pub fn bad(v:(Vec<u8>,bool))->u8{v.0}',
  ]) {
    const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');
    assert.equal(item.status,'carried',source);assert.ok(item.diagnostic);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});
