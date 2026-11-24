// Independent original grouping SOURCE. All cases remain unrun during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeGroupSources} from '../../prepare-http-resource-native-groups-sources.mjs';
const limits={timeout:60000};
function input(source){return {sourcePath:'src/caller.rs',javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:'src/caller.rs',source}])};}
test('original Boolean precedence and unary groups survive complete native inverse checking',limits,async()=>{
 const source='pub fn precedence(a: bool, b: bool, c: bool) -> bool { ((a || b)) && ((c)) }\npub fn negated(value: bool) -> bool { !!((value)) }\npub fn compared(a: bool, b: bool, c: bool) -> bool { (a == b) == c }\n',result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(history.equation.inverse,source);assert.equal(history.lexicalBindings.equation.inverse,source);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.match(history.normalizedSource,/\(\(a \|\| b\) && c\)/u);assert.match(history.normalizedSource,/\(!\(!value\)\)/u);assert.ok(history.lexicalBindings.controls.some(row=>row.kind==='canonical-value-group-open'));await verifyHttpResourceTargets(result,api=>{for(const a of [false,true])for(const b of [false,true])for(const c of [false,true]){assert.equal(api.precedence(a,b,c),(a||b)&&c);assert.equal(api.compared(a,b,c),(a===b)===c);}for(const value of [false,true])assert.equal(api.negated(value),value);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('Some payload changes combine original if-let scopes alpha-renamed inputs and operator groups',limits,async()=>{
 const source='pub fn changed(value: Option<bool>) -> Option<bool> { if let Some(value) = value { Some(!((value))) } else { return None; } }',result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(history.equation.inverse,source);assert.match(history.normalizedSource,/Some\(\(!router_shadow_[0-9]+\)\)/u);assert.ok(history.lexicalBindings.selections.some(row=>row.kind==='value-group-open'));await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.changed({$:'None'}),{$:'None'});for(const value of [false,true])assert.deepEqual(api.changed({$:'Some',field0:value}),{$:'Some',field0:!value});});
});
test('raw generic groups and call argument groups retain actual unchanged-value dependencies',limits,async()=>{
 const source='pub fn identity<T>(value: T) -> T { ((value)) }\npub fn forwarded<T>(value: T) -> T { identity(((value))) }\n',result=translateHttpResourceShadowCallerRust(source,input(source));assert.equal(result.httpResourceRustSourceHistory.equation.inverse,source);assert.ok(sameRustSourceSyntax(result.httpResourceRustSourceHistory.normalizedSource,result.rust));await verifyHttpResourceTargets(result,api=>{const payload=new Proxy({},{get(){throw Error('opaque');}});assert.strictEqual(api.forwarded(payload),payload);});
});
test('canonical required groups and literal contents retain exact original source bytes',()=>{
 const canonical='pub fn grouped(a: bool, b: bool) -> bool { (a && b) }',literal='pub fn literal() -> &\'static str { "((Some(!value))) a == b == c" }';for(const source of [canonical,literal]){const result=normalizeHttpResourceRustBindings(source);assert.equal(result.after,source);assert.equal(result.equation.inverse,source);assert.equal(result.semanticAuthority,false);}
 const comments='pub fn grouped(a: bool, b: bool, c: bool) -> bool { (( /* keep */ a || b)) && ((c)) }',result=normalizeHttpResourceRustBindings(comments);assert.match(result.after,/\/\* keep \*\//u);assert.equal(result.equation.inverse,comments);assert.equal(result.crossInvocationCache,false);
});
test('unparenthesized native comparison chains malformed groups and changed source remain refused',limits,()=>{
 for(const body of ['a == b == c','a == b < c','a < b == c','((a || b)','a && (b || c))']){const source='pub fn bad(a: bool, b: bool, c: bool) -> bool { '+body+' }';assert.throws(()=>normalizeHttpResourceRustBindings(source),body);assert.throws(()=>translateHttpResourceShadowCallerRust(source,input(source)),body);}
 const source='pub fn original(a: bool) -> bool { !a }',changed=input(source);changed.files=changed.files.map(row=>row.path==='src/caller.rs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceShadowCallerRust(source,changed));
});
test('three complete group parser and normalization source equations retain native owners and both phases',limits,()=>{
 const plan=prepareHttpResourceNativeGroupSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
