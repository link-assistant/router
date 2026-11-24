import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadStandardMatchesSourceProfile,isStandardMatchesSourceProfile,standardMatchesOriginalSource,standardMatchesOriginalDefinition} from '../matches-source-profile.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
test('full original matches definition and enclosing attributes retain exact source spans',()=>{
  const profile=loadStandardMatchesSourceProfile(),source=standardMatchesOriginalSource(profile,'library/core/src/macros/mod.rs').source,original=standardMatchesOriginalDefinition(profile);
  assert.equal(hash(source),profile.sources.find(row=>row.sourcePath==='library/core/src/macros/mod.rs').sha256);
  assert.equal(source.slice(profile.definition.span.start,profile.definition.span.end),original);assert.equal(hash(original),profile.definition.sha256);
  const item=profile.enclosingOriginalItem;assert.equal(hash(source.slice(item.span.start,item.span.end)),item.sha256);
  assert.ok(item.tokens.some(token=>token.text==='macro_export'));assert.ok(item.tokens.some(token=>token.text==='stable'));
  const cargo=standardMatchesOriginalSource(profile,'library/core/Cargo.toml').source,edition=profile.definitionEditionSource;assert.equal(hash(cargo.slice(edition.span.start,edition.span.end)),edition.sha256);assert.equal(edition.edition,'2024');
  assert.equal(profile.originalDefinitionTrees[3].delimiter,'{');assert.equal(profile.definitionEdition,'2024');
});
test('actual standard reexport and full injection handler stay original source evidence',()=>{
  const profile=loadStandardMatchesSourceProfile(),std=standardMatchesOriginalSource(profile,'library/std/src/lib.rs').source,export_=profile.stdReexport,inject=standardMatchesOriginalSource(profile,'compiler/rustc_builtin_macros/src/standard_library_imports.rs');
  assert.equal(hash(std.slice(export_.span.start,export_.span.end)),export_.itemSha256);assert.deepEqual(export_.path,['core','matches']);
  assert.match(inject.source,/sym::no_core/);assert.match(inject.source,/sym::no_std/);assert.match(inject.source,/sym::macro_use/);assert.match(inject.source,/with_def_site_ctxt/);
  assert.equal(hash(inject.source),inject.sha256);
});
test('cloned public source evidence cannot seal a macro owner or open opaque fragments',()=>{
  const profile=loadStandardMatchesSourceProfile();assert.equal(isStandardMatchesSourceProfile(profile),true);assert.equal(isStandardMatchesSourceProfile(structuredClone(profile)),false);
  assert.throws(()=>standardMatchesOriginalDefinition(structuredClone(profile)),/Unsealed/);assert.throws(()=>standardMatchesOriginalSource({...profile,sourceMacroOwnerResolved:true},'library/core/src/macros/mod.rs'),/Unsealed/);
  for(const key of ['sourceMacroOwnerResolved','fragmentGrammarChecked','opaqueAstProjectionChecked','namespaceAuthority','applicationEffectCompleteness','runtimeParity','constEligible'])assert.equal(profile[key],false,key);
});
