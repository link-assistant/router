import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {translateSource,sha256} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const tagged=($,fields={})=>Object.freeze({$,...fields});
const tuple=(...values)=>tagged('Tuple',Object.fromEntries(values.map((value,index)=>['field'+index,value])));
function originalTupleProject(fixture,name) {
  const standalone=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>fixture});
  if(name!=='response_content_key')return {result:standalone,fixture};
  assert.equal(standalone.meta.refused.length,1);
  assert.equal(standalone.meta.refused[0].name,name);
  assert.match(standalone.meta.refused[0].message,/actual owned facade and qualified source binding/u);
  assert.equal(standalone.meta.executable.some(row=>row.name===name),false);
  const root=readFileSync(new URL('../../../rust/src/lib.rs',import.meta.url),'utf8');
  const edge=sourceItems(root).filter(row=>row.term==='mod'&&row.name==='translation_core');
  assert.equal(edge.length,1);assert.equal(root.slice(edge[0].start,edge[0].end),'pub mod translation_core;');
  const scoped=root.slice(edge[0].start,edge[0].end)+'\n'+fixture,files={'src/lib.rs':scoped};
  for(const path of ['src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/json_collections.rs','src/translation_core/ranges.rs','src/translation_core/base64.rs'])files[path]=readFileSync(new URL('../../../rust/'+path,import.meta.url),'utf8');
  const cst=Object.entries(files).map(([path,source])=>{const transported=transportConcreteSyntaxSource(source,{language:'Rust'}),again=transportConcreteSyntaxMeta(transported.meta);assert.equal(again.source,source);return {path,source,transported,again};});
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>{assert.ok(Object.hasOwn(files,path));return files[path];}});
  const expected=JSON.parse(readFileSync(new URL('fixtures/tuple-owned-core-refusals.json',import.meta.url),'utf8'));
  assert.equal(expected.length,27);assert.deepEqual(result.meta.refused,expected);
  const directory=process.env.ROUTER_TUPLE_CORE_VECTOR_DIR;
  if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,'complete-scoped-tuple-project.json.gz'),gzipSync(JSON.stringify({standalone,root,edge,files,cst,result,scope:'authored scoped fixture; not full-crate namespace equivalence'})),{flag:'wx'});}
  return {result,fixture:scoped};
}
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

test('whole programs retain distinct Rust tuple identities after portable type erasure',async()=>{
  const source='pub fn words(v:(u64,u8))->u64{let(n,_)=v;n} pub fn indexes(v:(usize,u8))->usize{let(n,_)=v;n} pub fn borrowed(v:(&str,bool))->bool{v.1} pub fn owned()->(String,bool){("x".to_string(),true)}';
  const checked=roundTripProgram(checkProgram(parseRust(source+' fn main(){}')));
  const layouts=[...checked.declarations.values()].filter(entry=>entry.generated==='router-tuple-type');
  assert.equal(layouts.length,4);assert.equal(new Set(layouts.map(entry=>entry.fullName)).size,4);
  assert.equal(checked.declarations.get('words').params[0].type.name===checked.declarations.get('indexes').params[0].type.name,false);
  assert.equal(checked.declarations.get('owned').ret.patternOwnershipRefusal,'ownership-bearing String type');
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.words(tuple(7n,1n)),7n);assert.equal(api.indexes(tuple(9n,2n)),9n);
    assert.equal(api.borrowed(tuple('😀',true)),true);assert.deepEqual(api.owned(),tuple('x',true));
  });
});

test('earlier tuple declarations cannot launder later ownership or primitive identities',()=>{
  const fixtures=[
    ['pub fn first(v:(&str,u8))->u8{let(_,n)=v;n}','pub fn bad(v:(String,u8))->u8{let(_,n)=v;n}',/ownership/],
    ['pub fn first(v:(u64,u8))->u64{let(n,_)=v;n}','pub fn bad(v:(usize,u8))->u64{let(n,_)=v;n}',/primitive integer identities/],
    ['pub fn first(v:(u64,u8))->u64{v.0}','pub fn bad(v:(usize,u8))->u64{v.0}',/primitive integer identities/],
    ['pub fn first(v:((&str,bool),u8))->u8{let(_,n)=v;n}','pub fn bad(v:((String,bool),u8))->u8{let(_,n)=v;n}',/ownership/],
    ['pub fn first(v:((u64,bool),u8))->u64{(v.0).0}','pub fn bad(v:((usize,bool),u8))->u64{(v.0).0}',/primitive integer identities/],
  ];
  for(const [first,bad,message] of fixtures)for(const source of [first+bad,bad+first]){
    assert.throws(()=>checkProgram(parseRust(source+' fn main(){}')),message,source);
    const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');assert.equal(item.status,'carried',source);
    assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('original response content key functions execute unchanged through contextual tuple lowering',async()=>{
  for(const [file,name] of [['responses.rs','stream_content_key'],['anthropic_stream.rs','response_content_key']]) {
    const source=readFileSync(new URL('../../../rust/src/'+file,import.meta.url),'utf8'),item=sourceItems(source).find(item=>item.term==='fn'&&item.name===name);
    assert.ok(item);const original=source.slice(item.start,item.end),{result,fixture}=originalTupleProject('use serde_json::Value;\n'+original,name);
    assert.deepEqual(result.meta.refused.filter(row=>row.file==='src/lib.rs'),[]);const executable=result.meta.executable.find(item=>item.name===name);
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
    'pub fn bad()->u8{let v=(1,true);v.0}',
    'pub fn bad(v:(Box<u8>,bool))->u8{v.0}',
    'pub fn bad(v:(Vec<u8>,bool))->u8{v.0}',
  ]) {
    const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');
    assert.equal(item.status,'carried',source);assert.ok(item.diagnostic);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});
