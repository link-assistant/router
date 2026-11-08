import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,chmod,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {runBunReverseShard,discoverReverseBunFiles} from '../run-bun-reverse-shard.mjs';
import {runBunReverseFiles} from '../run-bun-reverse-files.mjs';
import {proposeBunReverseShard,REVERSE_SHARD_LANGUAGE_RULES,REVERSE_SHARD_REPOSITORY_RULES} from '../prepare-bun-reverse-shard.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
const directory='tools/translation/js-to-rust/test';
async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'router-bun-reverse-shard-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,directory),{recursive:true});await mkdir(join(root,'src'));
 await writeFile(join(root,'src/lib.rs'),'pub fn original()->u8{1}\n');
 const files=Array.from({length:4},(_,at)=>directory+'/'+at+'.test.mjs');
 for(const file of files)await writeFile(join(root,file),'{}');
 const bun=join(root,'fake-bun.mjs');
 await writeFile(bun,`#!/usr/bin/env node
import{readFileSync,writeFileSync}from'node:fs';const args=process.argv.slice(2);if(args.length!==2||args[0]!=='test'||!args[1].startsWith('./'))throw Error('Changed original whole-file command');const control=JSON.parse(readFileSync(args[1],'utf8'));console.log(JSON.stringify({pid:process.pid,args}));if(control.mutate)writeFileSync(control.mutate,'changed');if(control.add)writeFileSync(control.add,'{}');await new Promise(r=>setTimeout(r,control.delay??0));if(control.error)console.error(control.error);process.exit(control.exit??0);
`);await chmod(bun,0o755);
 let attempt=0;
 const run=(index,count=2,extra={})=>runBunReverseShard({root,bun,outputDirectory:join(root,'node_modules','evidence-'+attempt++),index,count,...extra});
 return {root,files,bun,run,put:(at,value)=>writeFile(join(root,files[at]),JSON.stringify(value))};
}
test('reverse shard source retains both complete CST phases full inverse and unchanged original coordinator',async()=>{
 const proposal=proposeBunReverseShard();
 assert.equal(proposal.before,await readFile(new URL('../run-bun-reverse-files.mjs',import.meta.url),'utf8'));
 assert.equal(proposal.after,await readFile(new URL('../run-bun-reverse-shard.mjs',import.meta.url),'utf8'));
 assert.equal(proposal.inverse,proposal.before);assert.deepEqual(proposal.stages.map(row=>row.phase),['language','repository']);
 let source=proposal.before;
 for(const [phase,rules]of [['language',REVERSE_SHARD_LANGUAGE_RULES],['repository',REVERSE_SHARD_REPOSITORY_RULES]]){
  const stage=proposal.stages.find(row=>row.phase===phase);assert.equal(stage.before,source);
  for(const row of rules){assert.equal(source.split(row.before).length,2);source=source.replace(row.before,()=>row.after);}
  assert.equal(source,stage.after);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,source);
 }
 assert.equal(source,proposal.after);assert.equal(proposal.semanticAuthority,false);
});
test('every reverse bin runs its complete files exactly once and retains identical whole discovery and original argv',async t=>{
 const f=await fixture(t),results=[await f.run(1),await f.run(2)];
 assert.deepEqual(results.flatMap(row=>row.discoveredFiles).sort(),f.files);
 const pids=[];
 for(const result of results){
  assert.equal(result.exitCode,0);assert.deepEqual(result.completeDiscoveredFiles,f.files);assert.deepEqual(result.discoveredAfter,f.files);
  assert.equal(result.inputsUnchanged,true);assert.equal(result.executionInputsUnchanged,true);assert.equal(result.allSelectedFilesExecuted,true);
  assert.equal(result.originalPerCaseDeadlinesUnchanged,true);assert.equal(result.globalCapMs,2400000);
  for(const row of result.records){assert.deepEqual(row.command,[f.bun,'test','./'+row.file]);assert.equal(row.status,'passed');assert.equal(row.resource.timedOut,false);const raw=await readFile(join(result.root,'node_modules','evidence-'+(result.shard.index-1),row.logs[0].path),'utf8');pids.push(JSON.parse(raw.trim()).pid);}
 }
 assert.equal(new Set(pids).size,4);
});
test('original coordinator reproduces the absence of bin selection while the derived coordinator selects complete files',async t=>{
 const f=await fixture(t);
 const original=await runBunReverseFiles({root:f.root,bun:f.bun,outputDirectory:join(f.root,'node_modules','original'),index:1,count:2});
 assert.equal(original.exitCode,0);assert.equal(original.records.length,4);
 const current=await f.run(1);assert.equal(current.exitCode,0);assert.equal(current.records.length,2);
 assert.deepEqual(current.completeDiscoveredFiles,original.discoveredFiles);
});
test('failed files remain fatal and cannot prevent later selected whole files or other bins from running',async t=>{
 const f=await fixture(t);await f.put(0,{exit:1,error:'Original failure preserved'});
 const first=await f.run(1),second=await f.run(2);
 assert.equal(first.exitCode,1);assert.deepEqual(first.records.map(row=>row.status),['failed','passed']);
 assert.equal(second.exitCode,0);assert.equal(second.records.length,2);assert.equal(first.allSelectedFilesExecuted,true);
});
test('mutating an unselected original file or adding a future mandatory file fails the complete source join',async t=>{
 const f=await fixture(t);await f.put(0,{mutate:join(f.root,f.files[1])});
 const changed=await f.run(1);assert.equal(changed.exitCode,1);assert.equal(changed.inputsUnchanged,false);assert.equal(changed.allSelectedFilesExecuted,true);
 await writeFile(join(f.root,f.files[1]),'{}');await f.put(0,{add:join(f.root,directory,'future.test.mjs')});
 const added=await f.run(1);assert.equal(added.exitCode,1);assert.deepEqual(added.newFiles,[directory+'/future.test.mjs']);assert.equal(added.records.at(-1).status,'unrun-new-mandatory-file-failure');
 assert.equal((await discoverReverseBunFiles(f.root)).length,5);
});
test('missing malformed duplicate empty or raised bin identities are refused and a global cap retains unrun failures',async t=>{
 const f=await fixture(t);
 for(const [index,count]of [[undefined,undefined],[0,2],[3,2],[1,17],[1.5,2]])await assert.rejects(f.run(index,count),/Explicit bounded/u);
 await assert.rejects(f.run(5,8),/must contain/u);
 await f.put(0,{delay:2000});const result=await f.run(1,2,{totalTimeoutMs:250});
 assert.equal(result.exitCode,1);assert.equal(result.records[0].resource.timedOut,true);assert.equal(result.records[1].status,'unrun-global-cap-failure');
 const cli=spawnSync(process.execPath,['scripts/run-bun-reverse-shard.mjs','--whole-file-shard','1/2','--whole-file-shard','1/2'],{encoding:'utf8'});
 assert.notEqual(cli.status,0);assert.match(cli.stderr,/One exact reverse shard/u);
});
test('actual Bun executes all original cases in every selected complete file across all bins',async t=>{
 const f=await fixture(t);
 for(const [at,file]of f.files.entries())await writeFile(join(f.root,file),"import test from 'node:test';test('whole "+at+" first',()=>{});test('whole "+at+" second',()=>{});\n");
 for(const index of [1,2]){
  const result=await f.run(index,2,{bun:'bun'});assert.equal(result.exitCode,0);assert.equal(result.records.length,2);
  for(const row of result.records){assert.match(row.resource.bunReportedVersion.version,/^\d+\.\d+\.\d+$/u);assert.equal(row.resource.processGroupCleanupSupported,true);}
 }
});
