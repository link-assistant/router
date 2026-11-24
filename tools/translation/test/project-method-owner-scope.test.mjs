import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {translateProject,translateProjectOwnedDefinitions,originalProjectMethodFieldEvidence} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {originalMethodTransformFacts} from '../source-method-transforms.mjs';
import {originalMethodParserNamespace} from '../matches-macro-context.mjs';
import {metadataDigest} from '../extensions/source-links.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {prepareProjectFacadeRetention} from '../prepare-project-facade-retention.mjs';
import {deriveProjectMethodOwnerScope} from '../project-method-owner-scope-source.mjs';

const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const deriveDependencies=loadDeriveDependencyProof({manifest,lock}),limits={timeout:60000};
const nominal='/// Original documented container.\n#[derive(schemars::JsonSchema)]#[schemars(with="String")]pub enum Entry{First,Last}';
const options=source=>({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies,compilationProfile:PRODUCTION_PROFILE});

test('owned methods link their actual parser scope when enclosing and full-bang evidence differ',limits,async()=>{
 const source=nominal+'impl Entry{pub fn number()->u8{7}}pub fn run()->u8{Entry::number()}';
 const original=translateProject(options(source)),current=translateProjectOwnedDefinitions(options(source));
 assert.equal(original.sourceScopes[0].scope.unresolvedBangMacroScope,true);
 assert.equal(current.sourceScopes[0].scope.unresolvedBangMacroScope,false);
 assert.notEqual(metadataDigest(current.sourceScopes[0].scope),metadataDigest(original.sourceScopes[0].scope));
 const facade=current.checkedMethodDeclarations.find(row=>row.displayName==='Entry.number');assert.ok(facade);
 const origin=originalProjectMethodFieldEvidence(facade),state=originalMethodTransformFacts(origin.transform),namespace=originalMethodParserNamespace(state.context,state.method);
 assert.equal(namespace.scope.unresolvedBangMacroScope,true);
 assert.equal(metadataDigest(namespace.scope),origin.transform.owner.scopeMetadataSha256);
 assert.deepEqual(namespace.scope,original.sourceScopes[0].scope);
 assert.deepEqual(current.meta.checkedMethods,original.meta.checkedMethods);
 assert.deepEqual(current.meta.executable,original.meta.executable);
 assert.equal(current.meta.runtimeParity,false);
 await verifyTypedTargets(current,api=>{assert.equal(api.run(),7n);},{childTimeoutMs:20000});
});

test('closed enclosing output never substitutes for unresolved method bang-macro evidence',limits,()=>{
 const source=nominal+'impl Entry{pub fn number()->u8{7}pub fn classify(value:u8)->bool{matches!(value,1)}}pub fn run()->u8{Entry::number()}';
 const current=translateProjectOwnedDefinitions(options(source));
 assert.equal(current.sourceScopes[0].scope.unresolvedBangMacroScope,false);
 assert.ok(current.meta.checkedMethods.some(row=>row.name==='Entry.number'));
 assert.equal(current.meta.checkedMethods.some(row=>row.name==='Entry.classify'),false);
 assert.ok(current.meta.refused.some(row=>row.name==='Entry.classify'&&row.kind==='unsupported'));
});

test('unknown attributes macros and configuration keep actual method owner refusals',limits,()=>{
 for(const source of [
  nominal.replace('pub enum','#[unknown]pub enum')+'impl Entry{pub fn number()->u8{7}}',
  nominal+'#[cfg(unknown_feature)]impl Entry{pub fn number()->u8{7}}',
  nominal+'macro_rules! classify{($($tokens:tt)*)=>{true}}impl Entry{pub fn number(value:u8)->bool{classify!(value)}}',
 ]){
  const current=translateProjectOwnedDefinitions(options(source));
  assert.equal(current.meta.checkedMethods.some(row=>row.name==='Entry.number'),false);
  assert.ok(current.meta.refused.length);
  assert.equal(current.meta.runtimeParity,false);
 }
});

test('the source recipe selects only the original private import and method linker with a complete inverse',limits,()=>{
 const plan=prepareProjectFacadeRetention(),row=plan.files[0],recipe=row.selection.methodOwnerScope,ts=ownershipCompiler();
 assert.equal(row.current,row.after);assert.equal(recipe.edits.length,2);assert.equal(recipe.inverse,recipe.before);
 assert.equal(recipe.sourceAuthority,false);assert.equal(recipe.semanticAuthority,false);
 assert.deepEqual(recipe.repositoryRules,[]);assert.equal(recipe.languageRules[0].id,'javascript:link-original-method-private-parser-scope');
 assert.deepEqual(deriveProjectMethodOwnerScope(ts,recipe.before),recipe);
 const selected=recipe.edits.find(edit=>edit.expected==='scopes.get(moduleScopeKey(module))');assert.ok(selected);
 for(const source of [
  recipe.before.slice(0,selected.span[0])+'foreign.get(moduleScopeKey(module))'+recipe.before.slice(selected.span[1]),
  recipe.before+"\nimport {originalMethodParserNamespace} from './matches-macro-context.mjs';\n",
  recipe.after,
 ]){assert.notEqual(source,recipe.before);assert.throws(()=>deriveProjectMethodOwnerScope(ts,source),/original .* differs|one actual native selection/);}
});
