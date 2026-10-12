import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { captureSerializationContext } from './extract.mjs';
import { serializeSerializationMeta, parseSerializationMeta, canonicalSerializationMeta } from './meta.mjs';
import { projectSerializationDescriptor } from './descriptor.mjs';
import { draftBulkSerialization, emitBulkSerializationRegistry } from './bulk.mjs';
import { createSerializationCodec } from './runtime.mjs';

const repository=resolve(fileURLToPath(new URL('../../../',import.meta.url))),profile={flags:{test:false,unix:true,windows:false}};
const imports='use serde::{Serialize,Deserialize};';
const plain=value=>JSON.parse(JSON.stringify(value));
let original;
function context(){return original??=captureSerializationContext({root:repository,paths:execFileSync('git',['ls-files','-z','--','src/*.rs'],{cwd:repository,encoding:'utf8'}).split('\0').filter(Boolean),entry:'src/lib.rs',compilationProfile:profile});}
function fixture(source,run) {
  const root=mkdtempSync(join(tmpdir(),'router-serialization-scalars-'));
  try {
    mkdirSync(join(root,'src'));writeFileSync(join(root,'src/lib.rs'),imports+source);
    for(const path of ['Cargo.toml','Cargo.lock'])writeFileSync(join(root,path),readFileSync(join(repository,path)));
    return run(captureSerializationContext({root,paths:['src/lib.rs'],entry:'src/lib.rs',compilationProfile:profile}));
  } finally {rmSync(root,{recursive:true,force:true});}
}
function checked(captured,root='crate::Record',direction='both'){return parseSerializationMeta(serializeSerializationMeta(captured,{roots:[root],direction}),captured);}
function record(fields){return '#[derive(Serialize,Deserialize)]struct Record{'+fields+'}';}

