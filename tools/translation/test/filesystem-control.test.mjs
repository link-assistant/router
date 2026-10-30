// Independent receiving SOURCE. Do not execute during the complete bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {translateFilesystemControlJavaScript,translateFilesystemControlTypeScript,readFilesystemControlMeta} from '../js-to-rust/filesystem-control.mjs';
import {translateFilesystemControlRust} from '../js-to-rust/filesystem-control-rust.mjs';
import {prepareFilesystemControlSources} from '../prepare-filesystem-control-sources.mjs';
import {prepareOwnedOutcomeUnitSources} from '../prepare-owned-outcome-unit-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {planUnitSynchronization,applyUnitSynchronization} from '../synchronize-units.mjs';
import {planUnitRuntimeMaterialization,applyUnitRuntimeMaterialization} from '../unit-runtime-materialization.mjs';
const limits={timeout:60000},runtimeSource=()=>readFileSync(new URL('../extensions/filesystem-effects-runtime.mjs',import.meta.url),'utf8');
const input=()=>({sourcePath:'js/src/caller.mjs',runtimePath:'js/runtime/effects.mjs',runtimeSource:runtimeSource()});
const sync=`import {std_fs_write as write,std_fs_remove_file as remove} from '../runtime/effects.mjs';
/** @param {string} path @param {string} contents @param {boolean} enabled */
export function changed(path,contents,enabled){if(enabled){return write(path,contents);}else{return remove(path);}}
`;
const asynchronous=`import {tokio_fs_read_to_string as read,tokio_fs_write as write,deferFilesystemFlow as lazy} from '../runtime/effects.mjs';
/** @param {string} from @param {string} left @param {string} right @param {boolean} choose */
export function copied(from,left,right,choose){return lazy(async()=>{const loaded=await read(from);if(loaded.$==='Err'){return loaded;}if(choose){return await write(left,loaded.field0);}else{return await write(right,loaded.field0);}});}
`;
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-fs-control-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};
 return {root,write,read:path=>readFileSync(join(root,path),'utf8')};
}
async function load(t,source){const api=fixture(t);api.write('js/runtime/effects.mjs',runtimeSource());api.write('js/src/caller.mjs',source);const runtime=await import(pathToFileURL(join(api.root,'js/runtime/effects.mjs')).href),module=await import(pathToFileURL(join(api.root,'js/src/caller.mjs')).href);return {api,runtime,module};}
test('Boolean branches use only their actual parameter domains and retain full CST and source inverses',limits,()=>{
 const result=translateFilesystemControlJavaScript(sync,input());assert.match(result.rust,/enabled: bool/);assert.match(result.rust,/if enabled/);assert.match(result.rust,/std::fs::write\(path, contents\)/);assert.match(result.rust,/std::fs::remove_file\(path\)/);assert.equal(result.javascript,sync);assert.match(result.typescript,/enabled: boolean/);
 const meta=readFilesystemControlMeta(result.meta,sync,input());assert.equal(meta.functions[0].flow.tail.kind,'branch');assert.equal(transportConcreteSyntaxMeta(result.concreteSyntax).source,sync);assert.ok(result.targetSourceEquations.every(row=>row.inverse===sync));
 const typed=translateFilesystemControlTypeScript(result.typescript,{...input(),sourcePath:'js/src/caller.ts'});assert.equal(sameRustSourceSyntax(typed.rust,result.rust),true);
 assert.throws(()=>readFilesystemControlMeta(result.meta,sync.replace('if(enabled)','if(!enabled)'),input()));assert.throws(()=>translateFilesystemControlJavaScript(sync,{...input(),runtimeSource:runtimeSource()+'\n'}));
});
test('selected sync branch performs exactly one actual effect and propagates its original error',limits,async t=>{
 const {runtime,module}=await load(t,sync),tape=[],capability={fs:{sync:{writeFileSync:(path,bytes)=>tape.push(['write',path,Buffer.from(bytes).toString('utf8')]),unlinkSync:path=>tape.push(['remove',path])}}};
 assert.deepEqual(runtime.withEffectCapabilities(capability,()=>module.changed('file','payload',true)),{$:'Ok',field0:null});assert.deepEqual(tape,[['write','file','payload']]);assert.deepEqual(runtime.withEffectCapabilities(capability,()=>module.changed('file','ignored',false)),{$:'Ok',field0:null});assert.deepEqual(tape,[['write','file','payload'],['remove','file']]);
 const denied={fs:{sync:{unlinkSync:()=>{throw Object.assign(new Error('denied'),{code:'EACCES'});}}}};assert.equal(runtime.withEffectCapabilities(denied,()=>module.changed('file','ignored',false)).field0.kind,'PermissionDenied');
});
test('deferred conditional effects start at first poll and consume a guarded payload on only the selected path',limits,async t=>{
 const result=translateFilesystemControlJavaScript(asynchronous,input());assert.match(result.rust,/async fn copied/);assert.match(result.rust,/let loaded = tokio::fs::read_to_string\(from\).await\?;/);assert.match(result.rust,/write\(left, loaded\).await/);assert.match(result.rust,/write\(right, loaded\).await/);
 const {runtime,module}=await load(t,result.javascript),tape=[],capability={fs:{async:{readFile:async path=>{tape.push(['read',path]);return Buffer.from('payload');},writeFile:async(path,bytes)=>tape.push(['write',path,Buffer.from(bytes).toString('utf8')])}}};
 const pending=module.copied('input','left','right',false);assert.deepEqual(tape,[]);const observed=await runtime.withEffectCapabilities(capability,()=>Promise.resolve(pending));assert.deepEqual(observed,{$:'Ok',field0:null});assert.deepEqual(tape,[['read','input'],['write','right','payload']]);assert.deepEqual(await pending,observed);assert.equal(tape.length,2);
 const failed=module.copied('missing','left','right',true),denied={fs:{async:{readFile:async()=>{throw Object.assign(new Error('missing'),{code:'ENOENT'});},writeFile:async()=>{throw Error('must not execute');}}}};assert.equal((await runtime.withEffectCapabilities(denied,()=>Promise.resolve(failed))).field0.kind,'NotFound');
});
test('native Rust authority is checked through a fresh source proposal and complete independent reproduction',limits,()=>{
 for(const source of [sync,asynchronous]){const first=translateFilesystemControlJavaScript(source,input()),inverse=translateFilesystemControlRust(first.rust,{...input(),sourcePath:'rust/src/caller.rs',javascriptPath:input().sourcePath});assert.equal(sameRustSourceSyntax(first.rust,inverse.rust),true);assert.equal(inverse.filesystemRustSourceHistory.source,first.rust);assert.equal(inverse.filesystemRustSourceHistory.equation.inverse,first.rust);assert.equal(inverse.rustExecuted,false);}
 const first=translateFilesystemControlJavaScript(asynchronous,input());for(const source of [first.rust.replace('.await?','?'),first.rust.replace('loaded =','mut loaded ='),first.rust.replace('tokio::fs::read_to_string(from).await?','tokio::fs::read_to_string(from).await'),first.rust.replace('if choose','std::fs::remove_file(from)?; if choose')])assert.throws(()=>translateFilesystemControlRust(source,{...input(),sourcePath:'rust/src/caller.rs',javascriptPath:input().sourcePath}));
});
test('incomplete branches mixed Result domains non-Boolean tests repeated moves and eager futures are refused',limits,()=>{
 const invalid=[sync.replace('else{return remove(path);}',''),sync.replace('if(enabled)','if(path)'),sync.replace('write(path,contents)','write(enabled,contents)'),sync.replace('else{return remove(path);}','else{return read(path);}').replace('std_fs_remove_file as remove','std_fs_read_to_string as read'),sync.replace('else{return remove(path);}','else{return remove(path);}return remove(path);'),asynchronous.replace('await read(from)','read(from)'),asynchronous.replace('write(left,loaded.field0)','write(loaded.field0,loaded.field0)'),asynchronous.replace('return lazy(async()=>{','return (async()=>{').replace('});}','})();}')];
 for(const source of invalid)assert.throws(()=>translateFilesystemControlJavaScript(source,input()),TypeError);
});
test('physical filesystem units initialize runtimes and synchronize all three source authorities with stale/conflict refusal',limits,t=>{
 const api=fixture(t),git=args=>execFileSync('git',['-C',api.root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'}),commit=()=>{git(['add','.']);git(['commit','--quiet','-m','Filesystem source baseline']);};git(['init','--quiet']);api.write('seed','baseline');commit();
 const unit={id:'filesystem',profile:'filesystem-control',authority:'auto',paths:{Rust:'rust/src/caller.rs',JavaScript:'js/src/caller.mjs',TypeScript:'ts/src/caller.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/caller.json'};api.write('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));api.write(unit.paths.JavaScript,sync);const options={root:api.root,manifestPath:'units.json'},materialization=planUnitRuntimeMaterialization(options);applyUnitRuntimeMaterialization(JSON.stringify(materialization),options);
 const plan=()=>planUnitSynchronization(options),apply=value=>applyUnitSynchronization(JSON.stringify(value),options);let proposal=plan();assert.equal(proposal.units[0].authority,'JavaScript');apply(proposal);commit();api.write(unit.paths.Rust,api.read(unit.paths.Rust).replace('if enabled','if (!enabled)'));proposal=plan();assert.equal(proposal.units[0].authority,'Rust');apply(proposal);commit();api.write(unit.paths.TypeScript,api.read(unit.paths.TypeScript)+'\n// typed edit\n');proposal=plan();assert.equal(proposal.units[0].authority,'TypeScript');apply(proposal);commit();
 api.write(unit.paths.JavaScript,api.read(unit.paths.JavaScript)+'\n// source edit\n');proposal=plan();const forged=structuredClone(proposal);forged.outputs.find(row=>row.path===unit.paths.Rust).after+='\n// forged\n';assert.throws(()=>apply(forged));api.write(unit.paths.TypeScript,api.read(unit.paths.TypeScript)+'\n// conflicting edit\n');assert.throws(plan,/concurrent source edits/u);assert.equal(proposal.rustExecuted,false);
});
test('complete emitted TypeScript is independently strict compiled against the actual declarations',limits,t=>{
 const api=fixture(t),git=args=>execFileSync('git',['-C',api.root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe',timeout:20000});git(['init','--quiet']);api.write('seed','baseline');git(['add','.']);git(['commit','--quiet','-m','Typed filesystem fixture']);
 const unit={id:'filesystem',profile:'filesystem-control',authority:'JavaScript',paths:{Rust:'rust/src/caller.rs',JavaScript:'js/src/caller.mjs',TypeScript:'ts/src/caller.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/caller.json'};api.write('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));api.write(unit.paths.JavaScript,asynchronous);const options={root:api.root,manifestPath:'units.json'};applyUnitRuntimeMaterialization(JSON.stringify(planUnitRuntimeMaterialization(options)),options);applyUnitSynchronization(JSON.stringify(planUnitSynchronization(options)),options);
 const require=createRequire(new URL('../../../js/package.json',import.meta.url)),compiler=require.resolve('typescript/bin/tsc');execFileSync(process.execPath,[compiler,'--strict','--noEmit','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck',join(api.root,unit.paths.TypeScript)],{stdio:'pipe',timeout:20000});
});
test('all seven complete source copies and predecessor producers retain fresh complete inverses',limits,()=>{
 const current=prepareFilesystemControlSources();assert.equal(current.files.length,7);for(const plan of [current,prepareOwnedOutcomeUnitSources()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(transportConcreteSyntaxMeta(row.stages[0].beforeMeta).source,row.before);}
});
