// Independent finite whole-source histories and CLI receiving wiring. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {proposeProtectedCoreCliWriterSources,knownProtectedCoreCliWriterSuccessor} from '../protected-core-cli-writers-20261102-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),base='tools/translation/source-profiles/protected-core-cli-writers-20261102/',read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
// Independent original physical names, not the producer's FILES table.
const stems=['text','sse','async-control','owned-result','primitive-result','primitive-option','primitive-option-callback','owned-outcome','http-protocol','http-transport','json-state','json-fields','json-iteration'];
const originals=stems.map(stem=>({path:'tools/translation/prepare-'+stem+'-core.mjs',source:read(base+stem+'.before.txt')}));
test('all thirteen actual CLI parents retain complete source, native producer APIs and ordered whole-source inverses',{timeout:60000},()=>{
 const proposal=proposeProtectedCoreCliWriterSources(originals,{root});assert.equal(proposal.files.length,13);assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.verification,'UNRUN');
 for(const [index,stem]of stems.entries()){
  const row=proposal.files[index],after=read(base+stem+'.after.txt');assert.equal(row.path,originals[index].path);assert.equal(row.before,originals[index].source);assert.equal(row.after,after);assert.equal(row.inverse,row.before);assert.deepEqual(row.trace.map(value=>value.phase),['language','repository']);
  for(const step of row.stages){assert.equal(transportConcreteSyntaxMeta(step.beforeMeta).source,step.before);assert.equal(transportConcreteSyntaxMeta(step.afterMeta).source,step.after);assert.equal(step.inverse,step.before);}
  const importLine="import {writeProtectedCoreCliPlan} from './protected-core-cli-writers-20261102.mjs';\n";
  assert.ok(after.startsWith(importLine));const originalPrefix=row.before.slice(0,row.before.indexOf('if(process.argv[1]'));assert.equal(after.slice(importLine.length,importLine.length+originalPrefix.length),originalPrefix,'every original imported binding and producer declaration stays byte exact');
  const oldTail=row.before.slice(row.before.indexOf('if(process.argv[1]')),newTail=after.slice(importLine.length+originalPrefix.length);assert.ok(newTail.includes("args[0]==='--write'?writeProtectedCoreCliPlan(ROOT,()=>"));assert.ok(newTail.includes("['--emit','--write','--check']"));assert.equal(newTail.slice(newTail.indexOf("if(args[0]==='--check')")),oldTail.slice(oldTail.indexOf("if(args[0]==='--check')")),'read-only check, JSON output and original local alias declarations unchanged');
  assert.equal(knownProtectedCoreCliWriterSuccessor({root,path:row.path,before:row.before+'\n'}),null);
 }
 assert.throws(()=>proposeProtectedCoreCliWriterSources(originals.slice(1),{root}),/all thirteen/u);assert.equal(knownProtectedCoreCliWriterSuccessor({root,path:'tools/translation/unassigned-cli.mjs',before:''}),null);
});
test('receiving active CLI source must match each exact named afterimage',{timeout:60000},()=>{for(const [index,stem]of stems.entries()){const row=knownProtectedCoreCliWriterSuccessor({root,path:originals[index].path,before:originals[index].source});assert.equal(row.after,read(base+stem+'.after.txt'));assert.equal(row.currentAfter,read(row.path));assert.equal(row.inverse,originals[index].source);}});
