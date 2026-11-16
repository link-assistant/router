// Independent transaction/CLI regression SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {planForwardStringUnitSynchronization,applyForwardStringUnitSynchronization} from '../forward-string-unit-synchronization.mjs';
import {prepareForwardStringUnitSources} from '../prepare-forward-string-unit-sources.mjs';
import {sourceUnitArguments} from '../../../scripts/sync-router-forward-strings.mjs';
const limits={timeout:60000},old='unit_before_Ω',next='unit_after_😀',source='pub fn message()->&\'static str{"unit_before_Ω"}\n';
const dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function fixture(t,authority='JavaScript',paired=true){
 const root=mkdtempSync(join(tmpdir(),'router-forward-string-unit-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);},read=path=>readFileSync(join(root,path),'utf8'),git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'}),commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Forward source baseline']);};
 const unit={schema:'router-forward-string-unit-v1',id:'message',entry:'rust/src/lib.rs',authority,javascript:'js/src/message.mjs',typescript:'ts/src/message.mts',meta:'translation/message.json'};
 write('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="2"\n');write('rust/Cargo.toml',dependencies.manifest);write('Cargo.lock',dependencies.lock);write(unit.entry,source);
 const targets=translateProject({entry:unit.entry,paths:[unit.entry],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest});
 for(const [language,key] of [['JavaScript','javascript'],['TypeScript','typescript']])if(paired||language===authority)write(unit[key],targets[key]);write('unit.json',JSON.stringify(unit));git(['init','--quiet']);commit();
 const selected=authority==='JavaScript'?'javascript':'typescript',changed=targets[selected].replace(JSON.stringify(old),JSON.stringify(next));assert.notEqual(changed,targets[selected]);write(unit[selected],changed);const options={root,manifestPath:'unit.json'};return {root,unit,options,targets,write,read,commit,plan:()=>planForwardStringUnitSynchronization(options),apply:plan=>applyForwardStringUnitSynchronization(JSON.stringify(plan),options)};
}
for(const authority of ['JavaScript','TypeScript'])test(authority+' edit freshly proposes Rust and both targets with full inverses',limits,t=>{
 const api=fixture(t,authority),proposal=api.plan();assert.equal(api.read(api.unit.entry),source);assert.deepEqual(proposal.outputs.map(row=>row.kind),['synchronized-source','paired-javascript','paired-typescript','complete-source-review']);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.rustExecuted,false);assert.equal(proposal.crossInvocationCache,false);
 for(const row of proposal.outputs)assert.equal(row.inverse,row.before);const review=JSON.parse(proposal.outputs.at(-1).after);assert.equal(review.proposal.rustEdit.history.inverse,source);assert.equal(Object.hasOwn(review.proposal,'sourceInputs'),false);assert.deepEqual(review.trace.map(row=>row.phase),['language','repository']);
 const receipt=api.apply(proposal);assert.ok(receipt.changed.includes(api.unit.entry));assert.ok(api.read(api.unit.entry).includes(next));for(const key of ['javascript','typescript'])assert.ok(api.read(api.unit[key]).includes(next));assert.equal(receipt.rustExecuted,false);
});
test('missing paired target is initialized without granting parity',limits,t=>{const api=fixture(t,'TypeScript',false),proposal=api.plan(),row=proposal.outputs.find(row=>row.kind==='paired-javascript');assert.equal(row.before,null);assert.equal(row.inverse,null);api.apply(proposal);assert.equal(api.read(row.path),row.after);assert.equal(proposal.runtimeParity,false);});
test('paired edits and changed original inputs cannot be silently overwritten',limits,t=>{
 const api=fixture(t),paired=api.read(api.unit.typescript);api.write(api.unit.typescript,paired+'\n// independent source change\n');assert.throws(()=>api.plan(),/paired target/u);api.write(api.unit.typescript,paired);const proposal=api.plan();api.write(api.unit.entry,source+'\n// new Rust source\n');assert.throws(()=>api.apply(proposal));assert.equal(api.read(api.unit.entry),source+'\n// new Rust source\n');
});
test('tampered outputs stale revisions unknown manifest keys and linked sources refuse',limits,t=>{
 const api=fixture(t),proposal=api.plan(),forged=structuredClone(proposal);forged.outputs[0].after+='\n// injected\n';assert.throws(()=>api.apply(forged),/fresh source translation/u);api.commit();assert.throws(()=>api.apply(proposal),/fresh source translation/u);api.write('unit.json',JSON.stringify({...api.unit,allowUnchecked:true}));assert.throws(()=>api.plan(),/complete forward string source unit/u);api.write('unit.json',JSON.stringify(api.unit));const path=join(api.root,api.unit.javascript),saved=api.read(api.unit.javascript);rmSync(path);api.write('external.mjs',saved);symlinkSync(join(api.root,'external.mjs'),path);assert.throws(()=>api.plan());
});
test('CLI requires one explicit manifest and one mode with original argument refusals',()=>{
 assert.equal(sourceUnitArguments(['--manifest','unit.json','--plan','new.json']).manifestPath,'unit.json');for(const args of [[],['--manifest','unit.json'],['--manifest','unit.json','--plan','a','--apply','b'],['--manifest','a','--manifest','b','--plan','c'],['--manifest','unit.json','--plan','a','--runtime-only']])assert.throws(()=>sourceUnitArguments(args));
});
test('complete original transaction and CLI copies retain ordered source histories',limits,()=>{const plan=prepareForwardStringUnitSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
