// Source equation cases only. Execution remains separately authorized/UNRUN.
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {proposeReadonlySourceProfileConsumerSuccessors,readonlySourceProfileConsumerSourceData} from '../ordered-text-map-callers-20261102-source-storage-profile.mjs';
import {readSourceProfileFileSync} from '../ordered-text-map-callers-20261102-source-storage.mjs';
import {fileURLToPath} from 'node:url';import {join} from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('all original consumer modules retain full source inverses and exactly language/repository sequences',()=>{
 const proposal=proposeReadonlySourceProfileConsumerSuccessors(),data=readonlySourceProfileConsumerSourceData();assert.equal(proposal.files.length,13);assert.equal(data.length,13);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.receivingExecuted,false);
 for(const row of proposal.files){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].before,row.before);assert.equal(row.stages[1].after,row.after);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}const actual=readSourceProfileFileSync(join(root,row.path),'utf8');assert.ok(actual===row.before||actual===row.after);}
});
