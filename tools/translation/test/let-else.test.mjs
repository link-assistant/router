import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {translateSource} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const tag=($,fields={})=>Object.freeze({$,...fields}),some=field0=>tag('Some',{field0}),none=tag('None');
const hash=text=>createHash('sha256').update(text).digest('hex');
async function artifacts(result) {
  execFileSync('node',['--input-type=module','--check'],{input:result.javascript,encoding:'utf8',timeout:10000});
  const directory=mkdtempSync(join(tmpdir(),'router-let-else-'));
  try {
    writeRuntimeAssets(directory);const path=join(directory,'src/module.ts');
    writeFileSync(join(directory,'src/module.mjs'),result.javascript);writeFileSync(path,result.typescript);
    const javascript=(await import(pathToFileURL(join(directory,'src/module.mjs')).href)).translated;
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',path],{encoding:'utf8',timeout:30000});
    const typescript=(await import(pathToFileURL(join(directory,'src/module.js')).href)).translated;
    return [javascript,typescript];
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

test('let-else binds only the success continuation and preserves scalar shadowing and chains',async()=>{
  const source='pub fn pick(value:Option<u8>,v:u8)->u8{let Some(v)=value else{return v;};v} pub fn chain(a:Option<u8>,b:Option<u8>)->u8{let Some(x)=a else{return 20;};let Some(y)=b else{return x;};x+y} pub fn text(value:Option<&str>)->bool{let Some(text)=value else{return false;};text=="Ω"} pub fn ordinary(flag:bool)->u8{let mut n:u8=if flag{1}else{2};n+=1;n}';
  const {result,checked}=compiled(source);
  assert.equal(checked.declarations.get('pick').body.patternControl.kind,'let-else');
  assert.equal(checked.declarations.get('pick').body.patternControl.divergence,'checked-exit');
  for(const api of await artifacts(result)) {
    assert.equal(api.pick(some(4n),9n),4n);assert.equal(api.pick(none,9n),9n);
    assert.equal(api.chain(none,some(3n)),20n);assert.equal(api.chain(some(4n),none),4n);assert.equal(api.chain(some(4n),some(3n)),7n);
    assert.equal(api.text(none),false);assert.equal(api.text(some('Ω')),true);assert.equal(api.text(some('ω')),false);
    assert.equal(api.ordinary(true),2n);assert.equal(api.ordinary(false),3n);
  }
  refuse('fn bad(value:Option<u8>)->u8{let Some(v)=value else{return v;};v}');
  refuse('fn bad(value:Option<u8>)->u8{let Some(v)=value else{return 0;};v=2;v}');
});

test('let-else proves all failure paths diverge and leaves branch locals out of scope',async()=>{
  const {result}=compiled('pub fn branches(value:Option<u8>,flag:bool)->u8{let Some(v)=value else{let fallback:u8=6;if flag{return fallback;}else{return 8;}};v} pub fn after(value:Option<u8>,flag:bool)->u8{let Some(v)=value else{if flag{return 6;}return 8;};v}');
  for(const api of await artifacts(result)) {
    assert.equal(api.branches(some(3n),false),3n);assert.equal(api.branches(none,true),6n);assert.equal(api.branches(none,false),8n);
    assert.equal(api.after(some(3n),true),3n);assert.equal(api.after(none,true),6n);assert.equal(api.after(none,false),8n);
  }
  for(const source of [
    'fn bad(value:Option<u8>)->u8{let Some(v)=value else{};v}',
    'fn bad(value:Option<u8>,flag:bool)->u8{let Some(v)=value else{if flag{return 1;}};v}',
    'fn bad(value:Option<u8>)->u8{let Some(v)=value else{while true{break;}};v}',
    'fn bad(value:Option<u8>)->u8{let Some(v)=value else{loop{break;}};v}',
    'fn bad(value:Option<u8>)->u8{let Some(v)=value else{let only_else:u8=1;return only_else;};only_else}',
    'fn bad(value:Option<u8>)->u8{let Some(v)=value else{break;};v}',
    'fn bad(value:Option<u8>)->u8{let Some(v)=value else{continue;};v}',
  ])refuse(source);
});

test('failure break and continue stay in their surrounding checked loop',async()=>{
  const {result}=compiled('pub fn loops(value:Option<u8>)->u8{let mut n:u8=0;while n<3{n+=1;let Some(v)=value else{continue;};let 2=v else{break;};}n}');
  assert.ok(result.javascript.includes('continue;'));assert.ok(result.javascript.includes('break;'));
  for(const api of await artifacts(result)){assert.equal(api.loops(none),3n);assert.equal(api.loops(some(2n)),3n);assert.equal(api.loops(some(1n)),1n);}
});

test('actual generic aliases and local named layouts retain constructor provenance',async()=>{
  const source='use std::option::Option::{Some as Present,None as Absent}; use std::result::Result as R; enum Local { A { field0:u8 }, Empty } pub fn option(value:Option<Option<u8>>)->u8{let Present(Present(v))=value else{return 7;};v} pub fn result(value:R<u8,bool>)->u8{let R::Ok(v)=value else{return 8;};v} pub fn local(value:Local)->u8{let Local::A {field0:v}=value else{return 9;};v} pub fn absent(value:Option<u8>)->bool{let Absent=value else{return false;};true}';
  const result=translateProject({entry:'src/module.rs',paths:['src/module.rs'],readSource:()=>source});
  assert.deepEqual(result.meta.refused,[]);assert.deepEqual(result.meta.moduleDiagnostics,[]);assert.equal(result.meta.runtimeParity,false);
  for(const api of await artifacts(result)) {
    assert.equal(api.option(some(some(4n))),4n);assert.equal(api.option(some(none)),7n);assert.equal(api.option(none),7n);
    assert.equal(api.result(tag('Ok',{field0:5n})),5n);assert.equal(api.result(tag('Err',{field0:true})),8n);
    assert.equal(api.local(tag('A',{field0:6n})),6n);assert.equal(api.local(tag('Empty')),9n);
    assert.equal(api.absent(none),true);assert.equal(api.absent(some(2n)),false);
  }
  for(const source of [
    'fn bad(value:Option<u8>)->u8{let Some {field0:v}=value else{return 0;};v}',
    'enum Local{Some(u8),None} fn bad(value:Local)->u8{let Some(v)=value else{return 0;};v}',
    'use std::result::Result::Ok as Present; fn bad(value:Option<u8>)->u8{let Present(v)=value else{return 0;};v}',
    'use unknown::*; fn bad(value:Option<u8>)->u8{let Some(v)=value else{return 0;};v}',
  ])refuse(source);
});

test('let-else honors source grammar and keeps unresolved ownership and never-type obligations explicit',async()=>{
  const {result}=compiled('pub fn parenthesized(value:Option<u8>)->u8{let (Some(v)|Some(v))=(if true{value}else{None}) else{return 9;};v} pub fn boolean(a:bool,b:bool)->u8{let true=(a&&b) else{return 3;};4}');
  for(const api of await artifacts(result)){assert.equal(api.parenthesized(some(5n)),5n);assert.equal(api.parenthesized(none),9n);assert.equal(api.boolean(true,true),4n);assert.equal(api.boolean(false,true),3n);}
  for(const source of [
    'fn bad(value:Option<u8>)->u8{let Some(v)|Some(v)=value else{return 0;};v}',
    'fn bad(value:Option<u8>)->u8{let Some(v)=if true{value}else{None} else{return 0;};v}',
    'fn bad(a:bool,b:bool)->u8{let true=a&&b else{return 0;};1}',
    'fn bad(a:bool,b:bool)->u8{let true=(a)||b else{return 0;};1}',
    'fn bad(value:Option<Option<u8>>)->u8{let Some(v)=value else{return 0;};1}',
    'fn bad(value:Option<String>)->u8{let Some(v)=value else{return 0;};1}',
    'fn bad(value:Option<&u8>)->u8{let Some(v)=value else{return 0;};1}',
    'fn bad(value:Option<u8>)->u8{let Some(mut v)=value else{return 0;};v}',
    'fn bad(value:Option<u8>)->u8{let Some(ref v)=value else{return 0;};1}',
    'fn bad(value:Option<u8>)->u8{let all @ Some(v)=value else{return 0;};v}',
    'fn bad(value:Option<u8>)->u8{let Some::<u8>(v)=value else{return 0;};v}',
    'fn bad(value:Option<u8>)->u8{let Some(v):Option<u8>=value else{return 0;};v}',
    'fn bad(value:Option<u8>)->u8{let Some(v)=value else{panic!("missing")};v}',
  ])refuse(source);
});

test('highest Host let-else guard rejects hostile subjects before any observable inspection',async()=>{
  const {result}=compiled('pub fn pick(value:Option<u8>)->u8{let Some(v)=value else{return 8;};v}');
  assert.ok(result.javascript.indexOf('ml_pattern_immutable(value);')<result.javascript.indexOf('ml_validate_rust_value(value,'));
  for(const api of await artifacts(result)) {
    assert.equal(api.pick(some(255n)),255n);assert.equal(api.pick(none),8n);
    assert.throws(()=>api.pick({$:'Some',field0:1n}),TypeError);
    let reads=0;
    const proxy=new Proxy(some(1n),{get(){reads++;},ownKeys(){reads++;return[];},getOwnPropertyDescriptor(){reads++;},getPrototypeOf(){reads++;return null;}});
    assert.throws(()=>api.pick(proxy),TypeError);assert.equal(reads,0);
    const getter=Object.freeze(Object.defineProperty({},'$',{get(){reads++;return 'Some';}}));
    assert.throws(()=>api.pick(getter),TypeError);assert.equal(reads,0);
  }
});

test('unchanged production let-else preserves source provenance while its UTF-8 host obligation stays refused',()=>{
  const evidence=JSON.parse(readFileSync(new URL('./fixtures/let-else-source-provenance.json',import.meta.url),'utf8'));
  assert.equal(evidence.newExecutedProductionBodies,0);assert.equal(evidence.runtimeParity,false);assert.equal(evidence.fullParity,false);
  const path='src/request_log/stream_outcome.rs',source=readFileSync(repositorySourceURL(path,new URL('../../../',import.meta.url)),'utf8');
  assert.equal(hash(source),'92452a28069d0b7055a62026b34c241153c21059c18943df97e165790b6f1f29');
  const item=sourceItems(source).find(item=>item.name==='frame_terminates_stream');
  assert.deepEqual({start:item.start,end:item.end},{start:7460,end:7791});
  const original=source.slice(item.start,item.end);assert.equal(hash(original),'dced525fc9817d647f69994a780db7029c518d5363f11a0085f12404bb426af0');
  const pin=evidence.sourceObligations[0];assert.equal(pin.path,path);assert.equal(pin.name,item.name);
  assert.equal(pin.sourceSha256,hash(source));assert.equal(pin.declarationSha256,hash(original));assert.equal(pin.bodyRewritten,false);
  assert.deepEqual(pin.span,{start:item.start,end:item.end,unit:'utf16'});
  const result=translateSource(original,path),record=result.ir.items.find(item=>item.name==='frame_terminates_stream');
  assert.equal(record.source,original);assert.equal(record.status,'carried');assert.match(record.diagnostic.message,/std::str::from_utf8/u);
  assert.equal(result.ir.counts.executableFunctions,0);assert.equal(result.ir.runtimeParity,false);
});
