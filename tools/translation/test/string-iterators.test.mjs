import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {stringLines,stringNext,stringJoin} from '../extensions/string-iterator-runtime.mjs';
import {STRING_ITERATOR_PROFILE} from '../extensions/string-iterators.mjs';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {checkedSourceContext,bindCheckedSourceLinks,checkedSourceEvidence} from '../extensions/source-links.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('../../../',import.meta.url),some=field0=>({$:'Some',field0}),none={$:'None'};

test('pinned Rust line boundaries preserve LF CRLF lone CR empty lines and scalar Unicode',()=>{
  assert.equal(STRING_ITERATOR_PROFILE.rust,'1.89.0');assert.equal(STRING_ITERATOR_PROFILE.constEligible,false);
  for(const [value,expected]of [['',[]],['\n',['']],['\r',['\r']],['\r\n',['']],['a\n',['a']],['a\r\n',['a']],['a\r',['a\r']],['a\n\n',['a','']],['a\rb\n',['a\rb']],['😀\r\né\n',['😀','é']],['a\u2028b',['a\u2028b']]])assert.deepEqual([...stringLines(value)],expected);
  for(const value of ['\ud800','\udfff','a\ud800b'])assert.throws(()=>stringLines(value),TypeError);
});

test('next consumes only a fresh private line cursor without external iterator dispatch',()=>{
  const cursor=stringLines('a\nb');assert.deepEqual(stringNext(cursor),some('a'));assert.throws(()=>stringNext(cursor),TypeError);
  assert.deepEqual(stringNext(stringLines('')),none);
  const advanced=stringLines('a\nb');advanced.next();assert.throws(()=>stringNext(advanced),TypeError);
  let calls=0;const custom={next(){calls++;throw Error('custom');}};
  assert.throws(()=>stringNext(custom),TypeError);assert.equal(calls,0);
  const proxy=new Proxy(custom,{get(){calls++;throw Error('get');},ownKeys(){calls++;throw Error('keys');},getPrototypeOf(){calls++;throw Error('prototype');},getOwnPropertyDescriptor(){calls++;throw Error('descriptor');}});
  assert.throws(()=>stringNext(proxy),TypeError);assert.equal(calls,0);
});

test('borrowed string join allocates with exact separators and never invokes array iterators or getters',()=>{
  for(const [values,separator,expected]of [[[],'x',''],[[''],'x',''],[['a','b'],'','ab'],[['a','','b'],'::','a::::b'],[['😀','é'],'\n','😀\né']])assert.equal(stringJoin(values,separator),expected);
  let calls=0;const values=['a','b'];values[Symbol.iterator]=()=>{calls++;throw Error('iterator');};assert.equal(stringJoin(values,','),'a,b');assert.equal(calls,0);
  const accessor=[];Object.defineProperty(accessor,'0',{get(){calls++;throw Error('getter');}});assert.throws(()=>stringJoin(accessor,','),TypeError);assert.equal(calls,0);
  const proxy=new Proxy(values,{get(){calls++;throw Error('get');},getPrototypeOf(){calls++;throw Error('prototype');},getOwnPropertyDescriptor(){calls++;throw Error('descriptor');}});assert.throws(()=>stringJoin(proxy,','),TypeError);assert.equal(calls,0);
  class Custom extends Array{};assert.throws(()=>stringJoin(new Custom('a'),','),TypeError);
  for(const [array,separator]of [[[1],','],[['\ud800'],','],[['a'],'\udfff'],[new Array(1),',']])assert.throws(()=>stringJoin(array,separator),TypeError);
});

test('typed line next keeps input lifetime while joins and trim callbacks return the checked owners',{timeout:60_000},async()=>{
  const source='pub fn first(value:&str)->Option<&str>{value.lines().next()} pub fn joined(value:&[&str],sep:&str)->String{value.join(sep)} pub fn trimmed(value:&str)->String{value.lines().map(str::trim).collect::<Vec<_>>().join("|")}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.deepEqual(api.first(''),none);assert.deepEqual(api.first('a\r\nb'),some('a'));assert.deepEqual(api.first('\r'),some('\r'));
    assert.equal(api.joined(Object.freeze(['a','😀','']),':'),'a:😀:');assert.equal(api.trimmed(' \u0085a\r\n b\uFEFF \n'),'a|b\uFEFF');
  });
});

