import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof,deriveDependencySource} from '../derive-dependencies.mjs';
import {boundedSchemarsWithType,proveSchemarsWithTypeConfinement,isSchemarsWithTypeConfinement,assertSchemarsWithTypeConfinement} from '../derive-schemars-with.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {inspectDeriveInput} from '../derive-inputs.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock});
const hash=value=>createHash('sha256').update(value).digest('hex');
const context=source=>createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});

test('bounded original TypePath helper retains every token and forbids executable or generic syntax',()=>{
  for(const [value,segments,absolute]of [['String',['String'],false],[' crate :: Wire ',['crate','Wire'],false],['::std::string::String',['std','string','String'],true],['self::Wire',['self','Wire'],false]]) {
    const input=boundedSchemarsWithType(value,'container');assert.deepEqual(input.type.segments,segments);assert.equal(input.type.leadingColon,absolute);
    for(const token of input.type.tokens)assert.equal(value.slice(token.span.start,token.span.end),token.text);
    assert.equal(input.type.resolvedType,false);assert.equal(input.generatedHelperBehavior,false);
  }
  for(const value of ['', 'String::','m!()','Vec<String>','fn()->String','&str','(String,)','[u8;1]','<T as Trait>::Wire','String; mod escape {}','String/* hidden */','gen','_', '::crate::Wire','r#type','a::::b',Array(33).fill('Wire').join('::'),'a'.repeat(4097)])assert.throws(()=>boundedSchemarsWithType(value,'container'),/Schemars with type/,value);
  assert.throws(()=>boundedSchemarsWithType('String','unknown'),TypeError);
});

test('actual source rule chain proves cloned type and no helper definitions without granting a whole derive',()=>{
  for(const position of ['container','field','variant']) {
    const proof=proveSchemarsWithTypeConfinement({dependencies,value:'String',position});
    assert.ok(isSchemarsWithTypeConfinement(proof));assert.deepEqual(proof.outputType,proof.input.type);assert.deepEqual(proof.helperDefinitions,[]);
    assert.equal(proof.selectedTypeBranchComplete,true);assert.equal(proof.completeDeriveOutput,false);assert.equal(proof.generatedImplBehavior,false);assert.equal(proof.typeOwnerResolved,false);
    assert.equal(proof.originalRules.length,12);
    for(const rule of proof.originalRules) {
      const original=deriveDependencySource(dependencies,rule.package,rule.source);
      assert.equal(original.sha256,rule.sourceSha256);assert.equal(hash(original.source.slice(rule.span.start,rule.span.end)),rule.sha256);
      for(const token of rule.tokens)assert.equal(original.source.slice(token.span.start,token.span.end),token.text);
    }
    assert.strictEqual(assertSchemarsWithTypeConfinement(proof,{dependencies,value:'String',position}),proof);
    assert.equal(isSchemarsWithTypeConfinement(structuredClone(proof)),false);
    assert.throws(()=>assertSchemarsWithTypeConfinement(structuredClone(proof),{dependencies,value:'String',position}),/Unsealed/);
    assert.throws(()=>assertSchemarsWithTypeConfinement(proof,{dependencies,value:'Other',position}),/mismatched/);
  }
  assert.throws(()=>proveSchemarsWithTypeConfinement({dependencies:structuredClone(dependencies),value:'String',position:'container'}),/sealed original/);
});

test('actual locked JsonSchema owners admit container field and variant type strings with source output evidence',()=>{
  for(const source of [
    '#[derive(schemars::JsonSchema)] #[schemars(with="String")] pub enum Entry { First, Last }',
    '#[derive(schemars::JsonSchema)] pub struct Entry { #[schemars(with="crate::Wire")] value:Unknown }',
    '#[derive(schemars::JsonSchema)] pub enum Entry { #[schemars(with="String")] First }',
    'use schemars::JsonSchema as Schema; #[derive(Schema)] #[schemars(with="String")] pub struct Entry { value:Unknown }',
  ]) {
    const result=context(source);assert.deepEqual(result.diagnostics,[]);assert.equal(result.certificates.length,1);
    const certificate=result.certificates[0],helper=certificate.attributes.find(attribute=>attribute.name==='schemars').helpers[0];
    assert.ok(isSchemarsWithTypeConfinement(helper.namespaceInput.outputConfinement));assert.equal(certificate.generatedImplBehavior,false);assert.equal(certificate.dimensions.bangMacroComplete,false);
  }
  for(const source of [
    '#[derive(serde::Serialize)] #[schemars(with="String")] struct Entry;',
    'mod schemars; #[derive(schemars::JsonSchema)] #[schemars(with="String")] struct Entry;',
    '#[derive(schemars::JsonSchema)] #[schemars(with="m!()")] struct Entry;',
    '#[derive(schemars::JsonSchema)] #[schemars(schema_with="make_schema")] struct Entry;',
    '#[derive(schemars::JsonSchema)] #[schemars(with="String",with="Other")] struct Entry;',
    '#[derive(schemars::JsonSchema)] #[schemars(with="String")] struct Entry; #[unknown] struct Sibling;',
  ])assert.equal(context(source).certificates.length,0,source);
});

test('type override removes bounded attribute uncertainty for executable borrowed helper in JS and TS',{timeout:60000},async()=>{
  const source='#[derive(schemars::JsonSchema)] #[schemars(with="String")] pub struct Entry {value:Unknown} pub fn selected(value:&str)->bool {value=="router"}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  assert.ok(result.meta.executable.some(item=>item.name==='selected'));assert.equal(result.meta.runtimeParity,false);
  await verifyTypedTargets(result,api=>{assert.equal(api.selected('router'),true);assert.equal(api.selected('Router'),false);},{childTimeoutMs:30000});
});

test('unchanged whole original ClientKind helper proves String confinement while Clap and full JsonSchema remain refused',()=>{
  const source=readFileSync(new URL('src/clients.rs',root),'utf8');assert.equal(hash(source),'2f12c5aa34a65ec62b793902cdefe8f36c1b6c414c673e6499ef40c7dbfb8c2d');
  const item=sourceItems(source).find(item=>item.name==='ClientKind'),tokens=item.tokens,at=tokens.findIndex((token,index)=>token.text==='schemars'&&tokens[index+1]?.text==='(');
  assert.ok(at>=0);assert.deepEqual(tokens.slice(at,at+6).map(token=>token.text),['schemars','(','with','=','"String"',')']);
  const literal=tokens[at+4],value=JSON.parse(literal.text),proof=proveSchemarsWithTypeConfinement({dependencies,value,position:'container'});
  assert.equal(source.slice(literal.start,literal.end),'"String"');assert.deepEqual(proof.outputType.segments,['String']);assert.deepEqual(proof.helperDefinitions,[]);
  const actual=createDeriveFootprintContext({modules:[{file:'src/clients.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(actual.certificates.some(certificate=>certificate.name==='ClientKind'),false);
  assert.ok(actual.diagnostics.some(entry=>entry.name==='ClientKind'));
  assert.throws(()=>inspectDeriveInput(item,PRODUCTION_PROFILE),/Unknown procedural or helper attribute.*value/);
});
