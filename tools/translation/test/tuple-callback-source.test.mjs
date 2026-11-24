import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const tag=($,fields={})=>Object.freeze({$,...fields});
async function artifacts(result) {
  execFileSync('node',['--input-type=module','--check'],{input:result.javascript,encoding:'utf8',timeout:10000});
  const directory=mkdtempSync(join(tmpdir(),'router-tuple-callbacks-'));
  try {
    writeRuntimeAssets(directory);const path=join(directory,'src/module.ts');
    writeFileSync(join(directory,'src/module.mjs'),result.javascript);writeFileSync(path,result.typescript);
    const javascript=(await import(pathToFileURL(join(directory,'src/module.mjs')).href)).translated;
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',path],{encoding:'utf8',timeout:30000});
    const typescript=(await import(pathToFileURL(join(directory,'src/module.js')).href)).translated;
    return [javascript,typescript];
  }finally{rmSync(directory,{recursive:true,force:true});}
}
const root=new URL('../../../',import.meta.url);
const pin=JSON.parse(readFileSync(new URL('fixtures/tuple-callback-source-provenance.json',import.meta.url),'utf8'));
const hash=source=>createHash('sha256').update(source).digest('hex');

test('original deployment image classifier executes its unchanged tuple callback and nested match patterns',async()=>{
  assert.equal(pin.fullParity,false);assert.equal(pin.runtimeParity,false);assert.equal(pin.rustExecution,false);assert.equal(pin.bodyRewritten,false);
  const source=readFileSync(repositorySourceURL(pin.path,root),'utf8');assert.equal(hash(source),pin.sourceSha256);
  const items=sourceItems(source).filter(item=>item.name===pin.name&&item.term==='fn');assert.equal(items.length,1);
  const item=items[0];assert.deepEqual({start:item.start,end:item.end,unit:'utf16'},pin.span);
  const original=source.slice(item.start,item.end);assert.equal(hash(original),pin.declarationSha256);
  const rustTests=readFileSync(repositorySourceURL(pin.rustTest.path,root),'utf8');assert.equal(hash(rustTests),pin.rustTest.sourceSha256);assert.match(rustTests,new RegExp(`fn ${pin.rustTest.name}\\(`));
  const result=translateProject({entry:pin.path,paths:[pin.path],readSource:()=>original});
  assert.deepEqual(result.meta.moduleDiagnostics,[]);assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.runtimeParity,false);
  const executable=result.meta.executable.filter(item=>item.term==='fn');assert.deepEqual(executable.map(item=>item.name),[pin.name]);assert.deepEqual(executable[0].span,{start:0,end:original.length});assert.equal(hash(original.slice(executable[0].span.start,executable[0].span.end)),pin.declarationSha256);
  const ok=tag('Ok',{field0:null});
  // Literal outcomes follow the actual last-colon and digest-first source
  // branches; deployment policy is neither strengthened nor synthesized here.
  const missing=image=>tag('Err',{field0:image+' names no tag, so it resolves to whatever `latest` points at today'});
  const moving=image=>tag('Err',{field0:image+' is a moving reference; deploy a release tag or a digest so the CLI and the container cannot disagree about the API contract'});
  const cases=[
    ['ghcr.io/link-assistant/router',missing('ghcr.io/link-assistant/router')],
    ['ghcr.io/link-assistant/router:latest',moving('ghcr.io/link-assistant/router:latest')],
    ['ghcr.io/link-assistant/router:main',moving('ghcr.io/link-assistant/router:main')],
    ['image:master',moving('image:master')],['image:edge',moving('image:edge')],['image:nightly',moving('image:nightly')],
    ['ghcr.io/link-assistant/router:1.9.0',ok],['ghcr.io/link-assistant/router@sha256:abc',ok],
    ['',missing('')],[':',ok],['image:latest:1',ok],['@',ok],['image@malformed',ok],['host:5000/image',ok],['image:LATEST',ok],['Ω:😀',ok],
  ];assert.equal(cases.length,pin.literalOutcomes);
  for(const api of await artifacts(result)){
    for(const [input,expected] of cases)assert.deepEqual(api.immutable_ref(input),expected,input);
    assert.throws(()=>api.immutable_ref(3n),TypeError);assert.throws(()=>api.immutable_ref(new String('image:1')),TypeError);
  }
});
