import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateSource,sha256} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {parseRust as parseData,checkProgram as checkData} from '../extensions/data.mjs';
const none=Object.freeze({$:'None'}),some=value=>Object.freeze({$:'Some',field0:value});
test('independent Data frontend preserves its existing checked string strip contract',()=>{
  const program=checkData(parseData('pub fn strip(value:&str)->Option<&str>{value.strip_prefix("/")} fn main(){}'));
  assert.equal(program.declarations.get('strip').body.k,'routerStrip');
  assert.equal(program.declarations.get(program.declarations.get('strip').ret.name).standardGeneric.kind,'Option');
});
async function translate(source,verify) {
  const result=translateSource(source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  assert.equal(result.ir.counts.carried,0,JSON.stringify(result.ir.items.filter(item=>item.status==='carried').map(item=>item.diagnostic)));
  await verifyTypedTargets(result,verify);return result;
}
test('str pattern trims remove repeated anchored matches and preserve empty and overlapping semantics',async()=>{
  await translate("pub fn start(v:&'static str,p:&str)->&'static str{v.trim_start_matches(p)} pub fn end(v:&'static str,p:&str)->&'static str{v.trim_end_matches(p)}",api=>{
    for(const [value,pattern,start,end] of [
      ['aaabaaa','aa','abaaa','aaaba'],['ababxabab','ab','xabab','ababx'],
      ['😀😀x😀😀','😀','x😀😀','😀😀x'],['abc','','abc','abc'],['','','',''],
      ['[a][a]x[a]','[a]','x[a]','[a][a]x'],['unchanged','no','unchanged','unchanged'],
    ]){assert.equal(api.start(value,pattern),start);assert.equal(api.end(value,pattern),end);}
    assert.throws(()=>api.start('\ud800','x'),TypeError);assert.throws(()=>api.end('x',/x/),TypeError);
  });
});
test('actual char trims support the DoubleEndedSearcher contract with scalar boundaries',async()=>{
  await translate("pub fn both(v:&str)->&str{v.trim_matches('/')} pub fn unicode(v:&str)->&str{v.trim_matches('😀')} pub fn end(v:&str)->&str{v.trim_end_matches('\\r')}",api=>{
    assert.equal(api.both('///a/b///'),'a/b');assert.equal(api.both('////'),'');assert.equal(api.both(''),'');
    assert.equal(api.unicode('😀😀Ω😀'),'Ω');assert.equal(api.unicode('😀'),'');assert.equal(api.end('a\r\r'),'a');
  });
});
test('stripping removes a prefix or suffix once and returns actual canonical Option identity',async()=>{
  await translate("pub fn prefix(v:&'static str,p:&str)->Option<&'static str>{v.strip_prefix(p)} pub fn suffix(v:&'static str,p:&str)->Option<&'static str>{v.strip_suffix(p)} pub fn char(v:&str)->Option<&str>{v.strip_prefix('[')}",api=>{
    assert.deepEqual(api.prefix('aaa','a'),some('aa'));assert.deepEqual(api.suffix('aaa','a'),some('aa'));
    assert.deepEqual(api.prefix('abc','x'),none);assert.deepEqual(api.suffix('abc','x'),none);
    assert.deepEqual(api.prefix('abc',''),some('abc'));assert.deepEqual(api.suffix('abc',''),some('abc'));assert.deepEqual(api.suffix('',''),some(''));
    assert.deepEqual(api.prefix('😀Ω','😀'),some('Ω'));assert.deepEqual(api.suffix('Ω😀','😀'),some('Ω'));assert.deepEqual(api.char('[[x'),some('[x'));
    assert.ok(Object.isFrozen(api.char('[x')));assert.throws(()=>api.prefix('x','\ud800'),TypeError);
  });
});
test('trim and strip operations preserve checked source-order bindings',async()=>{
  await translate('fn receiver()->&\'static str{panic!("receiver first")} fn pattern()->&\'static str{panic!("pattern second")} pub fn run()->&\'static str{receiver().trim_end_matches(pattern())}',api=>assert.throws(()=>api.run(),{message:'receiver first'}));
  const result=await translate("pub fn run(v:&'static str,p:&str)->&'static str{v.trim_start_matches(p)}",api=>assert.equal(api.run('ababx','ab'),'x'));
  let body=result.ir.items.find(item=>item.name==='run').semantic.checkedIR.body,count=0;
  while(body.k==='let'){count++;body=body.body;}assert.equal(count,2);assert.equal(body.constEligible,false);
});
test('trim double-ended trait bounds, ownership and const qualifications remain distinct obligations',()=>{
  for(const source of [
    'pub fn bad(v:&str)->String{v.trim_matches("ab").to_string()}',
    'pub fn bad(v:&str,p:&str)->String{v.trim_matches(p).to_string()}',
    'pub fn bad(v:&str)->String{v.trim_end_matches(|c|true).to_string()}',
    'pub fn bad(v:&str)->String{v.trim_matches([\'a\',\'b\']).to_string()}',
    'pub fn bad(v:String)->bool{v.strip_prefix("x").is_some()}',
    'pub fn bad(v:&str,p:String)->bool{v.strip_suffix(p).is_some()}',
    'pub fn bad(v:&String)->String{v.trim_start_matches("x").to_string()}',
    'pub const fn bad(v:&str)->&str{v.trim_end_matches("x")}',
  ]){const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});
test('actual endpoint and compatible URL functions execute unchanged source bodies in both targets',async()=>{
  const fixtures=[
    {path:'src/with_command.rs',name:'endpoint',fileSha256:'d4e0026b3a9d54b2073e6b64eb633fce1af8c74bdf12d170831ccdec242623cb',start:39128,end:39243,bodySha256:'ae11370ea8b0274737b09232c5d52d3027033953d91289213847e87a4015f582',observations:[[['https://x///','/api'],'https://x/api'],[['','/api'],'/api'],[['😀Ω/','/x'],'😀Ω/x'],[['https://x/','suffix'],'https://xsuffix']]},
    {path:'src/provider_proxy.rs',name:'join_openai_compatible_url',fileSha256:'acdd00cd3e346de590cc41c5c497df1473e69367a2ef118c18ffffe936bb154a',start:31196,end:31504,bodySha256:'12296da0b12b5c135ded3b0f62758d8850f2da45d6cb6d30b3d15a0a3e8719c4',observations:[[['https://x/v1///','/v1/models'],'https://x/v1/models'],[['https://x///','/v1/models'],'https://x/v1/models'],[['https://x/v1','/models'],'https://x/v1/models'],[['https://x/v1','/v1beta'],'https://x/v1beta'],[['😀Ω/v1/','/v1/models'],'😀Ω/v1/models'],[['/','/v1'],'/v1']]},
  ];
  for(const fixture of fixtures){
    const original=readFileSync(new URL('../../../'+fixture.path,import.meta.url),'utf8');assert.equal(sha256(original),fixture.fileSha256);
    const item=sourceItems(original).find(item=>item.term==='fn'&&item.name===fixture.name);assert.deepEqual([item.start,item.end],[fixture.start,fixture.end]);
    const source=original.slice(item.start,item.end);assert.equal(sha256(source),fixture.bodySha256);
    const module=fixture.path.slice(4,-3),files={'src/lib.rs':`mod ${module};`,[fixture.path]:source};
    const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.deepEqual(result.meta.refused,[]);
    const key=module+'.'+fixture.name,entry=result.meta.executable.find(entry=>entry.name===key);assert.deepEqual(entry.span,{start:0,end:source.length});assert.equal(entry.source,fixture.path);
    await verifyTypedTargets(result,api=>{for(const [args,expected] of fixture.observations)assert.equal(api[key](...args),expected);assert.throws(()=>api[key]('\ud800','/x'),TypeError);});
  }
});
