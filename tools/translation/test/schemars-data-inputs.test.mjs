import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {types} from 'node:util';
import {sourceItems} from '../rust-structure.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {schemarsDeriveDataInputs,originalSchemarsDataSourcePlan} from '../schemars-data-inputs.mjs';
const root=new URL('../../../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
function input(source){const item=sourceItems(source).find(row=>row.name==='Record');return schemarsDeriveDataInputs({source,span:{start:item.start,end:item.end}});}
test('outer docs attach only after the preceding actual item, preserving original comment and field token spans',()=>{
 const source='/// old item\nfn old(){}\n/// λ😀\n// inert comment\n/// second\n#[derive(schemars::JsonSchema)]pub struct Record{/// field doc\n#[serde(default)]pub(crate) value:Option<String>,pub next:bool}',result=input(source);
 assert.deepEqual(result.attributes.filter(row=>row.position==='container'&&row.name==='doc').map(row=>source.slice(row.span.start,row.span.end)),['/// λ😀','/// second']);
 const field=result.fields[0];assert.equal(source.slice(field.synTokenSpan.start,field.synTokenSpan.end),'/// field doc\n#[serde(default)]pub(crate) value:Option<String>');assert.equal(source.slice(field.fieldDefinitionSpan.start,field.fieldDefinitionSpan.end),'pub(crate) value:Option<String>');assert.equal(source.slice(field.nameSpan.start,field.nameSpan.end),'value');assert.equal(source.slice(field.typeSpan.start,field.typeSpan.end),'Option<String>');assert.equal(result.fields[1].synTokenSpan.start,result.fields[1].fieldDefinitionSpan.start);
 assert.equal(result.ownerAuthority,false);assert.equal(result.namespaceAuthority,false);assert.equal(result.generatedImplBehavior,false);assert.equal(Object.isFrozen(result.fields[0].synTokenSpan),true);
});
test('explicit and field line docs retain source syntax without manufactured attribute source',()=>{
 const source='#[derive(schemars::JsonSchema)]#[doc=" explicit"]pub struct Record{/// field\nvalue:u8}',result=input(source);assert.equal(result.leadingDocSpans.length,0);assert.equal(result.attributes.find(row=>row.position==='container'&&row.name==='doc').source,'#[doc=" explicit"]');assert.equal(result.fields[0].attributes[0].source,'/// field');
});
test('inner/block docs, generic declarations and untrusted source/span accessors stay refused',()=>{
 for(const source of ['//! inner\n#[derive(schemars::JsonSchema)]pub struct Record{v:u8}','/** block */#[derive(schemars::JsonSchema)]pub struct Record{v:u8}','#[derive(schemars::JsonSchema)]pub struct Record<T>{v:T}','#[derive(schemars::JsonSchema)]pub struct Record{#[cfg(test)]v:u8}'])assert.throws(()=>input(source));
 let traps=0;const accessor=Object.defineProperty({},'source',{get(){traps++;throw Error('getter');}});assert.throws(()=>schemarsDeriveDataInputs(accessor));assert.equal(traps,0);const proxy=new Proxy({source:'',span:{}},{get(){traps++;throw Error('proxy');}});assert.equal(types.isProxy(proxy),true);assert.throws(()=>schemarsDeriveDataInputs(proxy));assert.equal(traps,0);
});
test('source plan retains original lexical/parser/Field print recipes and only genuine dependencies cache them',()=>{
 const plan=originalSchemarsDataSourcePlan(dependencies);assert.equal(originalSchemarsDataSourcePlan(dependencies),plan);assert.equal(plan.rules.length,7);assert.ok(plan.rules.every(row=>row.sourceSha256&&row.sha256&&row.span.end>row.span.start));assert.equal(plan.namespaceAuthority,false);assert.equal(plan.spanIdentityAuthority,false);assert.equal(plan.generatedImplBehavior,false);assert.throws(()=>originalSchemarsDataSourcePlan(structuredClone(dependencies)));let traps=0;assert.throws(()=>originalSchemarsDataSourcePlan(new Proxy({},{get(){traps++;throw Error('getter');}})));assert.equal(traps,0);
});
