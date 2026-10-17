import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { captureSerializationContext, discoverSerializationCorpus } from './extract.mjs';
import { draftBulkSerialization, parseBulkSerialization, serializeBulkSerialization, emitBulkSerializationRegistry } from './bulk.mjs';
import { canonicalSerializationMeta } from './meta.mjs';
import { affinitySchema } from '../../../packages/javascript/native/affinity-schema.mjs';

const repository=resolve(fileURLToPath(new URL('../../../',import.meta.url))),profile={flags:{test:false,unix:true,windows:false}};
let original;
function context(){return original??=captureSerializationContext({root:repository,paths:execFileSync('git',['ls-files','-z','--','src/*.rs'],{cwd:repository,encoding:'utf8'}).split('\0').filter(Boolean),entry:'src/lib.rs',compilationProfile:profile});}
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture(source,run,files={}) {
  const root=mkdtempSync(join(tmpdir(),'router-bulk-schema-'));
  try {
    mkdirSync(join(root,'src'));writeFileSync(join(root,'src/lib.rs'),source);
    for(const path of ['Cargo.toml','Cargo.lock'])writeFileSync(join(root,path),readFileSync(join(repository,path)));
    for(const [path,text]of Object.entries(files)){mkdirSync(resolve(root,path,'..'),{recursive:true});writeFileSync(join(root,path),text);}
    return run(captureSerializationContext({root,paths:['src/lib.rs',...Object.keys(files)],entry:'src/lib.rs',compilationProfile:profile}),root);
  } finally {rmSync(root,{recursive:true,force:true});}
}
const serde='use serde::{Serialize,Deserialize};';

