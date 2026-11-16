// Complete original builder/segment/image case SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeWidthCountedRangeSegmentIndex20261104} from '../width-counted-range-segment-index-20261104.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
test('the original reusable builder reproduces every complete six-reader segment source image and index',{timeout:900000},()=>{
 const proposal=proposeWidthCountedRangeSegmentIndex20261104();assert.equal(proposal.index.rows.length,6);assert.equal(proposal.images.length,12);assert.equal(proposal.indexText,fs.readFileSync(join(ROOT,'tools/translation/source-profiles/width-counted-range-segments-20261104/index6.json'),'utf8'));assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);for(const row of proposal.images)assert.equal(fs.readFileSync(join(ROOT,row.path),'utf8'),row.source);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.sourceInstalled,false);
});
