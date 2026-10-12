// Eight source-only authored cases; ALL UNRUN, no Rust/parser/generator execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {builtinDeriveAstSourceProfile,astSyntaxText} from '../builtin-derive-ast-meta.mjs';
import {builtinParsedFieldConstructorSources,createBuiltinParsedFieldValueBridge,assertBuiltinParsedFieldValues,isBuiltinParsedFieldValues} from '../builtin-parsed-field-values.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalCsvContext} from './original-csv-context.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies);
function selected(source){const context=createDeriveFootprintContext({dependencies,compilationProfile:PRODUCTION_PROFILE,modules:[{file:'src/lib.rs',path:[],source:'mod data;'},{file:'src/data.rs',path:['data'],source}]}),certificate=context.certificates[0];assert.ok(certificate);const attribute=certificate.attributes.find(value=>value.derives?.some(path=>path.length===1&&path[0]==='Clone'));assert.ok(attribute);return {context,certificate,invocation:{path:['Clone'],attributeSpan:attribute.span}};}
function collect(node,predicate,result=[]){if(!node||typeof node!=='object')return result;if(predicate(node))result.push(node);for(const [key,value]of Object.entries(node))if(!['syntax','schema','recipe','import','typeSyntax','sourceBinding','original'].includes(key))if(Array.isArray(value))value.forEach(value=>collect(value,predicate,result));else collect(value,predicate,result);return result;}

test('actual parse_name_and_ty constructs all nine FieldDef fields in original initializer order',()=>{
  const value=builtinParsedFieldConstructorSources(profile);assert.deepEqual(value.field.value.fields.map(value=>value.name),['span','ident','vis','safety','id','ty','default','attrs','is_placeholder']);
  assert.equal(value.field.function.source,'compiler/rustc_parse/src/parser/item.rs');assert.equal(value.field.function.sourceSha256,'072e9ef9c2554296643fdb16102462b5d15b8255e39142a9d697e03d6a9240c2');
  assert.ok(value.field.value.fields.every(field=>field.expectedSchemaMember.name===field.name&&field.typeOwnershipEstablished===false));
  assert.equal(value.field.ownerEstablished,false);assert.equal(value.fieldAstInputEstablished,false);assert.equal(value.selectedOwnerBangComplete,false);
});

test('actual name/type initializer try nodes retain parse calls without erasing errors or assuming Result owners',()=>{
  const value=builtinParsedFieldConstructorSources(profile),ident=value.field.value.fields.find(value=>value.name==='ident'),ty=value.field.value.fields.find(value=>value.name==='ty');
  const names=collect(ident.value,node=>node.tag==='original-source-try');assert.equal(names.length,1);assert.equal(names[0].tryOwnerEstablished,false);assert.equal(names[0].value.method,'parse_field_ident');
  const types=collect(ty.value,node=>node.tag==='original-source-try');assert.equal(types.length,1);assert.equal(types[0].value.method,'parse_ty');
  assert.equal(value.optionOwnerEstablished,false);assert.equal(value.parserBranchSelectionEstablished,false);
});

test('default/attrs/visibility/safety and recovery recipes remain original unresolved values',()=>{
  const value=builtinParsedFieldConstructorSources(profile),fields=value.field.value.fields;
  for(const name of ['attrs','vis','safety'])assert.equal(fields.find(field=>field.name===name).value.tag,'source-slot-substitution');
  const defaultValue=fields.find(field=>field.name==='default').value;assert.equal(defaultValue.tag,'source-slot-substitution');assert.equal(defaultValue.value.kind,'source-expression-grammar');
  assert.ok(value.chain.some(value=>value.source==='compiler/rustc_parse/src/parser/mod.rs'));assert.ok(value.chain.some(value=>value.source==='compiler/rustc_parse/src/parser/item.rs'));
  assert.equal(value.attributeStorageEstablished,false);assert.equal(value.fieldIdentifierHygieneEstablished,false);
});

test('mk_ty and path schema use actual original constructors while keeping macro/bound branches separate',()=>{
  const value=builtinParsedFieldConstructorSources(profile);assert.equal(value.type.recipe.name,'Ty');assert.deepEqual(value.type.recipe.fields.map(value=>value.name),['kind','span','id','tokens']);
  assert.equal(value.type.function.sourceSha256,'6d24d479fa505e77182e784acdade0ec736b980aca5c3193a7638f99f5d624a3');
  assert.equal(value.type.pathVariant.name,'Path');assert.equal(value.type.pathVariant.arity,2);
  assert.ok(collect(value.type.value.tree,node=>node.tag==='original-positive-record'&&node.name==='Ty').length);
  assert.equal(value.type.ownerEstablished,false);assert.equal(value.allocationPhaseBehavior,false);assert.equal(value.generatedImplBehavior,false);
});

