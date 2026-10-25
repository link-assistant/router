// Independent original-native regression SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareNativeScalarProposalDomainSources} from '../../prepare-native-scalar-proposal-domain-sources.mjs';
const limits={timeout:60000};
function input(source){return {sourcePath:'src/caller.rs',javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:'src/caller.rs',source}])};}
test('native negated locals and conditional values retain Boolean JSON constructor domains',limits,async()=>{
 const source=`pub fn inverted(input: bool) -> crate::translation_core::Json { let value = (!input); crate::translation_core::json!(value) }
pub fn conditional(input: bool) -> crate::translation_core::Json { let value = if input { (!input) } else { input }; crate::translation_core::json!(value) }
`;
 const result=translateHttpResourceCallerRust(source,input(source));assert.ok(sameRustSourceSyntax(source,result.rust));await verifyHttpResourceTargets(result,api=>{assert.equal(api.inverted(true),false);assert.equal(api.inverted(false),true);assert.equal(api.conditional(true),false);assert.equal(api.conditional(false),false);});assert.equal(result.rustExecuted,false);
});
test('unit locals and concrete generic applications retain their complete native source inverse',limits,()=>{
 const source='fn identity<T>(value: T) -> T { value }\npub fn unit() -> () { let value = (); identity(value) }\n',result=translateHttpResourceCallerRust(source,input(source));assert.ok(sameRustSourceSyntax(source,result.rust));assert.equal(result.rustExecuted,false);
});
test('a proposed Boolean domain cannot admit malformed native operands or unsupported JSON scalar types',limits,()=>{
 for(const source of [
  'pub fn bad() -> crate::translation_core::Json { let value = (!1_u64); crate::translation_core::json!(value) }\n',
  'pub fn bad() -> crate::translation_core::Json { let value = (); crate::translation_core::json!(value) }\n',
 ])assert.throws(()=>translateHttpResourceCallerRust(source,input(source)));
});
test('complete native scalar proposal originals retain both ordered substitution inverses',limits,()=>{
 const plan=prepareNativeScalarProposalDomainSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
