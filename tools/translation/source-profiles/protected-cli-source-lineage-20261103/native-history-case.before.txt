import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createConcreteSyntaxMeta,serializeConcreteSyntaxMeta,parseConcreteSyntaxMeta,transportConcreteSyntaxMeta,reconstructConcreteSyntax} from '../concrete-syntax-meta.mjs';
import {prepareNativeParsedCst} from '../prepare-native-parsed-cst.mjs';
import {prepareNativeParsedCstHistory} from '../prepare-native-parsed-cst-history.mjs';
import {nativeStaticImportCount} from './native-source-fixture-inputs.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const outcome=run=>{try{return {accepted:true,value:run()};}catch(error){return {accepted:false,name:error.name,message:error.message};}};
test('native parsed source transport preserves complete original validator results for independent whole sources',{timeout:60000},()=>{
 const sources=[['Rust',''],['Rust','\ufeff// Ω😀\r\nfn copy(v:u8)->u8 { /* nested /* keep */ comment */ v }'],['Rust','macro_rules! x { ($v:expr)=>{{ $v }}; }'],['Rust','fn raw(){let value=r###"}/*😀"###;}'],['Rust','fn broken(] {'],['Rust','('.repeat(256)+'x'+')'.repeat(256)],['JavaScript','export function copy(value) { return value; }'],['JavaScript','const value = `x${flag ? `y${1}` : /[}]/.source}`;'],['JavaScript','function divide(a,b){return a / b;}'],['TypeScript','export function copy(value: readonly [number,string]): number {return value[0];}'],['TypeScript','const incomplete = `x${1};'],['Rust','// '+String.fromCharCode(0xd800)+'\nfn value() {}']];
 for(const [language,source]of sources){
  const canonical=serializeConcreteSyntaxMeta(createConcreteSyntaxMeta(source,{language})),expected=parseConcreteSyntaxMeta(canonical),received=transportConcreteSyntaxMeta(canonical);
  assert.deepEqual(received.document,expected);assert.equal(received.meta,canonical);assert.equal(received.source,source);assert.equal(reconstructConcreteSyntax(received.document),source);assert.deepEqual(received.document.authority,{type:false,owner:false,executable:false});
 }
});
test('altered canonical fields and noncanonical wire retain original exact refusal messages',{timeout:60000},()=>{
 const wire=serializeConcreteSyntaxMeta(createConcreteSyntaxMeta('fn copy(value:u8)->u8 { /* keep */ value }',{language:'Rust'})),mutations=[
  value=>{value.authority.owner=true;},value=>{value.schema='forged';},value=>{value.language='Unknown';},value=>{value.source=7;},value=>{value.sourceEncoding.utf8Bytes++;},value=>{value.nodes[0][3]--;},value=>{value.nodes[1][6]=1;},value=>{value.nodes[2][1]='forged';},value=>{value.nodes.push(['token','number',0,1,0,1,0]);},value=>{value.diagnostics=[['forged',0,1]];},value=>{value.extra=true;},value=>{value.status='forged';},value=>{value.nodes={};},value=>{delete value.source;}
 ];
 const invalid=mutations.map(mutate=>{const value=JSON.parse(wire);mutate(value);return JSON.stringify(value);});
 invalid.push(' '+wire,wire+'\n',wire.replace('"schema":','"schema" :'),wire.replace('"source":','"source":"overwritten","source":'),wire.replace('"utf16CodeUnits":','"utf16CodeUnits":0,"utf16CodeUnits":'),'{','[]','null',JSON.stringify(wire));
 for(const changed of invalid){const original=outcome(()=>parseConcreteSyntaxMeta(changed)),received=outcome(()=>transportConcreteSyntaxMeta(changed));assert.equal(original.accepted,false);assert.equal(received.accepted,false);assert.equal(received.name,original.name);assert.equal(received.message,original.message);}
});
test('actual source proposal preserves every original function and both complete CST phase inverses',{timeout:60000},async()=>{
 const plan=await prepareNativeParsedCst({root:root.pathname});assert.equal(plan.files.length,2);assert.equal(plan.noAcrossInvocationCache,true);assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);assert.equal(plan.performanceQualified,false);
 for(const input of plan.originalInputs)assert.equal(hash(input.source),input.sha256);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(readFileSync(new URL(row.path,root),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.ok(row.after.startsWith(row.before));assert.equal(row.selection.originalPrefixUnchanged,true);assert.ok(row.selection.unchangedOriginalFunctions.length>10);assert.equal(row.selection.nativeParsedCalls.length,2);assert.equal(row.selection.twoIndependentBuildsRetained,true);assert.equal(row.selection.originalValidatorFallback,true);assert.equal(row.selection.buildFailureUsesOriginalValidator,true);assert.equal(row.selection.newAcrossInvocationCache,false);assert.equal(row.selection.allOriginalBudgetsRetained,true);assert.deepEqual(row.trace.map(item=>item.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}}
});
test('current-source joins and fixture setup retain complete native selections and both CST inverses',{timeout:60000},()=>{
 const plan=prepareNativeParsedCstHistory();assert.equal(plan.files.length,5);assert.equal(plan.oldSourceCountsPreserved,true);assert.equal(plan.newAcrossInvocationCache,false);for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}}
});
test('fixture import counts cover complete static imports and exclude comments strings and dynamic imports',{timeout:60000},()=>{
 const source='import {a} from "./actual.mjs";\nimport "./actual.mjs";\n// from "./actual.mjs"\nconst note="from ./actual.mjs";import("./actual.mjs");';assert.equal(nativeStaticImportCount(source,'./actual.mjs'),2);assert.equal(nativeStaticImportCount(source,'./absent.mjs'),0);assert.throws(()=>nativeStaticImportCount('import {','./actual.mjs'),/grammar/);
});
