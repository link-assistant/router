// Independent actual format emitter ownership witness SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000};
function fixture(body){const files={'src/lib.rs':'pub mod translation_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};return {files,options:{entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]}};}
test('real string format results retain explicit String conversions across direct local literal and zero-slot emission',limits,async()=>{
 const input=fixture(`pub fn direct(value:&str)->String{crate::translation_core::format!("{}",value)}
pub fn local(value:&str)->String{let result=crate::translation_core::format!("{}",value);result}
pub fn literal()->String{crate::translation_core::format!("{}","é😀")}
pub fn zero()->String{crate::translation_core::format!("é😀")}
`),result=translateProject(input.options);assert.ok(result.javascript.includes('String('));assert.ok(result.typescript.includes('String('));for(const name of ['direct','local','literal','zero'])assert.ok(result.meta.executable.some(row=>row.name===name));await verifyTypedTargets(result,api=>{assert.equal(api.direct('é😀'),'é😀');assert.equal(api.local('é😀'),'é😀');assert.equal(api.literal(),'é😀');assert.equal(api.zero(),'é😀');},{childTimeoutMs:20000});
});
