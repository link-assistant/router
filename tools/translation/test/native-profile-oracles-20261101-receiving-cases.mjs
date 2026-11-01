// Whole real native receiving assertions SOURCE. Call only in the later gated
// native executor, before/after its child exits; this file invokes no Cargo.
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {writeFileSync,existsSync,lstatSync} from 'node:fs';
import {NATIVE_PROFILE_ORACLE_LIMITS,NATIVE_PROFILE_ORACLES,nativeProfileOracleTargetSource} from '../native-profile-oracles-20261101-control.mjs';
import {inspectNativeProfileOracleWorkspace,readNativeProfileOracleWorkspaceSource,verifyNativeProfileOracleWorkspace,cleanupNativeProfileOracleWorkspace} from '../native-profile-oracles-20261101-materialize.mjs';
import {visitPersistentOutputSourceEquations} from '../persistent-output-backend-20261101-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
export async function assertNativeProfileOracleReceivingSources(handle,{tick}){
 const before=inspectNativeProfileOracleWorkspace(handle),entry=NATIVE_PROFILE_ORACLES.find(row=>row.id===before.profileId);assert.ok(entry);assert.equal(before.status,'materialized');assert.equal(before.nativeOnlyOverlay,true);assert.equal(before.javascriptProfileInstalled,false);assert.equal(before.executionAuthority,false);assert.equal(before.semanticAuthority,false);assert.equal(before.cwd,join(before.workspaceRoot,'rust'));assert.ok(before.sourceBytes<=NATIVE_PROFILE_ORACLE_LIMITS.sourceBytes);assert.ok(before.retainedBytes<=NATIVE_PROFILE_ORACLE_LIMITS.evidenceBytes);assert.equal(before.knownFileCount>=before.sourceFiles,true);assert.equal(before.compileResourceClosure,true);assert.ok(before.fullHeadMetadataPaths>=before.sourceFiles);assert.equal(existsSync(join(before.workspaceRoot,'.git')),false);
 const actualTarget=readNativeProfileOracleWorkspaceSource(handle,'rust/tests/'+entry.target+'.rs');assert.equal(actualTarget.toString('utf8'),nativeProfileOracleTargetSource(entry.id));assert.ok(readNativeProfileOracleWorkspaceSource(handle,entry.oracle).length>0);for(const path of ['Cargo.toml','Cargo.lock','rust/Cargo.toml','.cargo/config.toml'])assert.ok(readNativeProfileOracleWorkspaceSource(handle,path).length>0);
 // This tracked native compile resource must survive the whole-root copy;
 // copying only Rust/Cargo files would omit the real embedded web assets.
 assert.equal(lstatSync(join(before.workspaceRoot,'rust/ui/dist')).isDirectory(),true);
 let fullEquations=0;const projection=visitPersistentOutputSourceEquations(event=>{tick();assert.equal(event.history.inverse,event.history.before);assert.equal(transportConcreteSyntaxMeta(event.history.beforeMeta).source,event.history.before);assert.equal(transportConcreteSyntaxMeta(event.history.afterMeta).source,event.history.after);assert.deepEqual(event.history.trace.map(row=>row.phase),['language','repository']);fullEquations++;return null;});assert.equal(fullEquations,projection.visited);assert.equal(before.proofEquations,projection.visited);assert.equal(before.proofResources,projection.resources.length);
 for(const row of [...projection.substitutions,...projection.additions]){tick();const after=projection.sources[Object.hasOwn(row,'version')?row.version:row.afterVersion];if(row.path.endsWith('.rs'))assert.equal(readNativeProfileOracleWorkspaceSource(handle,row.path).toString('utf8'),after);else if(Object.hasOwn(row,'physicalBeforeVersion'))assert.equal(readNativeProfileOracleWorkspaceSource(handle,row.path).toString('utf8'),projection.sources[row.physicalBeforeVersion]);}
 for(const row of projection.resources){tick();assert.equal(readNativeProfileOracleWorkspaceSource(handle,row.path).toString('utf8'),projection.sources[row.version]);}
 const closed=await verifyNativeProfileOracleWorkspace(handle,{tick});assert.equal(closed.sourceSha,before.sourceSha);assert.equal(closed.runtimeParity,false);return {completeSelectedNativeResourceClosureCompared:true,allFullProfileEquationsConsumed:true,nativeRowsInstalled:true,javascriptRowsInstalled:false,rawResourcesConsumed:true,oracleSourceIncludedEntirely:true,sourceOnly:true,runtimeExecuted:false};
}
// Independent negative case for its OWN already-materialized receiving
// workspace. Do not call this on the executor's successful oracle workspace.
export async function assertUnknownNativeTemporaryOutputIsRetained(handle,{tick}){
 const descriptor=inspectNativeProfileOracleWorkspace(handle),path=join(descriptor.tmpRoot,'independent-unknown-native-output.txt');writeFileSync(path,'unregistered native output\n',{flag:'wx'});await assert.rejects(cleanupNativeProfileOracleWorkspace(handle,{tick}),/unknown receiving|changed receiving/);assert.equal(existsSync(path),true);assert.equal(existsSync(descriptor.ownedRoot),true);assert.equal(inspectNativeProfileOracleWorkspace(handle).status,'retained-after-failure');return {recoveryPaths:descriptor.recoveryPaths,unknownOutputRetained:true,recursiveCleanup:false,sourceOnly:true};
}
