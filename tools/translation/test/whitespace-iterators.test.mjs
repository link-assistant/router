import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {WHITESPACE_ITERATOR_PROFILE} from '../extensions/whitespace-profile.mjs';
import {whitespaceSourceArtifacts} from '../extensions/whitespace-source.mjs';
import {RUST_WHITESPACE_CODE_UNITS,isRustWhitespaceCodeUnit} from '../extensions/whitespace-data.mjs';
import {stringWhitespace,stringNext} from '../extensions/string-iterator-runtime.mjs';
import {translateProject} from '../project.mjs';
import {trackedSource} from '../source-corpus.mjs';
import {parseRust,checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {checkedSourceContext,bindCheckedSourceLinks,checkedSourceEvidence} from '../extensions/source-links.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=fileURLToPath(new URL('../../../',import.meta.url));
const profileRoot=new URL('../source-profiles/whitespace-iterators/',import.meta.url);
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const some=field0=>({$:'Some',field0}),none={$:'None'};

test('original implementation closure and exhaustive Rust whitespace property agree',()=>{
  const profile=WHITESPACE_ITERATOR_PROFILE;
  assert.equal(profile.rust,'1.89.0');assert.deepEqual(profile.unicodeVersion,[16,0,0]);
  assert.equal(profile.sources.length,8);assert.equal(profile.sourceInputsVerified,true);
  assert.equal(profile.namespaceAuthority,false);assert.equal(profile.runtimeAuthority,false);
  assert.equal(profile.constEligible,false);assert.ok(Object.isFrozen(profile.sources));
  const originals=new Map();
  for(const input of profile.sources){
    const packed=readFileSync(new URL(input.archive,profileRoot));assert.equal(hash(packed),input.archiveSha256);
    const source=gunzipSync(packed,{maxOutputLength:300_000});assert.equal(source.length,input.bytes);assert.equal(hash(source),input.sha256);
    originals.set(input.archive,source.toString('utf8'));
  }
  const data=originals.get('unicode-data.rs.gz'),module=data.slice(data.indexOf('pub mod white_space {'));
  const match=module.match(/static WHITESPACE_MAP: \[u8; 256\] = \[([\s\S]*?)\];/);assert.ok(match);
  const table=match[1].split(',').map(value=>value.trim()).filter(Boolean).map(Number);assert.equal(table.length,256);
  assert.match(module,/0 => WHITESPACE_MAP\[c as usize & 0xff\] & 1 != 0/);
  assert.match(module,/22 => c as u32 == 0x1680/);assert.match(module,/32 => WHITESPACE_MAP\[c as usize & 0xff\] & 2 != 0/);
  assert.match(module,/48 => c as u32 == 0x3000/);
  assert.match(originals.get('../utf16-fixed-f64/core-char-methods.rs.gz'),/c > '\\x7f' && unicode::White_Space\(c\)/);
  assert.match(originals.get('unicode-mod.rs.gz'),/unicode_data::white_space::lookup as White_Space/);
  assert.match(originals.get('../utf16-fixed-f64/core-str-mod.rs.gz'),/self\.split\(IsWhitespace\)\.filter\(IsNotEmpty\)/);
  const expected=[];
  // Evaluate the pinned property table, without invoking Rust or a host regex.
  for(let scalar=0;scalar<=0x10ffff;scalar++){
    const page=scalar>>>8;
    const unicode=page===0?(table[scalar&255]&1)!==0:page===22?scalar===0x1680:page===32?(table[scalar&255]&2)!==0:page===48?scalar===0x3000:false;
    const whitespace=scalar===32||(scalar>=9&&scalar<=13)||(scalar>127&&unicode);
    if(whitespace)expected.push(scalar);
    assert.equal(isRustWhitespaceCodeUnit(scalar),whitespace,`scalar ${scalar}`);
  }
  assert.deepEqual(RUST_WHITESPACE_CODE_UNITS,expected);assert.deepEqual(profile.whitespaceScalarCodes,expected);
});

test('original Rust property lifts through reparsed meta to reproducible generated table bytes',()=>{
  const artifacts=whitespaceSourceArtifacts();assert.deepEqual(artifacts.codes,RUST_WHITESPACE_CODE_UNITS);
  assert.equal(artifacts.meta.namespaceAuthority,false);assert.equal(artifacts.meta.runtimeAuthority,false);
  assert.equal(readFileSync(new URL('../extensions/whitespace-data.mjs',import.meta.url),'utf8'),artifacts.javascript);
  assert.equal(readFileSync(new URL('../source-profiles/whitespace-iterators/white-space.meta.json',import.meta.url),'utf8'),artifacts.metaJson);
});

test('every pinned separator yields nonempty borrowed words and excludes BOM and obsolete whitespace',()=>{
  for(const scalar of RUST_WHITESPACE_CODE_UNITS){
    const separator=String.fromCodePoint(scalar);
    assert.deepEqual([...stringWhitespace(separator+'😀'+separator+separator+'é'+separator)],['😀','é']);
    assert.deepEqual([...stringWhitespace(separator)],[]);
  }
  for(const value of ['',' \t\r\n\u0085\u3000'])assert.deepEqual([...stringWhitespace(value)],[]);
  for(const scalar of [0,0x180e,0x200b,0xfeff]){
    const value='a'+String.fromCodePoint(scalar)+'b';assert.deepEqual([...stringWhitespace(value)],[value]);
  }
  assert.deepEqual([...stringWhitespace('\uFEFF a\u0085b \uFEFF')],['\uFEFF','a','b','\uFEFF']);
});

test('scalar validation and private fresh cursor consumption never dispatch caller coercions or iterator traps',()=>{
  for(const value of ['\ud800','\udfff','a\ud800b'])assert.throws(()=>stringWhitespace(value),TypeError);
  let calls=0;
  const custom={next(){calls++;throw Error('next');},[Symbol.toPrimitive](){calls++;throw Error('coerce');}};
  const proxy=new Proxy(custom,{get(){calls++;throw Error('get');},ownKeys(){calls++;throw Error('keys');},getPrototypeOf(){calls++;throw Error('prototype');}});
  for(const value of [custom,proxy,new String('a'),null,12])assert.throws(()=>stringWhitespace(value),TypeError);
  for(const value of [custom,proxy])assert.throws(()=>stringNext(value),TypeError);
  assert.equal(calls,0);
  assert.deepEqual(stringNext(stringWhitespace(' \u0085')),none);
  const cursor=stringWhitespace(' a b ');assert.deepEqual(stringNext(cursor),some('a'));assert.throws(()=>stringNext(cursor),TypeError);
  const advanced=stringWhitespace('a b');advanced.next();assert.throws(()=>stringNext(advanced),TypeError);
});

test('word views lower through checked meta to JavaScript and strict TypeScript',{timeout:60_000},async()=>{
  const source='pub fn first(value:&str)->Option<&str>{value.split_whitespace().next()} pub fn words(value:&str)->Vec<&str>{value.split_whitespace().collect::<Vec<_>>()} pub fn compact(value:&str)->String{value.split_whitespace().collect::<Vec<_>>().join(" ")} pub fn count(value:&str)->usize{value.split_whitespace().count()} pub fn contains(value:&str)->bool{value.split_whitespace().any(|word| word == "serve")}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const [value,words]of [['',[]],[' \t\u0085',[]],['\u0085😀\u3000é\t',['😀','é']],['a\uFEFFb serve',['a\uFEFFb','serve']]]){
      assert.deepEqual(api.words(value),words);assert.deepEqual(api.first(value),words.length?some(words[0]):none);
      assert.equal(api.compact(value),words.join(' '));assert.equal(api.count(value),BigInt(words.length));assert.equal(api.contains(value),words.includes('serve'));
    }
  });
});

