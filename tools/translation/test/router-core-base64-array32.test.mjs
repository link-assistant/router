import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {emitJavaScript} from '../extensions/host-contracts.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_CORE_BASE64_SOURCE,ROUTER_CORE_BASE64_CONTRACTS} from '../router-core-base64.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const nativeJson=JSON.stringify,root=new URL('../../../',import.meta.url),C='crate::translation_core::',T=C+'Text',call=value=>C+'base64_url_no_pad_encode_array32('+value+')';
const manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const vectorRoot=process.env.ROUTER_CORE_BASE64_ARRAY32_VECTOR_DIR;let retained=[];
const retain=(kind,value)=>{retained.push({kind,value});return value;};
const test=(name,run)=>nodeTest(name,{timeout:60000},async()=>{retained=[];try{await run();}finally{if(vectorRoot){mkdirSync(vectorRoot,{recursive:true});const encoded=nativeJson({name,vectors:retained},(_,value)=>typeof value==='bigint'?{$integer:String(value)}:value);writeJsonTextGzip(join(vectorRoot,Buffer.from(name).toString('hex')+'.json.gz'),encoded);}}});
function project(source){const files={'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};retain('complete-source-input',{entry:'src/lib.rs',files,manifest,lock,compilationProfile:PRODUCTION_PROFILE});return retain('complete-project',translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE}));}
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
function checked(result){const text=nativeJson(result.meta.checkedSemanticProgram),program=parseProgram(text);assert.equal(serializeProgram(program),text);retain('complete-serialized-reparsed-checked-program',text);return program;}

test('owned base64 array32 contract matches the actual checked fixed-array value owner',()=>{
 const contract=ROUTER_CORE_BASE64_CONTRACTS.find(row=>row.id==='router_core_base64_url_no_pad_encode_array32');assert.ok(contract);assert.deepEqual({...contract.params[0].rustOwnership},{kind:'value',source:'array'});assert.equal(contract.params[0].rustFixedArray.length,32);
 const result=project(`pub fn encode(v:[u8;32])->${T}{${call('v')}}`);assert.equal(has(result,'encode'),true);const type=checked(result).declarations.get('encode').params[0].type;
 assert.deepEqual({...type.rustOwnership},{kind:'value',source:'array'});assert.equal(type.rustFixedArray.length,32);assert.equal(type.rustSourceType,true);assert.equal(type.element.rustPrimitiveName,'u8');assert.equal(type.element.bits,8);assert.equal(type.element.signed,false);assert.equal(type.element.rustSourceType,true);retain('complete-actual-checked-array-type',type);
});

test('owned base64 array32 preserves repeated source Copy uses in both strict emitted targets',async()=>{
 const result=project(`pub fn twice(v:[u8;32])->${T}{let first=${call('v')};${call('v')}}`);assert.equal(has(result,'twice'),true);const body=checked(result).declarations.get('twice').body;assert.equal(body.k,'let');assert.equal(body.value.id,'router_core_base64_url_no_pad_encode_array32');assert.equal(body.body.id,body.value.id);
 await verifyTypedTargets(result,api=>{const bytes=Object.freeze(Array(32).fill(0n));assert.equal(api.twice(bytes),'A'.repeat(43));assert.deepEqual(bytes,Array(32).fill(0n));},{childTimeoutMs:20000});
});

test('owned base64 array32 refuses wrong lengths widths ownership references and shadowed primitive identity',()=>{
 const cases=[['[u8;31]',''],['[u8;33]',''],['[u16;32]',''],['Vec<u8>',''],['&[u8]',''],['&[u8;32]',''],['[u8;32]','type u8=u16;']];
 for(const [type,prefix]of cases){const source=prefix+`pub fn bad(v:${type})->${T}{${call('v')}}`,result=project(source);assert.equal(has(result,'bad'),false,source);retain('complete-array-domain-refusal',{source,result});}
});

test('owned base64 array32 rejects copied or mutated checked type metadata during fresh emission',()=>{
 const result=project(`pub fn encode(v:[u8;32])->${T}{${call('v')}}`);assert.equal(has(result,'encode'),true);
 for(const mutate of [type=>{type.rustOwnership={kind:'owned',source:'Vec'};},type=>{type.rustOwnership.extra=true;},type=>{type.rustFixedArray.length=31;},type=>{type.element.rustPrimitiveName='u16';}]){const program=checked(result),entry=program.declarations.get('encode');mutate(entry.params[0].type);retain('full-mutated-checked-program',serializeProgram(program));assert.throws(()=>emitJavaScript(program),/original function|layout|source|array|type|error/i);}
 const copied=checked(result),entry=copied.declarations.get('encode');entry.body.compatibilityCore={...entry.body.compatibilityCore,sourceTransport:'copied-array-custody'};retain('full-copied-carrier-program',serializeProgram(copied));assert.throws(()=>emitJavaScript(copied),/transport receipt/);
});
