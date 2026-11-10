// Complete source DATA, including every before/middle/after CST and inverse.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {prepareSharedF64MethodReceivers} from '../../tools/translation/prepare-shared-f64-method-receivers.mjs';
const path='ci-logs/issue-784-restart-2/shared-f64-complete-source-proposal.json.gz';
const hash=value=>createHash('sha256').update(value).digest('hex');
const checks=[];
function native(engine,args,source,expected){
 const result=spawnSync(engine,args,{input:source,encoding:'utf8',maxBuffer:1048576});
 assert.equal(result.error,undefined);assert.equal(result.signal,null);
 assert.equal(result.status===0,expected,result.stderr);
 return {engine,args,sourceSha256:hash(source),exitCode:result.status,stdout:result.stdout,stderr:result.stderr};
}
const engines=[[process.execPath,['--input-type=module','--check']],
 ['bun',['-e',"new Bun.Transpiler({loader:'js',target:'bun'}).scan(await Bun.stdin.text())"]]];
for(const [engine,args]of engines){
 checks.push(native(engine,args,'const duplicate=1;const duplicate=2;export {duplicate};',false));
 checks.push(native(engine,args,'import "./absent-no-syntax-resolution.mjs";throw new Error("must not execute");export {};',true));
}
const plan=prepareSharedF64MethodReceivers();
for(const row of plan.files){
 assert.equal(row.current,row.after);
 for(const source of new Set([row.before,row.middle,row.after]))for(const [engine,args]of engines){
  checks.push({...native(engine,args,source,true),path:row.path});
 }
}
const observation={schema:'complete-shared-f64-receiver-source-observation-v1',plan,nativeSyntax:checks,
 node:process.versions,bun:spawnSync('bun',['--version'],{encoding:'utf8'}).stdout.trim(),
 completeReceivingRepositoryQualified:false,rustExecuted:false,productionExecutableGain:0};
const raw=Buffer.from(JSON.stringify(observation));assert.ok(raw.length<64*1024*1024);
const encoded=gzipSync(raw,{level:6});writeFileSync(path,encoded,{flag:'wx'});
const reread=gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024});
assert.ok(reread.equals(raw));assert.deepEqual(JSON.parse(reread).plan.files.map(row=>row.path),plan.files.map(row=>row.path));
console.log(JSON.stringify({path,bytes:encoded.length,sha256:hash(encoded),decodedBytes:raw.length,
 decodedSha256:hash(raw),files:plan.files.length,nativeSyntaxChecks:checks.length,typescriptVersion:plan.typescriptVersion,
 sourceAuthority:false,semanticAuthority:false,receivingQualified:false,productionExecutableGain:0}));
