// Complete source/copy/caller/CST case source. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeModelAliasJsonCoreSources20261104} from '../model-alias-json-core-20261104-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('paired model policy operation retains the actual native body, shared bindings and uninstalled production caller source',{timeout:900000},()=>{
 const proposal=proposeModelAliasJsonCoreSources20261104();assert.equal(proposal.files.length,5);assert.equal(proposal.oracleFiles.length,1);assert.equal(proposal.callers.length,1);assert.equal(proposal.newFiles.length,3);assert.equal(proposal.guards.length,4);assert.equal(proposal.librarySourceInstalled,true);assert.equal(proposal.callerSourceInstalled,false);assert.equal(proposal.nativeBindingQualified,false);for(const row of [...proposal.files,...proposal.oracleFiles,...proposal.callers]){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 assert.equal(proposal.callers[0].wholeFunctionAdmitted,false);assert.ok(proposal.callers[0].unresolved.length);assert.equal(proposal.nativeBodyCopy.history.inverse,proposal.nativeBodyCopy.before);for(const row of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
});
