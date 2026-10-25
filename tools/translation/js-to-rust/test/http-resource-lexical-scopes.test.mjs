// Independent lexical-scope SOURCE. No cases executed during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceLexicalScopeSources} from '../../prepare-http-resource-lexical-scope-sources.mjs';
const limits={timeout:60000};
const imports="import {router_integer_u64_saturating_add as add} from './runtime/integer-runtime.mjs';\n";
const source=imports+`export function continued(){let count=0n;while(count<3n){{count=add(count,1n);if(count===2n){continue;}}}return count;}
export function stopped(){let count=0n;while(count<3n){{count=add(count,1n);break;}}return count;}
export function terminal(){{{return true;}}}
export function local(){let count=0n;{const local=2n;count=add(count,local);}{}return count;}
export function alternatives(){let count=0n;{if(true){return 9n;}else{count=add(count,2n);}}return count;}
export function nearest(){let count=0n;do{{count=add(count,1n);continue;}}while(count<2n);return count;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('whole lexical blocks retain local cleanup incoming assignments and nearest abrupt completion',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));
 assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,api=>{assert.equal(api.continued(),3n);assert.equal(api.stopped(),1n);assert.equal(api.terminal(),true);assert.equal(api.local(),2n);assert.equal(api.alternatives(),9n);assert.equal(api.nearest(),2n);});
 assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('canonical native lexical blocks reproduce the complete original Rust source syntax',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source));
 const reverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});
 assert.ok(sameRustSourceSyntax(result.rust,reverse.rust));assert.equal(reverse.rustExecuted,false);
});
test('lexical blocks refuse escaping locals type mismatches shadowing and unreachable continuation',limits,()=>{
 for(const body of [
  'export function bad(){{const local=true;}return local;}',
  'export function bad(){let count=0n;{count=true;}return count;}',
  'export function bad(){const outer=true;{const outer=false;}return outer;}',
  'export function bad(){{return true;}return false;}',
  'export function bad(){{break;}return null;}',
  'export function bad(){{continue;}return null;}',
  'export function bad(){{if(true){return true;}else{return 1n;}}}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);
 meta.functions.find(row=>row.name==='terminal').flow.tail.body.tail.kind='fallthrough';
 assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('lexical scope source substitutions retain complete independent originals and both ordered inverses',limits,()=>{
 const plan=prepareHttpResourceLexicalScopeSources();assert.equal(plan.files.length,4);
 for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
