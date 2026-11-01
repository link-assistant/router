// Independent actual portable visitor + CLOSED native receiving source cases.
// No Node compiler, Cargo, Rust target or native child is invoked here. UNRUN.
// Positive calls require Root's eventual actual closed scalar registration;
// copied registry DATA or caller paths cannot replace the private handle.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {visitPortableJsonScalarReadersSourceEquations} from '../json-scalar-readers-portable-source-20261101.mjs';
import {NATIVE_PROFILE_ORACLES,nativeProfileOracleTargetSource} from '../native-profile-oracles-20261101-control.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {inspectNativeProfileOracleWorkspace,readNativeProfileOracleWorkspaceSource,verifyNativeProfileOracleWorkspace} from '../native-profile-oracles-20261101-materialize.mjs';
function full(history){assert.equal(history.inverse,history.before);assert.equal(transportConcreteSyntaxMeta(history.beforeMeta).source,history.before);assert.equal(transportConcreteSyntaxMeta(history.afterMeta).source,history.after);assert.deepEqual(history.trace.map(row=>row.phase),['language','repository']);}
export async function assertPortableJsonScalarReadersNativeReceiving(handle,{tick}){
 const descriptor=inspectNativeProfileOracleWorkspace(handle);assert.equal(descriptor.status,'materialized');assert.equal(descriptor.profileId,'json-scalar-readers-20261101');assert.equal(descriptor.nativeOnlyOverlay,true);assert.equal(descriptor.javascriptProfileInstalled,false);const registry=NATIVE_PROFILE_ORACLES.find(row=>row.id===descriptor.profileId);assert.ok(registry);assert.equal(registry.archive,'tools/translation/source-profiles/json-scalar-readers-20261101/delta-sources.json.gz');assert.equal(registry.archiveSha256,'8a6de0143294b737f6e52f8ec01b513379810d32366a66eebf4a9a92352d8388');assert.equal(registry.target,'json_scalar_readers_profile_oracle_20261101');assert.equal(registry.oracle,'rust/tests/oracles/json_scalar_readers_20261101.rs');assert.equal(descriptor.targetName,registry.target);assert.equal(readNativeProfileOracleWorkspaceSource(handle,'rust/tests/'+registry.target+'.rs').toString('utf8'),nativeProfileOracleTargetSource(registry.id));assert.ok(readNativeProfileOracleWorkspaceSource(handle,registry.oracle).length>0);let modules=0,equations=0,resources=0;
 const source=visitPortableJsonScalarReadersSourceEquations(event=>{tick();if(event.kind==='portable-complete-module-equation'){full(event.history);modules++;}else if(event.kind==='complete-untranslated-resource'){assert.equal(event.inverse,event.source);assert.equal(event.cstClaimed,false);resources++;}else{assert.equal(event.kind,undefined);full(event.history);equations++;}return null;});
 assert.equal(modules,1);assert.equal(equations,source.visited);assert.equal(resources,source.resources.length);assert.equal(source.nativeOnly,true);assert.equal(source.compilerEntryExported,false);assert.equal(source.sourceInstalled,false);assert.equal(source.semanticAuthority,false);
 for(const row of [...source.substitutions,...source.additions]){tick();const expected=source.sources[row.path.endsWith('.rs')?Object.hasOwn(row,'version')?row.version:row.afterVersion:Object.hasOwn(row,'version')?row.version:row.physicalBeforeVersion];assert.equal(readNativeProfileOracleWorkspaceSource(handle,row.path).toString('utf8'),expected);}
 for(const row of source.resources){tick();assert.equal(readNativeProfileOracleWorkspaceSource(handle,row.path).toString('utf8'),source.sources[row.version]);}
 for(const row of source.portableCustody){tick();assert.equal(readNativeProfileOracleWorkspaceSource(handle,row.path).toString('utf8'),row.source);}
 const closed=await verifyNativeProfileOracleWorkspace(handle,{tick});assert.equal(closed.sourceSha,descriptor.sourceSha);return Object.freeze({completeOriginalScalarEquations:true,wholeModuleEquation:true,allRawResources:true,actualCustodyJoined:true,closedNativeWorkspace:true,javascriptProfileInstalled:false,compilerInvoked:false,rustInvoked:false,runtimeParity:false,semanticAuthority:false});
}
// Use only a separately materialized private test workspace. This intentionally
// leaves an invalid receiving image for mandatory recovery/artifact retention.
export async function assertPortableReceivingCustodyMutationRefused(handle,{tick}){
 const descriptor=inspectNativeProfileOracleWorkspace(handle),path='tools/translation/json-scalar-readers-portable-source-20261101.mjs',before=readNativeProfileOracleWorkspaceSource(handle,path),file=join(descriptor.workspaceRoot,path);try{writeFileSync(file,Buffer.concat([before,Buffer.from('\n// independent stale receiving copy\n')]));await assert.rejects(assertPortableJsonScalarReadersNativeReceiving(handle,{tick}));}finally{writeFileSync(file,before);}await assert.rejects(verifyNativeProfileOracleWorkspace(handle,{tick}));assert.equal(inspectNativeProfileOracleWorkspace(handle).status,'retained-after-failure');return {recoveryPaths:descriptor.recoveryPaths,restorationDoesNotReissueIdentity:true,sourceOnly:true};
}
