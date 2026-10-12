import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_JSON_PARSER_PROFILE,actualJsonCapabilityProfile} from '../json-capabilities.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const tagged=($,field0)=>Object.freeze({$,...(field0===undefined?{}:{field0})});
test('explicit standalone default JSON contracts retain borrowed readers and owned String and Vec serialization',async()=>{
  const source='pub fn text(v:&serde_json::Value)->Option<&str>{v.as_str()} pub fn selected(v:&serde_json::Value)->Option<&serde_json::Value>{v.get("a")} pub fn values(v:&serde_json::Value)->Option<&Vec<serde_json::Value>>{v.as_array()} pub fn count(v:&serde_json::Value)->Option<usize>{v.as_object().map(|m|m.len())} pub fn encoded(v:&serde_json::Value)->Result<String,serde_json::Error>{serde_json::to_string(v)} pub fn bytes(v:&serde_json::Value)->Result<Vec<u8>,serde_json::Error>{serde_json::to_vec(v)} pub fn display(v:&serde_json::Error)->String{v.to_string()}';
  const parsed=source+' pub fn parse_text(v:&str)->Result<serde_json::Value,serde_json::Error>{serde_json::from_str(v)} pub fn parse_bytes(v:&[u8])->Result<serde_json::Value,serde_json::Error>{serde_json::from_slice(v)}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>parsed,jsonParserProfile:DEFAULT_JSON_PARSER_PROFILE});assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.jsonParserProfile.kind,'explicit-registered-standalone-default-profile');
  await verifyTypedTargets(result,api=>{
    const text=tagged('String','Ω'),entries=Object.freeze([Object.freeze({$:'MapEntry',key:'a',value:text})]),object=tagged('Object',Object.freeze({$:'Map',entries}));
    const values=Object.freeze([text]),array=tagged('Array',values);
    assert.deepEqual(api.text(text),tagged('Some','Ω'));assert.deepEqual(api.text(tagged('Null')),tagged('None'));
    assert.equal(api.selected(object).field0,text);assert.deepEqual(api.selected(tagged('Null')),tagged('None'));
    assert.equal(api.values(array).field0,values);assert.deepEqual(api.values(text),tagged('None'));assert.deepEqual(api.count(object),tagged('Some',1n));
    assert.deepEqual(api.encoded(text),tagged('Ok','"Ω"'));assert.deepEqual(api.bytes(text),tagged('Ok',Object.freeze([34n,206n,169n,34n])));
    assert.deepEqual(api.parse_text('"Ω"'),tagged('Ok',text));assert.deepEqual(api.parse_bytes([34n,206n,169n,34n]),tagged('Ok',text));
    const error=Object.freeze({$:'JsonError',category:tagged('Syntax'),line:3n,column:2n,message:'bad'});assert.equal(api.display(error),'bad at line 3 column 2');
    assert.throws(()=>api.text(tagged('String','\ud800')),TypeError);
  });
});
test('standard output qualifiers cannot fabricate ownership transfers or erased map iterator types',()=>{
  for(const source of [
    'pub fn bad(v:&serde_json::Value)->Option<String>{v.as_str()}',
    'pub fn bad(v:&serde_json::Value)->Option<serde_json::Value>{v.get("a")}',
    'pub fn bad(v:&serde_json::Value)->Option<Vec<serde_json::Value>>{v.as_array()}',
    'pub fn bad(v:&serde_json::Value)->Result<&str,serde_json::Error>{serde_json::to_string(v)}',
    'pub fn bad(v:&serde_json::Value)->Result<&[u8],serde_json::Error>{serde_json::to_vec(v)}',
    'pub fn bad(v:&serde_json::Error)->&str{v.to_string()}',
    'pub fn bad(v:String)->Result<serde_json::Value,serde_json::Error>{serde_json::from_str(v)}',
    'pub fn bad(v:Vec<u8>)->Result<serde_json::Value,serde_json::Error>{serde_json::from_slice(v)}',
    'pub fn bad(v:&std::num::ParseIntError)->std::num::IntErrorKind{v.kind()}',
    'pub fn bad(v:&serde_json::Value)->Option<Vec<serde_json::Value>>{v.as_object().map(|m|m.values())}',
    'pub fn bad(v:&serde_json::Value)->Option<Vec<String>>{v.as_object().map(|m|m.keys())}',
  ]){
    const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);
    assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});
test('Option map_or joins actual owned strings across distinct checked constructor operations',async()=>{
  const source='pub fn choose(v:Option<bool>)->String{v.map_or(String::from("default"),|flag|if flag{format!("yes")}else{"no".to_string()})}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.choose(tagged('None')),'default');assert.equal(api.choose(tagged('Some',true)),'yes');assert.equal(api.choose(tagged('Some',false)),'no');});
});

test('valid borrowed parse signatures retain missing and actual float_roundtrip profile refusals independently of ownership',()=>{
  const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8');
  const actual=actualJsonCapabilityProfile({manifest,lock,compilationProfile:PRODUCTION_PROFILE});assert.equal(actual.kind,'actual-locked-Cargo-profile');assert.equal(actual.features.includes('float_roundtrip'),true);assert.equal(actual.parseAvailable,false);
  const source='pub fn reader(v:&serde_json::Value)->Option<&str>{v.as_str()} pub fn parse_text(v:&str)->Result<serde_json::Value,serde_json::Error>{serde_json::from_str(v)} pub fn parse_bytes(v:&[u8])->Result<serde_json::Value,serde_json::Error>{serde_json::from_slice(v)}';
  for(const profile of [undefined,actual]){
    const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,...(profile?{jsonParserProfile:profile}:{})});
    assert.equal(result.meta.executable.some(item=>item.name==='reader'),true);assert.deepEqual(result.meta.refused.map(item=>item.name).sort(),['parse_bytes','parse_text']);
    assert.equal(result.meta.jsonParserProfile.kind,profile?'actual-locked-Cargo-profile':'actual-Cargo-profile-unavailable');
    for(const item of result.meta.refused){assert.equal(item.kind,'unsupported');assert.equal(item.file,'src/lib.rs');assert.match(item.message,profile?/float_roundtrip/:/exact original Cargo manifest\/lock/);assert.match(source.slice(item.span.start,item.span.end),/serde_json::from_(str|slice)/);}
  }
});
