import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {crateEntrySourcePath,crateModuleSourcePath} from '../repository-layout.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {jsonMacroProfileMatches} from '../json-macro-profile-layout.mjs';
import {jsonRoundtripCandidateProfile} from '../json-roundtrip-capabilities.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {proposeCoreFormattingCorpus} from '../propose-core-formatting-corpus.mjs';
import {proposeCoreJsonReadersCorpus,iterateCoreJsonReadersCorpusPackets} from '../migrate-core-json-readers.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const C='crate::translation_core::',J=C+'Json',S=C+'Str';
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const deriveDependencies=loadDeriveDependencyProof(dependencyInputs),jsonMacroDependencies=loadJsonMacroSourceProof(dependencyInputs);
const core={
 'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,
 'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,
 'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,
 'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,
 'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,
};
function files(prefix,source){return Object.fromEntries(Object.entries({'src/lib.rs':'pub mod translation_core;\n'+source,...core}).map(([path,text])=>[prefix+path,text]));}
function project(prefix,input){return translateProject({entry:prefix+'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE,deriveDependencies,jsonMacroDependencies});}
const nativeJson=value=>{const parsed=serde_json_from_str(JSON.stringify(value));assert.equal(parsed.$,'Ok');return parsed.field0;};
const plain=value=>{const encoded=serde_json_to_string(value);assert.equal(encoded.$,'Ok');return JSON.parse(encoded.field0);};

test('source labels follow one declared captured crate root without normalizing foreign or mixed roots',()=>{
 const path='src/translation_core/primitives.rs';
 for(const entry of ['src/lib.rs','src/main.rs','custom/root.rs',null,undefined,'rust/src/lib.rs.backup'])assert.equal(crateEntrySourcePath(entry,path),path);
 for(const entry of ['rust/src/lib.rs','rust/src/main.rs']){
  assert.equal(crateEntrySourcePath(entry,path),'rust/'+path);
  assert.equal(crateModuleSourcePath([{file:'unrelated.rs',path:['other']},{file:entry,path:[]}],path),'rust/'+path);
 }
 for(const modules of [[],[{file:'rust/src/lib.rs',path:['nested']}],[{file:'src/lib.rs',path:[]},{file:'rust/src/lib.rs',path:[]}]])assert.equal(crateModuleSourcePath(modules,path),path);
});

test('the complete historical JSON pin joins current Cargo layout without accepting copied dependency proofs',()=>{
 const original='101f9e042d3c4665f531017082115d209a390940732532cef1b08a1420f8cfab';
 assert.equal(jsonMacroProfileMatches(jsonMacroDependencies,original),true);
 assert.equal(jsonMacroProfileMatches(jsonMacroDependencies,jsonMacroDependencies.profileSha256),true);
 assert.equal(jsonMacroProfileMatches(structuredClone(jsonMacroDependencies),original),false);
 assert.equal(jsonMacroProfileMatches({...jsonMacroDependencies,profileSha256:original},original),false);
 assert.throws(()=>jsonMacroProfileMatches(jsonMacroDependencies,'0'.repeat(64)),TypeError);
 const selected=jsonRoundtripCandidateProfile({dependencies:jsonMacroDependencies});assert.ok(selected.features.features.includes('float_roundtrip'));assert.equal(selected.parseAdmission,false);
 assert.throws(()=>loadJsonMacroSourceProof({...dependencyInputs,manifest:dependencyInputs.manifest+'\n# changed original\n'}),TypeError);
});

const source=`
pub fn borrowed(value:&${S})->&${S}{value}
pub fn counted(value:&${S})->usize{${C}unicode_scalar_count(value)}
pub fn rendered(value:u8)->${C}Text{${C}format!("value={}",value)}
pub fn optional(yes:bool)->${C}Maybe<u8>{if yes{${C}Maybe::Some(7)}else{${C}Maybe::None}}
pub fn ranged(lower:f64,upper:f64,value:f64)->bool{${C}f64_inclusive_contains(lower,upper,value)}
pub fn copied(value:&${J})->${J}{${C}json_copy(value)}
pub fn replaced(value:${J})->${J}{${C}json_with_field(value,"changed",${C}json!(true))}
pub fn parsed(value:&${S})->${C}Maybe<${J}>{${C}json_parse(value)}
pub fn mapped(values:&[${J}])->Vec<${J}>{${C}json_map(values,|value|{${C}json_copy(value)})}
pub fn encoded(value:&${S})->${C}Text{${C}base64_standard_encode_text(value)}
pub fn decoded(value:&${S})->${C}Outcome<Vec<u8>,${C}Base64Error>{${C}base64_standard_decode_text(value)}
`;
for(const prefix of ['', 'rust/'])test('complete owned operations execute independent goldens and strict TypeScript under '+(prefix||'legacy root'),{timeout:60000},async()=>{
 const input=files(prefix,source),result=project(prefix,input),names=['borrowed','counted','rendered','optional','ranged','copied','replaced','parsed','mapped','encoded','decoded'];
 for(const name of names)assert.ok(result.meta.executable.some(row=>row.name===name),name+': '+JSON.stringify(result.meta.refused));
 const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 const originalInputs=new Map(result.meta.sources.map(row=>[row.source,row]));
 for(const path of Object.keys(input))assert.ok(originalInputs.has(path),path);
 for(const row of result.meta.concreteSyntaxMeta){const restored=transportConcreteSyntaxMeta(JSON.stringify(row.document));assert.equal(restored.source,input[row.source]);}
 await verifyTypedTargets(result,api=>{
  assert.equal(api.borrowed('Ω😀'),'Ω😀');assert.equal(api.counted('Ω😀'),2n);assert.equal(api.rendered(255n),'value=255');
  assert.deepEqual(api.optional(true),{$:'Some',field0:7n});assert.deepEqual(api.optional(false),{$:'None'});
  assert.equal(api.ranged(-0,0,0),true);assert.equal(api.ranged(-Infinity,Infinity,7),true);assert.equal(api.ranged(0,1,NaN),false);
  const original=nativeJson({text:'猫',nested:[null,true]}),before=structuredClone(original),copy=api.copied(original);assert.deepEqual(plain(copy),{text:'猫',nested:[null,true]});assert.notStrictEqual(copy,original);assert.deepEqual(original,before);
  assert.deepEqual(plain(api.replaced(nativeJson(null))),{changed:true});assert.deepEqual(api.parsed('null'),{$:'Some',field0:nativeJson(null)});assert.deepEqual(api.parsed('{'),{$:'None'});
  assert.deepEqual(api.mapped(Object.freeze([original,nativeJson(false)])).map(plain),[{text:'猫',nested:[null,true]},false]);
  assert.equal(api.encoded('猫'),'54yr');assert.deepEqual(api.decoded('YQ=='),{$:'Ok',field0:Object.freeze([97n])});assert.equal(api.decoded('?').$,'Err');
 },{childTimeoutMs:20000});
});

test('physical layout still refuses changed complete facade and leaf sources before issuing owned bodies',{timeout:60000},()=>{
 for(const path of ['src/translation_core.rs','src/translation_core/primitives.rs']){
  const input=files('rust/',`pub fn borrowed(value:&${S})->&${S}{value}`);input['rust/'+path]+='\n// independently changed original\n';
  const result=project('rust/',input);assert.equal(result.meta.executable.some(row=>row.name==='borrowed'),false);assert.ok(result.meta.refused.some(row=>row.name==='borrowed'));
 }
});

for(const prefix of ['', 'rust/'])test('eager and streamed adoption retain complete physical source labels and original CST inverses under '+(prefix||'legacy root'),{timeout:60000},()=>{
 const source='pub fn read(value:&serde_json::Value)->&str{value.get("name").and_then(serde_json::Value::as_str).unwrap_or("")}\npub fn display()->String{format!("{}",7u8)}';
 const input=files(prefix,source),options={entry:prefix+'src/lib.rs',files:input,compilationProfile:PRODUCTION_PROFILE,dependencyInputs};
 const formatting=proposeCoreFormattingCorpus(options);assert.ok(formatting.rows.some(row=>row.path===prefix+'src/lib.rs'&&row.status==='proposed'));
 const eager=proposeCoreJsonReadersCorpus(options),stream=iterateCoreJsonReadersCorpusPackets(options),events=[];let complete;
 for(;;){const event=stream.next();if(event.done){complete=event.value;break;}events.push(event.value);}stream.verify();
 assert.equal(eager.entry,prefix+'src/lib.rs');assert.deepEqual(Object.keys(eager.before),Object.keys(input));assert.deepEqual(Object.keys(eager.after),Object.keys(input));
 assert.ok(events.length>0);assert.deepEqual(complete.after,eager.after);assert.ok(eager.proposals.some(row=>row.file===prefix+'src/lib.rs'));assert.equal(eager.proposals.some(row=>row.file===prefix+'src/translation_core.rs'),false);
 const proposed=eager.proposals.find(row=>row.file===prefix+'src/lib.rs');let inverse=proposed.after.source;
 for(const stage of [...proposed.stages].reverse()){
  assert.equal(inverse,stage.after.source);for(const row of [...stage.mapping].reverse())if(row.kind==='substitution')inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);assert.equal(inverse,stage.before.source);
 }
 assert.equal(inverse,input[prefix+'src/lib.rs']);
});
