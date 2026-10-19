import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof,deriveDependencySource} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createSerdeUnitEnumFrontier,isSerdeUnitEnumFrontier,inventoryPinnedDeriveQuotes,isPinnedDeriveQuoteInventory} from '../derive-success-frontier.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')});
function context(source) {
  return createDeriveFootprintContext({dependencies,compilationProfile:PRODUCTION_PROFILE,modules:[{file:'src/lib.rs',path:[],source:'mod model;'},{file:'src/model.rs',path:['model'],source}]});
}
function candidate(source) {
  const certificate=context(source).certificates[0];assert.ok(certificate,'Original bounded derive certificate required');
  return createSerdeUnitEnumFrontier({dependencies,certificate,source:source.slice(certificate.span.start,certificate.span.end),offset:certificate.span.start});
}

test('pinned unit enum candidate inventories unchanged generator templates without branch or owner authority',()=>{
  const source='use serde::{Serialize as Encode,Deserialize}; #[derive(Clone,Encode,Deserialize)] #[serde(rename_all="snake_case")] pub enum State { Ready, #[serde(rename="paused",alias="old")] Paused }';
  const result=candidate(source);assert.equal(isSerdeUnitEnumFrontier(result),true);assert.equal(isSerdeUnitEnumFrontier(structuredClone(result)),false);
  assert.deepEqual(result.variants.map(variant=>variant.name),['Ready','Paused']);
  for(const variant of result.variants)assert.equal(source.slice(variant.span.start,variant.span.end),variant.name);
  assert.equal(result.fixedEmptyMacro.outputTokens,0);assert.equal(result.fixedEmptyMacro.callOwnerResolved,false);
  assert.equal(result.fixedEmptyMacro.attributeOwnersResolved,false);assert.equal(result.fixedEmptyMacro.header.name,'__require_serde_not_serde_core');
  assert.equal(result.successfulBranchSelectionComplete,false);assert.equal(result.emittedQuoteClosureComplete,false);
  assert.equal(result.generatedImplBehavior,false);assert.equal(result.macroCallOwnerResolved,false);
  assert.ok(Object.values(result.dimensions).every(value=>value===false));
  assert.ok(result.inventory.every(isPinnedDeriveQuoteInventory));
  for(const inventory of result.inventory) {
    const original=deriveDependencySource(dependencies,inventory.package,inventory.source);
    assert.equal(original.sha256,inventory.sourceSha256);assert.equal(inventory.successfulBranchSelectionComplete,false);
    for(const definition of inventory.definitions) {
      assert.equal(hash(original.source.slice(definition.span.start,definition.span.end)),definition.sha256);
      for(const quote of definition.quotes) {
        assert.equal(original.source.slice(quote.span.start,quote.span.end),quote.tokens);
        assert.equal(hash(quote.tokens),quote.sha256);assert.equal(quote.emittedBranchProved,false);
        for(const entry of [...quote.splices,...quote.attributes,...quote.bangCalls]) {
          assert.equal(original.source.slice(entry.span.start,entry.span.end),entry.tokens);
          assert.equal(hash(entry.tokens),entry.sha256);
        }
      }
    }
  }
  assert.ok(result.inventory.some(inventory=>inventory.definitions.some(definition=>definition.quotes.some(quote=>quote.splices.length))));
  assert.ok(result.inventory.some(inventory=>inventory.definitions.some(definition=>definition.quotes.some(quote=>quote.attributes.some(attribute=>attribute.tokens.includes('automatically_derived'))))));
});

test('frontier excludes payloads, helper behavior and unsupported derive owners while retaining their existing certificates',()=>{
  for(const declaration of [
    '#[derive(serde::Serialize)] pub enum State { Item(u8) }',
    '#[derive(serde::Serialize)] pub enum State { Item { value:u8 } }',
    '#[derive(serde::Serialize)] #[serde(tag="kind")] pub enum State { Ready }',
    '#[derive(serde::Serialize)] pub enum State { #[serde(skip)] Ready }',
    '#[derive(serde::Serialize)] pub enum State { #[serde(with="crate::codec")] Ready }',
    '#[derive(serde::Serialize,schemars::JsonSchema)] pub enum State { Ready }',
  ])assert.throws(()=>candidate(declaration),/unit|fields|helper|owners/);
  for(const declaration of [
    '#[derive(serde::Serialize)] #[serde(remote="Other")] pub enum State { Ready }',
    '#[derive(serde::Serialize)] pub enum State { Ready } #[unknown] struct Sibling;',
  ])assert.equal(context(declaration).certificates.length,0);
});

test('bounded generic input retains a certificate while the nongeneric output frontier refuses original generic source',()=>{
  const declaration='#[derive(serde::Serialize)] pub enum State<T> { Ready(T) }';assert.equal(context(declaration).certificates.length,1);assert.throws(()=>candidate(declaration),/nongeneric/);
});

test('source cloning stale bytes unknown archive paths and caller closed-scope assertions cannot mint frontier evidence',()=>{
  const source='#[derive(serde::Serialize,serde::Deserialize)] pub enum State { Ready }',certificate=context(source).certificates[0];
  const options={dependencies,certificate,source:source.slice(certificate.span.start,certificate.span.end),offset:certificate.span.start};
  assert.throws(()=>createSerdeUnitEnumFrontier({...options,certificate:structuredClone(certificate)}),/Unsealed/);
  assert.throws(()=>createSerdeUnitEnumFrontier({...options,source:options.source+' '}),/mismatched/);
  assert.throws(()=>createSerdeUnitEnumFrontier({...options,dependencies:structuredClone(dependencies)}),/sealed/);
  assert.throws(()=>createSerdeUnitEnumFrontier({...options,ownerResolved:true}),/caller owner/);
  assert.throws(()=>deriveDependencySource(structuredClone(dependencies),'serde','src/lib.rs'),/Unsealed/);
  assert.throws(()=>deriveDependencySource(dependencies,'serde','src/not-audited.rs'),/audited/);
  const inventory=inventoryPinnedDeriveQuotes({dependencies,packageName:'serde_derive',sourcePath:'src/dummy.rs',functionName:'wrap_in_const'});
  assert.equal(isPinnedDeriveQuoteInventory(structuredClone(inventory)),false);
  assert.throws(()=>inventoryPinnedDeriveQuotes({dependencies,packageName:'serde_derive',sourcePath:'src/dummy.rs',functionName:'missing'}),/absent/);
});