test('trim_start and trim_end function items preserve the other boundary and Rust whitespace',{timeout:60_000},async()=>{
  const source='pub fn start(value:&str)->String{value.lines().map(str::trim_start).collect::<Vec<_>>().join("|")} pub fn end(value:&str)->String{value.lines().map(str::trim_end).collect::<Vec<_>>().join("|")}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const [value,start,end]of [['','',''],['  a  ','a  ','  a'],['\u0085a\u0085','a\u0085','\u0085a'],['\uFEFFa\uFEFF','\uFEFFa\uFEFF','\uFEFFa\uFEFF'],[' a \r\n\n b\t\n','a ||b\t',' a|| b']]){assert.equal(api.start(value),start);assert.equal(api.end(value),end);}
  });
});

test('line next uses actual standard Option aliases despite a local Option name',{timeout:60_000},async()=>{
  const source='enum Option{Other} use std::option::Option as Maybe; pub fn first(value:&str)->Maybe<&str>{value.lines().next()} pub fn qualified(value:&str)->std::option::Option<&str>{value.lines().next()}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const name of ['first','qualified']){assert.deepEqual(api[name](''),none);assert.deepEqual(api[name]('a\r\nb'),some('a'));}});
  // A source-defined enum with familiar variants is not the iterator's std Option.
  for(const source of [
    'enum Option{None,Some(&\'static str)}pub fn bad(value:&\'static str)->Option{value.lines().next()}',
    'mod str{}pub fn bad(value:&str)->String{value.lines().map(str::trim_start).collect::<Vec<_>>().join(",")}',
    // This first profile deliberately registers canonical str function items only.
    'use std::primitive::str as Text;pub fn bad(value:&str)->String{value.lines().map(Text::trim_end).collect::<Vec<_>>().join(",")}',
  ]){const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);}
});

const findNode=(value,kind)=>{
  if(!value||typeof value!=='object')return null;
  if(value.k===kind)return value;
  for(const child of Object.values(value)){const found=findNode(child,kind);if(found)return found;}
  return null;
};
test('new line nodes retain genuine parsed and checked body freshness',()=>{
  const source='pub fn first(value:&str)->Option<&str>{value.lines().next()}fn main(){}';
  const surface=parseRust(source),original=findNode(surface.items,'routerStringIteratorOperation');assert.ok(original);original.operation='join';
  assert.throws(()=>checkProgram(surface),/changed after source capture/);
  const program=checkProgram(parseRust(source)),entry=program.declarations.get('first'),context=checkedSourceContext(program);
  const options={targetProfile:{id:'string-iterator-freshness-test'}},bound=bindCheckedSourceLinks(program,context,options);
  assert.ok(checkedSourceEvidence(bound,entry));
  assert.throws(()=>bindCheckedSourceLinks(program,{...context},options),/private parser source context/);
  const next=findNode(entry.body,'routerStringNext');assert.ok(next);next.stringIteratorProof.consumption='caller-replaced';
  assert.throws(()=>bindCheckedSourceLinks(program,context,options),/checked declaration changed before source binding/);
  assert.throws(()=>checkedSourceEvidence(bound,entry),/checked source association became stale/);
});

test('emission refuses missing or replaced string iterator profile evidence',()=>{
  const source='pub fn first(value:&str)->Option<&str>{value.lines().next()}fn main(){}';
  for(const change of [node=>delete node.stringIteratorProof,node=>{node.stringIteratorProof.verified=false;},node=>{node.stringIteratorProof.profile='caller-profile';}]){
    const program=checkProgram(parseRust(source)),node=findNode(program.declarations.get('first').body,'routerStringLines');assert.ok(node);change(node);
    assert.throws(()=>emitJavaScript(program),/missing checked standard string iterator proof/);
  }
});

