import {proposeTargetBindingGapPlanSources} from '../target-binding-gap-plan-20261103-profile.mjs';
// Complete source-chronology ancestry case source. Execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeRuleRegistryChronologySources} from '../rule-registry-chronology-20261103-profile.mjs';
import {proposeRuleRegistryAdoptionSources} from '../rule-registry-adoption-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
test('complete intermediate-history adoption retains all four original parents and the frozen creation image',{timeout:60000},()=>{
 const proposal=proposeRuleRegistryChronologySources(),old=proposeRuleRegistryAdoptionSources();assert.equal(proposal.files.length,4);assert.equal(proposal.newFiles.length,1);assert.equal(proposal.semanticAuthority,false);
 for(const row of proposal.files){const terminal=proposeTargetBindingGapPlanSources().files.find(value=>value.path===row.path);if(terminal)assert.equal(terminal.before,row.after);assert.equal(readFileSync(join(ROOT,row.path),'utf8'),terminal?.after??row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 const original=old.newFiles.find(row=>row.path==='tools/translation/concrete-source-rule-registry.mjs'),next=proposal.files.find(row=>row.path===original.path);assert.ok(original);assert.equal(next.before,original.source);
 for(const row of proposal.newFiles){const terminal=proposeTargetBindingGapPlanSources().files.find(value=>value.path===row.path);if(terminal)assert.equal(terminal.before,row.source);assert.equal(readFileSync(join(ROOT,row.path),'utf8'),terminal?.after??row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);assert.equal(row.semanticAuthority,false);}
});
