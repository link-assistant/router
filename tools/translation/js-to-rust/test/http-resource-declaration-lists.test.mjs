// Independent sequential-declaration SOURCE; all cases are unrun drafts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceDeclarationListSources} from '../../prepare-http-resource-declaration-list-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_integer_u64_saturating_add as add} from './runtime/integer-runtime.mjs';
import {json_macro_string as make} from './runtime/json-macro-runtime.mjs';
import {router_option_u64_some as some} from './runtime/primitive-option-runtime.mjs';
`;
const source=imports+`type Counter=ReturnType<typeof add>;
export function sequential(){const first=1n,second=add(first,2n);return add(first,second);}
export function mutable(){let first=0n,second=1n;first=add(first,second);second=add(first,second);return second;}
export function typed(){const first:Counter=1n,second:Counter=add(first,2n);return second;}
export function owned(){const first=make('first'),second=make('second');return [first,second];}
export function guarded(){const _unused=0n,value=some(3n);if(value.$==='None'){return value;}return value;}
export function headers(){let count=0n;for(let index=0n,offset=0n;index<3n;index=add(index,1n),offset=add(offset,2n)){count=add(count,offset);}return count;}
export function continued(){let count=0n;for(let index=0n,offset=0n;index<3n;index=add(index,1n),offset=add(offset,2n)){if(index===1n){continue;}count=add(count,offset);}return count;}
export function assigned(){let index=9n,other=9n;for(index=0n,other=0n;index<2n;index=add(index,1n),other=add(other,index)){}return other;}
export function scopes(){for(const index=0n;index<1n;){break;}let index=0n;index=add(index,1n);return index;}
export function earlierSingle(){for(let index=0n,other=0n;index<3n;index=add(index,1n)){}return null;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('whole declaration lists retain left-to-right values moves types guards and loop update order',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));
 assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,api=>{assert.equal(api.sequential(),4n);assert.equal(api.mutable(),2n);assert.equal(api.typed(),3n);assert.deepEqual(api.owned(),['first','second']);assert.deepEqual(api.guarded(),{$:'Some',field0:3n});assert.equal(api.headers(),6n);assert.equal(api.continued(),4n);assert.equal(api.assigned(),3n);assert.equal(api.scopes(),1n);assert.equal(api.earlierSingle(),null);});
 const scoped=result.rust.slice(result.rust.indexOf('fn scopes('),result.rust.indexOf('fn earlierSingle('));assert.match(scoped,/let index = 0_u64/u);assert.match(scoped,/let mut index = 0_u64/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete native declaration and header sequence inverses reproduce every original token',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.equal(result.rustExecuted,false);
});
test('declaration lists retain duplicate binding TDZ move use and scalar update refusals',limits,()=>{
 for(const body of [
  'export function bad(){const first=second,second=1n;return first;}',
  'export function bad(){const first=first,second=1n;return second;}',
  'export function bad(){const first=1n,first=2n;return first;}',
  'export function bad(){const first=make("a"),second=first;return [first,second];}',
  'export function bad(){let first=0n,second=true;first=second;return first;}',
  'export function bad(){for(let index=0n,index=1n;index<3n;index=add(index,1n)){}return null;}',
  'export function bad(){let index=0n,other=0n;for(;index<2n;index=add(index,1n),other=true){}return other;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const value=imports+'export function bad(){const '+Array.from({length:65},(_,index)=>'value'+index+'=0n').join(',')+';return null;}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)));
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='headers').flow.steps.find(row=>row.kind==='scalar-for').increment.steps.reverse();assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete declaration list originals retain language/repository order and full inverses',limits,()=>{
 const plan=prepareHttpResourceDeclarationListSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
