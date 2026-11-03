// Complete whole-source ancestry/CST case source. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOrderedMutableScalarSources20261104} from '../ordered-mutable-scalars-20261104-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('mutable scalar proposal retains both real native readers, unchanged parent and complete copied state rule',{timeout:900000},()=>{
 const proposal=proposeOrderedMutableScalarSources20261104();assert.equal(proposal.files.length,2);assert.equal(proposal.copies.length,1);assert.equal(proposal.newFiles.length,3);assert.equal(proposal.inputSources.length,9);assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.nativeBindingQualified,false);
 for(const row of [...proposal.files,...proposal.copies]){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 for(const row of proposal.files){assert.match(row.after,/binding\.symbol!==checker\.getSymbolAtLocation\(target\)/);assert.match(row.after,/binding\.mutable!==true/);assert.match(row.after,/value\.root!==null\|\|value\.type!==binding\.type/);assert.match(row.after,/input\.rows\.length!==9/);assert.match(row.after,/lowerOrderedMutableScalarStatements20261104 as lowerOrderedScalarHelperStatements20261103/);}
 for(const row of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
});
