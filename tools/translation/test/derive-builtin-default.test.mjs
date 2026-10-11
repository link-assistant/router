import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {builtinDefaultDependencyProof,isBuiltinDefaultDependencyProof,BUILTIN_DEFAULT_SOURCE_PROFILE} from '../derive-builtin-default.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const context=(source,rootSource='mod model;')=>createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source:rootSource},{file:'src/model.rs',path:['model'],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});

test('builtin Default original compiler and core sources have sealed versioned evidence',()=>{
  const proof=builtinDefaultDependencyProof(dependencies);
  assert.equal(isBuiltinDefaultDependencyProof(proof),true);assert.equal(isBuiltinDefaultDependencyProof(structuredClone(proof)),false);
  assert.equal(proof.sources.length,3);assert.equal(proof.generatedImplBehavior,false);
  assert.equal(BUILTIN_DEFAULT_SOURCE_PROFILE.sources.find(entry=>entry.path.endsWith('deriving/default.rs')).sha256,'4c381dd6ee2196eb3184b4946a0a58f39f2d7d4618e78820a33d010ebf2196cf');
  assert.throws(()=>builtinDefaultDependencyProof(structuredClone(dependencies)),/sealed/);
});

test('standard-only and actual external derives retain unit default helper without implementing traits',()=>{
  for(const derives of ['Default','Clone,Copy,Default','Clone,Copy,Default,serde::Serialize,schemars::JsonSchema']) {
    const source=`#[derive(${derives})] pub enum Kind { #[default] Ready, Paused }`,result=context(source);
    assert.deepEqual(result.diagnostics,[]);assert.equal(result.certificates.length,1);
    const certificate=result.certificates[0];assert.equal(certificate.builtinDefault.variant,'Ready');assert.equal(certificate.generatedImplBehavior,false);
    assert.deepEqual(certificate.attributes.find(entry=>entry.name==='default').tokens,['#','[','default',']']);
    assert.equal(certificate.dimensions.bangMacroComplete,false,'other derivations and unrelated bang closure are not promoted');
  }
});

test('Default helpers retain actual owner and original input refusal boundaries',()=>{
  for(const source of [
    '#[derive(Clone)] enum Kind {#[default] Ready}',
    '#[derive(Default)] #[default] enum Kind {Ready}',
    '#[derive(Default)] enum Kind {#[default()] Ready}',
    '#[derive(Default)] enum Kind {#[default] Ready,#[default] Paused}',
    '#[derive(Default)] enum Kind {#[default] Ready(u8),Paused}',
    '#[derive(Default)] enum Kind {#[default] Ready,Paused(u8)}',
    '#[derive(Default)] enum Kind {#[default] #[non_exhaustive] Ready}',
    '#[derive(Default)] enum Kind<T> {#[default] Ready}',
    '#[derive(Default)] enum Kind {#[default] Ready=1}',
    '#[derive(Default)] enum Kind {#[default] Ready} #[unknown] struct Sibling;',
    '#[derive(Default,ValueEnum)] enum Kind {#[default] Ready}',
    '#[derive(Default)] enum Kind {#[default] Ready} use unknown::Default;',
    '#[derive(Default)] enum Kind {#[default] Ready} use unknown::default;',
    '#[derive(Default)] enum Kind {#[default] Ready} use unknown::*;',
    '#[cfg_attr(unix,derive(Default))] enum Kind {#[default] Ready}',
  ])assert.equal(context(source).certificates.length,0,source);
  for(const rootSource of ['mod core; mod model;','mod std; mod model;','#[unknown] struct Root; mod model;'])assert.equal(context('#[derive(Default)] enum Kind {#[default] Ready}',rootSource).certificates.length,0,rootSource);
  // A known bang macro has no authority to shadow an attribute derive.
  assert.equal(context('macro_rules! Default {()=>{}} #[derive(Default)] enum Kind {#[default] Ready}').certificates.length,1);
});

test('certified unit default layout executes existing selectors and retains Default call refusal',async()=>{
  const source='#[derive(Clone,Copy,Default)] pub enum Kind {#[default] Ready,Paused} impl Kind {pub fn code(self)->u8 {match self {Self::Ready=>7,Self::Paused=>9}}} pub fn ready()->u8 {Kind::Ready.code()} pub fn bad()->Kind {Default::default()}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'));
  const kind=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('Kind');assert.ok(kind);
  assert.ok(kind.ctors[0].rustAttributes.some(entry=>entry.name==='default'));
  await verifyTypedTargets(result,api=>assert.equal(api.ready(),7n));
});
