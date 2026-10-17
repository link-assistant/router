// Source-qualified CSV runtime/checked-target regressions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {stringSplitCharacter,stringSplitNext,allocateStringItem} from '../extensions/csv-string-runtime.mjs';
import {CSV_STRING_PROFILE,planCharacterSplit} from '../extensions/csv-strings.mjs';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {checkedSourceContext,bindCheckedSourceLinks} from '../extensions/source-links.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
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
    'trait ToString{fn to_string(&self)->String;}impl ToString for str{fn to_string(&self)->String{String::from("custom")}}pub fn bad(v:&str)->Vec<String>{v.split(\',\').map(str::to_string).collect()}',
    'trait ToString{}mod nested{use super::ToString;pub fn bad(v:&str)->Vec<String>{v.split(\',\').map(str::to_string).collect()}}',
    'use std::string::ToString as Textual;pub fn bad(v:&str)->Vec<String>{v.split(\',\').map(Textual::to_string).collect()}',
    'pub fn bad(v:&[u8])->Vec<String>{v.iter().copied().map(ToString::to_string).collect()}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(item=>item.name?.split('.').at(-1)==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name?.split('.').at(-1)==='bad'),false,source);}
});
const find=(value,kind)=>{if(!value||typeof value!=='object')return null;if(value.k===kind)return value;for(const child of Object.values(value)){const result=find(child,kind);if(result)return result;}return null;};
test('parsed, checked and emitter source proofs reject changed split metadata',()=>{
  const source='pub fn first(v:&str)->Option<&str>{v.split(\',\').next()}fn main(){}';
  const surface=parseRust(source);find(surface,'routerPatternChar').value=';';assert.throws(()=>checkProgram(surface),/changed after source capture/);
  const program=checkProgram(parseRust(source)),context=checkedSourceContext(program);find(program.declarations.get('first').body,'routerStringSplit').delimiter=';';assert.throws(()=>bindCheckedSourceLinks(program,context,{targetProfile:{id:'csv-freshness'}}),/changed before source binding/);assert.throws(()=>emitJavaScript(program),/delimiter differs/);
  const missing=checkProgram(parseRust(source));delete find(missing.declarations.get('first').body,'routerStringSplit').csvStringProof;assert.throws(()=>emitJavaScript(missing),/missing checked standard CSV string proof/);
});