test('fresh word adapters retain item ownership with actual trim function items',{timeout:60_000},async()=>{
  const result=project('pub fn limited(value:&str)->String{value.split_whitespace().map(str::trim).take(2).collect::<Vec<_>>().join("|")} pub fn trimmed(value:&str)->&str{value.trim()}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.limited(' \u0085😀\u3000é third '),'😀|é');assert.equal(api.limited(' \t'),'');assert.equal(api.limited('\uFEFF a b'),'\uFEFF|a');
    for(const scalar of RUST_WHITESPACE_CODE_UNITS){const separator=String.fromCodePoint(scalar);assert.equal(api.trimmed(separator+'😀'+separator),'😀');}
    assert.equal(api.trimmed('\uFEFF😀\uFEFF'),'\uFEFF😀\uFEFF');
  });
});

test('word next resolves standard Option aliases independently of local source names',{timeout:60_000},async()=>{
  const result=project('enum Option{Other} use std::option::Option as Maybe; pub fn first(value:&str)->Maybe<&str>{value.split_whitespace().next()} pub fn qualified(value:&str)->std::option::Option<&str>{value.split_whitespace().next()}');
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const name of ['first','qualified']){assert.deepEqual(api[name](' \t'),none);assert.deepEqual(api[name]('\u0085😀 word'),some('😀'));}});
});

test('source-defined inherent methods with the same spelling execute their actual checked body',{timeout:60_000},async()=>{
  const result=project('struct Counter{value:u8} impl Counter{fn split_whitespace(&self)->u8{self.value + 1}} pub fn run(value:u8)->u8{Counter{value}.split_whitespace()}');
  assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.checkedMethods.length,1);
  await verifyTypedTargets(result,api=>{assert.equal(api.run(7n),8n);assert.throws(()=>api.run(255n),/overflow/);});
});

