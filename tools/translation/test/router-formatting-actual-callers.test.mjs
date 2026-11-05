import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {translateProject} from '../project.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const profile=new URL('../source-profiles/router-formatting-adoption/complete-uri-module-proposal.json.gz',import.meta.url);
const nativeOracleSuffix='\n#[cfg(test)]\n#[path = "codex_remote_control/translation_tests.rs"]\nmod uri_translation_tests;\n';
function proposal(){
  const packed=readFileSync(profile);assert.equal(hash(packed),'0749fde232e95ce2937a2c58b93e6f42a0c95b070fc7ca36234032bb87a529b3');
  const wire=gunzipSync(packed,{maxOutputLength:2*1024*1024});assert.equal(hash(wire),'618d010bd5cbd43a8c5026769cc94821ae81f4dfccbef7abe2553e7160e1cb41');
  const row=JSON.parse(wire);assert.equal(row.path,'rust/src/codex_remote_control.rs');assert.equal(row.status,'proposed');
  assert.equal(row.proposal.before.sha256,hash(row.proposal.before.source));assert.equal(row.proposal.after.sha256,hash(row.proposal.after.source));
  return row.proposal;
}
function files(module){
  const paths=['rust/src/lib.rs','rust/src/operation_output.rs','rust/src/translation_core.rs'];
  function visit(path){for(const name of readdirSync(new URL(path+'/',root)).sort()){
    const child=path+'/'+name,stat=lstatSync(new URL(child,root));assert.equal(stat.isSymbolicLink(),false);
    if(stat.isDirectory())visit(child);else if(child.endsWith('.rs'))paths.push(child);
  }}
  visit('rust/src/translation_core');
  return {...Object.fromEntries(paths.map(path=>[path,readFileSync(new URL(path,root),'utf8')])),
    'rust/src/codex_remote_control.rs':module};
}
function retain(name,value){
  const directory=process.env.ROUTER_FORMATTING_CALLER_VECTOR_DIR;if(!directory)return;
  mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json.gz'),gzipSync(JSON.stringify(value),{level:1}));
}

test('actual whole URI module retains both concrete documents and every source substitution inverse',{timeout:60000},()=>{
  const row=proposal();
  for(const endpoint of [row.before,row.after])assert.equal(transportConcreteSyntaxMeta(endpoint.meta).source,endpoint.source);
  assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(row.executableAdmission,false);
  let original=row.after.source;
  for(const part of [...row.mapping].reverse())if(part.kind==='substitution'){
    assert.equal(original.slice(...part.after),part.replacement);
    original=original.slice(0,part.after[0])+part.expected+original.slice(part.after[1]);
  }
  assert.equal(original,row.before.source);
  assert.equal(readFileSync(new URL('rust/src/codex_remote_control.rs',root),'utf8'),row.after.source+nativeOracleSuffix);
});

test('actual URI helper becomes executable after bulk adoption and passes independent JS and strict TypeScript vectors',{timeout:60000},async()=>{
  const row=proposal(),original=files(row.before.source),current=files(readFileSync(new URL('rust/src/codex_remote_control.rs',root),'utf8'));
  const build=inputs=>translateProject({entry:'rust/src/lib.rs',paths:Object.keys(inputs),readSource:path=>inputs[path]});
  const before=build(original),after=build(current),name='codex_remote_control.uri_path_and_query';
  retain('complete-original-and-current-modules',{original,current,before,after,scope:'partial receiving with complete real root and selected module/core; other crate modules remain unresolved'});
  assert.equal(before.meta.executable.some(row=>row.name===name),false);
  assert.ok(before.meta.refused.some(row=>row.name==='uri_path_and_query'&&row.message.includes('format!')));
  assert.equal(after.meta.executable.some(row=>row.name===name),true);
  const cases=JSON.parse(readFileSync(new URL('parity/fixtures/translation/uri-path-query.json',root),'utf8'));
  assert.equal(cases.length,8);
  await verifyTypedTargets(after,api=>{for(const [path,query,expected]of cases)assert.equal(api[name](path,query),expected);},{childTimeoutMs:30000});
  assert.equal(after.meta.runtimeParity,false);assert.ok(after.meta.refused.length>0);
});
