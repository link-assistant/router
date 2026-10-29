// Complete ordinary source fixture DATA; no callable/source permission.
import {readFileSync} from 'node:fs';
import {ownedStateRuntimeSources} from '../owned-state.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../../json-state-native-source.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../../json-iteration-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../../router-core-source-data.mjs';
export function ownedStateReceivingData(callerFiles=[]){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[
 ...ownedStateRuntimeSources(),
 {path:'src/lib.rs',source:'pub mod translation_core;\npub mod translation_collections_core;\npub mod translation_state_core;\n'},
 {path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},
 {path:'src/translation_collections_core.rs',source:JSON_ITERATION_NATIVE_SOURCE},{path:'src/translation_state_core.rs',source:JSON_STATE_NATIVE_SOURCE},
 {path:'Cargo.toml',source:readFileSync(new URL('../../../../rust/Cargo.toml',import.meta.url),'utf8')},{path:'Cargo.lock',source:readFileSync(new URL('../../../../Cargo.lock',import.meta.url),'utf8')},...callerFiles,
 ]};}
