import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boundedSerdeExprPath,SERDE_HELPER_GRAMMAR} from '../derive-helper-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const context=(source,rootSource='mod model;')=>createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source:rootSource},{file:'src/model.rs',path:['model'],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});

test('bounded Serde helper ExprPath grammar retains original source paths and unimplemented behavior',()=>{
  assert.equal(SERDE_HELPER_GRAMMAR.sha256,'7abe82fde303a3c31f967c13e0ee1afe49ea584d882b9d2c32b067888e1c8225');
  for(const [written,absolute,segments]of [['Option::is_none',false,['Option','is_none']],[' ::std :: vec::Vec::is_empty ',true,['std','vec','Vec','is_empty']],['crate::is_false',false,['crate','is_false']],['super::super::default_value',false,['super','super','default_value']],['r#type::r#default',false,['r#type','r#default']]]){
    const result=boundedSerdeExprPath(written);assert.equal(result.leadingColon,absolute);assert.deepEqual(result.segments,segments);assert.equal(result.generatedHelperBehavior,false);
  }
  for(const value of ['',':x','x::','x()','m!()','{#[macro_export] macro_rules! escape {()=>{}}}','Vec::<u8>::is_empty','<T as Trait>::function','fn','gen','self::super::f','::crate::f','r#self::f','_','x; mod escaped {}','a::::b'])assert.throws(()=>boundedSerdeExprPath(value),/Serde helper/);
});

test('actual locked derive owners certify literal path and tag inputs without granting helper execution',()=>{
  const source='use serde::{Serialize,Deserialize}; #[derive(Serialize,Deserialize)] #[serde(tag="kind",content="body")] pub enum Entry { Value { #[serde(default="crate::default_value",skip_serializing_if="Option::is_none")] value:Option<u8> }, #[serde(with="crate::codec")] Tuple(u8) }';
  const result=context(source);assert.deepEqual(result.diagnostics,[]);assert.equal(result.certificates.length,1);
  const certificate=result.certificates[0];assert.equal(certificate.dimensions.bangMacroComplete,false);assert.equal(certificate.generatedImplBehavior,false);
  const entries=certificate.attributes.flatMap(attribute=>attribute.helpers??[]);
  assert.deepEqual(entries.filter(entry=>entry.namespaceInput?.grammar).map(entry=>entry.value),['crate::default_value','Option::is_none','crate::codec']);
  for(const entry of entries)assert.equal(entry.namespaceInput?.generatedHelperBehavior,false);
  const unknownHelper=context('#[derive(serde::Deserialize)] pub struct Entry {#[serde(default="crate::missing_helper")] value:u8}');
  assert.equal(unknownHelper.certificates.length,1,'name confinement supplies no helper resolution or runtime implementation');
  assert.equal(unknownHelper.certificates[0].generatedImplBehavior,false);
  const aliased=context('use serde as wire; use wire::Serialize as Encode; #[derive(Encode)] pub struct Entry {#[serde(skip_serializing_if="crate::predicate")] value:u8}');
  assert.equal(aliased.certificates.length,1);assert.deepEqual(aliased.certificates[0].owners[0].target,['serde','Serialize']);
});

test('helper expressions owners positions and unrelated procedural uncertainty remain closed',()=>{
  for(const source of [
    '#[derive(serde::Serialize)] pub struct Entry {#[serde(skip_serializing_if="helper()")] value:u8}',
    '#[derive(serde::Serialize)] pub struct Entry {#[serde(with="injected!()")] value:u8}',
    '#[derive(serde::Deserialize)] pub struct Entry {#[serde(default="{#[macro_export] macro_rules! escaped {()=>{}} 0}")] value:u8}',
    '#[derive(serde::Serialize)] #[serde(skip_serializing_if="helper")] pub struct Entry {value:u8}',
    '#[derive(serde::Deserialize)] pub enum Entry {#[serde(default="helper")] Value}',
    '#[derive(serde::Serialize)] #[serde(tag="kind")] pub struct Entry {value:u8}',
    '#[derive(schemars::JsonSchema)] pub struct Entry {#[schemars(skip_serializing_if="helper")] value:u8}',
    '#[derive(serde::Serialize)] pub struct Entry {#[serde(skip_serializing_if="helper")] value:u8} #[unknown] struct Sibling;',
    'mod serde; #[derive(serde::Serialize)] pub struct Entry {#[serde(skip_serializing_if="helper")] value:u8}',
    'use unknown::Serialize; #[derive(Serialize)] pub struct Entry {#[serde(skip_serializing_if="helper")] value:u8}',
    'use serde::Serialize as Encode; use unknown::Encode; #[derive(Encode)] pub struct Entry {#[serde(skip_serializing_if="helper")] value:u8}',
  ])assert.equal(context(source).certificates.length,0,source);
  assert.equal(context('#[derive(serde::Serialize)] pub struct Entry {#[serde(skip_serializing_if="helper")] value:u8}','mod core; mod model;').certificates.length,0);
  assert.equal(context('#[derive(serde::Serialize)] pub struct Entry {#[serde(skip_serializing_if="helper")] value:u8}','#[unknown] struct Root; mod model;').certificates.length,0);
});
