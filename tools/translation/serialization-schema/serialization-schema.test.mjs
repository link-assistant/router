import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { captureSerializationContext, extractSerializationSchema, SerializationRefusal } from './extract.mjs';
import { serializeSerializationMeta, parseSerializationMeta, canonicalSerializationMeta } from './meta.mjs';
import { projectSerializationDescriptor, emitSerializationDescriptor } from './descriptor.mjs';
import { generateSerializationSchema } from './generate.mjs';
import { affinitySchema } from '../../../packages/javascript/native/affinity-schema.mjs';

const repository=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const profile={flags:{test:false,unix:true,windows:false}};
const roots=['crate::response_affinity::AffinityFile'];
const plain=value=>JSON.parse(JSON.stringify(value));
const corpusPaths=()=>execFileSync('git',['ls-files','-z','--','src/*.rs'],{cwd:repository,encoding:'utf8'}).split('\0').filter(Boolean);
let original;
function originalContext(){return original ??= captureSerializationContext({root:repository,paths:corpusPaths(),entry:'src/lib.rs',compilationProfile:profile});}
function fixture(source,run,extra={}) {
  const root=mkdtempSync(join(tmpdir(),'router-schema-fixture-'));
  try {
    mkdirSync(join(root,'src'));writeFileSync(join(root,'src/lib.rs'),source);
    for(const path of ['Cargo.toml','Cargo.lock'])writeFileSync(join(root,path),readFileSync(join(repository,path)));
    for(const [path,text]of Object.entries(extra)){mkdirSync(resolve(root,path,'..'),{recursive:true});writeFileSync(join(root,path),text);}
    const options={root,paths:['src/lib.rs',...Object.keys(extra)],entry:'src/lib.rs',compilationProfile:profile};
    return run(options);
  } finally {rmSync(root,{recursive:true,force:true});}
}
function projected(options,selected=['crate::Record']){const context=captureSerializationContext(options);return projectSerializationDescriptor(parseSerializationMeta(serializeSerializationMeta(context,{roots:selected}),context));}
const imports='use serde::{Serialize,Deserialize};\n';
const record=body=>imports+'#[derive(Serialize,Deserialize)]\nstruct Record {'+body+'}\n';

