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
test('bool signed unsigned machine and wide integer repetitions use emitted JS and strict TS',limits,async()=>{
 const types=['u8','u16','u32','u64','u128','usize','i8','i16','i32','i64','i128','isize'];
 const source=types.map(type=>'pub fn copies_'+type+'()->Vec<'+type+'>{'+C+'vec![7'+type+';3usize]}').join('\n')+'pub fn flags()->Vec<bool>{'+C+'vec![true;4]}pub fn empty()->Vec<u8>{'+C+'vec![7u8;0]}';
 const result=project(source);for(const name of [...types.map(type=>'copies_'+type),'flags','empty'])assert.ok(result.meta.executable.some(row=>row.name===name),name);
 await verifyTypedTargets(result,api=>{for(const type of types)assert.deepEqual(api['copies_'+type](),[7n,7n,7n]);assert.deepEqual(api.flags(),[true,true,true,true]);assert.deepEqual(api.empty(),[]);},{childTimeoutMs:20000});
});
test('operand evaluates once including zero and division failure timing is preserved',limits,async()=>{
 const source='fn seed()->u8{let read=std::fs::read_to_string("seed").is_ok();7}pub fn copies()->Vec<u8>{'+C+'vec![seed();3]}pub fn empty()->Vec<u8>{'+C+'vec![seed();0]}pub fn panic(value:u8)->Vec<u8>{'+C+'vec![10u8/value;0]}',result=project(source),runtime='\nexport {withEffectCapabilities} from "../runtime/effects.mjs";\n';
 await verifyTypedTargets({...result,javascript:result.javascript+runtime,typescript:result.typescript+runtime},(api,_result,{withEffectCapabilities})=>{let count=0;const capabilities={fs:{sync:{readFileSync(path){assert.equal(path,'seed');count++;return new Uint8Array();}}}};assert.deepEqual(withEffectCapabilities(capabilities,()=>api.copies()),[7n,7n,7n]);assert.equal(count,1);assert.deepEqual(withEffectCapabilities(capabilities,()=>api.empty()),[]);assert.equal(count,2);assert.deepEqual(api.panic(2n),[]);assert.throws(()=>api.panic(0n));},{childTimeoutMs:20000});
});
test('ordinary source adoption retains count operand trivia and exact CST inverses',limits,async()=>{
 const source='pub fn values()->Vec<u8>{vec /* 🦀 */ ![9u8 /* seed */ ; 0x3usize]}',proposal=migrateCoreVectors(source);assert.equal(proposal.functions.length,1);assert.ok(proposal.after.source.includes(C+'vec /* 🦀 */ ![9u8 /* seed */ ; 0x3usize]'));assert.equal(proposal.inverse,source);assert.equal(transportConcreteSyntaxMeta(proposal.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(proposal.after.meta).source,proposal.after.source);const result=project(proposal.after.source);await verifyTypedTargets(result,api=>assert.deepEqual(api.values(),[9n,9n,9n]),{childTimeoutMs:20000});
});
test('allocation bounds source usize Copy domains and genuine facade remain independent refusals',limits,()=>{
 for(const source of [
 'pub fn bad()->Vec<u8>{'+C+'vec![1u8;4097]}',
 'pub fn bad()->Vec<u8>{'+C+'vec![1u8;2u8]}',
 'pub fn bad(count:usize)->Vec<u8>{'+C+'vec![1u8;count]}',
 'pub fn bad()->Vec<u8>{'+C+'vec![1u8;1+1]}',
 'pub fn bad()->Vec<u8>{'+C+'vec![1u16;2]}',
 'pub fn bad()->[u8;2]{'+C+'vec![1u8;2]}',
 'pub fn bad()->Vec<String>{'+C+'vec![String::from("owned");2]}',
 'pub fn bad(seed:&str)->Vec<&\'static str>{'+C+'vec![seed;2]}',
 'pub fn bad()->Vec<[u8;2]>{'+C+'vec![[1u8,2u8];2]}',
 'pub fn bad()->Vec<u8>{'+C+'vec![return '+C+'vec![1u8];2]}',
 ])assert.equal(project(source).meta.executable.some(row=>row.name==='bad'),false,source);
 const source='pub fn bad()->Vec<u8>{'+C+'vec![1u8;2]}',input=files(source);input['src/translation_core.rs']+='\n';assert.equal(project(source,input).meta.executable.some(row=>row.name==='bad'),false);
});
test('six complete compiler equations retain both phases exact originals and complete inverses',limits,()=>{const plan=prepareVectorRepeatSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