test('all fixed-width scalar owners retain exact original namespace identities in checked metadata',()=>{
  const names=['bool','i8','i16','i32','i64','u8','u16','u32','u64'];
  fixture(record(names.map((name,index)=>'field_'+index+':'+name).join(',')),captured=>{
    const meta=checked(captured);assert.deepEqual(meta.types[0].fields.map(field=>field.type.owner),names.map(name=>'rust-prelude::'+name));
    assert.deepEqual(projectSerializationDescriptor(meta).Record.fields.map(field=>field.type),names);
  });
});
test('late scalar type masks and unknown glob owners cannot impersonate standard primitive visitors',()=>{
  for(const tail of ['type bool=u8;','type u64=i64;','use missing::*;'])fixture(record('enabled:bool,count:u64')+tail,captured=>assert.throws(()=>checked(captured),/shadowed|unresolved|glob/));
  for(const type of ['usize','isize','f32','f64','u128'])fixture(record('value:'+type),captured=>assert.throws(()=>checked(captured),/no checked original source route/));
});
test('fixed-width visitors preserve signed and unsigned bounds and wide JSON identity without IEEE rounding',()=>{
  for(const bits of [8,16,32,64])for(const signed of [false,true]) {
    const type=(signed?'i':'u')+bits,low=signed?-(1n<<BigInt(bits-1)):0n,high=(1n<<BigInt(signed?bits-1:bits))-1n;
    fixture(record('value:'+type),captured=>{
      const codec=createSerializationCodec(checked(captured));
      for(const value of [low,high]) {const json='{"value":'+value+'}';assert.equal(BigInt(codec.deserialize(json).value),value);assert.equal(codec.serialize({value}),json);}
      for(const value of [low-1n,high+1n])assert.throws(()=>codec.deserialize('{"value":'+value+'}'),/bounds|integer visitor/);
      for(const spelling of ['-0','1.0','1e0','"1"','true'])assert.throws(()=>codec.deserialize('{"value":'+spelling+'}'),/integer visitor|exact/);
    });
  }
});
test('boolean and scalar string visitors reject coercion and lone-surrogate inputs',()=>{
  fixture(record('enabled:bool,text:String'),captured=>{
    const codec=createSerializationCodec(checked(captured));assert.deepEqual(plain(codec.deserialize('{"enabled":false,"text":"É🧪"}')),{enabled:false,text:'É🧪'});
    for(const enabled of [0,1,'true',null])assert.throws(()=>codec.serialize({enabled,text:'okay'}),/boolean/);
    assert.throws(()=>codec.deserialize('{"enabled":true,"text":"\\ud800"}'),/scalar string/);
  });
});
test('actual Serialize-only owners expose only the proven callable direction',()=>{
  fixture('#[derive(Serialize)]enum Record{#[serde(rename="active",alias="legacy")]Active}',captured=>{
    const meta=checked(captured,'crate::Record','serialize'),codec=createSerializationCodec(meta);
    assert.equal(codec.deserialize,undefined);assert.equal(codec.serialize('active'),'"active"');assert.throws(()=>codec.serialize('legacy'),/Unknown/);
    assert.throws(()=>checked(captured),/Deserialize owners are unproved/);
  });
});
test('actual Deserialize-only owners expose only the proven callable direction and accept explicit enum aliases',()=>{
  fixture('#[derive(Deserialize)]enum Record{#[serde(rename="active",alias="legacy")]Active}',captured=>{
    const codec=createSerializationCodec(checked(captured,'crate::Record','deserialize'));
    assert.equal(codec.serialize,undefined);assert.equal(codec.deserialize('"legacy"'),'active');assert.equal(codec.deserialize('{"active":null}'),'active');
    assert.throws(()=>checked(captured,'crate::Record','serialize'),/Serialize owners are unproved/);
  });
});
test('every reachable field owner must prove the requested direction independently of its containing DTO',()=>{
  fixture('#[derive(Serialize)]struct Child{value:u8}'+record('child:Child'),captured=>{
    assert.throws(()=>checked(captured),/Deserialize owners are unproved/);
    const codec=createSerializationCodec(checked(captured,'crate::Record','serialize'));assert.equal(codec.serialize({child:{value:7}}),'{"child":{"value":7}}');
    assert.throws(()=>checked(captured,'crate::Record','deserialize'),/Deserialize owners are unproved/);
  });
});
test('forged directions and copied metadata cannot grant a missing original trait or executable codec',()=>{
  fixture('#[derive(Serialize)]enum Record{Active}',captured=>{
    const text=serializeSerializationMeta(captured,{roots:['crate::Record'],direction:'serialize'}),forged=JSON.parse(text);forged.direction='deserialize';
    assert.throws(()=>parseSerializationMeta(canonicalSerializationMeta(forged)+'\n',captured),/Deserialize owners are unproved/);
    assert.throws(()=>createSerializationCodec(JSON.parse(text)),/privately checked/);
    assert.throws(()=>checked(captured,'crate::Record','unproved'),/direction/);
  });
});
test('plain Option missing-map and null values are None while missing sequence values require explicit default',()=>{
  fixture(record('required:u8,note:Option<String>'),captured=>{
    const codec=createSerializationCodec(checked(captured));assert.deepEqual(plain(codec.deserialize('{"required":2}')),{required:2,note:null});
    assert.deepEqual(plain(codec.deserialize('[2,null]')),{required:2,note:null});assert.throws(()=>codec.deserialize('[2]'),/Missing field note/);
    assert.equal(codec.serialize({required:2}),'{"required":2,"note":null}');assert.equal(codec.serialize({required:2,note:'yes'}),'{"required":2,"note":"yes"}');
  });
  fixture(record('required:u8,#[serde(default)]note:Option<String>'),captured=>assert.equal(createSerializationCodec(checked(captured)).deserialize('[2]').note,null));
});
test('only checked Option omission helpers remove None fields from serialization',()=>{
  fixture(record('required:u8,#[serde(default,skip_serializing_if="Option::is_none")]note:Option<String>'),captured=>{
    const codec=createSerializationCodec(checked(captured));assert.equal(codec.serialize({required:2,note:null}),'{"required":2}');assert.equal(codec.deserialize('{"required":2}').note,undefined);
  });
  fixture(record('#[serde(skip_serializing_if="opaque")]note:Option<String>'),captured=>assert.throws(()=>projectSerializationDescriptor(checked(captured)),/Option::is_none/));
});
test('nested Option, opaque defaults and non-Option default functions remain explicit refusals',()=>{
  for(const fields of ['value:Option<Option<u8>>','#[serde(default="make_value")]value:u8','#[serde(default)]value:bool','#[serde(with="custom")]value:u8'])fixture(record(fields),captured=>assert.throws(()=>projectSerializationDescriptor(checked(captured)),/Nested Option|opaque|default|separate|profile/));
});
test('actual original ServerSelection and TunnelStatusReport run through the shared scalar and nullable descriptor consumer',()=>{
  const selection=createSerializationCodec(checked(context(),'crate::operation_reports::ServerSelection'));
  assert.deepEqual(plain(selection.deserialize('{"source":"environment","token_configured":true}')),{source:'environment',url:null,token_configured:true});
  assert.equal(selection.serialize({source:'environment',token_configured:false}),'{"source":"environment","url":null,"token_configured":false}');
  const tunnel=createSerializationCodec(checked(context(),'crate::operation_reports::TunnelStatusReport'));
  const input={running:true,via:'ssh',server:'example',local_port:8080,remote_port:443,health_status:200,models_status:null,models_checked:false,output:['ready']};
  assert.deepEqual(plain(tunnel.deserialize(tunnel.serialize(input))),input);assert.throws(()=>tunnel.serialize({...input,local_port:65536}),/bounds/);
});
test('actual original OAuth response DTOs are deserialization-only without inventing an encoder',()=>{
  const codec=createSerializationCodec(checked(context(),'crate::auth::TokenResponse','deserialize'));
  assert.equal(codec.serialize,undefined);assert.deepEqual(plain(codec.deserialize('{"id_token":"id","access_token":"access","refresh_token":"refresh"}')),{id_token:'id',access_token:'access',refresh_token:'refresh'});
  assert.throws(()=>codec.deserialize('{"id_token":"id","access_token":"access"}'),/Missing field refresh_token/);
});
test('generic JSON parsing preserves duplicate known fields, scalar syntax and bounded input refusals',()=>{
  fixture(record('value:u64'),captured=>{
    const codec=createSerializationCodec(checked(captured));assert.throws(()=>codec.deserialize('{"value":1,"value":2}'),/Duplicate field/);
    assert.equal(codec.deserialize('{"ignored":1e0,"value":18446744073709551615}').value,18446744073709551615n);
    for(const text of ['\ufeff{"value":1}','{"value":01}','{"value":1,}','{"value":1}garbage','{"value":1,"unknown":1e999}'])assert.throws(()=>codec.deserialize(text));
    assert.throws(()=>codec.serialize({value:9007199254740992}),/exact/);
  });
});
test('bulk-generated JS and TS retain the exact one-way callable inventory rather than promoting missing directions',async()=>{
  const captured=fixture('#[derive(Serialize)]enum Output{Ready}#[derive(Deserialize)]struct Input{value:u16}',value=>value),bulk=draftBulkSerialization(captured);
  const js=emitBulkSerializationRegistry(bulk),module=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  assert.deepEqual(module.serializationSchemas['crate::Output'].directions,{serialize:true,deserialize:false});
  assert.deepEqual(module.serializationSchemas['crate::Input'].directions,{serialize:false,deserialize:true});
  assert.equal(module.serializationSchemas['crate::Input'].schema.Input.fields[0].type,'u16');
  assert.ok(emitBulkSerializationRegistry(bulk,{language:'typescript'}).endsWith(' as const;\n'));
  assert.equal(bulk.runtimeAuthority,false);
});
test('changing original derives changes only the actually proven generated and callable directions',()=>{
  for(const [derive,direction]of [['Serialize','serialize'],['Deserialize','deserialize'],['Serialize,Deserialize','both']])fixture('#[derive('+derive+')]enum Record{Ready}',captured=>{
    const codec=createSerializationCodec(checked(captured,'crate::Record',direction));assert.equal(typeof codec.serialize,direction==='deserialize'?'undefined':'function');assert.equal(typeof codec.deserialize,direction==='serialize'?'undefined':'function');
  });
});
