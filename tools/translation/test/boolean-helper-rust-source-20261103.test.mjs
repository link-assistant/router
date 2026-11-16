// Complete copied/created source history case, not runtime admission.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeBooleanHelperRustSources20261103} from '../boolean-helper-rust-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('canonical Boolean inverse and Rust oracle retain complete two-phase source history',{timeout:60000},()=>{
 const proposal=proposeBooleanHelperRustSources20261103();
 assert.equal(proposal.files.length,1);assert.equal(proposal.newFiles.length,2);assert.equal(proposal.nativeBindingQualified,false);
 const row=proposal.files[0];assert.equal(row.path,'rust/tests/translation_boolean_helper_oracle.rs');assert.equal(row.inverse,row.before);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}
 for(const file of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(file.concreteMeta).source,file.source);
 const inverse=proposal.newFiles.find(file=>file.path.endsWith('/owned-boolean-helper-rust-20261103.mjs'));
 assert.match(inverse.source,/readOwnedRustFunction/);assert.match(inverse.source,/projectOwnedRustFunctions/);
 assert.match(inverse.source,/sameRustSourceSyntax\(source,row.rust\)/);
 assert.match(inverse.source,/translateOwnedBooleanHelperSource20261103/);
 assert.match(inverse.source,/requiresReconciliation:true/);
});
