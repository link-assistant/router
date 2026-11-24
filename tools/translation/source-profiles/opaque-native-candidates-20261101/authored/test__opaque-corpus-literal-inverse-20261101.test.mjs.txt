// Whole receiving inverse case SOURCE. No native compiler or test ran.
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {receiveOpaqueNativeCandidates} from '../opaque-native-candidates-20261101-receiving.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const limits={timeout:60000,concurrency:false};
const headers=['id','issued_at','expires_at','revoked','requests','tokens','reserved','rpm','scope'];
function wholeHeaderCell(source,language,value){
 const ts=ownershipCompiler(),file=ts.createSourceFile(language==='TypeScript'?'whole.mts':'whole.mjs',source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS),found=[];assert.equal(file.parseDiagnostics.length,0);
 function visit(node){if(ts.isArrayLiteralExpression(node)&&node.elements.length===headers.length&&node.elements.every((row,at)=>ts.isStringLiteral(row)&&row.text===headers[at]))found.push(node.elements[0]);ts.forEachChild(node,visit);}visit(file);assert.equal(found.length,1,'one actual complete emitted header array required');const node=found[0];return source.slice(0,node.getStart(file))+JSON.stringify(value)+source.slice(node.end);
}
for(const language of ['JavaScript','TypeScript'])test('actual full '+language+' header cell maps back to physical Rust and reproduces both complete targets',limits,t=>{
 const startedAt=performance.now(),first=receiveOpaqueNativeCandidates(t,{operation:'inspect'},{startedAt});assert.equal(first.report.cleanupSucceeded,true);assert.equal(first.packet.ok,true,JSON.stringify(first.packet.error));const baseline=first.packet.result.targetPhases.find(row=>row.phase==='adopted-project'),key=language==='JavaScript'?'javascript':'typescript',source=wholeHeaderCell(baseline[key],language,'identifier'),second=receiveOpaqueNativeCandidates(t,{operation:'literal-inverse',submitted:{language,source}},{startedAt});assert.equal(second.report.cleanupSucceeded,true);assert.equal(second.packet.ok,true,JSON.stringify(second.packet.error));const result=second.packet.result;
 assert.equal(result[key],source);assert.equal(result.selection.kind,'actual-constant-initializer-cell');assert.equal(result.rustEdit.path,'rust/src/token_report.rs');assert.ok(result.rustEdit.after.includes('"identifier"'));assert.equal(result.rustEdit.history.inverse,result.rustEdit.before);assert.equal(result.sourceInstalled,false);assert.equal(result.runtimeExecuted,false);assert.equal(result.arbitraryEditedTargetsSupported,false);assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','language','repository']);assert.equal(result.originalWholeProject.sourceFiles,result.changedWholeProject.sourceFiles);
});
test('unrelated target structure and unchanged-target inverses are actual receiving failures',limits,t=>{
 const startedAt=performance.now(),first=receiveOpaqueNativeCandidates(t,{operation:'inspect'},{startedAt});assert.equal(first.packet.ok,true,JSON.stringify(first.packet.error));const source=first.packet.result.targetPhases.find(row=>row.phase==='adopted-project').javascript;
 const same=receiveOpaqueNativeCandidates(t,{operation:'literal-inverse',submitted:{language:'JavaScript',source}},{startedAt});assert.equal(same.packet.ok,false);
 const changed=receiveOpaqueNativeCandidates(t,{operation:'literal-inverse',submitted:{language:'JavaScript',source:source+'\nexport const unrelated=1;\n'}},{startedAt});assert.equal(changed.packet.ok,false);
});
