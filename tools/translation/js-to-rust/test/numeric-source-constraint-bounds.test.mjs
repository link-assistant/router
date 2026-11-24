// Independent grouped-call/depth regression SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareNumericSourceConstraintBoundSources} from '../../prepare-numeric-source-constraint-bound-sources.mjs';
const limits={timeout:60000},imports="import {router_integer_i64_min as min,router_integer_i64_saturating_add as add} from './runtime/integer-runtime.mjs';\n";
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('original grouped call nodes preserve nested argument constraints without reading nonexistent wrapper fields',limits,async()=>{
 for(const depth of [1,40]){const grouped='('.repeat(depth)+'min(1n,2n)'+')'.repeat(depth),source=imports+'export function chosen():ReturnType<typeof min>{const amount='+grouped+';return ((add(amount,3n)));}\n',result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));await verifyHttpResourceTargets(result,async api=>assert.equal(api.chosen(),4n));assert.equal(result.rustExecuted,false);}
});
test('deep actual conditional constraints refuse at their complete source bound',limits,()=>{
 const expression='true?'.repeat(170)+'1n'+':2n'.repeat(170),source=imports+'export function chosen():ReturnType<typeof min>{return '+expression+';}';assert.throws(()=>translateHttpResourceCallerTypeScript(source,input(source)),/bound/u);
});
test('complete numeric source-bound corrections retain every original substitution inverse',limits,()=>{
 const plan=prepareNumericSourceConstraintBoundSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
