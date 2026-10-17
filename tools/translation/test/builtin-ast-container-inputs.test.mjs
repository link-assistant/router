// All five cases authored SOURCE-ONLY and UNRUN; no heap/namespace authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {builtinDeriveAstSourceProfile} from '../builtin-derive-ast-meta.mjs';
import {builtinAstContainerSourceEvidence,isBuiltinAstContainerSourceEvidence} from '../builtin-ast-container-inputs.mjs';
import {createBuiltinAstBuilderMetaCompiler} from '../builtin-ast-builder-meta.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies),compiler=createBuiltinAstBuilderMetaCompiler(profile);

test('actual compiler Cargo lock fixes original ThinVec version and checksum independently of Router dependencies',()=>{
  const proof=builtinAstContainerSourceEvidence(profile);assert.equal(isBuiltinAstContainerSourceEvidence(proof),true);
  assert.equal(proof.rustWorkspaceLock.sha256,'47e4d2ad5e3b87fba150a3cee11a6c657d5d7648be075588e7f3aa9d8a8e847c');
  assert.match(proof.dependency.text,/version = "0\.2\.14"/);assert.match(proof.dependency.text,/144f754d318415ac792f9d69fc87abbbfc043ce2ef041c60f16ad828f638717d/);
  assert.equal(proof.selectedOwnerBangComplete,false);assert.equal(proof.generatedImplBehavior,false);
});

test('original P generic value slot reaches Box::new unchanged but heap behavior remains open',()=>{
  const proof=builtinAstContainerSourceEvidence(profile),contract=compiler.compileOriginal('compiler/rustc_ast/src/ptr.rs','P');
  assert.equal(contract.parameters[0].name,'value');assert.deepEqual(contract.parameters[0].typeSyntax.map(value=>value.text),['T']);
  assert.equal(contract.result.tag,'unresolved-source-call');assert.deepEqual(contract.result.path,['Box','new']);assert.equal(contract.result.args[0].name,'value');
  assert.equal(proof.pointer.allocationPhaseBehavior,false);assert.equal(contract.selectedOwnerBangComplete,false);
});

test('actual zero capacity argument does not discard the external gecko header branch',()=>{
  const proof=builtinAstContainerSourceEvidence(profile),contract=compiler.compileOriginal('thin-vec-0.2.14/src/lib.rs','new');
  assert.deepEqual(contract.result.path,['ThinVec','with_capacity']);assert.equal(contract.result.args[0].tag,'source-numeric-token');assert.equal(contract.result.args[0].spelling,'0');
  assert.equal(proof.thinVec.headerBranches.length,2);assert.match(proof.thinVec.headerBranches[0].text,/_len: 0/);assert.equal(proof.thinVec.headerBranches[1].text,'static EMPTY_HEADER: Header;');
  assert.equal(proof.thinVec.featureCompleteness,false);assert.equal(proof.thinVec.elementCountEstablished,false);
  assert.throws(()=>compiler.compileOriginal('thin-vec-0.2.14/src/lib.rs','with_capacity'),/unproved|requires|syntax/);
});

test('actual Binary Spanned record retains op and span inputs from its source schema',()=>{
  const contract=compiler.compile('expr_binary'),binary=contract.result.args[1],record=binary.args[0];
  assert.equal(binary.variant,'Binary');assert.equal(record.tag,'positive-ast-struct-constructor');assert.equal(record.owner,'Spanned');
  assert.deepEqual(record.fields.map(value=>[value.name,value.value.name]),[['node','op'],['span','sp']]);
  assert.ok(contract.positiveSchemas.some(value=>value.source==='compiler/rustc_span/src/source_map.rs'));assert.equal(contract.selectedOwnerBangComplete,false);
});

test('actual empty/None caller slots and private container identity cannot become proposed closed evidence',()=>{
  const proof=builtinAstContainerSourceEvidence(profile);assert.equal(isBuiltinAstContainerSourceEvidence(structuredClone(proof)),false);
  assert.throws(()=>builtinAstContainerSourceEvidence(structuredClone(profile)),/sealed/);
  const expression=compiler.compile('expr');assert.equal(expression.selectedOwnerBangComplete,false);
  assert.ok(expression.unresolved.some(value=>value.name==='None'));
  assert.ok(expression.unresolved.some(value=>value.path?.join('::')==='AttrVec::new'));
  assert.equal(proof.thinVec.attributeAlias.text,'pub type AttrVec = ThinVec<Attribute>;');
});
