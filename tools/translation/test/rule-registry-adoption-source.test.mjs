// Complete original/current source ancestry case source. Execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeRuleRegistryAdoptionSources} from '../rule-registry-adoption-20261103-profile.mjs';
import {proposeRuleRegistryChronologySources} from '../rule-registry-chronology-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
test('the actual scope driver/case and all five new registry/receiving modules retain full CST source ancestry',{timeout:60000},()=>{
 const proposal=proposeRuleRegistryAdoptionSources();assert.equal(proposal.files.length,2);assert.equal(proposal.newFiles.length,5);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.nativeBindingQualified,false);
 for(const row of proposal.files){assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 for(const row of proposal.newFiles){const later=proposeRuleRegistryChronologySources().files.find(value=>value.path===row.path);if(later)assert.equal(later.before,row.source);assert.equal(readFileSync(join(ROOT,row.path),'utf8'),later?.after??row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);assert.equal(row.semanticAuthority,false);}
});
