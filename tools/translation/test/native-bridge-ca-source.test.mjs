// Independent complete native trust source equations. SOURCE ONLY; ALL UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareNativeBridgeCASources} from '../prepare-native-bridge-ca-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('native trust helper six complete application successors and two compiler equations preserve independent boundaries',{timeout:60000},()=>{
 const plan=prepareNativeBridgeCASources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 assert.equal(plan.nativeHelpers.length,1);const helper=plan.nativeHelpers[0];assert.equal(helper.path,'rust/src/codex_loopback_bridge/trust.rs');assert.equal(helper.source,helper.originalSource);assert.equal(transportConcreteSyntaxMeta(helper.concreteSyntax).source,helper.source);assert.equal(helper.source,readFileSync(new URL('../../../rust/src/codex_loopback_bridge/trust.rs',import.meta.url),'utf8'));
 assert.equal(plan.nativeInputs.files.length,15);assert.equal(plan.nativeInputs.files.reduce((count,row)=>count+row.historyChain.length,0),17);
 const expected=new Map([['rust/src/codex_loopback_bridge.rs',1],['rust/src/with_command.rs',2],['rust/src/configure.rs',1],['rust/src/client_command.rs',1],['rust/src/managed_server/selection.rs',1],['rust/src/managed_server.rs',1]]);
 for(const [path,steps] of expected){const row=plan.nativeInputs.files.find(row=>row.path===path);assert.ok(row,path);assert.equal(row.historyChain.length,steps);assert.notEqual(row.before,row.current);assert.equal(row.inverse,row.before);assert.equal(row.current,row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),Array.from({length:steps},()=>['language','repository']).flat());}
 for(const row of [helper,...plan.nativeInputs.files]){assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);assert.equal(row.namespaceAuthority,false);}assert.equal(plan.rustExecuted,false);assert.equal(plan.receivingExecuted,false);assert.equal(plan.nativeInputs.sourceCache,false);
});