test('original seven reachable owners generate exactly the actual manual affinity descriptor',()=>{
  const context=originalContext(),meta=parseSerializationMeta(serializeSerializationMeta(context,{roots}),context);
  assert.equal(meta.types.length,7);
  assert.equal(meta.context.dependencyEvidence.packages.find(entry=>entry.name==='serde').version,'1.0.229');
  assert.equal(meta.context.caseSource.path,'src/internals/case.rs');
  assert.deepEqual(plain(projectSerializationDescriptor(meta)),plain(affinitySchema));
  const subscription=meta.types.find(type=>type.name==='SubscriptionProvider');
  assert.equal(subscription.owner,'crate::subscription::types::SubscriptionProvider');
  const field=meta.types.find(type=>type.name==='AffinityDestination').variants.find(variant=>variant.name==='Subscription').fields.find(field=>field.name==='provider');
  assert.equal(field.type.written,'crate::subscription::SubscriptionProvider');assert.equal(field.type.owner,subscription.owner);
});
test('checked original meta retains precise source attr and field/variant identities',()=>{
  const context=originalContext(),meta=parseSerializationMeta(serializeSerializationMeta(context,{roots}),context);
  for(const type of meta.types){const source=readFileSync(join(repository,type.source),'utf8');assert.match(source.slice(type.span.start,type.span.end),new RegExp('\\b'+type.name+'\\b'));for(const attribute of type.attributes)assert.equal(source.slice(attribute.span.start,attribute.span.end).replace(/\s/g,''),attribute.tokens.join('').replace(/\s/g,''));}
  const option=meta.types.find(type=>type.name==='ResponseAffinity').fields.find(field=>field.name==='parent_id');assert.equal(option.type.kind,'option');assert.equal(option.type.owner,'rust-prelude::Option');assert.equal(option.type.type.owner,'rust-prelude::String');assert.deepEqual(option.attributes[0].helpers.map(helper=>helper.key),['default','skip_serializing_if']);
});
test('JS and TS emissions share one checked graph and JS exposes real canonical and alias values',async()=>{
  const context=originalContext(),meta=parseSerializationMeta(serializeSerializationMeta(context,{roots}),context);
  const js=emitSerializationDescriptor(meta),ts=emitSerializationDescriptor(meta,{language:'typescript'});
  assert.equal(ts,js.replace(/;\n$/,' as const;\n'));
  const module=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  assert.deepEqual(plain(module.serializationSchema),plain(affinitySchema));
  assert.equal(module.serializationSchema.ProviderKind.aliases['open-a-i-compatible'],'openai-compatible');
});
test('source serde rename and alias edits change generated accepted enum identities',()=>{
  const source=imports+'#[derive(Serialize,Deserialize)] #[serde(rename_all="snake_case")] enum Choice { FirstValue, #[serde(rename="explicit",alias="legacy")] SecondValue }';
  fixture(source,options=>{const result=projected(options,['crate::Choice']);assert.deepEqual(plain(result.Choice),{kind:'enum',source:'lib.rs::Choice',variants:['first_value','explicit'],aliases:{legacy:'explicit'}});});
  fixture(source.replace('legacy','older').replace('explicit','renamed'),options=>{const result=projected(options,['crate::Choice']);assert.deepEqual(result.Choice.variants,['first_value','renamed']);assert.equal(result.Choice.aliases.older,'renamed');assert.equal(result.Choice.aliases.legacy,undefined);});
});
test('metadata drift and forged attrs/qualified owners remain rejected',()=>{
  const context=originalContext(),text=serializeSerializationMeta(context,{roots});
  for(const mutate of [meta=>meta.types[0].sourceSha256='0'.repeat(64),meta=>meta.types[0].owner='crate::forged::Owner',meta=>meta.types[0].attributes=[],meta=>meta.runtimeAuthority=true]) {const meta=JSON.parse(text);mutate(meta);assert.throws(()=>parseSerializationMeta(canonicalSerializationMeta(meta)+'\n',context),SerializationRefusal);}
  assert.throws(()=>parseSerializationMeta(text,{...context}),/Unsealed/);
  assert.throws(()=>emitSerializationDescriptor(JSON.parse(text)),/privately checked/);
});
test('source changes invalidate old checked metadata even with unchanged qualified names',()=>{
  fixture(record('value: i64,'),options=>{const first=captureSerializationContext(options),text=serializeSerializationMeta(first,{roots:['crate::Record']});writeFileSync(join(options.root,'src/lib.rs'),record('value: String,'));const changed=captureSerializationContext(options);assert.throws(()=>parseSerializationMeta(text,changed),/differs/);assert.equal(projected(options).Record.fields[0].type,'String');});
});
test('source-defined String and aliases cannot impersonate a prelude serialization primitive',()=>{
  for(const declaration of ['#[derive(Serialize,Deserialize)] struct String { inner:i64 }','type String = i64;'])fixture(imports+declaration+'\n#[derive(Serialize,Deserialize)] struct Record { value:String }',options=>assert.throws(()=>projected(options),/shadowed|unresolved|owner/));
});
test('Option shadow and unsupported helpers are explicit refusals',()=>{
  for(const body of ['#[serde(default="make_value")] value:i64','#[serde(with="custom")] value:String','#[serde(flatten)] value:String','#[serde(skip_serializing_if="custom")] value:Option<String>','value:Option<String>'])fixture(record(body),options=>assert.throws(()=>projected(options),SerializationRefusal));
});
test('generic collection and field defaults retain the bounded original Option/Vec identities',()=>{
  fixture(record('items: Vec<i64>, #[serde(default,skip_serializing_if="Option::is_none")] note:Option<String>'),options=>assert.deepEqual(plain(projected(options).Record.fields),[{name:'items',type:{kind:'vec',type:'i64'},optional:false},{name:'note',type:'String',optional:true}]));
});
test('tagged named variants project ordered fields while tuple and untagged layouts refuse',()=>{
  fixture(imports+'#[derive(Serialize,Deserialize)] #[serde(tag="kind",rename_all="snake_case")] enum Record { StoredValue { value:i64 }, OtherValue { text:String } }',options=>{const value=projected(options).Record;assert.equal(value.tag,'kind');assert.deepEqual(Object.keys(value.variants),['stored_value','other_value']);assert.equal(value.variants.stored_value.fields[0].type,'i64');});
  for(const source of [imports+'#[derive(Serialize,Deserialize)] enum Record { Item(i64) }',imports+'#[derive(Serialize,Deserialize)] #[serde(untagged)] enum Record { Item { value:i64 } }'])fixture(source,options=>assert.throws(()=>projected(options),SerializationRefusal));
});
test('source-qualified duplicate leaf names refuse the ordinary descriptor ABI',()=>{
  fixture(imports+'mod one { use serde::{Serialize,Deserialize}; #[derive(Serialize,Deserialize)] pub struct Same { pub value:i64 } } mod two { use serde::{Serialize,Deserialize}; #[derive(Serialize,Deserialize)] pub struct Same { pub text:String } } #[derive(Serialize,Deserialize)] struct Record { one:crate::one::Same,two:crate::two::Same }',options=>assert.throws(()=>projected(options),/collide/));
});
test('ambiguous aliases and unregistered globs cannot bless type owner guesses',()=>{
  for(const source of [imports+'use missing::String; #[derive(Serialize,Deserialize)] struct Record { value:String }',imports+'use missing::*; #[derive(Serialize,Deserialize)] struct Record { value:i64 }'])fixture(source,options=>assert.throws(()=>projected(options),SerializationRefusal));
});
test('checked grammar refuses duplicate metadata keys and unbounded nesting',()=>{
  const context=originalContext(),text=serializeSerializationMeta(context,{roots});
  assert.throws(()=>parseSerializationMeta(text.replace('"schema":','"schema":"original-serialization-meta-v1","schema":'),context),/canonical/);
  assert.throws(()=>parseSerializationMeta('{"schema":"original-serialization-meta-v1","roots":'+ '['.repeat(70)+'0'+']'.repeat(70)+'}',context),/budget/);
});
test('generation compares the actual projection before offering any native replacement artifact',()=>{
  const options={root:repository,paths:corpusPaths(),entry:'src/lib.rs',roots,compilationProfile:profile,expectedDescriptor:affinitySchema,exportName:'affinitySchema'};
  const generated=generateSerializationSchema(options);assert.equal(generated.comparedExistingProjection,true);assert.equal(generated.runtimeAuthority,false);assert.match(generated.javascript,/export const affinitySchema/);
  assert.throws(()=>generateSerializationSchema({...options,expectedDescriptor:{}}),/differs from the actual existing manual/);
});

test('JSON-only escapes cannot bless Rust-invalid serde helper names',()=>{
  for(const escape of ['\\u0041','\\b','\\f','\\/'])fixture(imports+'#[derive(Serialize,Deserialize)] enum Record { #[serde(rename="'+escape+'")] Value }',options=>assert.throws(()=>projected(options),/Rust helper literal escape|Unproved|unproved/));
});