test('owned escapes stored cursors custom owners arguments and const use remain refused',()=>{
  for(const source of [
    'pub fn bad(value:String)->Option<&str>{value.split_whitespace().next()}',
    'pub fn bad(value:&str)->Option<&\'static str>{value.split_whitespace().next()}',
    'pub fn bad(value:&str)->Vec<&\'static str>{value.split_whitespace().collect::<Vec<_>>()}',
    'pub fn bad(value:&str)->Option<&str>{let words=value.split_whitespace();words.next()}',
    'pub fn bad(value:&str)->Option<&str>{let mut words=value.split_whitespace();words.next()}',
    'pub fn bad(value:&mut str)->Option<&str>{value.split_whitespace().next()}',
    'pub fn bad(value:&str)->Option<&str>{value.split_whitespace(1).next()}',
    'struct Custom;pub fn bad(value:Custom)->Option<&str>{value.split_whitespace().next()}',
    'pub const fn bad(value:&str)->Option<&str>{value.split_whitespace().next()}',
    'enum Option{None,Some(&\'static str)}pub fn bad(value:&\'static str)->Option{value.split_whitespace().next()}',
    'enum Vec{Other}pub fn bad(value:&str)->String{value.split_whitespace().collect::<Vec<_>>().join(",")}',
    'pub fn bad(value:&str)->Vec<u8>{value.split_whitespace().collect::<Vec<_>>()}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);}
});

const findNode=(value,kind)=>{
  if(!value||typeof value!=='object')return null;if(value.k===kind)return value;
  for(const child of Object.values(value)){const found=findNode(child,kind);if(found)return found;}return null;
};
test('word nodes preserve genuine parser and checked source association freshness',()=>{
  const source='pub fn first(value:&str)->Option<&str>{value.split_whitespace().next()}fn main(){}';
  const surface=parseRust(source),original=findNode(surface.items,'routerStringIteratorOperation');assert.ok(original);original.operation='lines';
  assert.throws(()=>checkProgram(surface),/changed after source capture/);
  const program=checkProgram(parseRust(source)),entry=program.declarations.get('first'),context=checkedSourceContext(program);
  const options={targetProfile:{id:'whitespace-freshness-test'}},bound=bindCheckedSourceLinks(program,context,options);
  assert.ok(checkedSourceEvidence(bound,entry));
  assert.throws(()=>bindCheckedSourceLinks(program,{...context},options),/private parser source context/);
  const words=findNode(entry.body,'routerStringWords');assert.ok(words);words.whitespaceIteratorProfile={...words.whitespaceIteratorProfile,id:'caller-profile'};
  assert.throws(()=>bindCheckedSourceLinks(program,context,options),/checked declaration changed before source binding/);
  assert.throws(()=>checkedSourceEvidence(bound,entry),/checked source association became stale/);
});

test('emission rejects removed or replaced whitespace source evidence',()=>{
  const source='pub fn first(value:&str)->Option<&str>{value.split_whitespace().next()}fn main(){}';
  for(const change of [node=>delete node.whitespaceIteratorProfile,node=>{node.whitespaceIteratorProfile={...node.whitespaceIteratorProfile,sourceInputsVerified:false};},node=>{node.whitespaceIteratorProfile={...node.whitespaceIteratorProfile,id:'caller-profile'};}]){
    const program=checkProgram(parseRust(source)),node=findNode(program.declarations.get('first').body,'routerStringWords');assert.ok(node);change(node);
    assert.throws(()=>emitJavaScript(program),/missing checked standard whitespace source profile/);
  }
});

const frontier=JSON.parse(readFileSync(new URL('./fixtures/whitespace-iterator-frontier.json',import.meta.url),'utf8'));
for(const pin of frontier.originalFiles)test(`whole unchanged ${pin.path} keeps ${pin.name} bytes and actual admission`,{timeout:60_000},async()=>{
  const source=trackedSource(root,pin.path);assert.equal(hash(source),pin.sha256);
  const item=sourceItems(source).find(item=>item.term==='fn'&&item.name===pin.name);assert.ok(item);
  assert.deepEqual({start:item.start,end:item.end},pin.span);assert.equal(hash(source.slice(item.start,item.end)),pin.declarationSha256);
  const result=translateProject({entry:pin.path,paths:[pin.path],readSource:()=>source});assert.equal(result.meta.runtimeParity,false);
  if(pin.path!=='src/deploy/runtime.rs'){
    // pub(super) keeps its original parent requirement. An isolated entry does
    // not invent parent modules, visibility, imports or a source owner.
    const refusal=result.meta.refused.find(item=>item.name===pin.name);assert.ok(refusal);
    assert.equal(result.meta.executable.some(item=>item.name===pin.name),false);return;
  }
  const checked=result.meta.executable.find(item=>item.term==='fn'&&item.name===pin.name);assert.ok(checked);assert.deepEqual(checked.span,pin.span);
  await verifyTypedTargets(result,api=>{
    for(const [value,expected]of [['',''],['failed:\n  because\n  reasons','failed: because reasons'],['\u0085😀\u3000é\t','😀 é'],['a\uFEFFb','a\uFEFFb']])assert.equal(api.compact(value),expected);
  });
});
