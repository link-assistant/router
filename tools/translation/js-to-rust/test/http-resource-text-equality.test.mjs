// Independent scalar text equality/capture SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceTextEqualitySources} from '../../prepare-http-resource-text-equality-sources.mjs';
import {json_macro_null as nil} from '../../json-macro-runtime.mjs';
const limits={timeout:60000};
const imports=`import {router_text_replace as replace,router_text_contains as contains} from './runtime/text-runtime.mjs';
import {router_state_json_values_copy as copyValues} from './runtime/json-state-runtime.mjs';
import {router_core_json_filter as filter,router_core_json_any as any} from './runtime/json-iteration-runtime.mjs';
`;
const source=imports+`export function equals(left:string,right:string){return left===right;}
export function differs(left:string,right:string){return left!==right;}
export function retained(){const value=replace('x','x','é😀');const same=value==='é😀';if(same){return value;}else{return replace('x','x','other');}}
export function pairs(){const first=replace('x','x','é😀'),second=replace('y','y','é😀');return first===second;}
export function temporary(){return replace('x','x','é😀')==='é😀';}
export function chosen(flag:boolean){const value=replace('x','x','yes');return (flag?value:value)==='yes';}
export function selected(values:Parameters<typeof copyValues>[0]){const needle=replace('x','x','é😀');return filter(values,_value=>needle==='é😀');}
export function borrowed(values:Parameters<typeof copyValues>[0]){const needle=replace('x','x','é😀');return filter(values,_value=>contains(needle,'😀'));}
export function nested(values:Parameters<typeof copyValues>[0]){const needle=replace('x','x','é😀');return any(values,_value=>any(values,_probe=>needle==='é😀'));}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual scalar text equality preserves Unicode values original String owners and read-only captures',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,api=>{for(const [left,right]of [['',''],['é😀','é😀'],['é','e\u0301'],['😀','\uffff'],['a','b']]){assert.equal(api.equals(left,right),left===right);assert.equal(api.differs(left,right),left!==right);}assert.equal(api.retained(),'é😀');assert.equal(api.pairs(),true);assert.equal(api.temporary(),true);assert.equal(api.chosen(true),true);assert.equal(api.chosen(false),true);assert.deepEqual(api.selected([]),[]);assert.deepEqual(api.borrowed([]),[]);assert.equal(api.nested([]),false);const values=Object.freeze([nil()]);assert.deepEqual(api.selected(values),values);assert.deepEqual(api.borrowed(values),values);assert.equal(api.nested(values),true);});
 const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='retained').flow.steps[1].value.kind,'text-compare');assert.equal(rows.find(row=>row.name==='selected').flow.tail.value.args[1].flow.captures[0].type,'text-owned');assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('native explicit text views and read-only closure captures reproduce every original syntax token',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.equal(result.rustExecuted,false);
});
test('text ordering mismatched domains captured mutation moves and temporary owner reuse remain refused',limits,()=>{
 for(const body of [
  'export function bad(left:string,right:string){return left<right;}',
  'export function bad(left:string){return left===true;}',
  'export function bad(){return "\\ud800"==="x";}',
  'export function bad(values:Parameters<typeof copyValues>[0]){let needle=replace("x","x","y");return any(values,_value=>{needle=replace("x","x","z");return true;});}',
  'export function bad(values:Parameters<typeof copyValues>[0]){const needle=replace("x","x","y");return any(values,_value=>{const moved=needle;return moved==="y";});}',
  'export function bad(flag:boolean){const value=replace("x","x","y");const compared=(flag?value:value)==="y";if(compared){return value;}else{return value;}}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='selected').flow.tail.value.args[1].flow.captures[0].type='str';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete text equality originals retain both ordered substitution stages and exact inverses',limits,()=>{
 const plan=prepareHttpResourceTextEqualitySources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
