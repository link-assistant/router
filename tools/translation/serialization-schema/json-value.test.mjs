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
import { createSerializationCodec } from './runtime.mjs';
import { jsonMap, tagged } from '../extensions/json-values.mjs';
import { serde_json_from_str } from '../extensions/json-runtime.mjs';

const repository=resolve(fileURLToPath(new URL('../../../',import.meta.url))),profile={flags:{test:false,unix:true,windows:false}},serde='use serde::{Serialize,Deserialize};';
let original;
function context(){return original??=captureSerializationContext({root:repository,paths:execFileSync('git',['ls-files','-z','--','src/*.rs'],{cwd:repository,encoding:'utf8'}).split('\0').filter(Boolean),compilationProfile:profile});}
function fixture(source,run) {
  const root=mkdtempSync(join(tmpdir(),'router-serialization-json-'));
  try {
    mkdirSync(join(root,'src'));writeFileSync(join(root,'src/lib.rs'),serde+source);
    for(const name of ['Cargo.toml','Cargo.lock'])writeFileSync(join(root,name),readFileSync(join(repository,name)));
    return run(captureSerializationContext({root,paths:['src/lib.rs'],compilationProfile:profile}));
  } finally {rmSync(root,{recursive:true,force:true});}
}
const record=fields=>'#[derive(Serialize,Deserialize)]struct Record{'+fields+'}';
const checked=(captured,root='crate::Record',direction='serialize')=>parseSerializationMeta(serializeSerializationMeta(captured,{roots:[root],direction}),captured);
const text=value=>tagged('String',{field0:value}),integer=value=>tagged('Number',{field0:tagged(value<0n?'NegInt':'PosInt',{field0:value})}),object=entries=>tagged('Object',{field0:jsonMap(entries)});

