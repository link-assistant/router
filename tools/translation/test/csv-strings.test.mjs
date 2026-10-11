// SOURCE-ONLY DRAFT: every case remains unrun until the exclusive focus slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {stringSplitCharacter,stringSplitNext,allocateStringItem} from '../extensions/csv-string-runtime.mjs';
import {CSV_STRING_PROFILE,planCharacterSplit} from '../extensions/csv-strings.mjs';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {checkedSourceContext,bindCheckedSourceLinks} from '../extensions/source-links.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
const some=field0=>({$:'Some',field0}),none={$:'None'};

test('pinned Split includes empty and trailing fields with exact Unicode scalar delimiters',()=>{
  assert.equal(CSV_STRING_PROFILE.rust,'1.89.0');assert.equal(CSV_STRING_PROFILE.constEligible,false);
  for(const [value,delimiter,expected]of [['',',',['']],['a',',',['a']],[',',',',['','']],['a,,b,',',',['a','','b','']],['😀a😀', '😀',['','a','']],['éΩé','é',['','Ω','']],['a\0b\0','\0',['a','b','']],['a\r\nb\n','\n',['a\r','b','']]])assert.deepEqual([...stringSplitCharacter(value,delimiter)],expected);
  for(const [value,delimiter]of [['x',''],['x','ab'],['\ud800',','],['x','\udfff']])assert.throws(()=>stringSplitCharacter(value,delimiter),TypeError);
  assert.equal(allocateStringItem('😀'),'😀');assert.throws(()=>allocateStringItem('\ud800'),TypeError);
});
test('split next has a private fresh linear cursor and invokes no caller protocol',()=>{
  assert.deepEqual(stringSplitNext(stringSplitCharacter('',',')),some(''));
  const cursor=stringSplitCharacter('a,b',',');assert.deepEqual(stringSplitNext(cursor),some('a'));assert.throws(()=>stringSplitNext(cursor),TypeError);
  const advanced=stringSplitCharacter('a,b',',');advanced.next();assert.throws(()=>stringSplitNext(advanced),TypeError);
  let reads=0;const caller=new Proxy({next(){reads++;throw Error('next');}},{get(){reads++;throw Error('get');},getPrototypeOf(){reads++;throw Error('prototype');},ownKeys(){reads++;throw Error('keys');}});
  assert.throws(()=>stringSplitNext(caller),TypeError);assert.equal(reads,0);
});
test('plans require an actual source scalar char and checked borrowed str',()=>{
  const type={kind:'string',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'}},span={start:4,end:8};
  assert.equal(planCharacterSplit(type,{k:'routerPatternChar',raw:"'😀'",value:'😀',span},span).delimiter,'😀');
  for(const argument of [{k:'lit',value:','},{k:'routerPatternChar',raw:"','",value:'x'}, {k:'routerPatternChar',raw:"'ab'",value:'ab'}])assert.throws(()=>planCharacterSplit(type,argument,span));
  for(const receiver of [{kind:'string'}, {...type,rustOwnership:{kind:'owned',source:'String'}}, {...type,rustReference:{kind:'shared',pointee:type}}])assert.throws(()=>planCharacterSplit(receiver,{k:'routerPatternChar',raw:"','",value:',',span},span));
});
test('typed literal split keeps origins and allocating function items produce owned strings',{timeout:60_000},async()=>{
  const source='pub fn borrowed(value:&str)->Vec<&str>{value.split(\',\').collect::<Vec<_>>()}pub fn strings(value:&str)->Vec<String>{value.split(\',\').map(str::trim).filter(|s|!s.is_empty()).map(ToString::to_string).collect()}pub fn alternate(value:&str)->Vec<String>{value.split(\',\').map(str::trim).filter(|s|!s.is_empty()).map(str::to_string).collect()}pub fn first(value:&str)->Option<&str>{value.split(\'?\').next()}pub fn unicode(value:&str)->Vec<String>{value.split(\'😀\').map(str::to_string).collect()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.deepEqual(api.borrowed('a,,b,'),['a','','b','']);assert.deepEqual(api.borrowed(''),['']);
    for(const name of ['strings','alternate']){assert.deepEqual(api[name](' , \u0085one, two\uFEFF, ,' ),['one','two\uFEFF']);assert.deepEqual(api[name](''),[]);}
    assert.deepEqual(api.first(''),some(''));assert.deepEqual(api.first('/x?query?more'),some('/x'));
    assert.deepEqual(api.unicode('😀a😀'),['','a','']);
  });
});
test('method precedence and helper binder identity are preserved',{timeout:60_000},async()=>{
  const result=project('struct View{n:u8}impl View{fn split(&self,n:u8)->u8{self.n+n}}pub fn custom(n:u8)->u8{View{n}.split(2u8)}pub fn collision(v:&str)->Vec<String>{let ml_csv_allocate=3u8;v.split(\',\').map(str::to_string).collect()}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.custom(4n),6n);assert.deepEqual(api.collision('a,b'),['a','b']);});
});
test('source unknown owners, escapes, custom Pattern, stored cursors and const authority remain refused',()=>{
  for(const source of [
    'pub fn bad(v:&str)->Vec<&str>{v.split(",").collect()}',
    'pub fn bad(v:&str,p:char)->Vec<&str>{v.split(p).collect()}',
    'pub fn bad(v:String)->Vec<&str>{v.as_str().split(\',\').collect()}',
    'pub fn bad(v:&str)->Vec<&\'static str>{v.split(\',\').collect()}',
    'pub fn bad(v:&str)->Option<&str>{let it=v.split(\',\');it.next()}',
    'pub fn bad(v:&str)->Option<&str>{let mut it=v.split(\',\');it.next()}',
    'pub const fn bad(v:&str)->Option<&str>{v.split(\',\').next()}',
    'mod str{}pub fn bad(v:&str)->Vec<String>{v.split(\',\').map(str::to_string).collect()}',
    'trait ToString{}pub fn bad(v:&str)->Vec<String>{v.split(\',\').map(ToString::to_string).collect()}',
    'use std::string::ToString as Textual;pub fn bad(v:&str)->Vec<String>{v.split(\',\').map(Textual::to_string).collect()}',
    'pub fn bad(v:&[u8])->Vec<String>{v.iter().copied().map(ToString::to_string).collect()}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);}
});
const find=(value,kind)=>{if(!value||typeof value!=='object')return null;if(value.k===kind)return value;for(const child of Object.values(value)){const result=find(child,kind);if(result)return result;}return null;};
test('parsed, checked and emitter source proofs reject changed split metadata',()=>{
  const source='pub fn first(v:&str)->Option<&str>{v.split(\',\').next()}fn main(){}';
  const surface=parseRust(source);find(surface,'routerStringIteratorOperation').args[0].value=';';assert.throws(()=>checkProgram(surface),/changed after source capture/);
  const program=checkProgram(parseRust(source)),context=checkedSourceContext(program);find(program.declarations.get('first').body,'routerStringSplit').delimiter=';';assert.throws(()=>bindCheckedSourceLinks(program,context,{targetProfile:{id:'csv-freshness'}}),/changed before source binding/);assert.throws(()=>emitJavaScript(program),/delimiter differs/);
  const missing=checkProgram(parseRust(source));delete find(missing.declarations.get('first').body,'routerStringSplit').csvStringProof;assert.throws(()=>emitJavaScript(missing),/missing checked standard CSV string proof/);
});

// Whole source/context fixtures are not reduced to handwritten function ports.
// These pending tests do not assert a canonical lib.rs coverage forecast.
const pins=[
  ['src/config.rs','9f5bb5c2d7060a8ab317889e401d3da2155a0574b5d4e2ed112f52d5e9468d8a','parse_csv',38315,38488,'aa546ece7c5cb7ebf5daf009677a5e6c635c0396b53e313bb5f022710290a600'],
  ['src/storage/associative.rs','ed0ece47432947d26bd5c026ab6bbf4a9efd7e415deeca6424213ff836f450d1','split_repository_list',10643,10846,'b9699846f61b897d40553b7dcc150811f9d53becb2a5913aa2d086a0ce5213ac'],
  ['src/stream_termination.rs','96e99a807fab7c520d2739fcbb3a0138b1933d7c2c8bfe816db329d257e9e50a','from_path',2166,2657,'662c23868e203a81321c0d92120e8f42c113597b92065ac907e443d511a6ae69'],
  ['src/log_decode.rs','7dc190395c8ec6d786647c81b143c591337e18ddbdeeeae86038c38d3b945b8e','parse',1731,2394,'62e91fc42c646029c143edd67d95d37eb443e1ca2b2b71978a403da839544d4f'],
];
for(const [file,fileHash,name,start,end,sliceHash]of pins)test(`pending complete original ${file} ${name} retains source and checked frontier`,{timeout:60_000},async()=>{
  const source=readFileSync(new URL(file,root),'utf8');assert.equal(hash(source),fileHash);assert.equal(hash(source.slice(start,end)),sliceHash);assert.ok(source.slice(start,end).startsWith('fn '+name+'('));
  const paths=execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:root,encoding:'utf8',timeout:30_000}).split('\0').filter(Boolean);
  const deriveDependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
  const result=translateProject({entry:file,paths,readSource:path=>readFileSync(new URL(path,root),'utf8'),compilationProfile:PRODUCTION_PROFILE,deriveDependencies});assert.equal(result.meta.runtimeParity,false);
  if(name==='parse'){assert.ok(result.meta.refused.some(item=>item.name==='Encoding.parse'));assert.equal(result.meta.checkedMethods.some(item=>item.name==='Encoding.parse'),false);return;}
  if(name==='from_path'){
    const method=extractImplDeclarations(source).implementations.flatMap(item=>item.methods).find(item=>item.name===name);assert.ok(result.meta.checkedMethods.some(item=>item.name==='StreamDialect.from_path'&&item.span.start===method.span.start&&item.span.end===method.span.end));
    const binding='ml_impl_'+Buffer.from('crate.StreamDialect').toString('hex')+'_'+Buffer.from(name).toString('hex');
    await verifyTypedTargets(result,api=>{for(const [value,expected]of [['/v1/messages?q=x','Anthropic'],['/v1/chat/completions?x','OpenAiChat'],['/v1/responses','Responses'],['/models/x:streamGenerateContent?alt=sse','Gemini'],['unknown',null]])assert.deepEqual(api[binding](value),expected===null?none:some({$:expected}));});return;
  }
  const item=sourceItems(source).find(item=>item.term==='fn'&&item.name===name);assert.deepEqual([item.start,item.end],[start,end]);assert.ok(result.meta.executable.some(item=>item.name===name&&item.span.start===start&&item.span.end===end));
  await verifyTypedTargets(result,api=>{for(const [value,expected]of [['',[]],[', ,',[]],['one, two,one',['one','two','one']],['\u0085a,\uFEFFb',['a','\uFEFFb']],['😀,Ω',['😀','Ω']]])assert.deepEqual(api[name](value),expected);});
});
