// Independent complete paired target agreement and conflict cases. SOURCE / UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {receiveOpaquePairedLiterals} from '../opaque-paired-literal-20261101-receiving.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const limits={timeout:60000,concurrency:false};
const headers=['id','issued_at','expires_at','revoked','requests','tokens','reserved','rpm','scope'];
function editHeaders(source,language,labels){
 const ts=ownershipCompiler(),file=ts.createSourceFile(language==='JavaScript'?'pair.mjs':'pair.mts',source,ts.ScriptTarget.Latest,true,language==='JavaScript'?ts.ScriptKind.JS:ts.ScriptKind.TS),arrays=[];
 assert.equal(file.parseDiagnostics.length,0);function visit(node){if(ts.isArrayLiteralExpression(node)&&node.elements.length===9&&node.elements.every((cell,at)=>ts.isStringLiteral(cell)&&cell.text===headers[at]))arrays.push(node);ts.forEachChild(node,visit);}visit(file);assert.equal(arrays.length,1);let next=source;for(const [at,value]of [...labels].sort((a,b)=>b[0]-a[0])){const cell=arrays[0].elements[at];next=next.slice(0,cell.getStart(file))+JSON.stringify(value)+next.slice(cell.end);}return next;
}
function baseline(t,startedAt){const received=receiveOpaquePairedLiterals(t,{operation:'inspect'},{startedAt});assert.equal(received.report.cleanupSucceeded,true);assert.equal(received.packet.ok,true,JSON.stringify(received.packet.error));return received.packet.result.targetPhases.find(row=>row.phase==='adopted-project');}
for(const language of ['JavaScript','TypeScript'])test('complete paired two-cell projections agree using '+language+' inference',limits,t=>{
 const startedAt=performance.now(),before=baseline(t,startedAt),labels=[[0,'identifier'],[8,'permission']],javascript=editHeaders(before.javascript,'JavaScript',labels),typescript=editHeaders(before.typescript,'TypeScript',labels),received=receiveOpaquePairedLiterals(t,{operation:'paired-literal-inverse',submitted:{language,javascript,typescript}},{startedAt});
 assert.equal(received.packet.ok,true,JSON.stringify(received.packet.error));const result=received.packet.result;assert.equal(result.javascript,javascript);assert.equal(result.typescript,typescript);assert.equal(result.pairedTargetAgreement,true);assert.equal(result.projectAttemptCount,6);assert.equal(result.rustEdits.length,1);assert.equal(result.nativeEdits.length,2);assert.equal(result.rustEdits[0].history.inverse,result.rustEdits[0].before);assert.equal(result.sourceInstalled,false);assert.equal(result.wholeRouterSynchronization,false);assert.deepEqual(result.authoredLanguages,['JavaScript','TypeScript']);assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','language','repository']);assert.deepEqual(result.inverseRuleTrace.map(row=>row.phase),['language','language','repository']);assert.equal(received.report.cleanupSucceeded,true);
});
for(const variant of ['different-value','stale-peer','unrelated-type-source'])test('complete paired inverse refuses '+variant+' and cleans receiving copy',limits,t=>{
 const startedAt=performance.now(),before=baseline(t,startedAt),javascript=editHeaders(before.javascript,'JavaScript',[[0,'identifier']]);let typescript=variant==='stale-peer'?before.typescript:editHeaders(before.typescript,'TypeScript',[[0,variant==='different-value'?'other_identifier':'identifier']]);if(variant==='unrelated-type-source')typescript+='\nexport type Unrelated = string;\n';
 const received=receiveOpaquePairedLiterals(t,{operation:'paired-literal-inverse',submitted:{language:'JavaScript',javascript,typescript}},{startedAt});assert.equal(received.packet.ok,false);assert.match(received.packet.error.message,/conflicting complete authored JS\/TS projections/u);assert.equal(received.report.cleanupSucceeded,true);
});
