// Independent borrowed/static text vector source. ALL UNRUN.
// Independent repetition source/behavior/refusal cases. SOURCE ONLY; ALL UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';import {verifyTypedTargets} from './typed-targets.mjs';
import {migrateCoreVectors} from '../migrate-core-vectors.mjs';
import {prepareVectorRepeatSources} from '../prepare-vector-repeat-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE as facade,ROUTER_CORE_PRIMITIVES_SOURCE as primitives,ROUTER_CORE_RANGES_SOURCE as ranges,ROUTER_CORE_BASE64_SOURCE as base64,ROUTER_CORE_JSON_COLLECTIONS_SOURCE as collections} from '../router-core-source-data.mjs';
const C='crate::translation_core::',limits={timeout:60000};
function files(source){return {'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':facade,'src/translation_core/primitives.rs':primitives,'src/translation_core/ranges.rs':ranges,'src/translation_core/base64.rs':base64,'src/translation_core/json_collections.rs':collections};}
function project(source,input=files(source)){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path]});}
import {prepareVectorStaticTextSources} from '../prepare-vector-static-text-sources.mjs';
test('borrowed str repeats and zero vectors retain actual input and static literal values in both targets',limits,async()=>{
 const source='pub fn values(seed:&str)->Vec<&str>{'+C+'vec![seed;3]}pub fn empty(seed:&str)->Vec<&str>{'+C+'vec![seed;0]}pub fn static_values()->Vec<&\'static str>{'+C+'vec!["Ω😀";2]}',result=project(source);for(const name of ['values','empty','static_values'])assert.ok(result.meta.executable.some(row=>row.name===name),name);await verifyTypedTargets(result,api=>{for(const seed of ['', 'Ω😀']){assert.deepEqual(api.values(seed),[seed,seed,seed]);assert.deepEqual(api.empty(seed),[]);}assert.deepEqual(api.static_values(),['Ω😀','Ω😀']);},{childTimeoutMs:20000});
});
test('zero storage never widens input borrow lifetime to static in return or local type annotations',limits,()=>{
 for(const count of [0,2])for(const source of ['pub fn bad(seed:&str)->Vec<&\'static str>{'+C+'vec![seed;'+count+']}','pub fn bad(seed:&str)->u8{let held:Vec<&\'static str>='+C+'vec![seed;'+count+'];0}'])assert.equal(project(source).meta.executable.some(row=>row.name==='bad'),false,source);
});
test('owned String Clone repetition still requires its separate qualified rule',limits,()=>{assert.equal(project('pub fn bad(seed:String)->Vec<String>{'+C+'vec![seed;2]}').meta.executable.some(row=>row.name==='bad'),false);});
test('eight complete static/borrow source equations retain both phases and exact inverse bytes',limits,()=>{const plan=prepareVectorStaticTextSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
