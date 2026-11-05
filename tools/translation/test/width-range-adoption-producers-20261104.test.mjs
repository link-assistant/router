// Complete index/image and implementation-copy source cases. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeWidthRangeAdoptionSegmentIndex20261104} from '../width-range-adoption-segment-index-20261104.mjs';
import {proposeWidthRangeAdoptionAuthoringCopies20261104} from '../width-range-adoption-copies-20261104.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),read=path=>fs.readFileSync(join(ROOT,path),'utf8');
test('the original complete two-phase builder reproduces all eighteen control rows and thirty-six source images',{timeout:900000},()=>{
 const proposal=proposeWidthRangeAdoptionSegmentIndex20261104();assert.equal(proposal.index.rows.length,18);assert.equal(proposal.images.length,36);assert.equal(proposal.indexText,read('tools/translation/source-profiles/width-range-reader-adoption-20261104/index18.json'));assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);for(const row of proposal.images)assert.equal(read(row.path),row.source);assert.equal(proposal.index.rows.some(row=>row.path==='tools/translation/exact-source-successors-20261103.mjs'),false);
});
test('all three implementation copies retain whole originals and intermediate CST/inverse source equations',{timeout:900000},()=>{
 const proposal=proposeWidthRangeAdoptionAuthoringCopies20261104();assert.equal(proposal.copies.length,3);assert.equal(proposal.nativeBindingQualified,false);for(const row of proposal.copies){assert.equal(row.inverse,row.before);assert.equal(read(row.path),row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
});
