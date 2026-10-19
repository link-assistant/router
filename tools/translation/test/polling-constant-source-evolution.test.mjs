import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxSource,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {pollingEvolutionData,pollingEvolutionText,pollingConstantSourceEvolution,currentPollingConstantPin} from './polling-constant-source-evolution.mjs';
const pin=row=>({...row.priorPin,nanos:BigInt(row.priorPin.nanos)}),hash=value=>createHash('sha256').update(value).digest('hex');

test('both complete migrated parents retain actual serialized CST inverses and untouched constant bytes',{timeout:60000},()=>{
 const manifest=pollingEvolutionData();assert.equal(manifest.sourceChangeCommit,'eeb05407b75f32ee46a55913cbf3731760b76d15');let edits=0;
 for(const row of manifest.rows){const result=pollingConstantSourceEvolution(pin(row),process.env.ROUTER_POLLING_CONSTANT_VECTOR_DIR);edits+=row.edits.length;assert.equal(hash(result.before),row.priorPin.sourceSha);assert.equal(hash(result.after),result.pin.sourceSha);assert.equal(result.restored.source,result.before);assert.deepEqual(result.forward.trace.map(row=>row.phase),['language','repository']);assert.equal(result.pin.declarationSha,row.priorPin.declarationSha);assert.equal(result.pin.bodySha,row.priorPin.bodySha);assert.equal(result.sourceAuthority,false);assert.equal(result.namespaceAuthority,false);assert.equal(result.runtimeParity,false);}
 assert.equal(edits,10);
});
test('all fourteen old test workloads and literal oracle fields stay exact beyond the explicit pin adaptation',{timeout:60000},()=>{
 const before=pollingEvolutionText(pollingEvolutionData().originalTest),after=readFileSync(new URL('./source-links.test.mjs',import.meta.url),'utf8');
 const restored=after.replace("import {currentPollingConstantPin} from './polling-constant-source-evolution.mjs';\n",'').replace('for(const previousPin of [','for(const pin of [').replace('    const pin=currentPollingConstantPin(previousPin,process.env.ROUTER_POLLING_CONSTANT_VECTOR_DIR);\n','');
 assert.equal(restored,before);assert.equal((after.match(/^test\(/gm)||[]).length,14);assert.equal((before.match(/^test\(/gm)||[]).length,14);
 const data=pollingEvolutionData();assert.deepEqual(data.rows[0].priorPin.span,[1991,2049]);assert.deepEqual(data.rows[0].afterSpan,[1991,2049]);assert.deepEqual(data.rows[1].priorPin.span,[13448,13533]);assert.deepEqual(data.rows[1].afterSpan,[13523,13608]);
});
test('every original pin field remains mandatory while the unrelated parent preserves identity',{timeout:60000},()=>{
 for(const row of pollingEvolutionData().rows){const original=pin(row);for(const [key,value]of [['name','other'],['sourceSha','0'.repeat(64)],['span',[0,1]],['declarationSha','0'.repeat(64)],['bodySha','0'.repeat(64)],['nanos',0n]])assert.throws(()=>pollingConstantSourceEvolution({...original,[key]:value}),/original oracle pin/);assert.throws(()=>pollingConstantSourceEvolution({...original,path:'src/other.rs'}),/exact evolved polling parent/);}
 const other={path:'src/codex_loopback_bridge.rs',sentinel:true};assert.equal(currentPollingConstantPin(other),other);
});
test('same-length altered whole parents and changed migration anchors refuse at the actual CST substitution',{timeout:60000},()=>{
 for(const row of pollingEvolutionData().rows){const before=pollingEvolutionText(row.before),first=row.edits[0],changed=before.slice(0,first.span[0])+'x'.repeat(first.expected.length)+before.slice(first.span[1]),document=transportConcreteSyntaxSource(changed,{language:'Rust'}).document;assert.equal(changed.length,before.length);assert.notEqual(hash(changed),row.before.sha256);assert.throws(()=>applyConcreteSyntaxSubstitutions(document,{languageRules:[{id:'rust:retain-whole-parent-negative',edits:[]}],repositoryRules:[{id:'router:refuse-stale-owned-alias-input',edits:row.edits}]}),/exact edit span or expected text changed/);}
});
