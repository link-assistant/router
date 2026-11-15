"""Draft the original CLI cursor repair; do not alter generation inputs."""
import hashlib
import json
from pathlib import Path

generator = Path('scripts/prepare-bun-reverse-shard.mjs')
tests = Path('scripts/test/bun-reverse-shard.test.mjs')
cursor_before = 'for(let index=0;index<args.length;index++){const flag=args[index],value=args[++index];'
cursor_after = 'for(let argumentIndex=0;argumentIndex<args.length;argumentIndex++){const flag=args[argumentIndex],value=args[++argumentIndex];'
anchor = 'export const REVERSE_SHARD_LANGUAGE_RULES=Object.freeze([\n'
rule = ' {id:\'reverse-shard:separate-argument-cursor-from-selected-bin\',before:' + json.dumps(cursor_before) + ',after:' + json.dumps(cursor_after) + '},\n'
before = generator.read_text()
assert before.count(anchor) == 1
after = before.replace(anchor, anchor + rule)
assert after.replace(anchor + rule, anchor) == before

addition = r'''
test('actual reverse CLI accepts every complete bin without confusing argv position with shard identity',async t=>{
 const f=await fixture(t),files=Array.from({length:8},(_,at)=>directory+'/'+at+'.test.mjs'),selected=[];
 for(const [at,file]of files.entries())await writeFile(join(f.root,file),"import test from 'node:test';test('CLI whole "+at+" first',()=>{});test('CLI whole "+at+" second',()=>{});\n");
 for(let index=1;index<=8;index++){
  const outputRoot=join(f.root,'node_modules','cli-'+index),identity=['--whole-file-shard',index+'/8'],options=['--root',f.root,'--bun','bun','--output-root',outputRoot];
  const command=[new URL('../run-bun-reverse-shard.mjs',import.meta.url).pathname,...(index%2?[...identity,...options]:[...options,...identity])];
  const child=spawnSync(process.execPath,command,{encoding:'utf8'});assert.equal(child.status,0,child.stderr);
  const summary=JSON.parse(child.stdout);assert.equal(summary.exitCode,0);assert.equal(summary.mandatoryFiles,1);assert.equal(summary.executedFiles,1);assert.equal(summary.inputsUnchanged,true);
  const runs=await readdir(outputRoot);assert.equal(runs.length,1);const evidence=join(outputRoot,runs[0],'evidence'),receipt=JSON.parse(await readFile(join(evidence,'receipt.json'),'utf8'));
  assert.deepEqual(receipt.shard,{index,count:8});assert.deepEqual(receipt.completeDiscoveredFiles,files);assert.equal(receipt.records.length,1);assert.equal(receipt.allSelectedFilesExecuted,true);assert.equal(receipt.originalPerCaseDeadlinesUnchanged,true);assert.equal(receipt.globalCapMs,2400000);assert.equal(receipt.inputsUnchanged,true);assert.equal(receipt.executionInputsUnchanged,true);
  const row=receipt.records[0];assert.equal(row.status,'passed');assert.deepEqual(row.command,['bun','test','./'+row.file]);assert.equal(row.resource.timedOut,false);assert.match(row.resource.bunReportedVersion.version,/^\d+\.\d+\.\d+$/u);
  const raw=(await Promise.all(row.logs.map(log=>readFile(join(evidence,log.path),'utf8')))).join('\n');assert.match(raw,/CLI whole \d first/u);assert.match(raw,/CLI whole \d second/u);selected.push(row.file);
 }
 assert.deepEqual(selected.sort(),files);
});
test('actual reverse CLI refuses malformed duplicate out-of-range or absent shard identities',async t=>{
 const f=await fixture(t),script=new URL('../run-bun-reverse-shard.mjs',import.meta.url).pathname;
 const variants=[[],['--whole-file-shard','0/8'],['--whole-file-shard','9/8'],['--whole-file-shard','1/17'],['--whole-file-shard','1/8tail'],['--whole-file-shard','1/8','--whole-file-shard','2/8'],['--whole-file-shard']];
 for(const [at,identity]of variants.entries()){
  const child=spawnSync(process.execPath,[script,'--root',f.root,'--output',join(f.root,'node_modules','invalid-'+at),...identity],{encoding:'utf8'});
  assert.notEqual(child.status,0);assert.match(child.stderr,/One exact reverse shard required|Explicit bounded complete reverse shard required/u);
 }
});
'''
test_before = tests.read_text()
old_import = 'mkdtemp,mkdir,writeFile,readFile,chmod,rm'
assert test_before.count(old_import) == 1
test_after = test_before.replace(old_import, old_import + ',readdir') + addition
assert test_after[:-len(addition)].replace(old_import + ',readdir', old_import) == test_before
records = []
for path, old, new in [(generator, before, after), (tests, test_before, test_after)]:
    records.append({'path': str(path), 'before': old, 'after': new, 'inverse': old,
                    'beforeSha256': hashlib.sha256(old.encode()).hexdigest(),
                    'afterSha256': hashlib.sha256(new.encode()).hexdigest()})
target = Path('ci-logs/issue-784-restart-2/current-reverse-shard-cursor-draft.json')
report = {'schema': 'current-reverse-cli-cursor-source-draft-v1', 'records': records,
          'originalTestsPreserved': True, 'sourceInstalled': False,
          'nativeAndConcreteChecksPassed': False, 'receivingTestsExecuted': False,
          'runtimeParity': False, 'rustExecuted': False}
with target.open('x') as output:
    json.dump(report, output)
assert json.loads(target.read_bytes()) == report
print(json.dumps({'draft': str(target), 'installed': False}))
