// Entirely SOURCE ONLY / UNRUN. No historical renderer runs during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {replayKnownOriginalProducer,originalProducerReplayData} from '../legacy-source-edits-20261101-replay.mjs';
import {proposeLegacySourceEditsHistory} from '../legacy-source-edits-20261101-source-history.mjs';
import {regenerateNativeTypeScript} from '../js-to-rust/native-typescript.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const SOURCE=fileURLToPath(new URL('../../../',import.meta.url));
const environment=()=>Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_')));
function write(root,name,value){const full=join(root,name);fs.mkdirSync(dirname(full),{recursive:true});fs.writeFileSync(full,value,{mode:0o644});}
function sourceRoot(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-current-legacy-')));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 // Read-only object alternates, not a clone/worktree or a copy of build/deps.
 execFileSync('git',['-C',root,'init','--quiet'],{env:environment(),timeout:10000});
 const common=execFileSync('git',['-C',SOURCE,'rev-parse','--git-common-dir'],{env:environment(),encoding:'utf8',timeout:10000}).trim();
 const objects=join(resolve(SOURCE,common),'objects');assert.ok(!/[\r\n]/u.test(objects));
 write(root,'.git/objects/info/alternates',objects+'\n');
 write(root,'js/package.json','{"name":"independent-current-legacy-fixture","version":"0.0.0","type":"module"}\n');
 write(root,'js/catalog.json','{}\n');write(root,'js/index.js','export {};\n');write(root,'js/testing.js','export {};\n');
 write(root,'js/src/core.mjs','export function currentValue(){ return "first-current"; }\n');
 // The actual existing pinned compiler/declarations are an external read-only
 // dependency, as in the complete original native-TypeScript fixture controls.
 fs.symlinkSync(join(SOURCE,'js/node_modules'),join(root,'js/node_modules'),'dir');
 return root;
}
test('complete predecessor/copy/planner equations retain every original and inverse',{timeout:60000},()=>{
 const proposal=proposeLegacySourceEditsHistory();assert.equal(proposal.files.length,2);
 assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.semanticAuthority,false);
 for(const row of proposal.files){assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.trace.map(phase=>phase.phase),['language','repository']);}
 assert.match(proposal.files[0].before,/current authored input differs/);
 assert.doesNotMatch(proposal.files[0].after,/current authored input differs/);
 assert.match(proposal.files[0].after,/const dependencies=dependencyArchives[\s\S]*directory=fs.realpathSync/);
});
test('actual fixed historical targets migrate after current source edits without adopting changed neighbors',{timeout:300000},t=>{
 const token=replayKnownOriginalProducer({root:SOURCE,producer:'native-typescript',dependencyArchive:process.env.ROUTER_ORIGINAL_TYPESCRIPT_ARCHIVE});
 const legacy=originalProducerReplayData(token,'native-typescript',SOURCE);
 assert.throws(()=>originalProducerReplayData(token,'native-typescript',SOURCE),/genuine freshly/);
 const root=sourceRoot(t),core=legacy.get('ts/src/core.ts');assert.ok(core);
 write(root,'ts/src/core.ts',core.source);fs.chmodSync(join(root,'ts/src/core.ts'),core.mode);
 const oldNeighbors=[...legacy].filter(([name])=>name.startsWith('ts/src/')&&name.endsWith('.ts')&&name!=='ts/src/core.ts').slice(0,3);
 assert.equal(oldNeighbors.length,3);const [stale,modified,authored]=oldNeighbors;
 for(const [name,row]of oldNeighbors){write(root,name,row.source);fs.chmodSync(join(root,name),row.mode);}
 const custom=modified[1].source+'\n// independent authored change\n';write(root,modified[0],custom);
 write(root,'translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored:[authored[0]],unmanaged:[]})+'\n');
 write(root,'ts/src/independent-neighbor.ts','export const untouched = 17;\n');
 const changed=regenerateNativeTypeScript(root);
 assert.ok(changed.changed.includes('ts/src/core.ts'));
 assert.ok(changed.unexpected.includes(stale[0]));assert.equal(fs.existsSync(join(root,stale[0])),false);
 assert.equal(fs.readFileSync(join(root,modified[0]),'utf8'),custom);
 assert.equal(fs.readFileSync(join(root,authored[0]),'utf8'),authored[1].source);
 assert.equal(fs.readFileSync(join(root,'ts/src/independent-neighbor.ts'),'utf8'),'export const untouched = 17;\n');
 assert.match(fs.readFileSync(join(root,'ts/src/core.ts'),'utf8'),/first-current/);
 const receiptPath='tools/translation/js-to-rust/generated/native-typescript/ownership-20261101.json';
 const first=JSON.parse(fs.readFileSync(join(root,receiptPath),'utf8'));
 assert.ok(first.outputs.some(row=>row.path==='ts/src/core.ts'));
 for(const [name]of [modified,authored])assert.equal(first.outputs.some(row=>row.path===name),false);
 // The new ledger, not historical input equality, owns the ordinary next edit.
 write(root,'js/src/core.mjs','export function currentValue(){ return "second-current"; }\n');
 regenerateNativeTypeScript(root);assert.match(fs.readFileSync(join(root,'ts/src/core.ts'),'utf8'),/second-current/);
 const actual=fs.readFileSync(join(root,'ts/src/core.ts'),'utf8');write(root,'ts/src/core.ts',actual+'\n// authored peer edit\n');
 const ledger=fs.readFileSync(join(root,receiptPath),'utf8');
 assert.throws(()=>regenerateNativeTypeScript(root),/edited|authored/);
 assert.equal(fs.readFileSync(join(root,receiptPath),'utf8'),ledger);
 assert.equal(fs.readFileSync(join(root,'ts/src/core.ts'),'utf8'),actual+'\n// authored peer edit\n');
});
test('changed current inputs cannot forge the actual private historical replay token',{timeout:60000},()=>{
 for(const fake of [{},Object.freeze({schema:'private-fixed-original-producer-replay-20261101'}),null])
  assert.throws(()=>originalProducerReplayData(fake,'native-typescript',SOURCE),/genuine freshly/);
});
test('bad offline archive refuses before creating a large isolated compiler tree',{timeout:60000},t=>{
 const root=sourceRoot(t),archive=join(root,'bad-typescript.tgz');fs.writeFileSync(archive,'corrupted independent archive');
 let failed=false,primary;try{replayKnownOriginalProducer({root,producer:'native-typescript',dependencyArchive:archive});}catch(error){failed=true;primary=error;}
 assert.equal(failed,true);assert.equal(Object.hasOwn(primary,'recoveryPaths'),false);
 assert.equal(fs.readFileSync(archive,'utf8'),'corrupted independent archive');
});
