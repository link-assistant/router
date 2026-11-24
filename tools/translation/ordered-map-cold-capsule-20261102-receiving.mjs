// Explicit installed-profile oracle SOURCE, not a production function count.
// Located in compiler closure so full committed source export retains it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createOrderedMapForwardSourceCapsule,createOrderedMapReverseSourceCapsule} from './ordered-map-cold-capsule-20261102.mjs';
import {ORDERED_TEXT_MAP_NATIVE_SOURCE} from './ordered-text-map-20261102-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from './router-core-source-data.mjs';
import {ownedCoreRuntimeSources} from './js-to-rust/owned-vector-candidate-source.mjs';
import {ORDERED_MAP_REVERSE_ACCEPTANCE_SOURCE,ORDERED_MAP_REVERSE_ACCEPTANCE_JAVASCRIPT} from './ordered-text-map-callers-20261102-receiving-cases.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),limits={timeout:60000,concurrency:false},map='crate::translation_ordered_text_map_core::OrderedTextMap',core='crate::translation_ordered_text_map_core::text_map_';
function sources(){return {
 'src/lib.rs':'pub mod translation_core;\npub mod translation_ordered_text_map_core;\n',
 'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_ordered_text_map_core.rs':ORDERED_TEXT_MAP_NATIVE_SOURCE,
};}
function packets(){const native=sources(),manifest=fs.readFileSync(join(ROOT,'rust/Cargo.toml'),'utf8'),lock=fs.readFileSync(join(ROOT,'Cargo.lock'),'utf8'),rust=`pub fn make()->${map}{${core}new()}\npub fn count(map:&${map})->u64{${core}len(map)}\npub fn value(map:&${map})->Option<&str>{${core}get(map,"stream")}\npub fn inserted(map:${map},key:String,value:String)->${map}{${core}insert(map,key,value)}\n`;
 const forward={schema:'ordered-map-forward-source-packet-v1',entry:'src/lib.rs',files:Object.entries({...native,'src/lib.rs':native['src/lib.rs']+rust}).map(([path,source])=>({path,source})),cargoManifest:manifest,cargoLock:lock,compilationProfile:PRODUCTION_PROFILE};
 const reverse={schema:'ordered-map-reverse-source-packet-v1',path:'caller.mjs',input:{runtimeRoot:'runtime',declarationRoot:'runtime',vectorBindings:[],files:[...ownedCoreRuntimeSources(),...Object.entries(native).map(([path,source])=>({path,source})),{path:'Cargo.toml',source:manifest},{path:'Cargo.lock',source:lock},{path:'caller.mjs',source:ORDERED_MAP_REVERSE_ACCEPTANCE_JAVASCRIPT},{path:'caller.mts',source:ORDERED_MAP_REVERSE_ACCEPTANCE_SOURCE}]}};return {forward,reverse};
}
function fixture(t){const directory=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-map-cold-capsule-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));return directory;}
function child(mode,file){const path=fileURLToPath(new URL('./ordered-map-cold-capsule-20261102-child.mjs',import.meta.url)),result=JSON.parse(execFileSync(process.execPath,[path,mode,file],{encoding:'utf8',timeout:20000,maxBuffer:16777216}).trim());assert.equal(result.schema,'ordered-map-cold-source-meta-probe-v1');assert.equal(result.mode,mode);assert.equal(result.privateReceiptsSerialized,false);}
export function registerOrderedMapColdCapsuleReceivingCases(){
 test('source capsules reconstruct real forward and reverse compilers in cold processes',limits,t=>{const directory=fixture(t),source=packets();for(const direction of ['forward','reverse']){const text=direction==='forward'?createOrderedMapForwardSourceCapsule(JSON.stringify(source.forward)):createOrderedMapReverseSourceCapsule(JSON.stringify(source.reverse)),file=join(directory,direction+'.json');fs.writeFileSync(file,text);child(direction,file);}});
 test('cold receiving rejects semantic edits and source changes without matching fresh checked meta',limits,t=>{const directory=fixture(t),source=packets(),forward=JSON.parse(createOrderedMapForwardSourceCapsule(JSON.stringify(source.forward))),reverse=JSON.parse(createOrderedMapReverseSourceCapsule(JSON.stringify(source.reverse)));
  const changedMeta=structuredClone(forward),document=JSON.parse(changedMeta.meta);document.program.main={k:'literal',type:{kind:'bool'},value:true};changedMeta.meta=JSON.stringify(document);const changedSource=structuredClone(forward);changedSource.source.files.find(row=>row.path.endsWith('translation_ordered_text_map_core.rs')).source+='\n// changed original native leaf\n';const changedReverse=structuredClone(reverse),reverseDocument=JSON.parse(changedReverse.meta);reverseDocument.program[0].body=[];changedReverse.meta=JSON.stringify(reverseDocument);
  for(const [name,value,mode]of [['forward-meta',changedMeta,'refuse-forward'],['forward-source',changedSource,'refuse-forward'],['reverse-meta',changedReverse,'refuse-reverse']]){const file=join(directory,name+'.json');fs.writeFileSync(file,JSON.stringify(value));child(mode,file);}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))registerOrderedMapColdCapsuleReceivingCases();
