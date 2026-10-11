import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {stablePublicTypeCandidates,stablePublicReexportCandidates,originalPublicModuleCandidate,originalExternAliasCandidate} from '../namespace-census.mjs';
import {STANDARD_NAMESPACE_EVIDENCE,STANDARD_NAMESPACE_BINDINGS,isStandardNamespaceEvidence} from '../namespace-standard.mjs';
import {externalModuleBindings} from '../registered-bindings.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});

test('stable public source census retains names and original spans without expansion authority',()=>{
  const source='#[stable(feature="fixture",since="1.0.0")] pub struct Public;\n#[stable(feature="fixture",since="1.0.0")] pub unsafe auto trait Marker {}\n#[stable(feature="fixture",since="1.0.0")] pub(crate) struct Private;\n#[unstable(feature="fixture",issue="1")] pub struct Future;\n#[cfg(unix)] #[stable(feature="fixture",since="1.0.0")] pub struct Conditional;\n#[other] #[stable(feature="fixture",since="1.0.0")] pub struct Expanded;';
  const candidates=stablePublicTypeCandidates(source);assert.deepEqual(candidates.map(item=>[item.name,item.kind]),[['Public','struct'],['Marker','trait']]);
  for(const item of candidates){assert.equal(item.status,'candidate');assert.equal(item.sourceSha256,hash(source));assert.equal(item.itemSha256,hash(source.slice(item.span.start,item.span.end)));assert.equal(item.namespaceComplete,false);assert.equal(item.runtimeAuthority,false);assert.equal(isStandardNamespaceEvidence(item),false);}
  assert.throws(()=>stablePublicTypeCandidates(' '.repeat(2_000_001)),/bound/);
});

test('explicit original namespace reexports preserve grouped aliases and refuse globs or unsupported leaves',()=>{
  const stable='#[stable(feature="fixture",since="1.0.0")] ';
  const source=stable+'pub use core::fmt::{Arguments,Debug as ActualDebug};\n'+stable+'pub use core::fmt::*;\n'+stable+'pub use core::fmt::{self,Write};\n#[cfg(unix)] '+stable+'pub use core::fmt::Formatter;';
  const candidates=stablePublicReexportCandidates(source);
  assert.deepEqual(candidates.map(item=>[item.path,item.name]),[[['core','fmt','Arguments'],'Arguments'],[['core','fmt','Debug'],'ActualDebug']]);
  assert.ok(originalPublicModuleCandidate('pub mod fmt;','fmt'));assert.equal(originalPublicModuleCandidate('pub(crate) mod fmt;','fmt'),null);
  assert.ok(originalExternAliasCandidate('extern crate alloc as alloc_crate;','alloc','alloc_crate'));
  const attributed=originalExternAliasCandidate('#[allow(unused_imports)] #[macro_use] extern crate alloc as alloc_crate;','alloc','alloc_crate');
  assert.ok(attributed);assert.equal(attributed.macroImportsComplete,false);assert.deepEqual(attributed.attributes.map(attribute=>attribute.name),['allow','macro_use']);
  assert.equal(originalExternAliasCandidate('extern crate other as alloc_crate;','alloc','alloc_crate'),null);
  for(const source of ['#[cfg(unix)] extern crate alloc as alloc_crate;','#[macro_use(renamed)] extern crate alloc as alloc_crate;','#[other] extern crate alloc as alloc_crate;'])assert.equal(originalExternAliasCandidate(source,'alloc','alloc_crate'),null);
});

test('verified std alloc core type facts have sealed original owners and no runtime or complete namespace grant',()=>{
  const expected=['Alignment','Arguments','Binary','Debug','Display','Error','Formatter','LowerExp','LowerHex','Octal','Pointer','Result','UpperExp','UpperHex','Write'];
  assert.deepEqual(STANDARD_NAMESPACE_EVIDENCE.facts.map(fact=>fact.name).sort(),expected);
  for(const proof of STANDARD_NAMESPACE_EVIDENCE.facts){
    assert.equal(isStandardNamespaceEvidence(proof),true);assert.equal(isStandardNamespaceEvidence(structuredClone(proof)),false);assert.equal(proof.sourceInputsVerified,true);
    assert.deepEqual(proof.target,['std','fmt',proof.name]);assert.equal(proof.reexports.length,4);
    for(const flag of ['namespaceComplete','layoutAuthority','constructorAuthority','globAuthority','runtimeAuthority'])assert.equal(proof[flag],false);
  }
  const tables=externalModuleBindings({extraBindings:STANDARD_NAMESPACE_BINDINGS});assert.equal(tables.get('std::fmt').complete,false);
  assert.equal(tables.get('std::fmt').bindings.some(binding=>binding.namespace==='value'),false);
  assert.equal(tables.get('std::fmt').bindings.some(binding=>binding.name==='FormattingOptions'),false);
});

test('grouped original fmt type imports permit unrelated typed scalar checking',{timeout:30_000},async()=>{
  const source='use std::fmt::{Arguments,Debug,Formatter,Result as FmtResult,Write}; pub fn valid(value:u8)->u8{value}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.bindingEvidence.scopes[0].unresolvedTypeScope,false);
  for(const [name,original]of [['Arguments','Arguments'],['Debug','Debug'],['Formatter','Formatter'],['FmtResult','Result'],['Write','Write']]){
    const binding=result.meta.bindingEvidence.scopes[0].bindings.find(binding=>binding.namespace==='type'&&binding.name===name);
    assert.equal(binding.status,'resolved');assert.deepEqual(binding.target,['std','fmt',original]);
  }
  assert.equal(result.meta.standardNamespaceCensus.runtimeAuthority,false);
  await verifyTypedTargets(result,api=>{assert.equal(api.valid(19n),19n);assert.throws(()=>api.valid(256n),RangeError);});
});

test('local shadows globs unstable names constructors and opaque runtime uses retain source refusals',()=>{
  for(const source of ['mod std{} use std::fmt::Debug; pub fn bad(value:u8)->u8{value}',
    'use std::fmt::*; pub fn bad(value:u8)->u8{value}',
    'use std::fmt::FormattingOptions; pub fn bad(value:u8)->u8{value}',
    'use std::fmt::Formatter; pub fn bad(value:Formatter)->Formatter{value}',
    'use std::fmt::Error; pub fn bad()->Error{Error}']){
    const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.length,source);
  }
});

test('whole unchanged Router formatting imports resolve while unsupported argument effects remain carried',()=>{
  const path='src/operation_output.rs',source=readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
  assert.equal(hash(source),'1a7dc0667a29686dff795f223097f655760b0118823a80111b0d3eff29811322');
  const result=translateProject({entry:path,paths:[path],readSource:()=>source});
  const binding=result.meta.bindingEvidence.scopes[0].bindings.find(binding=>binding.namespace==='type'&&binding.name==='Arguments');
  assert.equal(binding.status,'resolved');assert.deepEqual(binding.target,['std','fmt','Arguments']);
  assert.equal(result.meta.sources[0].sha256,hash(source));assert.equal(result.meta.runtimeParity,false);
  assert.ok(result.meta.refused.some(item=>item.name==='write'));
  assert.equal(result.meta.executable.some(item=>item.name==='write'),false);
});
