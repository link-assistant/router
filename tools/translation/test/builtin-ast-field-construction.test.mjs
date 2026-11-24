import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
// Eight source-only authored cases; ALL UNRUN, no generated trait execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../builtin-derive-ast-meta.mjs';
import {createBuiltinAstSourceSubstitution,isBuiltinAstSourceSubstitution} from '../builtin-ast-source-substitution.mjs';
import {createBuiltinDeriveFieldAstBridge,assertBuiltinDeriveFieldAstBridge,isBuiltinDeriveFieldAstBridge} from '../builtin-ast-field-construction.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalCsvContext} from './original-csv-context.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies),generic='compiler/rustc_builtin_macros/src/deriving/generic/mod.rs';
function route(name){const stage=createBuiltinAstSourceSubstitution(profile),fragment=originalAstFunction(profile,generic,name),program=stage.compile(fragment);return {stage,fragment,program,result:stage.substitute(program)};}
function collect(node,predicate,output=[]){
  if(!node||typeof node!=='object')return output;if(predicate(node))output.push(node);
  for(const [key,value]of Object.entries(node))if(!['syntax','schema','recipe','import','sourceBinding','original','typeSyntax'].includes(key))if(Array.isArray(value))value.forEach(value=>collect(value,predicate,output));else collect(value,predicate,output);return output;
}
function selected(source){const context=createDeriveFootprintContext({dependencies,compilationProfile:PRODUCTION_PROFILE,modules:[{file:'src/lib.rs',path:[],source:'mod data;'},{file:'src/data.rs',path:['data'],source}]}),certificate=context.certificates[0];assert.ok(certificate);const attribute=certificate.attributes.find(value=>value.derives?.some(path=>path.length===1&&path[0]==='Clone'));assert.ok(attribute);return {context,certificate,invocation:{path:['Clone'],attributeSpan:attribute.span}};}

test('original create_fields self_expr is the actual source-local remove(0), not a field-name template',()=>{
  const {program,result}=route('create_fields');
  const records=collect(result.tree,value=>value.tag==='original-positive-record'&&value.name==='FieldInfo');assert.equal(records.length,1);
  const self=records[0].fields.find(value=>value.schema.name==='self_expr').value;assert.equal(self.tag,'source-slot-substitution');
  assert.equal(self.value.kind,'source-method-call');assert.equal(self.value.method,'remove');assert.equal(self.value.args[0].spelling,'0');
  const expressions=program.slots.find(value=>value.name==='exprs');assert.equal(expressions.mutable,true);
  assert.ok(program.obligations.some(value=>value.kind==='closure-pattern-input-domain'));
  assert.equal(result.mutationControlEstablished,false);assert.equal(result.selectedOwnerBangComplete,false);
});

test('actual field access constructor derives its Field variant and receiver from original source schemas',()=>{
  const {program,result}=route('create_struct_field_access_fields');
  const initializer=program.slots.find(value=>value.name==='field_expr'&&value.kind==='local').value;
  const fields=collect(initializer,value=>value.tag==='original-positive-enum'&&value.schema.name==='Field');assert.equal(fields.length,1);
  assert.equal(fields[0].schema.source,'compiler/rustc_ast/src/ast.rs');assert.equal(fields[0].schema.arity,2);
  assert.equal(fields[0].args[0].method,'clone');assert.equal(fields[0].args[1].method,'unwrap_or_else');
  const built=collect(result.tree,value=>value.tag==='source-substituted-builder-result');assert.ok(built.length);
  assert.ok(collect(result.tree,value=>value.tag==='source-built-ast-record'&&value.owner==='Expr').length);
  assert.equal(result.optionOwnerEstablished,false);assert.equal(result.allocationPhaseBehavior,false);
});

test('packed mutation preserves both actual slot versions and an unselected join',()=>{
  const {program,result}=route('create_struct_field_access_fields'),initial=program.slots.find(value=>value.name==='field_expr'&&value.kind==='local'),mutation=program.slots.find(value=>value.name==='field_expr'&&value.kind==='open-mutation'),join=program.slots.find(value=>value.name==='field_expr'&&value.kind==='open-control-join');
  assert.ok(initial);assert.ok(mutation);assert.ok(join);assert.notEqual(initial.id,mutation.id);
  assert.equal(join.value.thenSlot,mutation.id);assert.equal(join.value.elseSlot,initial.id);
  assert.ok(collect(result.tree,value=>value.tag==='original-if'&&value.selectionEstablished===false).length);
  assert.ok(program.obligations.some(value=>value.kind==='source-mutation'));
  assert.ok(collect(result.tree,value=>value.tag==='unselected-source-join').length);
});

