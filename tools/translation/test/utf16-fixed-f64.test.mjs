import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {rustFixedType} from '../checked-types.mjs';
import {SOURCE_F64} from '../extensions/primitive-float-contracts.mjs';
import {UTF16_FIXED_F64_PROFILE,checkedUtf16Iterator,checkedFixedF64Cast,prepareTemporaryStringCall,consumeTemporaryStringCallBorrow} from '../extensions/utf16-fixed-f64.mjs';
import {encodeUtf16,fixedToF64} from '../extensions/utf16-fixed-f64-runtime.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {parseProgram} from '../semantic-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const borrowed={kind:'string',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'},rustBorrowLifetime:{kind:'elided',source:'borrowed-str-type'}};
const owned={kind:'string',rustSourceType:true,rustOwnership:{kind:'owned',source:'String'}};
const fixed=name=>({...rustFixedType(name),rustPrimitiveName:name,rustSourceType:true});

test('UTF16 runtime yields actual lazy u16 units and validates every Unicode scalar first',()=>{
  for(const [value,units]of [['',[]],['abc',[97n,98n,99n]],['a😀é',[97n,0xd83dn,0xde00n,233n]],['e\u0301',[101n,769n]],['\0',[0n]],['\ud7ff\ue000',[0xd7ffn,0xe000n]],['\u{10000}\u{10ffff}',[0xd800n,0xdc00n,0xdbffn,0xdfffn]]])assert.deepEqual([...encodeUtf16(value)],units);
  const iterator=encodeUtf16('😀a');assert.deepEqual(iterator.next(),{value:0xd83dn,done:false});assert.deepEqual(iterator.next(),{value:0xde00n,done:false});assert.deepEqual(iterator.next(),{value:97n,done:false});assert.equal(iterator.next().done,true);
  let coercions=0;const hostile={toString(){coercions++;return '😀';}};
  for(const value of ['\ud800','ok\udfff','\ud800x','\udfff\ud800',hostile,new String('a'),1n,null])assert.throws(()=>encodeUtf16(value),TypeError);
  assert.equal(coercions,0);
});

test('fixed integer binary64 runtime rounds halfway cases to even without width guessing',()=>{
  for(const [value,source,expected]of [[0n,'usize',0],[-128n,'i8',-128],[255n,'u8',255],[(1n<<53n)+1n,'u64',9007199254740992],[(1n<<53n)+3n,'u64',9007199254740996],[-((1n<<53n)+1n),'i64',-9007199254740992],[(1n<<64n)-1n,'usize',18446744073709551616],[(1n<<128n)-1n,'u128',2**128],[-(1n<<127n),'i128',-(2**127)]])assert.equal(Object.is(fixedToF64(value,source),expected),true);
  for(const [value,source]of [[256n,'u8'],[-1n,'u8'],[128n,'i8'],[1n<<64n,'usize']])assert.throws(()=>fixedToF64(value,source),RangeError);
  for(const [value,source]of [[1,'u64'],[1n,'custom'],[1n,'f32'],[1n,'__proto__']])assert.throws(()=>fixedToF64(value,source),TypeError);
});

test('operation admission checks actual source owners, primitive domain and private call preparation',()=>{
  assert.equal(UTF16_FIXED_F64_PROFILE.constantEvaluation,false);
  assert.equal(checkedUtf16Iterator({k:'var',name:'s',type:borrowed},null).type.element.rustPrimitiveName,'u16');
  assert.equal(checkedUtf16Iterator({k:'var',name:'s',type:owned},null).constEligible,false);
  for(const type of [{kind:'string'},{...owned,rustReference:{kind:'shared',pointee:owned}},{...borrowed,rustGenericIdentityUnresolved:true},{kind:'data',name:'String'}])assert.throws(()=>checkedUtf16Iterator({type},null));
  const value={k:'var',name:'n',type:fixed('usize')};assert.equal(checkedFixedF64Cast(value,SOURCE_F64,null).sourceType.rustPrimitiveName,'usize');
  for(const type of [{...fixed('u64'),bits:32},{kind:'fixed',bits:64,signed:false},{...fixed('u64'),rustReference:{kind:'shared',pointee:fixed('u64')}},{...fixed('u64'),rustPrimitiveName:'User'}])assert.throws(()=>checkedFixedF64Cast({type},SOURCE_F64,null));
  assert.throws(()=>checkedFixedF64Cast(value,{...SOURCE_F64,rustPrimitiveName:'f32'},null));
  assert.throws(()=>consumeTemporaryStringCallBorrow({k:'routerPreparedStringCallBorrow',temporaryStringBorrowProof:{verified:true}}));
  const argument={k:'routerTextReference',value:{k:'toString'},sourceAmpersand:{value:'&',span:{start:0,end:1}},span:{start:0,end:4}},entry={k:'fn',fullName:'consume',body:{k:'unit'},params:[{name:'s',type:borrowed}],ret:fixed('usize')};
  let visits=0;const checker={expr(){visits++;return {k:'lit',value:'a',type:owned};}};
  const prepared=prepareTemporaryStringCall(checker,entry,[argument],new Map(),[],null);
  assert.equal(visits,1);assert.equal(consumeTemporaryStringCallBorrow(prepared[0]).temporaryStringBorrowProof.origin,'call-local-temporary');
  assert.throws(()=>consumeTemporaryStringCallBorrow(JSON.parse(JSON.stringify(prepared[0]))));
  assert.throws(()=>prepareTemporaryStringCall(checker,{...entry,params:[{name:'s',type:{...borrowed,rustBorrowLifetime:{kind:'static'}}}]},[argument],new Map(),[],null));
  assert.throws(()=>prepareTemporaryStringCall(checker,{...entry,ret:borrowed},[argument],new Map(),[],null));
  // Pure profile units do not claim parser association of their hand-built IR.
});

test('source UTF16 laziness, u16 items and integer casts execute unchanged JS plus strict TS',{timeout:30_000},async()=>{
  const source='pub fn count(value:&str)->usize{value.encode_utf16().count()} pub fn owned_count(value:String)->usize{value.encode_utf16().count()} pub fn prefix(value:&str)->usize{value.encode_utf16().take(1usize).count()} pub fn high(value:&str)->bool{value.encode_utf16().any(|unit|unit>255u16)} pub fn cast(value:u128)->f64{value as f64} pub fn signed(value:i128)->f64{value as f64}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const [value,length]of [['',0n],['a😀é',4n],['e\u0301',2n],['\u{10ffff}',2n]]){assert.equal(api.count(value),length);assert.equal(api.owned_count(value),length);assert.equal(api.prefix(value),length?1n:0n);}
    assert.equal(api.high('a'),false);assert.equal(api.high('😀'),true);
    assert.equal(api.cast((1n<<128n)-1n),2**128);assert.equal(api.signed(-(1n<<127n)),-(2**127));
    for(const value of ['\ud800','ok\udfff'])assert.throws(()=>api.count(value),TypeError);
  });
});

