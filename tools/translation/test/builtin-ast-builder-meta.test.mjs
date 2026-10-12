// Source-only callback foundation: all cases UNRUN, no namespace activation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../builtin-derive-ast-meta.mjs';
import {createBuiltinAstBuilderMetaCompiler,isBuiltinAstBuilderMetaContract,inventoryBuiltinAstCallbackCalls,isBuiltinAstCallbackBuilderInventory} from '../builtin-ast-builder-meta.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {planBuiltinDeriveBangOutput} from '../builtin-derive-bang-footprints.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalCsvContext} from './original-csv-context.mjs';
import {encodeBuiltinSourceMeta,decodeBuiltinSourceMeta,sealBuiltinSourceMeta} from '../builtin-source-meta.mjs';
const root=new URL('../../../',import.meta.url);
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies),compiler=createBuiltinAstBuilderMetaCompiler(profile);
function walk(node,visit){if(!node||typeof node!=='object')return;visit(node);for(const [key,value] of Object.entries(node))if(!['syntax','recipe','positiveSchemas','variantSchema','import','binding','fieldSchema'].includes(key))if(Array.isArray(value))value.forEach(value=>walk(value,visit));else walk(value,visit);}

test('actual Unary constructor preserves source slots, original import and positive variant schema',()=>{
  const contract=compiler.compile('expr_deref');assert.equal(isBuiltinAstBuilderMetaContract(contract),true);
  assert.equal(contract.result.tag,'original-builder-call');assert.equal(contract.result.method,'expr');
  const unary=contract.result.args[1];assert.equal(unary.tag,'positive-ast-enum-constructor');assert.equal(unary.owner,'ExprKind');assert.equal(unary.variant,'Unary');assert.equal(unary.variantSchema.arity,2);
  assert.equal(unary.args[0].owner,'UnOp');assert.equal(unary.args[0].variant,'Deref');assert.equal(unary.args[1].tag,'bound-source-slot');assert.equal(unary.args[1].name,'e');
  assert.deepEqual(unary.import.target,['rustc_ast']);assert.equal(contract.generatedImplBehavior,false);assert.equal(contract.selectedOwnerBangComplete,false);
});

test('actual Call arguments retain distinct lexical parameters and constructor arity',()=>{
  const contract=compiler.compile('expr_call'),call=contract.result.args[1];
  assert.equal(call.variant,'Call');assert.equal(call.variantSchema.arity,2);assert.deepEqual(call.args.map(value=>value.name),['expr','args']);
  assert.equal(call.args[0].binding.parameter.typeSyntax.some(node=>node.text==='Expr'),true);
  assert.equal(call.args[1].binding.parameter.typeSyntax.some(node=>node.text==='ThinVec'),true);
  assert.equal(contract.sourceExpressionRoundTrip,true);assert.ok(Object.isFrozen(contract.result));assert.equal(compiler.compile('expr_call'),contract);
});

test('actual Path schema does not bless an unresolved None slot or infer namespace closure',()=>{
  const contract=compiler.compile('expr_path'),path=contract.result.args[1];
  assert.equal(path.variant,'Path');assert.equal(path.variantSchema.arity,2);
  assert.equal(path.args[0].tag,'unresolved-source-value');assert.equal(path.args[0].name,'None');
  assert.ok(contract.unresolved.some(value=>value.name==='None'));assert.equal(contract.selectedOwnerBangComplete,false);
  assert.equal(contract.result.args[0].tag,'bound-source-projection');assert.equal(contract.result.args[0].member,'span');
});

test('real local constructor flow preserves initializer before the bound use',()=>{
  const contract=compiler.compile('expr_call_global');assert.equal(contract.statements.length,1);
  assert.equal(contract.statements[0].name,'pathexpr');assert.equal(contract.statements[0].binding.value.method,'expr_path');
  assert.equal(contract.result.method,'expr_call');assert.equal(contract.result.args[1].tag,'bound-source-slot');assert.equal(contract.result.args[1].binding.kind,'local');
  assert.equal(contract.result.args[1].binding.value.method,'expr_path');assert.equal(contract.selectedOwnerBangComplete,false);
});

test('private original profile/contracts and source-fragment pairing reject proposed caller authority',()=>{
  const contract=compiler.compile('expr_call');assert.equal(isBuiltinAstBuilderMetaContract(structuredClone(contract)),false);
  assert.throws(()=>compiler.assert(structuredClone(contract)),/original compiler/);
  assert.throws(()=>createBuiltinAstBuilderMetaCompiler(structuredClone(profile)),/sealed/);
  assert.throws(()=>compiler.compile('nonexistent_output_builder'),/not unique/);
  const macro=compiler.compile('expr_macro_call');assert.equal(macro.result.args[1].variant,'MacCall');assert.equal(macro.selectedOwnerBangComplete,false,'A positive schema constructor is not a bang-output closure proof');
  assert.throws(()=>compiler.compile('expr_unreachable'),/statement|syntax|unproved/,'Actual macro-producing helper is not replaced by an assumed closed expression');
  const fragment=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/clone.rs','cs_clone_simple');
  assert.throws(()=>inventoryBuiltinAstCallbackCalls(compiler,structuredClone(fragment)),/Unsealed/);
});

