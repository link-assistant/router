// Independent bulk span/inverse regression SOURCE. All new cases are UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeCoreJsonReadersCorpus} from '../migrate-core-json-readers.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareJsonReaderSpanJoinSources} from '../prepare-json-reader-span-join-sources.mjs';
const limits={timeout:60000},C='crate::translation_core::',T=C+'Json',dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function propose(source){return proposeCoreJsonReadersCorpus({files:{'src/lib.rs':'pub mod translation_core;\r\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE},dependencyInputs:dependencies});}
function inverse(stage){
 let cursor=0,reconstructed='';for(const row of stage.mapping){assert.equal(row.before[0],cursor);assert.equal(stage.before.source.slice(...row.before),row.kind==='substitution'?row.expected:stage.after.source.slice(...row.after));reconstructed+=row.kind==='substitution'?row.expected:stage.after.source.slice(...row.after);cursor=row.before[1];}assert.equal(cursor,stage.before.source.length);assert.equal(reconstructed,stage.before.source);
 let reverse=stage.after.source;for(const row of [...stage.mapping].reverse())if(row.kind==='substitution'){assert.equal(reverse.slice(...row.after),row.replacement);reverse=reverse.slice(0,row.after[0])+row.expected+reverse.slice(row.after[1]);}assert.equal(reverse,stage.before.source);
}
test('mixed bulk UTF16 source edits keep all distinct generated paths phase maps and complete inverses',limits,()=>{
 const source='// Ω😀\r\n'+Array.from({length:32},(_,index)=>"pub fn field_"+index+"<'a>(value:&'a "+T+")->"+(index%2?"&'a str":"Option<&'a str>")+'{value.get(r#"v_猫😀_'+index+'"#).and_then('+T+'::as_str)'+(index%2?'.unwrap_or_default()':'')+'}').join('\r\n')+'\r\n',result=propose(source),rows=result.proposals;
 assert.equal(rows.flatMap(row=>row.selections).length,32);for(const row of rows){for(const key of ['before','intermediate','after'])assert.equal(transportConcreteSyntaxMeta(row[key].meta).source,row[key].source);inverse(row);for(const stage of row.stages)inverse(stage);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.completeInverse,true);}
 const row=rows[0];assert.equal(row.mapping.filter(part=>part.kind==='substitution').length,32);assert.equal(row.stages[1].edits.length,112);assert.ok(row.after.source.startsWith('pub mod translation_core;\r\n// Ω😀\r\n'));assert.ok(row.after.source.endsWith('\r\n'));for(let index=0;index<32;index++)assert.ok(row.after.source.includes('r#"v_猫😀_'+index+'"#'));assert.equal(row.after.source.includes('::core::option::Option::Some'),false);
});
test('an untouched whole source retains both empty stages and exact original text',limits,()=>{
 const result=propose('// Ω😀\r\npub fn unchanged()->bool{true}\r\n');assert.deepEqual(result.before,result.after);assert.equal(result.proposals[0].selections.length,0);for(const row of result.proposals){inverse(row);for(const stage of row.stages)inverse(stage);assert.equal(row.stages[0].edits.length,0);assert.equal(row.stages[1].edits.length,0);}
});
test('two complete original source equations retain owner bodies phases and physical inverses',limits,()=>{
 const plan=prepareJsonReaderSpanJoinSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
