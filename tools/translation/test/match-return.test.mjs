import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {translateSource} from '../translate.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const tag=($,fields={})=>Object.freeze({$,...fields}),some=field0=>tag('Some',{field0}),none=tag('None');
async function artifacts(result) {
  execFileSync('node',['--input-type=module','--check'],{input:result.javascript,encoding:'utf8',timeout:10000});
  const directory=mkdtempSync(join(tmpdir(),'router-match-return-'));
  try {
    writeRuntimeAssets(directory);const path=join(directory,'src/module.ts');
    writeFileSync(join(directory,'src/module.mjs'),result.javascript);writeFileSync(path,result.typescript);
    const javascript=(await import(pathToFileURL(join(directory,'src/module.mjs')).href)).translated;
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',path],{encoding:'utf8',timeout:30000});
    const typescript=(await import(pathToFileURL(join(directory,'src/module.js')).href)).translated;
    const {withEffectCapabilities}=await import(pathToFileURL(join(directory,'runtime/effects.mjs')).href);
    return [javascript,typescript].map(api=>({...api,withEffectCapabilities}));
  }finally{rmSync(directory,{recursive:true,force:true});}
}
function compiled(source) {
  const checked=checkProgram(parseRust(source+'\nfn main() {}'));
  const serialized=serializeProgram(checked);assert.equal(serializeProgram(parseProgram(serialized)),serialized);
  const result=translateSource(source,'src/module.rs');
  assert.equal(result.ir.counts.carried,0);assert.equal(result.ir.runtimeParity,false);
  return {result,checked};
}
const refuse=source=>{
  const result=translateSource(source,'src/module.rs');
  assert.ok(result.ir.items.some(item=>item.name==='bad'&&item.status==='carried'),source);
  assert.equal(result.ir.items.some(item=>item.name==='bad'&&item.status==='executable'),false,source);
};

test('return-valued scalar match initializers exit the real function before its continuation',async()=>{
  const source='pub fn pick(word:&str)->Option<bool>{let flag=match word{"yes"=>true,"no"=>false,_=>return None};Some(flag)} pub fn first(word:&str)->Option<bool>{let flag=match word{"stop"=>return None,"no"=>false,_=>true};Some(flag)} pub fn tail(word:&str)->Option<bool>{match word{"stop"=>return None,_=>Some(true)}}';
  const {result,checked}=compiled(source),pick=checked.declarations.get('pick').body;
  assert.equal(pick.k,'let');assert.equal(pick.value.k,'routerControlInitializer');assert.equal(pick.value.patternControl.kind,'match-return');
  assert.ok(result.javascript.includes('ml_control_exit_'));assert.equal(result.javascript.includes('(() =>'),false);
  for(const api of await artifacts(result)) {
    assert.deepEqual(api.pick('yes'),some(true));assert.deepEqual(api.pick('no'),some(false));assert.deepEqual(api.pick('other'),none);
    assert.deepEqual(api.first('stop'),none);assert.deepEqual(api.first('no'),some(false));assert.deepEqual(api.first('other'),some(true));
    assert.deepEqual(api.tail('stop'),none);assert.deepEqual(api.tail('other'),some(true));
  }
});

test('initializer branch locals stay scoped while continuation bindings preserve original owners',async()=>{
  const source='pub fn scoped(word:&str)->Option<bool>{let outer=true;let local=match word{"yes"=>{let outer=false;outer},_=>return None};Some(outer)} pub fn bind(value:Option<bool>,outer:bool)->Option<bool>{let local:bool=match value{Some(outer)=>outer,None=>return None};Some(outer)} pub fn shadow(word:&str,flag:bool)->Option<bool>{let flag=match word{"yes"=>true,_=>return None};Some(flag)}';
  const {result}=compiled(source);
  for(const api of await artifacts(result)) {
    assert.deepEqual(api.scoped('yes'),some(true));assert.deepEqual(api.scoped('other'),none);
    assert.deepEqual(api.bind(some(false),true),some(true));assert.deepEqual(api.bind(some(true),false),some(false));assert.deepEqual(api.bind(none,true),none);
    assert.deepEqual(api.shadow('yes',false),some(true));assert.deepEqual(api.shadow('other',true),none);
  }
});

