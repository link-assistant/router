import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeSubInput,declarativeNestedMacroInvocations,declarativeNestedMacroInput,declarativeExpansionLineage} from '../declarative-token-macros.mjs';
import {createDeclarativeMacroEngine} from '../declarative-macro-engine.mjs';
import {originalMacroTrees,originalMacroInvocation,originalMacroTreeText} from '../macro-token-trees.mjs';
import {loadJsonMacroSourceProof,jsonMacroOriginalSource} from '../json-macro-inputs.mjs';

const root=new URL('../../../',import.meta.url),dependencies=loadJsonMacroSourceProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
const original=jsonMacroOriginalSource(dependencies,'serde_json','src/macros.rs');
const definitions=Object.fromEntries(['json','json_internal','json_unexpected','json_expect_expr_comma'].map(name=>[name,compileDeclarativeMacro(original.source,{name,owner:['serde_json'],...(name==='json_internal'?{maxRules:37}:{})})]));
function closure(source){
 const root=expandDeclarativeMacro(definitions.json,originalMacroInvocation(source).trees),trace=[root],unknown=[];
 for(let index=0;index<trace.length;index++)for(const call of declarativeNestedMacroInvocations(trace[index])){
  const name=call.writtenPath.at(-1);
  if(call.hygiene!=='definition-site-dollar-crate'||call.writtenPath[0]!=='serde_json'||!definitions[name]){unknown.push(call);continue;}
  if(trace.length>=128)throw new TypeError('Complete JSON trace exceeds its unchanged bounded scope');
  trace.push(expandDeclarativeMacro(definitions[name],declarativeNestedMacroInput(trace[index],call)));
 }
 return {root,trace,unknown};
}
for(const source of ['json!(null)','json!(true)','json!({})','json!({"reason":"max_output_tokens"})','json!({"type":"response.incomplete","response":response})','json!({"error":{"type":error.code,"message":error.to_string()}})'])test('complete original nested JSON expansion '+source+' preserves every private forwarding edge',()=>{
 const result=closure(source);assert.deepEqual(result.unknown,[]);assert.ok(result.trace.length>=2);
 if(process.env.ROUTER_NESTED_MACRO_VECTORS){mkdirSync(process.env.ROUTER_NESTED_MACRO_VECTORS,{recursive:true});writeFileSync(join(process.env.ROUTER_NESTED_MACRO_VECTORS,Buffer.from(source).toString('hex')+'.json'),JSON.stringify({source,original,definitions,result})+'\n');}
 for(const expansion of result.trace){
  assert.equal(expansion.ownerVerified,false);assert.equal(expansion.namespaceComplete,false);assert.equal(expansion.generatedBehavior,false);
  const lineage=declarativeExpansionLineage(expansion);
  if(expansion!==result.root){assert.ok(result.trace.includes(lineage.parent));assert.equal(lineage.sourceAssociationKind,'checked-nested-macro-input');assert.equal(expansion.input.kind,'checked-nested-macro-input');}
 }
 const leaves=result.trace.filter(expansion=>declarativeNestedMacroInvocations(expansion).length===0);assert.ok(leaves.length);
 if(source.includes('max_output_tokens'))assert.ok(leaves.some(expansion=>expansion.trees.map(originalMacroTreeText).join(' ').includes('max_output_tokens')));
});
test('opaque outer expressions remain opaque while their own nested bang input can expand',()=>{
 const outer=compileDeclarativeMacro('macro_rules! outer{($e:expr)=>{$e};}',{name:'outer',owner:['test']}),inner=compileDeclarativeMacro('macro_rules! inner{(u8)=>{true};}',{name:'inner',owner:['test']});
 const parent=expandDeclarativeMacro(outer,originalMacroTrees('inner!(u8)'));
 assert.throws(()=>expandDeclarativeMacro(inner,declarativeSubInput(parent)),/does not match/);
 const calls=declarativeNestedMacroInvocations(parent);assert.equal(calls.length,1);assert.deepEqual(calls[0].writtenPath,['inner']);assert.equal(calls[0].ownerVerified,false);
 const child=expandDeclarativeMacro(inner,declarativeNestedMacroInput(parent,calls[0]));assert.equal(child.trees.map(originalMacroTreeText).join(' '),'true');
 const bare=expandDeclarativeMacro(outer,originalMacroTrees('(u8)'));assert.deepEqual(declarativeNestedMacroInvocations(bare),[]);
 assert.throws(()=>declarativeNestedMacroInput(bare,{path:[{kind:'opaque-fragment',index:0}]}),/exact private parent/);
});
test('copied changed foreign getter and proxy invocation records never issue private nested inputs',()=>{
 const {root,trace}=closure('json!(true)'),call=declarativeNestedMacroInvocations(root)[0];let reads=0;
 for(const fake of [structuredClone(call),{...call},new Proxy(call,{}),Object.defineProperty({},'path',{get(){reads++;return call.path;}})])assert.throws(()=>declarativeNestedMacroInput(root,fake),/exact private parent/);
 assert.equal(reads,0);assert.throws(()=>declarativeNestedMacroInput(trace[1],call),/exact private parent/);assert.throws(()=>declarativeNestedMacroInvocations(structuredClone(root)),/privately checked/);
 const foreign=createDeclarativeMacroEngine();assert.throws(()=>foreign.declarativeNestedMacroInput(root,call),/exact private parent/);
});
test('unknown payload macros and allocation macros retain their independent source obligations',()=>{
 const payload=closure('json!({"value":unknown!(u8)})');assert.ok(payload.unknown.some(call=>call.writtenPath.at(-1)==='unknown'));
 const arrays=closure('json!([true])');assert.ok(arrays.unknown.some(call=>call.writtenPath.join('::')==='serde_json::__private::vec'));
});
test('nested forwarding retains original step output and recursion caps',()=>{
 const definition=compileDeclarativeMacro('macro_rules! again{($e:expr)=>{$crate::again!($e)};}',{name:'again',owner:['test']});
 let current=expandDeclarativeMacro(definition,originalMacroTrees('true'));
 for(let depth=1;depth<=32;depth++){const call=declarativeNestedMacroInvocations(current)[0];current=expandDeclarativeMacro(definition,declarativeNestedMacroInput(current,call));assert.equal(declarativeExpansionLineage(current).depth,depth);}
 const input=declarativeNestedMacroInput(current,declarativeNestedMacroInvocations(current)[0]);assert.throws(()=>expandDeclarativeMacro(definition,input),/recursive expansion depth budget/);
 const root=expandDeclarativeMacro(definition,originalMacroTrees('true')),fresh=declarativeNestedMacroInput(root,declarativeNestedMacroInvocations(root)[0]);assert.throws(()=>expandDeclarativeMacro(definition,fresh,{output:1}),/budget/);
 const pair=compileDeclarativeMacro('macro_rules! pair{($a:expr,$b:expr)=>{true};}',{name:'pair',owner:['test']});assert.throws(()=>expandDeclarativeMacro(pair,originalMacroTrees('true,false'),{steps:1}),/budget/);
});
