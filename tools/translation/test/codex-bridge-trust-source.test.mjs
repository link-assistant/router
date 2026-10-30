// Complete CA and HTTP/WS/native history source. SOURCE ONLY; UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareCodexBridgeTrustSources} from '../prepare-codex-bridge-trust-sources.mjs';
import {prepareNativeSourceHistory} from '../native-source-history.mjs';
import {prepareNativeCodexBridgeSources} from '../prepare-native-codex-bridge-sources.mjs';
test('sixteen complete trust/caller/history equations retain both phases native originals and exact inverses',{timeout:60000},()=>{
 const plan=prepareCodexBridgeTrustSources();assert.equal(plan.files.length,17);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.nativeInputs.length,3);assert.equal(plan.rustExecuted,false);assert.equal(plan.receivingExecuted,false);
});
test('full native implementation histories support all three languages without turning lexical DATA into namespace authority',{timeout:60000},()=>{
 const plan=prepareNativeSourceHistory();assert.equal(plan.files.length,17);assert.equal(plan.files.reduce((count,row)=>count+row.historyChain.length,0),23);assert.deepEqual([...new Set(plan.files.map(row=>row.language))].sort(),['JavaScript','Rust','TypeScript']);for(const path of ['js/src/websocket-relay.mjs','ts/src/websocket-relay.ts']){const row=plan.files.find(row=>row.path===path);assert.notEqual(row.before,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);assert.equal(row.namespaceAuthority,false);}
 const earlier=prepareNativeCodexBridgeSources(),websocket=earlier.nativeInputs.find(row=>row.path==='js/src/websocket-relay.mjs');assert.equal(websocket.language,'JavaScript');assert.notEqual(websocket.source,websocket.originalSource);assert.equal(websocket.nativeSourceHistory.before,websocket.originalSource);assert.equal(websocket.nativeSourceHistory.after,websocket.source);assert.equal(websocket.nativeSourceHistory.inverse,websocket.originalSource);assert.equal(websocket.sourceAuthority,false);assert.equal(websocket.semanticAuthority,false);
});