test('unknown owners mutable or stored cursors escapes and const use remain carried',()=>{
  for(const source of [
    'struct Custom;pub fn bad(value:Custom)->String{value.lines().next()}',
    'pub fn bad(value:String)->Option<&str>{value.lines().next()}',
    'pub fn bad(value:&str)->Option<&\'static str>{value.lines().next()}',
    'pub fn bad(value:&str)->Option<&str>{let lines=value.lines();lines.next()}',
    'pub fn bad(value:&str)->Option<&str>{let mut lines=value.lines();lines.next()}',
    'pub fn bad(value:&mut str)->Option<&str>{value.lines().next()}',
    'pub fn bad(value:Vec<String>)->String{value.join(",")}',
    'pub fn bad(value:&[u8])->String{value.join(",")}',
    'pub const fn bad(value:&str)->Option<&str>{value.lines().next()}',
    'mod str{} pub fn bad(value:&str)->String{value.lines().map(str::trim).collect::<Vec<_>>().join(",")}',
    'enum Vec{Other}pub fn bad(value:&str)->String{value.lines().collect::<Vec<_>>().join(",")}',
    'pub fn bad(value:&str)->Vec<u64>{value.lines().collect::<Vec<_>>()}',
    'pub fn bad(value:&str)->Vec<&\'static str>{value.lines().collect::<Vec<_>>()}',
    'pub fn bad(value:&str)->Vec<_>{value.lines().collect()}',
  ]){const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);}
});

const pins=[
  ['src/deploy.rs','0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a','first_line',21479,21575,'d6243fc0422877ca1011f449d1701f7fb3e957356866d251d806ff412a2dbd42'],
  ['src/storage.rs','d301981bd64c7b8726fbe89e13c7d580a66e7219ca5137c70aee0930f30e3050','sanitize_codec_error',19640,19916,'31e14e85b6f0b9ec999ccf5766b242adcc48e36e628b0b71454be97a50c4bbab'],
  ['src/responses.rs','5d00fae1c3f24e678c460381c58f0bc746435910655109d8d4ce2609a01ffea0','extract_sse_data',30721,31000,'ea95ad29548df0bb2ef72ebfdb44fff1fb88e8967e999e283b1509a8b5aa89fa'],
];
for(const [path,sourceHash,name,start,end,declarationHash]of pins)test(`complete unchanged ${path} preserves ${name} source bytes and its actual namespace admission`,{timeout:60_000},async()=>{
  const source=readFileSync(new URL(path,root),'utf8');assert.equal(hash(source),sourceHash);
  const item=sourceItems(source).find(item=>item.term==='fn'&&item.name===name);assert.deepEqual([item.start,item.end],[start,end]);assert.equal(hash(source.slice(start,end)),declarationHash);
  // Feed the entire original file to the ordinary compiler. Other carried
  // declarations remain visible; no import, attribute or body is replaced.
  const result=translateProject({entry:path,paths:[path],readSource:()=>source});
  // Missing original module/import evidence cannot be waived to execute a
  // convenient isolated function. These whole files stay explicitly carried.
  if(path==='src/storage.rs'||path==='src/responses.rs'){
    const expected='shadowed borrowed str type: requires actual standard primitive identity in the source type namespace';
    const refusal=result.meta.refused.find(item=>item.name===name);assert.ok(refusal,name);assert.equal(refusal.message,expected);assert.equal(result.meta.executable.some(item=>item.name===name),false);assert.equal(result.meta.runtimeParity,false);return;
  }
  const checked=result.meta.executable.find(item=>item.term==='fn'&&item.name===name);assert.ok(checked,name);assert.deepEqual(checked.span,{start,end});assert.equal(result.meta.runtimeParity,false);
  await verifyTypedTargets(result,api=>{
    if(name==='first_line')for(const [value,expected]of [['',''],[' a\r\nb','a'],['\nrest',''],['\r',''],['😀\nnext','😀']])assert.equal(api.first_line(value),expected);
    if(name==='sanitize_codec_error'){assert.equal(api.sanitize_codec_error('secret-password and short',' secret-password\nshort\n'),'<redacted input> and short');assert.equal(api.sanitize_codec_error('😀 password',''),'😀 password');}
    if(name==='extract_sse_data')for(const [value,expected]of [['',''],['event: text\ndata: first\r\ndata:second\n','first\nsecond'],['data: \u0085a\ndata:\n','a\n'],['data: one\rdata: two','one\rdata: two']])assert.equal(api.extract_sse_data(value),expected);
  });
});