test('a returned match arm skips later effects while a normal arm preserves source order',async()=>{
  const source='fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()} fn subject(word:&str)->&\'static str{let ignored=mark("subject");if word=="stop"{"stop"}else{"go"}} pub fn pick(word:&str)->Option<bool>{let flag=match subject(word){"stop"=>return None,_=>{let ignored=mark("arm");true}};let ignored=mark("continuation");Some(flag)}';
  const {result}=compiled(source);
  for(const api of await artifacts(result))for(const [input,expected,callsExpected]of [['stop',none,['subject']],['go',some(true),['subject','arm','continuation']]]) {
    const calls=[],capability={fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}};
    assert.deepEqual(api.withEffectCapabilities(capability,()=>api.pick(input)),expected);assert.deepEqual(calls,callsExpected);
  }
});

test('control-valued match keeps a nontrivial subject once and guards algebraic inputs before projections',async()=>{
  const {result,checked}=compiled('pub fn trim(word:&str)->Option<bool>{let flag=match word.trim(){"yes"=>true,_=>return None};Some(flag)} pub fn algebraic(value:Option<bool>)->Option<bool>{let flag:bool=match value{Some(flag)=>flag,None=>return None};Some(flag)}');
  const flow=checked.declarations.get('trim').body.value.value;assert.equal(flow.k,'let');assert.equal(flow.value.k,'routerStringOperation');assert.equal(flow.value.op,'trim');
  const early=result.javascript.indexOf('ml_pattern_immutable(value);'),layout=result.javascript.indexOf('ml_validate_rust_value(value,');assert.ok(early>=0&&layout>early);
  for(const api of await artifacts(result)) {
    assert.deepEqual(api.trim(' yes '),some(true));assert.deepEqual(api.trim('no'),none);
    assert.deepEqual(api.algebraic(some(false)),some(false));assert.deepEqual(api.algebraic(none),none);
    let reads=0;const proxy=new Proxy(some(true),{get(){reads++;},ownKeys(){reads++;return[];},getOwnPropertyDescriptor(){reads++;},getPrototypeOf(){reads++;return null;}});
    assert.throws(()=>api.algebraic(proxy),TypeError);assert.equal(reads,0);
  }
});

test('unproven return-valued expressions and join ownership remain explicit refusals',()=>{
  for(const source of [
    'fn bad(word:&str)->Option<bool>{let flag=match word{"yes"=>true,"no"=>false};Some(flag)}',
    'fn bad(word:&str)->Option<bool>{let flag=match word{"yes"=>true,_=>return Some(1)};Some(flag)}',
    'fn consume(flag:bool)->bool{flag} fn bad(word:&str)->Option<bool>{Some(consume(match word{"yes"=>true,_=>return None}))}',
    'fn bad(word:&str)->Option<bool>{Some(true&&(match word{"yes"=>true,_=>return None}))}',
    'fn bad(word:&str)->Option<bool>{match word{"yes"=>true,_=>return None};Some(true)}',
    'fn bad(word:&str)->Option<bool>{let flag=match (return None){_=>true};Some(flag)}',
    'fn bad(word:&str)->Option<bool>{let mut flag=match word{"yes"=>true,_=>return None};Some(flag)}',
    'fn bad(word:&str)->Option<bool>{let flag=match word{"yes"=>{if true{return None;}false},_=>true};Some(flag)}',
    'fn bad(word:&str)->Option<bool>{let flag=match word{"yes"=>{break;true},_=>return None};Some(flag)}',
    'fn bad(word:&str)->Option<bool>{let flag=match word{"yes"=>return None,_=>return None};Some(true)}',
    'fn bad(word:&str)->Option<bool>{let pair=match word{"yes"=>Some(true),_=>return None};Some(true)}',
    'fn bad(value:&Option<bool>)->Option<bool>{let flag:bool=match value{Some(flag)=>flag,None=>return None};Some(flag)}',
    'fn bad(word:&str)->Option<bool>{let flag=match word{"yes"=>true,_=>return None};Some(missing)}',
  ])refuse(source);
});
