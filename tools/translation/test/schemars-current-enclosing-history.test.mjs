import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {prepareDefaultProofByteEnclosingHistory} from '../prepare-default-proof-byte-adoption.mjs';
import {normalizeSchemarsCurrentEnclosingSource,assertSchemarsCurrentEnclosingHistoryFresh,prepareCurrentSchemarsEnclosingAdoption} from '../schemars-current-enclosing-history.mjs';
import {SCHEMARS_ENCLOSING_ORIGINAL} from '../schemars-enclosing-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
function input(){const focused=prepareDefaultProofByteEnclosingHistory({root}),row=focused.files[0],birth=focused.historicalLayers[0].files.find(row=>row.path===SCHEMARS_ENCLOSING_ORIGINAL);return {focused,row,birth};}

test('fresh focused source equation composes complete native and serialized CST wrapper inverses',{timeout:60000},()=>{
 const {focused,row,birth}=input(),history=normalizeSchemarsCurrentEnclosingSource({root,original:birth.before,source:row.after});assert.deepEqual(history.byteLayer,focused);assert.equal(history.current,row.after);assert.equal(history.physicalCurrent,row.current);assert.equal(history.restored,birth.before);assert.equal(history.wholeInverse,birth.before);assert.equal(history.byteNativeInverse.repository,row.language);assert.equal(history.byteNativeInverse.language,birth.after);
 assert.deepEqual(history.byteInverseStages.map(row=>row.phase),['repository','language']);let restored=row.after;
 for(const stage of history.byteInverseStages){assert.equal(stage.before,restored);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);restored=stage.after;}assert.equal(restored,birth.after);assert.equal(history.inverseEdit.expected,"'./schemars-enclosing-output-dispatch.mjs'");
 for(const physical of history.physicalInputs)assert.equal(readFileSync(new URL(physical.path,new URL('../../../',import.meta.url)),'utf8'),physical.source);assert.equal(history.binaryInputs.length,1);for(const binary of history.binaryInputs)assert.equal(readFileSync(new URL(binary.path,new URL('../../../',import.meta.url))).toString('base64'),binary.source);assertSchemarsCurrentEnclosingHistoryFresh({root,history});assert.equal(history.sourceAuthority,false);
});

test('changed complete wrapper or original source cannot borrow the known native equation',{timeout:60000},()=>{
 const {row,birth}=input();for(const source of [row.after+'\n',row.after.slice(0,-1),row.after+'\nfunction unrelatedProducer(){}\n'])assert.throws(()=>normalizeSchemarsCurrentEnclosingSource({root,original:birth.before,source}));assert.throws(()=>normalizeSchemarsCurrentEnclosingSource({root,original:birth.before+'\n',source:row.after}));
 for(const source of [birth.before,birth.after]){const history=normalizeSchemarsCurrentEnclosingSource({root,original:birth.before,source});assert.equal(history.byteLayer,null);assert.equal(history.restored,birth.before);}
});

test('current adoption retains birth equations and full physical text and binary freshness fences',{timeout:60000},()=>{
 const current=prepareCurrentSchemarsEnclosingAdoption({root});assert.equal(current.knownCurrentEnclosingSource,true);assert.equal(current.defaultInstalled,false);assert.equal(current.sourceAuthority,false);assert.equal(current.wholeInverse,current.birth.files.find(row=>row.path===SCHEMARS_ENCLOSING_ORIGINAL).before);assert.equal(current.physicalCurrent,readFileSync(new URL('../derive-enclosing-namespace-context.mjs',import.meta.url),'utf8'));
 const {row,birth}=input(),history=normalizeSchemarsCurrentEnclosingSource({root,original:birth.before,source:row.after}),changedText={...history,physicalInputs:history.physicalInputs.map((row,index)=>index?row:{...row,source:row.source+'\n'})},changedBinary={...history,binaryInputs:history.binaryInputs.map(row=>({...row,source:(row.source[0]==='A'?'B':'A')+row.source.slice(1)}))};assert.throws(()=>assertSchemarsCurrentEnclosingHistoryFresh({root,history:changedText}));assert.throws(()=>assertSchemarsCurrentEnclosingHistoryFresh({root,history:changedBinary}));assertSchemarsCurrentEnclosingHistoryFresh({root,history});
});