test('both original Clone callbacks retain exact calls and source receiver-shadow obligations',()=>{
  const path='compiler/rustc_builtin_macros/src/deriving/clone.rs';
  const simple=inventoryBuiltinAstCallbackCalls(compiler,originalAstFunction(profile,path,'cs_clone_simple'));
  assert.equal(isBuiltinAstCallbackBuilderInventory(simple),true);assert.equal(simple.receiverLexicalClosure,true);
  assert.ok(simple.calls.some(value=>value.method==='expr_deref'&&value.contract.result.args[1].variant==='Unary'));
  const full=inventoryBuiltinAstCallbackCalls(compiler,originalAstFunction(profile,path,'cs_clone'));
  assert.equal(full.receiverLexicalClosure,false);assert.ok(full.shadowSites.length,'Actual typed cx closure argument must not silently inherit outer identity');
  assert.ok(full.calls.some(value=>value.method==='expr_struct'));assert.ok(full.calls.some(value=>value.method==='expr_call'));
  for(const value of [simple,full]){assert.equal(value.selectedOwnerBangComplete,false);assert.equal(value.generatedImplBehavior,false);assert.equal(value.callback.sourceSha256,'8379f6a84fa05659d0536a62e794b47240833b493e073d5d21493ac10d9b925a');}
});

test('actual remaining callbacks retain unproved builder cases and all source calls',()=>{
  for(const [path,name] of [
    ['debug.rs','show_substructure'],['debug.rs','show_fieldless_enum'],['cmp/partial_eq.rs','get_substructure_equality_expr'],['hash.rs','hash_substructure'],
  ]){
    const fragment=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/'+path,name),inventory=inventoryBuiltinAstCallbackCalls(compiler,fragment);
    assert.deepEqual(inventory.callback,fragment,'Original fragments survive exact semantic metadata roundtrip');
    assert.ok(inventory.calls.length);assert.ok(inventory.calls.some(call=>call.refusal),'Unsupported/transitive original recipes must remain explicit');
    assert.equal(inventory.selectedOwnerBangComplete,false);assert.equal(inventory.generatedImplBehavior,false);
    const nodes=[];for(const call of inventory.calls)if(call.contract)walk(call.contract.result,node=>{if(node.tag==='positive-ast-enum-constructor')nodes.push(node);});
    assert.ok(nodes.every(node=>node.variantSchema.source==='compiler/rustc_ast/src/ast.rs'));
  }
});

test('complete original provider/catalog inputs preserve both Clone callbacks without a Copy spelling inference',{timeout:60_000},()=>{
  // Authentic complete source graph only; never request the semantic .result.
  const original=originalCsvContext(),graph=resolveModuleGraph({entry:'src/lib.rs',paths:original.inputs.sources.map(row=>row.source),readSource:original.source,compilationProfile:PRODUCTION_PROFILE});
  const context=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
  for(const [name,path,sourceSha256,span] of [
    ['SubscriptionProvider','src/subscription/types.rs','74996ec0b4a32cb6e8d8c6a5e4cf2057a09238acff6d141ad58b592184c12c26',{start:105,end:639}],
    ['CatalogRecord','src/model_catalog.rs','2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5',{start:1956,end:2355}],
  ]){
    const certificate=context.certificates.find(value=>value.source===path&&value.name===name);assert.ok(certificate);
    const attribute=certificate.attributes.find(value=>value.derives?.some(path=>path.length===1&&path[0]==='Clone'));assert.ok(attribute);
    const plan=planBuiltinDeriveBangOutput({context,certificate,invocation:{path:['Clone'],attributeSpan:attribute.span}});
    assert.equal(plan.sourceSha256,sourceSha256);assert.deepEqual(plan.span,span);assert.equal(plan.closed,false);
    const callbacks=plan.callbackRecipes.map(fragment=>inventoryBuiltinAstCallbackCalls(compiler,fragment));assert.equal(callbacks.length,2);
    assert.ok(callbacks.some(value=>value.calls.some(call=>call.method==='expr_deref')));
    assert.ok(callbacks.some(value=>value.calls.some(call=>call.method==='expr_struct')));
    assert.ok(callbacks.every(value=>value.selectedOwnerBangComplete===false&&value.generatedImplBehavior===false));
  }
});

// Shared storage preserves all original metadata and independently bounds it.
test('source metadata sharing preserves exact scopes and refuses cycles, dangling refs and independent limits',()=>{
  const original={source:'actual/original.rs',scope:['outer','inner'],span:{start:12,end:34},syntax:[{kind:'token',text:'actual',span:{start:12,end:18}}]};
  const payload={left:original,right:structuredClone(original)},encoded=encodeBuiltinSourceMeta(payload),decoded=decodeBuiltinSourceMeta(encoded);
  assert.deepEqual(decoded,payload);assert.equal(decoded.left,decoded.right);assert.ok(Object.isFrozen(decoded.left.syntax));
  assert.equal(encodeBuiltinSourceMeta(decoded),encoded);
  assert.notEqual(sealBuiltinSourceMeta(payload).digest,sealBuiltinSourceMeta({...payload,right:{...original,scope:['other']}}).digest);
  const forged=JSON.parse(encoded);forged.root={r:forged.table.length};assert.throws(()=>decodeBuiltinSourceMeta(JSON.stringify(forged)),/Dangling|cyclic/);
  const cyclic={};cyclic.next=cyclic;assert.throws(()=>encodeBuiltinSourceMeta(cyclic),/cycle/);
  const selfTable={schema:'builtin-source-meta-sharing-v1',fieldNames:['next'],table:[['o',[[0,{r:0}]]]],root:{r:0}};assert.throws(()=>decodeBuiltinSourceMeta(JSON.stringify(selfTable)),/cyclic/);
  let deep=null;for(let i=0;i<66;i++)deep={next:deep};assert.throws(()=>encodeBuiltinSourceMeta(deep),/depth budget/);
  assert.throws(()=>encodeBuiltinSourceMeta(Array.from({length:16001},(_,i)=>({index:i}))),/cell budget/);
  assert.throws(()=>encodeBuiltinSourceMeta({source:'x'.repeat(524288)}),/byte budget/);
});
