import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boundedSchemarsNumericHelper,SCHEMARS_NUMERIC_HELPER_GRAMMAR} from '../derive-numeric-helpers.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {loadDeriveDependencyProof,deriveDependencySource} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const context=source=>createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});
const parsed=text=>boundedSchemarsNumericHelper(rustTokens(text).filter(token=>token.type!=='comment'),0,'field');
const declaration='#[derive(serde::Serialize,schemars::JsonSchema)] pub struct Document {#[schemars(range(min=1,max=1))] version:u32, #[schemars(length(max=4096))] models:Vec<String>}';

test('original Schemars numeric helper source and all accepted literal spans are retained',()=>{
  for(const member of SCHEMARS_NUMERIC_HELPER_GRAMMAR.members)assert.equal(deriveDependencySource(dependencies,'schemars_derive',member.path).sha256,member.sha256);
  for(const text of ['range(min=1,max=1)','length(max=4096,)','length(equal=0)','range(min=18446744073709551615)']){
    const result=parsed(text);assert.equal(result.evidence.generatedHelperBehavior,false);assert.equal(text.slice(result.evidence.span.start,result.evidence.span.end),text);
    for(const token of result.evidence.tokens)assert.equal(text.slice(token.span.start,token.span.end),token.text);
    for(const bound of result.evidence.bounds)assert.equal(text.slice(bound.literalSpan.start,bound.literalSpan.end),bound.value);
  }
  const result=context(declaration);assert.equal(result.certificates.length,1);assert.deepEqual(result.diagnostics,[]);assert.equal(result.certificates[0].dimensions.bangMacroComplete,false);
  assert.deepEqual(result.certificates[0].attributes.filter(entry=>entry.name==='schemars').map(entry=>entry.helpers[0].namespaceInput.helper),['range','length']);
});

test('numeric helper calls quoted expressions macro injection wrong positions and invalid assignments remain refused',()=>{
  for(const text of ['range()','range(min=-1)','range(min=1.0)','range(min=1u32)','range(min=1_000)','range(min="1")','range(min=helper())','range(min=injected!())','range(min={#[macro_export] macro_rules! escaped {()=>{}} 1})','range(min=1,min=2)','range(equal=1,max=2)','range(min=1,equal=2)','range(unknown=1)','range(min=18446744073709551616)','range(min=01)','range(min)','range(min=1 max=2)'])assert.throws(()=>parsed(text),TypeError,text);
  assert.throws(()=>boundedSchemarsNumericHelper(rustTokens('range(min=1)'),0,'container'),/field/);
  assert.throws(()=>boundedSchemarsNumericHelper(rustTokens('range(min=1)'),0,'variant'),/field/);
  for(const source of ['#[derive(serde::Serialize)] struct Entry{#[schemars(range(min=1))] value:u8}',declaration+' #[unknown] struct Sibling;',declaration.replace('schemars::JsonSchema','Unknown'),declaration.replace('min=1','min=emit!()')])assert.equal(context(source).certificates.length,0,source);
});

test('numeric input confinement admits original ordinary functions in independently checked JS and TS',{timeout:30000},async()=>{
  const source=declaration+' pub fn identity(text:&str)->&str{text} pub fn flag(value:bool)->bool{value}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  for(const name of ['identity','flag'])assert.ok(result.meta.executable.some(entry=>entry.name===name),JSON.stringify(result.meta.refused));
  assert.equal(result.meta.runtimeParity,false);
  await verifyCohortTargets(result,api=>{assert.equal(api.identity('Ω😀'),'Ω😀');assert.equal(api.flag(true),true);assert.equal(api.flag(false),false);});
});
