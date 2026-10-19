import test from 'node:test';
import assert from 'node:assert/strict';
import {macroProvenance} from '../macro-provenance.mjs';
test('actual named macro definitions are collected across nested modules and function scopes',()=>{
  const source='macro_rules! format { ($($tt:tt)*) => { "CUSTOM" }; } mod nested { macro_rules ! vec { () => { [9] }; } } fn caller() { macro_rules! panic { () => { 9 }; } } pub macro other() {}';
  const evidence=macroProvenance(source);
  assert.deepEqual(evidence.shadowedNames,['format','other','panic','vec']);assert.deepEqual(evidence.importedNames,[]);assert.equal(evidence.unresolvedImportScope,false);
  assert.equal(evidence.diagnostics.length,4);
  for(const diagnostic of evidence.diagnostics)assert.match(source.slice(diagnostic.span.start,diagnostic.span.end),/macro/u);
});
test('literal and comment decoys are opaque lexical regions',()=>{
  const source='// macro_rules! format {}\n/* outer /* use x::*; */ #[macro_use] */ const TEXT: &str = r###"macro_rules! panic {}; use source::*; #[macro_use]"###; const OTHER: &str = "use source::vec;"; fn caller() -> String { format!("real") }';
  assert.deepEqual(macroProvenance(source),{shadowedNames:[],importedNames:[],unresolvedImportScope:false,diagnostics:[]});
});
test('nested use trees collect actual bound aliases rather than imported path spellings',()=>{
  const evidence=macroProvenance('pub use crate::source::{format as alternative, replacement as vec, nested::{panic, String}, self as Tools}; use ::core::fmt::Debug; use crate::other::panic as _;');
  assert.deepEqual(evidence.shadowedNames,['panic','vec']);assert.deepEqual(evidence.importedNames,['Debug','String','Tools','alternative','panic','vec']);assert.equal(evidence.unresolvedImportScope,false);
});
test('self imports and raw identifiers preserve their actual binding names',()=>{
  const source='use crate::format::{self}; use crate::tools::r#panic; use crate::other as r#vec; macro_rules! r#format { () => {} } fn caller() { let r#use = true; }';
  const evidence=macroProvenance(source);
  assert.deepEqual(evidence.shadowedNames,['format','panic','vec']);assert.deepEqual(evidence.importedNames,['format','panic','vec']);assert.equal(evidence.unresolvedImportScope,false);
});
test('unresolved glob import scope guards every builtin macro without fabricating bindings',()=>{
  const evidence=macroProvenance('use crate::source::{format, nested::*, Debug}; use source::*;');
  assert.deepEqual(evidence.shadowedNames,['format']);assert.deepEqual(evidence.importedNames,['Debug','format']);assert.equal(evidence.unresolvedImportScope,true);
  assert.equal(evidence.diagnostics.filter(item=>item.kind==='unresolved-macro-scope').length,2);
});
test('outer, inner and conditional macro_use attributes conservatively mark imported scope',()=>{
  for(const source of ['#[macro_use] extern crate tools;','#[macro_use(format)] mod tools;','#![macro_use] mod tools {}','#[cfg_attr(feature="x", macro_use)] mod tools;']) {
    const evidence=macroProvenance(source);assert.equal(evidence.unresolvedImportScope,true,source);
    assert.match(source.slice(evidence.diagnostics[0].span.start,evidence.diagnostics[0].span.end),/macro_use/u);
  }
  assert.equal(macroProvenance('#[allow(dead_code)] fn macro_use() {}').unresolvedImportScope,false);
});
test('malformed lexical or import evidence is explicitly unresolved and never grants dispatch',()=>{
  for(const source of ['use source::{format as};','use source::{format','const TEXT: &str = r#"unterminated','macro_rules! { () => {} }']) {
    const evidence=macroProvenance(source);assert.equal(evidence.unresolvedImportScope,true,source);assert.ok(evidence.diagnostics.length);
  }
  assert.throws(()=>macroProvenance(null),TypeError);
});
test('provenance is deterministic, frozen serializable evidence and does not expand custom bodies',()=>{
  const source='macro_rules! panic { () => { entirely_unknown_expansion() }; } use x::{b as format, a as Vec};';
  const first=macroProvenance(source),second=macroProvenance(source);
  assert.deepEqual(first,second);assert.deepEqual(JSON.parse(JSON.stringify(first)),first);
  assert.ok(Object.isFrozen(first.shadowedNames));assert.ok(Object.isFrozen(first.diagnostics[0].span));
  assert.equal(JSON.stringify(first).includes('entirely_unknown_expansion'),false);
});
