import test from 'node:test';
import assert from 'node:assert/strict';
import {translateSource} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const none=()=>Object.freeze({$:'None'});
const some=(left,right)=>Object.freeze({$:'Some',field0:Object.freeze({$:'Tuple',field0:left,field1:right})});
async function translate(source,verify) {
  const result=translateSource(source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  assert.equal(result.ir.counts.carried,0,JSON.stringify(result.ir.items.filter(item=>item.status==='carried').map(item=>item.diagnostic)));
  await verifyTypedTargets(result,verify);return result;
}
test('first and last splits return actual immutable Option of borrowed tuple products',async()=>{
  await translate('pub fn first(v:&str,p:&str)->Option<(&str,&str)>{v.split_once(p)} pub fn last(v:&str,p:&str)->Option<(&str,&str)>{v.rsplit_once(p)}',api=>{
    for(const [value,pattern,first,last] of [
      ['cfg','=',none(),none()],['cfg=','=',some('cfg',''),some('cfg','')],
      ['cfg=foo=bar','=',some('cfg','foo=bar'),some('cfg=foo','bar')],
      ['aaa','aa',some('','a'),some('a','')],['😀Ω😀','😀',some('','Ω😀'),some('😀Ω','')],
      ['a.b','.',some('a','b'),some('a','b')],['$&x$&','$&',some('','x$&'),some('$&x','')],
    ]){assert.deepEqual(api.first(value,pattern),first);assert.deepEqual(api.last(value,pattern),last);}
    const result=api.first('a=b','=');assert.ok(Object.isFrozen(result));assert.ok(Object.isFrozen(result.field0));
    assert.throws(()=>api.first('\ud800','x'),TypeError);assert.throws(()=>api.last('x','\udc00'),TypeError);assert.throws(()=>api.first('x',/x/),TypeError);
  });
});
test('empty split delimiters select the first or last Unicode scalar boundary',async()=>{
  await translate('pub fn first(v:&str)->Option<(&str,&str)>{v.split_once("")} pub fn last(v:&str)->Option<(&str,&str)>{v.rsplit_once("")}',api=>{
    assert.deepEqual(api.first('😀Ω'),some('','😀Ω'));assert.deepEqual(api.last('😀Ω'),some('😀Ω',''));
    assert.deepEqual(api.first(''),some('',''));assert.deepEqual(api.last(''),some('',''));
  });
});
test('actual Rust character split patterns preserve Unicode scalar and escaped delimiter identity',async()=>{
  await translate("pub fn first(v:&str)->Option<(&str,&str)>{v.split_once('\\u{1F600}')} pub fn last(v:&str)->Option<(&str,&str)>{v.rsplit_once('\\'')} pub fn zero(v:&str)->Option<(&str,&str)>{v.split_once('\\0')}",api=>{
    assert.deepEqual(api.first('a😀b😀c'),some('a','b😀c'));assert.deepEqual(api.last("a'b'c"),some("a'b",'c'));assert.deepEqual(api.zero('a\0b'),some('a','b'));
  });
});
test('checked tuple split products feed if-let and let-else scalar continuations',async()=>{
  await translate("pub fn first(v:&str)->&str{if let Some((left,_))=v.split_once('='){left}else{v}} pub fn last(v:&str)->&str{let Some((_,right))=v.rsplit_once('=') else{return v;};right}",api=>{
    assert.equal(api.first('a=b=c'),'a');assert.equal(api.last('a=b=c'),'c');assert.equal(api.first('no'),'no');assert.equal(api.last('no'),'no');assert.equal(api.last('a='),'');
  });
});
test('standard split results retain intrinsic Option identity under a local same-named type',async()=>{
  const source='enum Option{Missing} pub fn present(v:&str)->bool{v.split_once("=").is_some()}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.present('a=b'),true);assert.equal(api.present('a'),false);});
});
test('split argument order is receiver first and each checked operand is bound once',async()=>{
  await translate('fn receiver()->&\'static str{panic!("receiver first")} fn delimiter()->&\'static str{panic!("delimiter second")} pub fn run()->Option<(&\'static str,&\'static str)>{receiver().split_once(delimiter())}',api=>assert.throws(()=>api.run(),{message:'receiver first'}));
  const result=await translate('pub fn run(v:&str,p:&str)->Option<(&str,&str)>{v.split_once(p)}',api=>assert.deepEqual(api.run('a=b','='),some('a','b')));
  let body=result.ir.items.find(item=>item.name==='run').semantic.checkedIR.body,count=0;
  while(body.k==='let'){count++;body=body.body;}assert.equal(count,2);assert.equal(body.k,'routerTextPattern');assert.equal(body.constEligible,false);
  const tuple=result.ir.items.find(item=>item.name==='run').semantic.dataTypes.find(entry=>entry.tuple);assert.deepEqual(tuple.ctors[0].fields.map(field=>field.rustTypeSyntax),[['&','str'],['&','str']]);
});
test('split preserves source-bearing refusals for unproved ownership, trait or result identities',()=>{
  for(const source of [
    'pub fn bad(v:String)->bool{v.split_once("=").is_some()}',
    'pub fn bad(v:&String)->bool{v.split_once("=").is_some()}',
    'pub fn bad(v:&str)->bool{v.to_string().split_once("=").is_some()}',
    'pub fn bad(v:&str,p:String)->bool{v.split_once(p).is_some()}',
    'pub fn bad(v:&str,p:char)->bool{v.split_once(p).is_some()}',
    'pub fn bad(v:&str)->bool{v.split_once(b\'=\').is_some()}',
    'pub fn bad(v:&str)->bool{v.split_once(|c|true).is_some()}',
    'pub fn bad(v:&str)->Option<(String,String)>{v.split_once("=")}',
    'pub fn bad(v:&str)->Option<(&str,)>{v.split_once("=")}',
    'pub const fn bad(v:&str)->bool{v.split_once("=").is_some()}',
    'enum Local{Some((&\'static str,&\'static str)),None} pub fn bad(v:&str)->Local{v.split_once("=")}',
  ]){const result=translateSource(source);assert.equal(result.ir.items.find(item=>item.name==='bad').status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});
