// Actual native-caller regression SOURCE. No execution before full bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {SSE_NATIVE_SOURCE,SSE_ORIGINAL_FRAMER_SOURCE} from '../sse-native-source.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_object as object,json_macro_string as text,json_macro_array as array} from '../json-macro-runtime.mjs';
const limits={timeout:60000},inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')},caller='pub fn framed(pending:&str,chunk:&str)->Result<crate::translation_core::Json,String>{crate::translation_stream_core::sse_push_base64(pending,chunk)}';
function files(){return {'src/lib.rs':'pub mod translation_core;\nmod sse;\npub mod translation_stream_core;\n'+caller,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/sse.rs':SSE_ORIGINAL_FRAMER_SOURCE,'src/translation_stream_core.rs':SSE_NATIVE_SOURCE};}
function project(data){return translateProject({entry:'src/lib.rs',paths:Object.keys(data),readSource:path=>data[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
test('actual full native SSE caller emits executable JS and independently strict-compiled TS',limits,async()=>{const result=project(files());assert.ok(result.meta.executable.some(row=>row.name==='framed'),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.deepEqual(api.framed('5Lg=','lgoK'),{$:'Ok',field0:object([['pending',text('')],['blocks',array([text('世')])]])});assert.deepEqual(api.framed('','bad'),{$:'Err',field0:'invalid SSE chunk base64'});},{childTimeoutMs:20000});});
test('changed wrapper or original production-framer dependency cannot qualify a caller',limits,()=>{for(const path of ['src/sse.rs','src/translation_stream_core.rs']){const data=files();data[path]+='\n// changed actual source\n';assert.equal(project(data).meta.executable.some(row=>row.name==='framed'),false);}});