test('bulk discovery partitions the complete original data-owner graph and keeps every source file accounted',()=>{
  const source=context(),discovery=discoverSerializationCorpus(source),bulk=draftBulkSerialization(source);
  assert.equal(bulk.supported.length+bulk.refused.length+bulk.excluded.length,discovery.declarations.length);
  assert.deepEqual(new Set(discovery.sourceCoverage.map(entry=>entry.source)),new Set(source.sources.map(entry=>entry.source)));
  assert.equal(new Set(discovery.declarations.map(entry=>entry.owner+':'+entry.span.start)).size,discovery.declarations.length);
  for(const entry of [...bulk.supported,...bulk.refused]){assert.match(entry.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(entry.span.end>entry.span.start);}
  assert.ok(bulk.refused.length>0);assert.ok(discovery.manualTraitImplementations.length>0);
});
test('generic bulk discovery generates the original affinity graph and additional actual owners without a seven-name input list',async()=>{
  const bulk=draftBulkSerialization(context()),js=emitBulkSerializationRegistry(bulk),module=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  const actual=module.serializationSchemas['crate::response_affinity::AffinityFile'];assert.equal(actual.root,'AffinityFile');assert.deepEqual(plain(actual.schema),plain(affinitySchema));
  assert.ok(Object.keys(module.serializationSchemas).length>7);
  for(const entry of bulk.supported)assert.equal(module.serializationSchemas[entry.owner].root,entry.meta.types.find(type=>type.owner===entry.owner).name);
  assert.equal(bulk.runtimeAuthority,false);assert.equal(bulk.generatedTraitBehavior,false);
});
test('changing original serde aliases changes observable generated registry values and preserves old spelling only when explicit',async()=>{
  const source=serde+'#[derive(Serialize,Deserialize)] enum Flavor { #[serde(rename="one",alias="old")] First }';
  await fixture(source,async captured=>{const bulk=draftBulkSerialization(captured),module=await import('data:text/javascript;base64,'+Buffer.from(emitBulkSerializationRegistry(bulk)).toString('base64'));assert.equal(module.serializationSchemas['crate::Flavor'].schema.Flavor.aliases.old,'one');});
  await fixture(source.replace('one','changed').replace('old','legacy'),async captured=>{const bulk=draftBulkSerialization(captured),module=await import('data:text/javascript;base64,'+Buffer.from(emitBulkSerializationRegistry(bulk)).toString('base64'));assert.equal(module.serializationSchemas['crate::Flavor'].schema.Flavor.aliases.legacy,'changed');assert.equal(module.serializationSchemas['crate::Flavor'].schema.Flavor.aliases.old,undefined);});
});
test('duplicate leaf names in separate closures retain source-qualified registry keys while a colliding closure refuses',async()=>{
  const source='mod left{'+serde+'#[derive(Serialize,Deserialize)]pub struct Same{value:i64}}mod right{'+serde+'#[derive(Serialize,Deserialize)]pub struct Same{text:String}}'+serde+'#[derive(Serialize,Deserialize)]struct Combined{left:crate::left::Same,right:crate::right::Same}';
  await fixture(source,async captured=>{const bulk=draftBulkSerialization(captured),module=await import('data:text/javascript;base64,'+Buffer.from(emitBulkSerializationRegistry(bulk)).toString('base64'));assert.equal(module.serializationSchemas['crate::left::Same'].schema.Same.fields[0].type,'i64');assert.equal(module.serializationSchemas['crate::right::Same'].schema.Same.fields[0].type,'String');assert.equal(module.serializationSchemas['crate::Combined'],undefined);assert.match(bulk.refused.find(entry=>entry.owner==='crate::Combined').diagnostic.message,/collide/);});
});
test('recursive and borrowed ownership closures remain source-bearing refusals instead of executable registry entries',()=>{
  fixture(serde+'#[derive(Serialize,Deserialize)]struct Tree{children:Vec<Tree>}#[derive(Serialize,Deserialize)]struct Borrowed{value:&\'static str}',captured=>{const bulk=draftBulkSerialization(captured);assert.deepEqual(bulk.supported,[]);assert.match(bulk.refused.find(entry=>entry.owner==='crate::Tree').diagnostic.message,/Recursive/);assert.ok(bulk.refused.find(entry=>entry.owner==='crate::Borrowed'));});
});
test('opaque serde hooks retain exact attributes and source coordinates in the complete refusal inventory',()=>{
  fixture(serde+'#[derive(Serialize,Deserialize)]struct Hooked{#[serde(with="custom")]value:String}#[derive(Serialize,Deserialize)]struct Flat{#[serde(flatten)]value:String}',captured=>{const bulk=draftBulkSerialization(captured);assert.equal(bulk.supported.length,0);for(const entry of bulk.refused){assert.ok(entry.attributes.some(attribute=>attribute.name==='serde'));assert.equal(entry.source,'src/lib.rs');assert.ok(entry.diagnostic.message);}});
});
test('unproved aliases, source shadows and unknown conditions cannot disappear from discovery or unlock generation',()=>{
  for(const source of [serde+'type String=i64;#[derive(Serialize,Deserialize)]struct Row{value:String}',serde+'#[cfg(unknown)]#[derive(Serialize,Deserialize)]struct Row{value:i64}',serde+'use missing::*;#[derive(Serialize,Deserialize)]struct Row{value:i64}'])fixture(source,captured=>{const bulk=draftBulkSerialization(captured);assert.equal(bulk.supported.length,0);assert.ok(bulk.refused.some(entry=>entry.owner==='crate::Row'));});
});
test('manual trait implementations remain unproved while actual serializer-only owners retain exactly one direction',()=>{
  fixture(serde+'#[derive(Serialize)]enum OneWay{Value}struct Manual;impl Serialize for Manual{}',captured=>{const bulk=draftBulkSerialization(captured);assert.deepEqual(bulk.supported.find(entry=>entry.owner==='crate::OneWay').directions,{serialize:true,deserialize:false});assert.equal(bulk.discovery.manualTraitImplementations.length,1);assert.match(bulk.discovery.manualTraitImplementations[0].headerTokens.join(' '),/Serialize for Manual/);});
});
test('public reexports preserve actual dependency owners while inaccessible field routes refuse in bulk',()=>{
  const source='mod left{mod hidden{'+serde+'#[derive(Serialize,Deserialize)]pub struct Secret{value:i64}}pub use hidden::Secret as Visible;}mod right{'+serde+'#[derive(Serialize,Deserialize)]pub struct Good{value:crate::left::Visible}#[derive(Serialize,Deserialize)]pub struct Bad{value:crate::left::hidden::Secret}}';
  fixture(source,captured=>{const bulk=draftBulkSerialization(captured);assert.ok(bulk.supported.find(entry=>entry.owner==='crate::right::Good'));assert.match(bulk.refused.find(entry=>entry.owner==='crate::right::Bad').diagnostic.message,/inaccessible/);});
});
test('forged bulk promotion/removal and copied contexts cannot bypass source re-extraction',()=>{
  fixture(serde+'#[derive(Serialize,Deserialize)]struct Good{value:i64}#[derive(Serialize,Deserialize)]struct Hook{#[serde(with="custom")]value:String}',captured=>{const text=serializeBulkSerialization(captured),original=JSON.parse(text);original.refused=[];assert.throws(()=>parseBulkSerialization(canonicalSerializationMeta(original)+'\n',captured),/differs/);assert.throws(()=>parseBulkSerialization(text,{...captured}),/Unsealed/);assert.throws(()=>emitBulkSerializationRegistry(JSON.parse(text)),/privately/);});
});
test('changed source is rejected even when a forged inventory retains its prior source-set identity',()=>{
  fixture(serde+'#[derive(Serialize,Deserialize)]struct Good{value:i64}',(captured,root)=>{const text=serializeBulkSerialization(captured);writeFileSync(join(root,'src/lib.rs'),serde+'#[derive(Serialize,Deserialize)]struct Good{value:String}');const changed=captureSerializationContext({root,paths:['src/lib.rs'],entry:'src/lib.rs',compilationProfile:profile});assert.throws(()=>parseBulkSerialization(text,changed),/differs/);});
});
test('external modules, inactive original owners and outside-graph source files retain honest coverage boundaries',()=>{
  fixture('mod data;#[cfg(test)]mod tests;',captured=>{const bulk=draftBulkSerialization(captured);assert.ok(bulk.supported.find(entry=>entry.owner==='crate::data::State'));assert.ok(bulk.discovery.sourceCoverage.find(entry=>entry.source==='src/tests.rs'&&entry.status==='outside-reviewed-entry-graph'));assert.equal(bulk.discovery.graphDiagnostics.length,0);},{'src/data.rs':serde+'#[derive(Serialize,Deserialize)]pub enum State{Ready}','src/tests.rs':serde+'#[derive(Serialize,Deserialize)]enum OnlyTest{Testing}'});
});

test('post-DTO primitive aliases retain whole-file String and Vec masks rather than inheriting fragment preludes',()=>{
  for(const [field,alias]of [['value:String','type String=i64;'],['values:Vec<i64>','type Vec<T>=T;']]) {
    fixture(serde+'#[derive(Serialize,Deserialize)]struct Row{'+field+'}',captured=>assert.ok(draftBulkSerialization(captured).supported.find(entry=>entry.owner==='crate::Row')));
    fixture(serde+'#[derive(Serialize,Deserialize)]struct Row{'+field+'}'+alias,captured=>{const bulk=draftBulkSerialization(captured),row=bulk.refused.find(entry=>entry.owner==='crate::Row');assert.ok(row);assert.match(row.diagnostic.message,/shadowed|unresolved/);assert.equal(bulk.supported.some(entry=>entry.owner==='crate::Row'),false);});
  }
});
test('post-DTO reexport import masks the primitive while a checked qualified route retains its real private target',()=>{
  const source=serde+'#[derive(Serialize,Deserialize)]struct Masked{value:String}#[derive(Serialize,Deserialize)]struct Qualified{value:crate::catalog::Exported}mod catalog{mod hidden{'+serde+'#[derive(Serialize,Deserialize)]pub struct Text{value:i64}}pub use hidden::Text as Exported;}use catalog::Exported as String;';
  fixture(source,captured=>{const bulk=draftBulkSerialization(captured);assert.ok(bulk.refused.find(entry=>entry.owner==='crate::Masked'));const good=bulk.supported.find(entry=>entry.owner==='crate::Qualified');assert.ok(good);assert.equal(good.meta.types.find(entry=>entry.owner==='crate::Qualified').fields[0].type.owner,'crate::catalog::hidden::Text');assert.ok(good.meta.types.find(entry=>entry.owner==='crate::catalog::hidden::Text'));});
});