test('unicode original token coordinates remain source ranges rather than fabricated rustc Span/Ident values',()=>{
  const args=selected('#[derive(Clone,serde::Serialize)] struct Payload { é:String, 字:u64 }'),value=createBuiltinParsedFieldValueBridge(args);
  assert.deepEqual(value.rows.map(value=>value.name.syntax),['é','字']);
  for(const row of value.rows){assert.equal(row.name.compilerValueEstablished,false);assert.equal(row.type.compilerValueEstablished,false);assert.equal(row.fieldAstInputEstablished,false);assert.ok(row.name.sourceUtf8Range.end>row.name.sourceUtf16Span.end);}
  assert.equal(value.fieldIdentifierHygieneEstablished,false);assert.equal(value.rows[0].type.syntax,'String');
});

test('private source/certificate/profile/invocation pairing rejects copied value claims or absent context',()=>{
  const sources=builtinParsedFieldConstructorSources(profile);assert.equal(isBuiltinParsedFieldValues(sources),true);assert.equal(isBuiltinParsedFieldValues(structuredClone(sources)),false);
  assert.throws(()=>assertBuiltinParsedFieldValues(sources,{}),/original private source identity/);assert.throws(()=>builtinParsedFieldConstructorSources(structuredClone(profile)),/Unsealed/);
  const args=selected('#[derive(Clone,serde::Serialize)] struct Payload { value:u8 }'),value=createBuiltinParsedFieldValueBridge(args);
  assert.throws(()=>createBuiltinParsedFieldValueBridge({...args,certificate:structuredClone(args.certificate)}),/sealed/);
  assert.throws(()=>assertBuiltinParsedFieldValues(structuredClone(value),args),/original private source identity/);
  assert.throws(()=>assertBuiltinParsedFieldValues(value,{...args,invocation:{path:['Debug'],attributeSpan:args.invocation.attributeSpan}}),/original private source identity/);
});

test('unproved field generics/type paths are retained as tokens, not resolved trait/type/allocator authorities',()=>{
  const args=selected('#[derive(Clone,serde::Serialize)] struct Payload { value:serde_json::Map<String,serde_json::Value>, other:Box<u8> }'),value=createBuiltinParsedFieldValueBridge(args);
  assert.deepEqual(value.rows.map(row=>row.type.syntax),['serde_json::Map<String,serde_json::Value>','Box<u8>']);
  assert.equal(value.fieldAstInputEstablished,false);assert.equal(value.allocationPhaseBehavior,false);assert.equal(value.optionOwnerEstablished,false);
  assert.ok(value.obligations.some(value=>value.includes('scope/type/attribute')));assert.equal(astSyntaxText(value.constructors.type.pathVariant.fields[0]),'Option < P < QSelf > >');
});

test('complete unchanged provider/catalog input spans retain all original field leaves and false compiler-value authority',{timeout:60_000},()=>{
  const original=originalCsvContext(),graph=resolveModuleGraph({entry:'src/lib.rs',paths:original.inputs.map(row=>row.path),readSource:original.source,compilationProfile:PRODUCTION_PROFILE}),context=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
  for(const [source,name,sha,span,count] of [
    ['src/subscription/types.rs','SubscriptionProvider','74996ec0b4a32cb6e8d8c6a5e4cf2057a09238acff6d141ad58b592184c12c26',{start:105,end:639},0],
    ['src/model_catalog.rs','CatalogRecord','2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5',{start:1956,end:2355},8],
  ]){
    const certificate=context.certificates.find(value=>value.source===source&&value.name===name);assert.ok(certificate);const attribute=certificate.attributes.find(value=>value.derives?.some(path=>path.length===1&&path[0]==='Clone'));assert.ok(attribute);
    const args={context,certificate,invocation:{path:['Clone'],attributeSpan:attribute.span}},value=createBuiltinParsedFieldValueBridge(args);assert.equal(value.sourceSha256,sha);assert.deepEqual(value.span,span);assert.equal(value.rows.length,count);
    assert.equal(assertBuiltinParsedFieldValues(value,args),value);assert.equal(value.selectedOwnerBangComplete,false);assert.equal(value.generatedImplBehavior,false);
    for(const row of value.rows)for(const leaf of [row.name,row.type]){assert.equal(original.source(source).slice(leaf.sourceUtf16Span.start,leaf.sourceUtf16Span.end),leaf.syntax);assert.equal(leaf.compilerValueEstablished,false);}
  }
});
