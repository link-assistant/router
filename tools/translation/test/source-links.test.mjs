import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {copyMetadata,snapshotMap,bindCheckedSourceLinks,linkedSourceContext} from '../extensions/source-links.mjs';
import {translateSource} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function both(result,assertions) {
  const folder=mkdtempSync(join(tmpdir(),'router-constant-source-'));
  try {
    writeRuntimeAssets(folder);const js=join(folder,'src/module.mjs'),ts=join(folder,'src/module.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30000});
    let command=process.env.ROUTER_TRANSLATION_TSC,prefix=[];
    if(!command){try{prefix=[createRequire(new URL('../../../packages/javascript/package.json',import.meta.url)).resolve('typescript/bin/tsc')];command=process.execPath;}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;command='tsc';}}
    execFileSync(command,[...prefix,'--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',ts],{encoding:'utf8',timeout:30000});
    for(const path of [js,join(folder,'src/module.js')])await assertions((await import(pathToFileURL(path).href)).translated);
  }finally{rmSync(folder,{recursive:true,force:true});}
}
test('direct parse/check captures original source without fabricated full checked spans',()=>{
  const source='// é 😀\npub const VALUE:u8=7u8; pub const fn add(v:u8)->u8{v+1} fn main(){}';
  const checked=checkProgram(parseRust(source)),entry=checked.declarations.get('VALUE'),proof=entry.constantEvaluationProof;
  assert.equal(proof.sourceLinksVerified,true);assert.ok(Object.isFrozen(proof));
  const link=proof.resolution[0].source;assert.equal(link.sourceSha256,hash(source));
  assert.equal(source.slice(link.declarationSpan.start,link.declarationSpan.end),'pub const VALUE:u8=7u8;');
  assert.equal(source.slice(link.bodySpan.start,link.bodySpan.end),'7u8');
  assert.equal(link.bodySha256,hash('7u8'));assert.equal(checked.declarations.get('add').constantEvaluationProof,undefined);
  assert.equal(serializeProgram(parseProgram(serializeProgram(checked))),serializeProgram(checked));
  assert.ok(Object.isFrozen(parseProgram(serializeProgram(checked)).declarations.get('VALUE').constantEvaluationProof));
  const unlinked=JSON.parse(JSON.stringify(parseRust('const VALUE:u8=7;fn main(){}')));
  assert.throws(()=>checkProgram(unlinked),/original declaration|source association/);
  const changed=parseRust('const VALUE:u8=7;fn main(){}');changed.items[0].body.value='8';assert.throws(()=>checkProgram(changed),/changed after source capture/);
  assert.throws(()=>bindCheckedSourceLinks(checked,new Map(),{}),/private parser source context/);
  let reads=0;const options=Object.defineProperty({},'targetProfile',{enumerable:true,get(){reads++;return {};}});assert.throws(()=>bindCheckedSourceLinks(checked,new Map(),options),/private parser source context/);assert.equal(reads,0);
  const context=linkedSourceContext(parseRust('const VALUE:u8=7;fn main(){}'));assert.ok(Object.isFrozen(context));assert.equal(context instanceof Map,false);
  assert.throws(()=>bindCheckedSourceLinks(checked,{...context},{}),/private parser source context/);
  assert.throws(()=>bindCheckedSourceLinks({...checked},context,{}),/genuine checked parser invocation/);
});
test('constants reject overflow and selected panic; concrete const calls preserve unselected branches',{timeout:30000},async()=>{
  const source='const fn pick(b:bool,v:u8)->u8{if b{v}else{v+1}} pub const GOOD:u8=pick(true,255u8); pub const MIN:i8=-128i8; pub fn read()->u8{GOOD}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await both(result,api=>{assert.equal(api.GOOD,255n);assert.equal(api.MIN,-128n);assert.equal(api.read(),255n);});
  for(const initializer of ['255u8+1u8','1u8/0u8','pick(false,255u8)','-(-128i8)']){
    const type=initializer.startsWith('-')?'i8':'u8',result=project(`const fn pick(b:bool,v:u8)->u8{if b{v}else{v+1}} const BAD:${type}=${initializer};pub fn read()->${type}{BAD}`);
    assert.ok(result.meta.refused.some(entry=>entry.name==='BAD'&&/constant evaluation/.test(entry.message)));
    assert.ok(result.meta.refused.some(entry=>entry.name==='read'));assert.equal(result.meta.executable.some(entry=>entry.name==='BAD'||entry.name==='read'),false);
  }
  assert.throws(()=>checkProgram(parseRust('const BAD:i8=128i8;fn main(){}')));
});
test('standalone bulk links refer to full original file rather than synthetic main',{timeout:30000},async()=>{
  const source='// λ\npub const VALUE:usize=16*1024*1024;pub fn read()->usize{VALUE}';
  const result=translateSource(source,'src/original.rs');assert.equal(result.ir.counts.carried,0);
  const item=result.ir.items.find(item=>item.name==='VALUE'),proof=item.semantic.checkedIR.constantEvaluationProof;
  assert.equal(proof.resolution[0].source.sourcePath,'src/original.rs');assert.equal(proof.resolution[0].source.sourceSha256,hash(source));
  await both(result,api=>{assert.equal(api.VALUE,16777216n);assert.equal(api.read(),16777216n);});
});
test('project global offsets retain local UTF-16 ranges and original resolved callees',{timeout:30000},async()=>{
  const files=new Map([['src/lib.rs','// 😀\nmod helper;pub const ROOT:u8=helper::add(6u8);'],['src/helper.rs','// é\npub const fn add(value:u8)->u8{value+1}']]);
  const result=translateProject({entry:'src/lib.rs',paths:[...files.keys()],readSource:path=>files.get(path)});assert.deepEqual(result.meta.refused,[]);
  const proof=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('ROOT').constantEvaluationProof,callee=proof.resolution.find(entry=>entry.name==='helper.add').source;
  assert.equal(callee.sourcePath,'src/helper.rs');assert.equal(callee.sourceSha256,hash(files.get('src/helper.rs')));assert.equal(callee.sourceOffset,files.get('src/lib.rs').length+1);
  assert.equal(files.get('src/helper.rs').slice(callee.bodySpan.start,callee.bodySpan.end),'{value+1}');
  await both(result,api=>assert.equal(api.ROOT,7n));
});
test('original STACK_BYTES and MAX_RETRY_AFTER receive independently pinned source proofs',{timeout:30000},async()=>{
  for(const pin of [
    {path:'src/entrypoint.rs',name:'STACK_BYTES',sourceSha:'39268a95729f7c2f4004ce47761afb31369ddb600ff3c63b3fc890868f6aa85e',span:[677,721],body:[704,720],declarationSha:'0be2725212bd633b4ba92f7ec53651d19475018d26014bf2960896808d6fe8d1',assert:api=>assert.equal(api.STACK_BYTES,16777216n)},
    {path:'src/request_routing.rs',name:'MAX_RETRY_AFTER',sourceSha:'45ea38cb6ad56934e2534595a77d2442e5bfbfd7c4376b45afc9d3e199963134',span:[169,241],body:[207,240],declarationSha:'b783afd2f14624b09072b47aae14903b6c4b416daf3234657cb7af9fedc14f12',assert:api=>assert.deepEqual(api.MAX_RETRY_AFTER,{$:'Duration',secs:86400n,nanos:0n})},
  ]){
    const source=readFileSync(new URL('../../../'+pin.path,import.meta.url),'utf8');assert.equal(hash(source),pin.sourceSha);
    const result=translateProject({entry:pin.path,paths:[pin.path],readSource:()=>source}),entry=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get(pin.name);
    assert.ok(entry,JSON.stringify(result.meta.refused));const link=entry.constantEvaluationProof.resolution.find(entry=>entry.name===pin.name).source;
    assert.deepEqual(link.declarationSpan,{start:pin.span[0],end:pin.span[1]});assert.deepEqual(link.bodySpan,{start:pin.body[0],end:pin.body[1]});assert.equal(link.sourceSha256,pin.sourceSha);assert.equal(link.declarationSha256,pin.declarationSha);
    await both(result,pin.assert);
  }
});
test('metadata normalization invokes no getters, proxy traps or overridden Map methods',()=>{
  let reads=0;const hidden={};Object.defineProperty(hidden,'secret',{get(){reads++;return 'secret';}});assert.throws(()=>copyMetadata(hidden),/hidden metadata|accessor/);
  const proxy=new Proxy({}, {ownKeys(){reads++;return [];},getPrototypeOf(){reads++;return Object.prototype;}});assert.throws(()=>copyMetadata(proxy),/acyclic data/);
  const map=new Map();Object.defineProperty(map,'get',{value:()=>{reads++;return 'override';}});assert.throws(()=>snapshotMap(map),/unmodified native Map/);
  assert.throws(()=>copyMetadata([,]),/holes|hole/);assert.throws(()=>copyMetadata({[Symbol('evidence')]:1}),/symbol/);assert.equal(reads,0);
});
