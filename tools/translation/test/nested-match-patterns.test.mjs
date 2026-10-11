import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const none=Object.freeze({$:'None'}),some=field0=>Object.freeze({$:'Some',field0});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function both(result,assertions) {
  assert.deepEqual(result.meta.refused,[]);
  const folder=mkdtempSync(join(tmpdir(),'router-nested-match-'));
  try {
    writeRuntimeAssets(folder);const js=join(folder,'src/fixture.mjs'),ts=join(folder,'src/fixture.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30_000});
    try{execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(folder,'compiled'),ts],{encoding:'utf8',timeout:30_000});}catch(error){throw new Error(error.stdout+error.stderr,{cause:error});}
    const effects=await import(pathToFileURL(join(folder,'runtime/effects.mjs')).href);
    for(const path of [js,join(folder,'compiled/fixture.js')])await assertions((await import(pathToFileURL(path).href)).translated,effects);
  } finally {rmSync(folder,{recursive:true,force:true});}
}
test('nested alternatives retain first-arm priority scalar captures and exhaustive constructors',{timeout:30_000},async()=>{
  const result=project(`pub fn selected(value:Option<&'static str>,capture:u8)->u8{match value {Some("a")=>1,Some("a" | "b" | "|")=>capture,None=>3,Some(tag)=>if tag=="other"{4}else{5}}} pub fn all(value:Option<bool>)->u8{match value{Some(true | false)=>1,None=>0}}`);
  await both(result,api=>{for(const [input,output]of [[some('a'),1n],[some('b'),8n],[some('|'),8n],[none,3n],[some('other'),4n],[some('else'),5n]])assert.equal(api.selected(input,8n),output);assert.equal(api.all(none),0n);assert.equal(api.all(some(true)),1n);assert.equal(api.all(some(false)),1n);});
});
test('constructor products distribute source alternatives and retain identical scalar projections',{timeout:30_000},async()=>{
  const result=project('enum Choice{Pick(u8,u8),Empty} pub fn product(value:Choice)->u8{match value{Choice::Pick(1 | 2,3 | 4)=>9,Choice::Pick(_,_)=>0,Choice::Empty=>1}} pub fn captured(value:Choice,offset:u8)->u8{match value{Choice::Pick(0 | 2,n) | Choice::Pick(3,n)=>n+offset,Choice::Pick(_,_)=>0,Choice::Empty=>1}}');
  await both(result,api=>{for(let a=0;a<4;a++)for(let b=2;b<6;b++){const value=Object.freeze({$:'Pick',field0:BigInt(a),field1:BigInt(b)});assert.equal(api.product(value),(a===1||a===2)&&(b===3||b===4)?9n:0n);assert.equal(api.captured(value,3n),a!==1?BigInt(b)+3n:0n);}assert.equal(api.product(Object.freeze({$:'Empty'})),1n);});
});
test('one computed scrutinee and one selected effectful arm execute in source order',{timeout:30_000},async()=>{
  const result=project('fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()} fn subject(v:u8)->Option<u8>{let ignored=mark("subject");Some(v)} pub fn ordered(v:u8)->u8{match subject(v){Some(1 | 2)=>{let ignored=mark("selected");7},Some(_)=>{let ignored=mark("fallback");8},None=>0}}');
  await both(result,(api,{withEffectCapabilities})=>{for(const [input,expected,arm]of [[1n,7n,'selected'],[2n,7n,'selected'],[3n,8n,'fallback']]){const calls=[],capability={fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}};assert.equal(withEffectCapabilities(capability,()=>api.ordered(input)),expected);assert.deepEqual(calls,['subject',arm]);}});
});
test('immutable parameter and computed-subject guards precede all hostile record reads',{timeout:30_000},async()=>{
  await both(project('pub fn selected(value:Option<u8>)->u8{match value{Some(1 | 2)=>1,Some(_)=>2,None=>0}}'),api=>{
    let reads=0;const target=Object.freeze({$:'Some',field0:1n}),proxy=new Proxy(target,{get(){reads++;throw Error('get');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');},ownKeys(){reads++;throw Error('keys');},getPrototypeOf(){reads++;throw Error('prototype');}});
    assert.throws(()=>api.selected(proxy),TypeError);assert.equal(reads,0);
    const accessor=Object.freeze({$: 'Some',get field0(){reads++;return 1n;}});assert.throws(()=>api.selected(accessor),TypeError);assert.equal(reads,0);
    for(const invalid of [{$:'Some',field0:1n},Object.freeze({$:'Some',field0:256n}),Object.freeze({$:'Other'})])assert.throws(()=>api.selected(invalid),TypeError);
  });
});
test('checked evidence retains original token coordinates alternatives and typed binding plans',()=>{
  const source='pub fn selected(v:Option<u8>)->u8{match v{Some(1u8 | 2u8)=>3,Some(n)=>n,None=>0}} fn main(){}',checked=checkProgram(parseRust(source)),entry=checked.declarations.get('selected');
  const find=node=>node&&typeof node==='object'&&(node.patternControl?.kind==='nested-match-alternatives'?node.patternControl:Object.entries(node).filter(([key])=>key!=='type').map(([,value])=>Array.isArray(value)?value.map(find).find(Boolean):find(value)).find(Boolean));
  const evidence=find(entry.body);assert.ok(evidence);assert.equal(evidence.expandedRows,4);assert.equal(evidence.expansionBound,256);assert.equal(evidence.guards,'refused');
  const first=evidence.rows[0];assert.equal(first.sourcePattern.pattern.args[0].k,'or');assert.equal(first.expandedRows,2);
  const token=first.sourcePattern.tokens.find(token=>token.value==='|');assert.equal(source.slice(token.span.start,token.span.end),'|');assert.equal(first.plan.diagnostics.length,0);assert.equal(evidence.rows[1].plan.bindings[0].name,'n');assert.deepEqual(JSON.parse(JSON.stringify(evidence)),evidence);
});
test('unproved owners binders guards references source identities and exhaustiveness remain refusals',()=>{
  for(const source of [
    'pub fn wrong(v:Option<u8>)->u8{match v{Some(1 | n)=>0,Some(_)=>1,None=>2}}',
    'enum C{A(u8,u8),B} pub fn wrong(v:C)->u8{match v{C::A(0 | 1,n) | C::A(n,0 | 1)=>n,C::A(_,_)=>0,C::B=>1}}',
    'enum C{A(u8),B(u8),D} pub fn wrong(v:C)->u8{match v{C::A(0 | 1)=>1,C::A(n) | C::B(other)=>0,C::D=>2}}',
    'enum C{A(u64),B(usize),D} pub fn wrong(v:C)->u64{match v{C::A(0 | 1)=>1,C::A(n) | C::B(n)=>n,C::D=>2}}',
    'pub fn wrong(v:Option<u8>)->u8{match v{Some(1 | 2) if true=>0,Some(_)=>1,None=>2}}',
    'pub fn wrong(v:Option<u8>)->u8{match v{Some(1 | 2)=>0,None=>1}}',
    'pub fn wrong(v:Option<u8>)->u8{match v{Some(256 | 2)=>0,Some(_)=>1,None=>2}}',
    'pub fn wrong(v:Option<u64>)->u8{match v{Some(1usize | 2usize)=>0,Some(_)=>1,None=>2}}',
    'pub fn wrong(v:&Option<u8>)->u8{match v{Some(1 | 2)=>0,Some(_)=>1,None=>2}}',
    'pub fn wrong(v:Option<u8>)->u8{match v{Some(1 | 2)=>0,&Some(_)=>1,None=>2}}',
    'pub fn wrong(v:Option<u8>)->u8{match v{Some(1 | 2)=>0,x @ Some(_)=>1,None=>2}}',
    'pub fn wrong(v:Option<u8>)->u8{match v{Result::Some(1 | 2)=>0,Some(_)=>1,None=>2}}',
    'enum Fake{Some(u8),None} pub fn wrong(v:Fake)->u8{match v{Option::Some(1 | 2)=>0,Fake::Some(_)=>1,Fake::None=>2}}',
    'const LIMIT:u8=1; pub fn wrong(v:Option<u8>)->u8{match v{Some(LIMIT | 2)=>0,Some(_)=>1,None=>2}}',
    'pub const fn wrong(v:Option<u8>)->u8{match v{Some(1 | 2)=>0,Some(_)=>1,None=>2}}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='wrong'),false,source);assert.ok(result.meta.refused.some(entry=>entry.name==='wrong'),source);}
});
test('cartesian expansion is bounded before code emission',()=>{
  const fields=Array(9).fill('u8').join(','),alternatives=Array(9).fill('0 | 1').join(','),fallback=Array(9).fill('_').join(',');
  const result=project(`enum C{A(${fields})} pub fn wrong(v:C)->u8{match v{C::A(${alternatives})=>1,C::A(${fallback})=>0}}`);
  assert.equal(result.meta.executable.some(entry=>entry.name==='wrong'),false);assert.ok(result.meta.refused.some(entry=>/expansion bound/u.test(entry.message)));
  for(const [pattern,message]of [
    ['('.repeat(130)+'0 | 1'+')'.repeat(130),'depth bound'],
    [Array(2100).fill('0').join(' | '),'token bound'],
  ]) {
    const result=project(`pub fn wrong(v:Option<u8>)->u8{match v{Some(${pattern})=>1,Some(_)=>0,None=>2}}`);
    assert.equal(result.meta.executable.some(entry=>entry.name==='wrong'),false);assert.ok(result.meta.refused.some(entry=>entry.message.includes(message)),JSON.stringify(result.meta.refused));
  }
});
