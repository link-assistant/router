// Authoring algorithm case SOURCE; no project execution during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extendExactSourceIndexData} from '../exact-source-index-builder-20261103.mjs';
const previous={schema:'fixed-reviewed-source-successor-index-20261103-v1',rows:[],sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};
const family={id:'shared-source-fixture',manifest:'tools/translation/source-profiles/shared-source-fixture/manifest.json',rows:[{id:'ordinary',path:'tools/translation/example.mjs',language:'JavaScript',before:'export const value = 1;\n',after:'export const value = 2;\n'}]};
test('deterministic whole source image authoring preserves original equations and separate phase order',()=>{
 const first=extendExactSourceIndexData({previous,families:[family]}),second=extendExactSourceIndexData({previous,families:[family]});assert.equal(first.indexText,second.indexText);assert.deepEqual(previous.rows,[]);assert.equal(first.images.length,2);assert.equal(first.sourceInstalled,false);assert.equal(first.semanticAuthority,false);
 assert.equal(first.images[0].source,family.rows[0].before);assert.equal(first.images[1].source,family.rows[0].after);
 const later=extendExactSourceIndexData({previous:first.index,families:[]});assert.deepEqual(later.index.rows,first.index.rows);
 assert.deepEqual(first.trace.map(row=>row.phase).filter((value,index,rows)=>index===0||value!==rows[index-1]),['language','repository']);
});
test('duplicate ids traversal getters and hash self-reference cannot create source authoring output',()=>{
 assert.throws(()=>extendExactSourceIndexData({previous,families:[family,family]}));
 const bad={...family,rows:[{...family.rows[0],path:'../outside.mjs'}]};assert.throws(()=>extendExactSourceIndexData({previous,families:[bad]}));
 const engine={...family,rows:[{...family.rows[0],path:'tools/translation/exact-source-successors-20261103.mjs'}]};assert.throws(()=>extendExactSourceIndexData({previous,families:[engine]}));
 let called=false;const input=Object.defineProperty({},'previous',{get(){called=true;throw Error('must not evaluate');},enumerable:true});assert.throws(()=>extendExactSourceIndexData(input));assert.equal(called,false);
});
