// Independent ordinary-statement SOURCE. All cases remain unrun drafts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {json_macro_null as nil,json_macro_object as object} from '../../json-macro-runtime.mjs';
import {prepareHttpResourceCommonStatementSources} from '../../prepare-http-resource-common-statement-sources.mjs';
const limits={timeout:60000};
const imports=`;import {router_integer_u64_saturating_add as add} from './runtime/integer-runtime.mjs';;
import {router_state_json_values_copy as copyValues,router_state_json_object_has as has} from './runtime/json-state-runtime.mjs';
`;
const source=imports+`;;export function whileBody(){let count=0n;while(count<3n)count=add(count,1n);return count;;}
export function doBody(){let count=0n;do count=add(count,1n);while(count<2n);return count;}
export function forBody(){let count=0n;for(let index=0n;index<3n;index++)count=add(count,1n);return count;}
export function forEmpty(){for(let index=0n;index<2n;index++);return true;}
export function broken(){while(true)break;return true;}
export function returned(){do return true;while(false);return false;}
export function shared(values:Parameters<typeof copyValues>[0]){let found=false;for(const value of values)if(has(value,'keep'))found=true;return found;}
export function noops(){;const value=1n;;;;{;;};return value;;;}
export function equality(left:string,right:string){return left==right;}
export function inequality(left:string,right:string){return left!=right;}
export function boolean(input:boolean){return input==true;}
export function integer(){return 1n==1n;}
export function cases(input:string){switch(input){case 'GET':;;;case 'HEAD':;return true;;default:;;return false;;}}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual single-statement loops empty statements and equal-domain equality retain complete behavior',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,api=>{assert.equal(api.whileBody(),3n);assert.equal(api.doBody(),2n);assert.equal(api.forBody(),3n);assert.equal(api.forEmpty(),true);assert.equal(api.broken(),true);assert.equal(api.returned(),true);assert.equal(api.noops(),1n);assert.equal(api.equality('é😀','é😀'),true);assert.equal(api.equality('é','e\u0301'),false);assert.equal(api.inequality('a','b'),true);assert.equal(api.boolean(true),true);assert.equal(api.boolean(false),false);assert.equal(api.integer(),true);assert.equal(api.cases('GET'),true);assert.equal(api.cases('HEAD'),true);assert.equal(api.cases('other'),false);assert.equal(api.shared([]),false);assert.equal(api.shared(Object.freeze([object([['keep',nil()]])])),true);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete native canonical block loops and equality inverses preserve original syntax',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.equal(result.rustExecuted,false);
});
test('ordinary statement spellings cannot grant mixed-domain coercion implicit returns labels or unsupported effects',limits,()=>{
 for(const body of [
  'export function bad(){return "1"==1n;}',
  'export function bad(){return true!=1n;}',
  'export function bad(){return null==false;}',
  'export function bad(){;;;}',
  'export function bad(){outer:while(true)break outer;return null;}',
  'export function bad(){let count=0n;while(count<1n)count=true;return count;}',
  'export function bad(){do throw new Error("unqualified effect");while(false);return false;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='whileBody').flow.steps.find(row=>row.kind==='while').condition.type='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('ordinary statement source history retains every original control and ordered complete inverse',limits,()=>{
 const plan=prepareHttpResourceCommonStatementSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