test('actual empty fallback closure retains capture and source hygiene requirements',()=>{
  const {program}=route('create_struct_field_access_fields'),initializer=program.slots.find(value=>value.name==='field_expr'&&value.kind==='local').value,closures=collect(initializer,value=>value.tag==='source-closure'&&value.parameters.length===0);assert.equal(closures.length,1);
  const index=program.slots.find(value=>value.name==='i');assert.ok(closures[0].capturedSlots.includes(index.id));
  const calls=collect(closures[0].body,value=>value.kind==='source-function-call'&&value.path.join('::')==='Ident::from_str_and_span');assert.equal(calls.length,1);
  assert.equal(calls[0].args[0].value.method,'to_string');assert.equal(calls[0].args[1].member,'span');
  assert.equal(program.selectedOwnerBangComplete,false);
});

test('pattern route retains actual mk_pattern_ident and format path rather than manufactured names',()=>{
  const {program,result}=route('create_struct_pattern_fields');
  const initializer=program.slots.find(value=>value.name==='ident'&&value.kind==='local').value;
  assert.ok(collect(initializer,value=>value.kind==='source-method-call'&&value.method==='mk_pattern_ident').length);
  assert.ok(collect(result.tree,value=>value.tag==='source-slot-substitution').length);
  const actual=route('mk_pattern_ident');assert.ok(actual.program.obligations.some(value=>value.kind==='source-expression-grammar'));
  assert.equal(result.selectedOwnerBangComplete,false);assert.equal(result.generatedImplBehavior,false);
});

test('fresh private source programs reject copied recipes/programs/results without caller substitutions',()=>{
  const {stage,fragment,program,result}=route('create_fields');assert.equal(isBuiltinAstSourceSubstitution(result),true);assert.equal(isBuiltinAstSourceSubstitution(structuredClone(result)),false);
  assert.throws(()=>stage.compile(structuredClone(fragment)),/Unsealed/);assert.throws(()=>stage.substitute(structuredClone(program)),/original private source/);
  assert.throws(()=>createBuiltinAstSourceSubstitution(profile).substitute(program),/original private source/);
  assert.throws(()=>stage.assert(structuredClone(result)),/original private source/);
  assert.equal(stage.compile(fragment),program);assert.ok(Object.isFrozen(result.tree));
});

test('invocation bridge retains original field type tokens and rejects cloned certificate/changed invocation',()=>{
  const args=selected('#[derive(Clone,serde::Serialize)] struct Payload { value:String, other:u64 }'),bridge=createBuiltinDeriveFieldAstBridge(args);
  assert.deepEqual(bridge.rows.map(value=>value.name.spelling),['value','other']);assert.deepEqual(bridge.rows.map(value=>value.type.syntax),['String','u64']);
  assert.equal(bridge.routes.length,3);assert.equal(bridge.fieldAstInputEstablished,false);assert.equal(bridge.featureCompleteness,false);assert.equal(bridge.optionOwnerEstablished,false);
  assert.equal(isBuiltinDeriveFieldAstBridge(structuredClone(bridge)),false);
  assert.throws(()=>createBuiltinDeriveFieldAstBridge({...args,certificate:structuredClone(args.certificate)}),/sealed/);
  assert.throws(()=>assertBuiltinDeriveFieldAstBridge(bridge,args.context,args.certificate,{path:['Debug'],attributeSpan:args.invocation.attributeSpan}),/original private invocation/);
});

test('complete unchanged original provider/catalog retain source-qualified field construction with all obligations open',{timeout:60_000},()=>{
  const original=originalCsvContext(),graph=resolveModuleGraph({entry:'src/lib.rs',paths:original.inputs.sources.map(row=>row.source),readSource:original.source,compilationProfile:PRODUCTION_PROFILE}),context=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
  for(const [source,name,sha,span,count] of [
    ['src/subscription/types.rs','SubscriptionProvider','74996ec0b4a32cb6e8d8c6a5e4cf2057a09238acff6d141ad58b592184c12c26',{start:105,end:639},0],
    ['src/model_catalog.rs','CatalogRecord','2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5',{start:1956,end:2355},8],
  ]){
    const certificate=context.certificates.find(value=>value.source===source&&value.name===name);assert.ok(certificate);const attribute=certificate.attributes.find(value=>value.derives?.some(path=>path.length===1&&path[0]==='Clone'));assert.ok(attribute);
    const value=createBuiltinDeriveFieldAstBridge({context,certificate,invocation:{path:['Clone'],attributeSpan:attribute.span}});
    assert.equal(value.sourceSha256,sha);assert.deepEqual(value.span,span);assert.equal(value.rows.length,count);assert.equal(value.routes[0].fragment.sourceSha256,'a61c43391cbb0c1cf99bbe3e388d502d113c295fa38d818dfac9c374948e3af8');
    assert.equal(value.selectedOwnerBangComplete,false);assert.equal(value.generatedImplBehavior,false);assert.equal(value.allocationPhaseBehavior,false);
    for(const row of value.rows){assert.equal(original.source(source).slice(row.name.span.start,row.name.span.end),row.name.spelling);assert.equal(original.source(source).slice(row.type.span.start,row.type.span.end),row.type.syntax);}
  }
});
