import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { captureSerializationContext } from './extract.mjs';
import { serializeSerializationMeta, parseSerializationMeta, canonicalSerializationMeta } from './meta.mjs';
import { projectSerializationDescriptor, emitSerializationDescriptor } from './descriptor.mjs';
import { draftBulkSerialization } from './bulk.mjs';
import { createSerializationCodec } from './runtime.mjs';

const repository=resolve(fileURLToPath(new URL('../../../',import.meta.url))),profile={flags:{test:false,unix:true,windows:false}};
const serde='use serde::{Serialize,Deserialize};',plain=value=>JSON.parse(JSON.stringify(value));
let original;
function context(){return original??=captureSerializationContext({root:repository,paths:execFileSync('git',['ls-files','-z','--','src/*.rs'],{cwd:repository,encoding:'utf8'}).split('\0').filter(Boolean),compilationProfile:profile});}
function fixture(source,run) {
  const root=mkdtempSync(join(tmpdir(),'router-serde-alias-default-'));
  try {
    mkdirSync(join(root,'src'));writeFileSync(join(root,'src/lib.rs'),serde+source);
    for(const path of ['Cargo.toml','Cargo.lock'])writeFileSync(join(root,path),readFileSync(join(repository,path)));
    return run(captureSerializationContext({root,paths:['src/lib.rs'],compilationProfile:profile}));
  } finally {rmSync(root,{recursive:true,force:true});}
}
const record=fields=>'#[derive(Serialize,Deserialize)]struct Record{'+fields+'}';
const checked=(captured,root='crate::Record',direction='both')=>parseSerializationMeta(serializeSerializationMeta(captured,{roots:[root],direction}),captured);