test('external Value fields preserve the actual locked manual trait and complete-source identities',()=>{
  fixture(record('payload:serde_json::Value'),captured=>{
    const meta=checked(captured),field=meta.types[0].fields[0];assert.equal(field.type.kind,'json-value');assert.equal(field.type.owner,'serde_json::Value');
    assert.equal(field.type.sourceProof.traitOwner.package,'serde_core');assert.equal(field.type.sourceProof.traitOwner.version,'1.0.229');
    for(const direction of ['serialize','deserialize'])assert.match(field.type.sourceProof.traits[direction].bodySha256,/^[a-f0-9]{64}$/);
    assert.equal(field.type.sourceProof.manualTraitCompleteness,false);assert.equal(field.type.sourceProof.actualParserProfile.parseAvailable,false);
    assert.equal(field.type.sourceProof.finiteFloatFormattingAvailable,false);
  });
});
test('source-qualified and imported reexport aliases share the real external Value ABI',()=>{
  fixture('mod exports{pub use serde_json::Value as Payload;}use exports::Payload as Input;'+record('payload:Input'),captured=>{
    const meta=checked(captured),codec=createSerializationCodec(meta);assert.equal(meta.types[0].fields[0].type.owner,'serde_json::Value');
    assert.equal(codec.serialize({payload:text('É🧪')}),'{"payload":"É🧪"}');assert.equal(codec.deserialize,undefined);
  });
});
test('actual source module masks retain their own type instead of impersonating the external Value owner',()=>{
  fixture('mod serde_json{use serde::Serialize;#[derive(Serialize)]pub struct Value{pub enabled:bool}}'+record('payload:serde_json::Value'),captured=>{
    const meta=checked(captured);assert.equal(meta.types.find(type=>type.name==='Record').fields[0].type.owner,'crate::serde_json::Value');
    assert.equal(createSerializationCodec(meta).serialize({payload:{enabled:true}}),'{"payload":{"enabled":true}}');
  });
});
test('unresolved external-root imports, glob masks and fake package spellings cannot borrow JSON certificates',()=>{
  for(const source of ['use missing::*;'+record('payload:serde_json::Value'),record('payload:fake_json::Value'),record('payload:Value')])fixture(source,captured=>assert.throws(()=>checked(captured),/unproved|glob|inaccessible|route/));
});
test('recursive algebraic arrays and objects serialize actual signed and unsigned integers without IEEE rounding',()=>{
  fixture(record('payload:serde_json::Value'),captured=>{
    const codec=createSerializationCodec(checked(captured)),value=object([['wide',integer(18446744073709551615n)],['array',tagged('Array',{field0:[integer(-9223372036854775808n),text('Ω'),tagged('Null')]})]]);
    assert.equal(codec.serialize({payload:value}),'{"payload":{"array":[-9223372036854775808,"Ω",null],"wide":18446744073709551615}}');
    for(const value of [integer(18446744073709551616n),integer(-9223372036854775809n),tagged('Number',{field0:tagged('PosInt',{field0:9007199254740992})})])assert.throws(()=>codec.serialize({payload:value}),/Number|domain/);
  });
});
test('Map<String,Value> uses the original specialization and UTF8 key order without a JS object coercion bridge',()=>{
  fixture('use serde_json::{Map,Value};'+record('payload:Map<String,Value>'),captured=>{
    const codec=createSerializationCodec(checked(captured)),map=jsonMap([['🧪',text('astral')],['\ue000',text('private')],['__proto__',integer(1n)]]);
    assert.equal(codec.serialize({payload:map}),'{"payload":{"__proto__":1,"":"private","🧪":"astral"}}');
    assert.throws(()=>codec.serialize({payload:{key:'plain'}}),/Map|field layout/);
  });
  for(const type of ['serde_json::Map<u64,serde_json::Value>','serde_json::Map<String,bool>','serde_json::Map<String>'])fixture(record('payload:'+type),captured=>assert.throws(()=>checked(captured),/specialization|arity/));
});
test('typed algebraic maps reject duplicate or unsorted key entries even though Value input object visitors are last-wins',()=>{
  fixture(record('payload:serde_json::Value'),captured=>{
    const codec=createSerializationCodec(checked(captured));
    for(const entries of [[['same',text('one')],['same',text('two')]],[['z',text('one')],['a',text('two')]]]) {
      const map=tagged('Map',{entries:entries.map(([key,value])=>tagged('MapEntry',{key,value}))});assert.throws(()=>codec.serialize({payload:tagged('Object',{field0:map})}),/unique and sorted/);
    }
    // Explicit standalone registered parser control; it does not admit this
    // crate's actual float_roundtrip decoding profile or DTO Deserialize.
    const parsed=serde_json_from_str('{"same":1,"same":2}');assert.equal(parsed.$,'Ok');assert.equal(parsed.field0.field0.entries[0].value.field0.field0,2n);
  });
  fixture(record('value:u64'),captured=>assert.throws(()=>createSerializationCodec(checked(captured,'crate::Record','both')).deserialize('{"value":1,"value":2}'),/Duplicate field/));
});
test('all finite Float constructors stay refused until a genuine source-equivalent formatter is admitted',()=>{
  fixture(record('payload:serde_json::Value'),captured=>{
    const codec=createSerializationCodec(checked(captured));
    for(const number of [0,-0,1.5,Number.MIN_VALUE,Number.MAX_VALUE])assert.throws(()=>codec.serialize({payload:tagged('Number',{field0:tagged('Float',{field0:number})})}),/formatting has no admitted source-equivalence proof/);
    for(const number of [NaN,Infinity,-Infinity])assert.throws(()=>codec.serialize({payload:tagged('Number',{field0:tagged('Float',{field0:number})})}),/finite binary64 domain/);
  });
});
test('actual float_roundtrip Deserialize and both projections remain explicit source-bearing refusals',()=>{
  fixture(record('payload:serde_json::Value'),captured=>{
    for(const direction of ['both','deserialize']) {
      const meta=checked(captured,'crate::Record',direction);assert.equal(meta.types[0].fields[0].type.sourceProof.actualParserProfile.parseAvailable,false);
      assert.throws(()=>projectSerializationDescriptor(meta),/decoding profile remains refused.*float_roundtrip/);
      assert.throws(()=>createSerializationCodec(meta),/decoding profile remains refused/);
    }
  });
});
test('copied parser candidates, source trait certificates and forged Float flags cannot promote executable directions',()=>{
  fixture(record('payload:serde_json::Value'),captured=>{
    const raw=JSON.parse(serializeSerializationMeta(captured,{roots:['crate::Record'],direction:'serialize'}));
    for(const change of [meta=>{meta.types[0].fields[0].type.sourceProof.actualParserProfile.parseAvailable=true;},meta=>{meta.types[0].fields[0].type.sourceProof.finiteFloatFormattingAvailable=true;},meta=>{meta.types[0].fields[0].type.sourceProof.traits.serialize.bodySha256='0'.repeat(64);},meta=>{meta.types[0].fields[0].type.sourceProof.manualTraitCompleteness=true;}]) {
      const copied=structuredClone(raw);change(copied);assert.throws(()=>parseSerializationMeta(canonicalSerializationMeta(copied)+'\n',captured),/differs/);
    }
    assert.throws(()=>createSerializationCodec(raw),/privately checked/);
  });
});
test('the actual Value Default is checked from its original constructor body without supplying missing Serialize fields',()=>{
  fixture(record('#[serde(default)]payload:serde_json::Value'),captured=>{
    const meta=checked(captured),proof=meta.types[0].fields[0].defaultProof;
    assert.equal(proof.schema,'original-json-value-default-v1');assert.equal(proof.selection.header,'implDefaultforValue');assert.deepEqual(proof.value,{$:'Null'});
    assert.match(proof.checkedBodySha256,/^[a-f0-9]{64}$/);
    const codec=createSerializationCodec(meta);assert.equal(codec.serialize({payload:tagged('Null')}),'{"payload":null}');assert.throws(()=>codec.serialize({}),/Missing field payload/);
  });
});
test('custom Value defaults remain opaque and source edits invalidate checked default constructor metadata',()=>{
  fixture(record('#[serde(default="custom")]payload:serde_json::Value')+'fn custom()->serde_json::Value{serde_json::Value::Bool(true)}',captured=>assert.throws(()=>projectSerializationDescriptor(checked(captured)),/Custom serde default function remains opaque/));
  fixture(record('#[serde(default)]payload:serde_json::Value'),captured=>{
    const text=serializeSerializationMeta(captured,{roots:['crate::Record'],direction:'serialize'}),forged=JSON.parse(text);forged.types[0].fields[0].defaultProof.value={$:'Bool',field0:true};assert.throws(()=>parseSerializationMeta(canonicalSerializationMeta(forged)+'\n',captured),/differs/);
  });
});
test('nested plain JSON objects, cyclic values, getters and proxies cannot trigger a checked serializer coercion',()=>{
  fixture(record('payload:serde_json::Value'),captured=>{
    const codec=createSerializationCodec(checked(captured));let reads=0;const getter={get $(){reads++;return 'Null';}};
    for(const value of [getter,new Proxy(tagged('Null'),{}),{value:1},tagged('String',{field0:'\ud800'})])assert.throws(()=>codec.serialize({payload:value}),/data properties|proxies|constructor|layout|scalar/);
    assert.equal(reads,0);const cycle={$:'Array',field0:[]};cycle.field0.push(cycle);assert.throws(()=>codec.serialize({payload:cycle}),/acyclic/);
  });
});
test('bounded recursive JSON domains reject excessive depth and escaped wire expansion',()=>{
  fixture(record('payload:serde_json::Value'),captured=>{
    const codec=createSerializationCodec(checked(captured));let nested=tagged('Null');for(let index=0;index<130;index++)nested=tagged('Array',{field0:[nested]});assert.throws(()=>codec.serialize({payload:nested}),/depth/);
    assert.throws(()=>codec.serialize({payload:text('\u0000'.repeat(200000))}),/bounded source contract/);
  });
});
test('actual Serialize-only report DTOs use the same Value adapter while remaining DTO obstacles stay explicit',()=>{
  const report=createSerializationCodec(checked(context(),'crate::providers_cli::ProviderImportReport'));
  assert.equal(report.deserialize,undefined);assert.equal(report.serialize({complete:true,results:[text('provider')]}),'{"complete":true,"results":["provider"]}');
  const both=checked(context(),'crate::operation_reports::ClientRepresentation','both');assert.throws(()=>createSerializationCodec(both),/decoding profile remains refused/);
  assert.throws(()=>checked(context(),'crate::responses::OpenAIResponseRequest'),/route: f32/);
});
test('shared JS and TS descriptor data carry bounded external owners and never widen full trait or parser authority',async()=>{
  await fixture(record('payload:serde_json::Value'),async captured=>{
    const meta=checked(captured),js=emitSerializationDescriptor(meta),ts=emitSerializationDescriptor(meta,{language:'typescript'}),module=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
    const descriptor=module.serializationSchema.Record.fields[0].type;assert.equal(descriptor.kind,'json-value');assert.equal(descriptor.owner,'serde_json::Value');assert.equal(descriptor.finiteFloatFormattingAvailable,false);assert.equal(descriptor.manualTraitCompleteness,false);
    assert.equal(ts,js.replace(/;\n$/,' as const;\n'));assert.equal(meta.runtimeAuthority,false);assert.equal(meta.generatedTraitBehavior,false);
  });
});
