// Independent source-history receiving cases, drafted without execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {capturePhysicalLanguageProducerSourceSuccessor20261104,proposePhysicalLanguageProducerSourceAdoption20261104} from '../physical-language-output-layout-20261104-history.mjs';
import {captureProtectedFlatWriterSourceSuccessor} from '../protected-flat-writer-20261102-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {withFixedForwardWriterSources} from '../forward-output-ownership-20261101-source-history.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const packet='tools/translation/source-profiles/physical-language-output-adoption-20261104/equations.json';
const limits={timeout:900000};
function fixture(){
 const raw=fs.readFileSync(root+packet,'utf8'),data=JSON.parse(raw),sources=new Map([[packet,raw],...data.rows.map(row=>[row.path,row.after])]);
 return {rows:data.rows,sources,capture:path=>({source:sources.get(path)??null})};
}
test('actual two producers and unchanged dispatch API retain complete source phases and inverse',limits,()=>{
 const result=proposePhysicalLanguageProducerSourceAdoption20261104();assert.equal(result.rows.length,3);assert.equal(result.sourceInstalled,true);assert.equal(result.installationAuthority,false);
 for(const row of result.rows){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}}
});
test('original history dispatch appends both exact producer successors without replacing their originals',limits,()=>{
 const api=fixture();for(const row of api.rows.slice(0,2)){const result=captureProtectedFlatWriterSourceSuccessor(api.capture,row.path,row.before);assert.equal(result.before,row.before);assert.equal(result.after,row.after);assert.equal(result.inverse,row.before);assert.equal(result.semanticAuthority,false);}
});
test('unknown coordinates keep original null behavior without reading source or invoking callbacks',()=>{
 const capture=()=>{throw Error('unknown path must not read');};assert.equal(captureProtectedFlatWriterSourceSuccessor(capture,'js/src/unmanaged.mjs','arbitrary'),null);assert.equal(capturePhysicalLanguageProducerSourceSuccessor20261104(capture,'rust/src/lib.rs','arbitrary'),null);
});
test('edited producer or dispatch, wrong predecessor and altered packet cannot join a known source epoch',limits,()=>{
 for(const changed of ['producer','dispatch','predecessor','packet']){const api=fixture(),row=api.rows[0];if(changed==='producer')api.sources.set(row.path,row.after+'\n// authored edit\n');if(changed==='dispatch')api.sources.set(api.rows[2].path,api.rows[2].before);if(changed==='packet')api.sources.set(packet,api.sources.get(packet)+' ');assert.throws(()=>captureProtectedFlatWriterSourceSuccessor(api.capture,row.path,changed==='predecessor'?row.before+' ':row.before));}
});
test('a later operation rereads every whole source instead of reusing a successful verdict',limits,()=>{
 const api=fixture(),row=api.rows[1];assert.equal(captureProtectedFlatWriterSourceSuccessor(api.capture,row.path,row.before).after,row.after);api.sources.set(row.path,row.after+' ');assert.throws(()=>captureProtectedFlatWriterSourceSuccessor(api.capture,row.path,row.before));
});

test('actual forward chronology keeps immutable originals and appends the two physical producer source equations',limits,()=>{
 const expected=fixture().rows.slice(0,2);withFixedForwardWriterSources(root,history=>{history.requireActive();for(const image of expected){const row=history.rows().find(value=>value.path===image.path);assert.ok(row);assert.equal(row.historicalAfter,image.before);assert.equal(row.after,image.after);assert.equal(row.laterHistories.length,1);assert.equal(row.laterHistories[0].inverse,image.before);assert.equal(row.laterHistories[0].equation.after,image.after);}});
});
