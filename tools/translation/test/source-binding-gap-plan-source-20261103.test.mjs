// Complete original parent and creation-image ancestry SOURCE. Execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {proposeSourceBindingGapPlanSources} from '../source-binding-gap-plan-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
test('the real source-binding operation retains its complete original, both rule phases and final inverse',{timeout:60000},()=>{
 const proposal=proposeSourceBindingGapPlanSources();assert.equal(proposal.files.length,1);assert.equal(proposal.newFiles.length,2);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.nativeBindingQualified,false);
 const row=proposal.files[0];assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}
 assert.ok(row.after.includes('const LIMITS=Object.freeze({files:512,'));assert.ok(row.after.includes('const GAP_INPUT_LIMITS=Object.freeze({...LIMITS,files:4096})'));assert.ok(row.after.includes('snapshot,census(root,directory,declaredRoot,limits)'));
 for(const created of proposal.newFiles){assert.equal(readFileSync(join(ROOT,created.path),'utf8'),created.source);assert.equal(transportConcreteSyntaxMeta(created.concreteMeta).source,created.source);assert.equal(created.semanticAuthority,false);}
});