test('temporary String call borrowing is local, preserves ordinary Unicode results and cannot escape',{timeout:30_000},async()=>{
  const source='fn consume(value:&str)->usize{value.encode_utf16().count()} pub fn length(value:&str)->usize{consume(&value.to_string())}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.length('😀'),2n);assert.equal(api.length('a😀é'),4n);assert.equal(api.length(''),0n);});
  const entries=[...parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.values()].filter(entry=>entry.k==='fn');
  assert.ok(JSON.stringify(entries).includes('call-local-temporary'));assert.ok(JSON.stringify(entries).includes('sourceAmpersand'));
});

test('shared/custom/f32 casts, unknown UTF16 owners, static and escaping temporary borrows refuse',()=>{
  for(const source of [
    'pub fn bad(value:&u64)->f64{value as f64}',
    'pub fn bad(value:u64)->f32{value as f32}',
    'pub fn bad(value:f64)->f64{value as f64}',
    'pub fn bad(value:&String)->usize{value.encode_utf16().count()}',
    'pub fn bad(value:&mut String)->usize{value.encode_utf16().count()}',
    'pub fn bad(value:&str)->usize{value.encode_utf16(1u8).count()}',
    'pub const fn bad(value:&str)->usize{value.encode_utf16().count()}',
    'struct User{n:u64} pub fn bad(value:User)->f64{value as f64}',
    'fn consume(value:&\'static str)->usize{value.len()} pub fn bad(value:&str)->usize{consume(&value.to_string())}',
    'fn echo(value:&str)->&str{value} pub fn bad(value:&str)->&str{echo(&value.to_string())}',
    'pub fn bad(value:&str)->&str{&value.to_string()}',
  ]){const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'),source);}
});

test('original complete attributed UTF16 policy declarations retain byte pins and shared Unicode outcomes',{timeout:60_000},async()=>{
  const path='src/generated_js_first/policy.rs',original=readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
  assert.equal(hash(original),'c5d5cec07bf54be29de7beed707263256afa6ba1ee87c89695b237d5626f5673');
  const pins=[['utf16_length',3920,4042,'77a429191843ebe5548e18557493245f04831bf8887e4e6f4f2364d69af88d94'],['model_name_length_permits',4044,4236,'4286f43941d0cf1ce0dd46ef80f2d0f4608a57febf05104946aee6ebc6479bfe']];
  const items=sourceItems(original),selected=pins.map(([name,start,end,digest])=>{const item=items.find(item=>item.term==='fn'&&item.name===name);assert.deepEqual([item.start,item.end],[start,end]);const text=original.slice(start,end);assert.equal(hash(text),digest);assert.ok(text.startsWith('#[rustfmt::skip]'));return text;}).join('\n');
  const result=translateProject({entry:path,paths:[path],readSource:()=>selected,compilationProfile:PRODUCTION_PROFILE});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const [value,length]of [['',0],['a😀é',4],['e\u0301',2],['😀',2],['\u{10ffff}',2]]){assert.equal(api.utf16_length(value),length);for(const maximum of [0,1,2,4,NaN,Infinity])assert.equal(api.model_name_length_permits(value,maximum),length>0&&length<=maximum);}
    for(const value of ['\ud800','\udfff'])assert.throws(()=>api.utf16_length(value),TypeError);
  });
  assert.equal(result.meta.runtimeParity,false); // complete selected originals
});