test('field aliases decode canonical values and never become serialized field names',()=>{
  fixture(record('#[serde(rename="current",alias="legacy",alias="older")]value:u64'),captured=>{
    const codec=createSerializationCodec(checked(captured));
    for(const key of ['current','legacy','older'])assert.equal(codec.deserialize('{"'+key+'":18446744073709551615}').current,18446744073709551615n);
    assert.equal(codec.serialize({current:9}),'{"current":9}');assert.throws(()=>codec.serialize({legacy:9}),/Missing field current/);
    assert.throws(()=>codec.deserialize('{"value":9}'),/Missing field current/);
  });
});
test('canonical plus alias and two different aliases are duplicate known fields even when values are null',()=>{
  fixture(record('#[serde(alias="old",alias="older")]value:Option<String>'),captured=>{
    const codec=createSerializationCodec(checked(captured));
    for(const text of ['{"value":null,"old":null}','{"old":"one","older":"two"}','{"old":null,"old":null}'])assert.throws(()=>codec.deserialize(text),/Duplicate field value/);
    assert.equal(codec.deserialize('{"unknown":1,"unknown":2,"old":"one"}').value,'one');
  });
});
test('rename_all does not rewrite explicitly written aliases and alias self/repetition is a set',()=>{
  fixture('#[derive(Serialize,Deserialize)]#[serde(rename_all="camelCase")]struct Record{#[serde(alias="old_name",alias="firstName",alias="old_name")]first_name:String}',captured=>{
    const codec=createSerializationCodec(checked(captured));assert.equal(codec.deserialize('{"old_name":"Ada"}').firstName,'Ada');
    assert.equal(codec.serialize({firstName:'Ada'}),'{"firstName":"Ada"}');assert.throws(()=>codec.deserialize('{"oldName":"Ada"}'),/Missing/);
  });
});
test('ambiguous cross-field aliases remain source-bearing refusals instead of guessed field precedence',()=>{
  for(const fields of ['#[serde(alias="second")]first:u8,second:u8','#[serde(alias="old")]first:u8,#[serde(alias="old")]second:u8'])fixture(record(fields),captured=>{
    assert.throws(()=>projectSerializationDescriptor(checked(captured)),/alias collides/);
    const refused=draftBulkSerialization(captured).refused.find(entry=>entry.owner==='crate::Record');assert.match(refused.diagnostic.message,/alias collides/);
  });
  fixture('#[derive(Serialize,Deserialize)]#[serde(tag="kind")]enum Record{First{#[serde(default,alias="kind")]value:bool}}',captured=>assert.throws(()=>projectSerializationDescriptor(checked(captured)),/Internal tag conflicts/));
});
test('bare primitive defaults use checked original Rust bodies for missing map and sequence fields',()=>{
  const types=['bool','i8','i16','i32','i64','u8','u16','u32','u64'];
  fixture(record(types.map((type,index)=>'#[serde(default)]field_'+index+':'+type).join(',')),captured=>{
    const meta=checked(captured),codec=createSerializationCodec(meta),expected=Object.fromEntries(types.map((type,index)=>['field_'+index,type==='bool'?false:0]));
    assert.deepEqual(plain(codec.deserialize('{}')),expected);assert.deepEqual(plain(codec.deserialize('[]')),expected);
    for(const field of meta.types[0].fields){assert.equal(field.defaultProof.selection.evidence.trait,'core::default::Default');assert.equal(field.defaultProof.selection.evidence.owner,field.type.name);assert.equal(field.defaultProof.generatedTraitBehavior,false);}
    assert.throws(()=>codec.serialize({}),/Missing field/);
  });
});
test('primitive defaults apply only to missing values and preserve supplied integer and boolean visitor failures',()=>{
  fixture(record('#[serde(default)]enabled:bool,#[serde(default)]count:u64'),captured=>{
    const codec=createSerializationCodec(checked(captured));assert.deepEqual(plain(codec.deserialize('{"enabled":true,"count":17}')),{enabled:true,count:17});
    assert.equal(codec.deserialize('{"count":18446744073709551615}').count,18446744073709551615n);
    for(const text of ['{"enabled":null}','{"enabled":0}','{"count":null}','{"count":-0}','{"count":1e0}','{"count":18446744073709551616}'])assert.throws(()=>codec.deserialize(text),/boolean|integer visitor|exact|bounds/);
  });
});
test('an aliased primitive default shares canonical duplicate and missing-field behavior',()=>{
  fixture(record('#[serde(default,rename="active",alias="legacy")]enabled:bool'),captured=>{
    const codec=createSerializationCodec(checked(captured));assert.equal(codec.deserialize('{}').active,false);assert.equal(codec.deserialize('{"legacy":true}').active,true);
    assert.equal(codec.serialize({active:false}),'{"active":false}');assert.throws(()=>codec.deserialize('{"active":false,"legacy":true}'),/Duplicate field active/);
  });
});
test('whole-file primitive aliases and imports cannot substitute a same-spelling Default owner',()=>{
  for(const tail of ['type bool=u8;','mod private{pub type Value=u8;}use private::Value as bool;','use missing::*;'])fixture(record('#[serde(default)]value:bool')+tail,captured=>assert.throws(()=>checked(captured),/shadowed|unresolved|unproved/));
});
test('local Default trait spelling cannot override the private Serde core trait route',()=>{
  fixture(record('#[serde(default)]value:bool')+'trait Default{fn default()->bool;}struct Marker;impl Default for Marker{fn default()->bool{true}}',captured=>{
    const codec=createSerializationCodec(checked(captured));assert.equal(codec.deserialize('{}').value,false);
    assert.equal(codec.schema.Record.fields[0].default.value,false);
  });
});
test('opaque custom and derived defaults, aggregate defaults and omission predicates retain genuine obligations',()=>{
  for(const source of [record('#[serde(default="custom")]value:bool')+'fn custom()->bool{true}',record('#[serde(default)]value:String'),record('#[serde(default)]value:Vec<u8>'),record('#[serde(default,skip_serializing_if="is_false")]value:bool')+'fn is_false(value:&bool)->bool{!*value}',
    '#[derive(Serialize,Deserialize,Default)]enum Choice{#[default]First,Second}'+record('#[serde(default)]value:Choice'),
    '#[derive(Serialize,Deserialize,Default)]#[serde(default)]struct Record{value:bool}'])fixture(source,captured=>assert.throws(()=>projectSerializationDescriptor(checked(captured)),/opaque|Default body|predicate|separately|projection/));
});
test('edited Default source identities and values cannot be reissued as checked metadata or copied codec authority',()=>{
  fixture(record('#[serde(default)]value:bool'),captured=>{
    const text=serializeSerializationMeta(captured,{roots:['crate::Record']});
    for(const change of [meta=>{meta.types[0].fields[0].defaultProof.checkedLiteral.value=true;},meta=>{meta.types[0].fields[0].defaultProof.selection.evidence.expansionDigest='0'.repeat(64);},meta=>{meta.types[0].fields[0].defaultProof.selection.evidence.owner='u8';}]) {
      const edited=JSON.parse(text);change(edited);assert.throws(()=>parseSerializationMeta(canonicalSerializationMeta(edited)+'\n',captured),/differs/);
    }
    assert.throws(()=>createSerializationCodec(JSON.parse(text)),/privately checked/);
  });
});
test('one-way traits keep their actual callable direction with aliases and primitive defaults',()=>{
  for(const [derive,direction]of [['Serialize','serialize'],['Deserialize','deserialize']])fixture('#[derive('+derive+')]struct Record{#[serde(default,alias="old")]value:bool}',captured=>{
    const codec=createSerializationCodec(checked(captured,'crate::Record',direction));
    if(direction==='serialize'){assert.equal(codec.deserialize,undefined);assert.equal(codec.serialize({value:true}),'{"value":true}');assert.throws(()=>codec.serialize({old:true}),/Missing/);}
    else {assert.equal(codec.serialize,undefined);assert.equal(codec.deserialize('{}').value,false);assert.equal(codec.deserialize('{"old":true}').value,true);}
  });
});
test('actual private Claude DTO decodes original vendor aliases and exact signed timestamps',()=>{
  const claude=createSerializationCodec(checked(context(),'crate::oauth::ClaudeCredentials','deserialize'));
  assert.equal(claude.serialize,undefined);
  const value=claude.deserialize('{"claudeAiOauth":{"accessToken":"access","refreshToken":"refresh","expiresAt":9223372036854775807}}');
  assert.equal(value.claude_ai_oauth.access_token,'access');assert.equal(value.claude_ai_oauth.expires_at,9223372036854775807n);
  assert.throws(()=>claude.deserialize('{"accessToken":"one","access_token":"two"}'),/Duplicate field access_token/);
});
test('actual private subscription DTO decodes original nested aliases and exact signed timestamps',()=>{
  const raw=createSerializationCodec(checked(context(),'crate::subscription::RawCredentials','deserialize'));
  const nested=raw.deserialize('{"tokens":{"accessToken":"access","accountId":"owner"},"expiryDate":-9223372036854775808}');
  assert.equal(nested.tokens.account_id,'owner');assert.equal(nested.expiry_date,-9223372036854775808n);
  assert.throws(()=>raw.deserialize('{"expiryDate":1.0}'),/integer visitor/);
});
test('actual ProviderUpsert combines optional aliases with its original primitive if_absent default',()=>{
  const codec=createSerializationCodec(checked(context(),'crate::providers::ProviderUpsert'));
  const value=codec.deserialize('{"name":"example","base_url":"https://example.invalid","intermediary_risk_acknowledged":true,"unsupported_clients":["custom"]}');
  assert.equal(value.if_absent,false);assert.equal(value.acknowledge_intermediary_risk,true);assert.deepEqual(value.acknowledge_unsupported_clients,['custom']);
  const wire=JSON.parse(codec.serialize(value));assert.equal(wire.if_absent,false);assert.equal(wire.acknowledge_intermediary_risk,true);assert.equal(wire.intermediary_risk_acknowledged,undefined);
  assert.throws(()=>codec.deserialize('{"name":"example","base_url":"url","if_absent":null}'),/boolean/);
});
test('shared emitted JS and TS descriptors retain aliases and source-checked defaults without target body templates',async()=>{
  await fixture(record('#[serde(default,alias="old")]value:u64'),async captured=>{
    const meta=checked(captured),js=emitSerializationDescriptor(meta),ts=emitSerializationDescriptor(meta,{language:'typescript'}),module=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
    assert.deepEqual(module.serializationSchema.Record.fields[0],{name:'value',type:'u64',optional:false,aliases:['old'],default:{kind:'primitive',value:'0'}});
    assert.equal(ts,js.replace(/;\n$/,' as const;\n'));assert.equal(meta.runtimeAuthority,false);assert.equal(meta.generatedTraitBehavior,false);
  });
});
