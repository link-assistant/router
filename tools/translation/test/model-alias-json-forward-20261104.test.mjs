// Independent whole forward caller source. SOURCE ONLY / UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../json-state-native-source.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array,json_macro_object as object} from '../json-macro-runtime.mjs';
import {requireOriginalJsonProjectionEmission} from '../router-core-json-updates.mjs';
const limits={timeout:60_000},T='crate::translation_core::Json',C='crate::translation_core::',S='crate::translation_state_core::';
const inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function files(source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_collections_core;\npub mod translation_state_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_collections_core.rs':JSON_ITERATION_NATIVE_SOURCE,'src/translation_state_core.rs':JSON_STATE_NATIVE_SOURCE};}
function project(data){return translateProject({entry:'src/lib.rs',paths:Object.keys(data),readSource:path=>data[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
const source=`pub fn rewrite(value:${T},upstream:&str,visible:&str)->${T}{${S}json_rewrite_model_alias(value,upstream,visible)}`;
test('the new shared operation qualifies an actual owned caller through original source/meta and strict target checks',limits,async()=>{
 const result=project(files(source));assert.equal(result.meta.executable.some(row=>row.name==='rewrite'),true,JSON.stringify(result.meta.refused));const original=object([['model',text('native')],['response',object([['modelVersion',text('models/native')]])]]),expected=object([['model',text('visible')],['response',object([['modelVersion',text('visible')]])]]);
 await verifyTypedTargets(result,api=>{assert.deepEqual(api.rewrite(original,'models/native','visible'),expected);assert.deepEqual(original,object([['model',text('native')],['response',object([['modelVersion',text('models/native')]])]]));},{childTimeoutMs:20000});
});
test('changed native leaf, borrowed ownership and public projection tags do not authorize the operation',limits,()=>{
 const altered=files(source);altered['src/translation_state_core.rs']+='\n// not the actual complete native source\n';assert.equal(project(altered).meta.executable.some(row=>row.name==='rewrite'),false);const borrowed=`pub fn rewrite(value:&${T},upstream:&str,visible:&str)->${T}{${S}json_rewrite_model_alias(value,upstream,visible)}`;assert.equal(project(files(borrowed)).meta.executable.some(row=>row.name==='rewrite'),false);assert.throws(()=>requireOriginalJsonProjectionEmission({},{k:'routerHostCall',id:'router_state_json_rewrite_model_alias',args:[],compatibilityCore:{sourceProjectionKey:'forged'}}));
});
