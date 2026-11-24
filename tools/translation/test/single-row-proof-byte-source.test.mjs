import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from '../source-copy-native-bindings.mjs';
import {prepareSingleRowProofByteSource} from '../prepare-single-row-proof-byte-source.mjs';
import {substituteWholeSourceRow} from '../single-source-substitution-runtime.mjs';
import {transportConcreteSyntaxParsedChunks,transportConcreteSyntaxMeta,createConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),ts=ownershipCompiler(),hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Whole owner proof byte source: '+message);};
function receivingWhole(run){
 const source=readFileSync(new URL('../prepare-whole-owner-proof-byte-candidate.mjs',import.meta.url),'utf8'),file=ts.createSourceFile('actual-complete-source-producer.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),entry=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareWholeOwnerProofByteCandidate'),whole=entry.body.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='whole'),helpers=['parse','hashCalls'].map(name=>file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name).getText(file)).join('\n');assert.equal(file.parseDiagnostics.length,0);
 const factory=Function('ts','root','verifyNativeCopiedSourceBindings','transportConcreteSyntaxParsedChunks','serializeConcreteSyntaxMeta','applyConcreteSyntaxSubstitutions','substituteWholeSourceRow','existsSync','readFileSync','resolve','hash','fail','"use strict";\n'+helpers+'\nreturn ('+whole.getText(file)+');');return factory(ts,root,verifyNativeCopiedSourceBindings,transportConcreteSyntaxParsedChunks,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,run,existsSync,readFileSync,resolve,hash,fail);
}

test('both complete native source equations preserve original limits fallback and all CST inverses',{timeout:60000},()=>{
 const plan=prepareSingleRowProofByteSource();assert.equal(plan.files.length,2);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.originalLimitsChanged,false);assert.equal(plan.originalFallbackRetained,true);assert.equal(plan.independentCompleteSourceComparisons,true);for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}}
});

test('the actual complete row executes one shared operation and joins independent full canonical sources',{timeout:60000},()=>{
 let calls=0;const whole=receivingWhole(rows=>{calls++;return substituteWholeSourceRow(rows);}),before='// 🦀\nexport function value(){return 7;}\n',language=before+'// language\n',after=language+'// repository\n',row=whole('tools/translation/test/fixtures/single-source-row-probe.mjs',before,language,after,{fixture:true});assert.equal(calls,1);assert.equal(row.inverse,before);assert.equal(row.stages.length,2);for(const [index,source]of [before,language,after].entries()){const wire=serializeConcreteSyntaxMeta(createConcreteSyntaxMeta(source,{language:'JavaScript'})),actual=index===0?row.beforeMeta:index===2?row.afterMeta:row.stages[0].afterMeta;assert.equal(actual,wire);}assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.ok(row.stages.every(stage=>stage.completeInverse));
});

test('large valid source retains the original complete path without widening any shared-operation bound',{timeout:60000},()=>{
 let calls=0;const whole=receivingWhole(()=>{calls++;throw new Error('oversized shared operation must not run');}),before='/*'+'x'.repeat(650000)+'*/\nexport function value(){return 7;}\n',language=before+'// language\n',after=language+'// repository\n',row=whole('tools/translation/test/fixtures/single-source-row-large-probe.mjs',before,language,after,{fixture:true});assert.equal(calls,0);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,after);assert.equal(row.inverse,before);assert.equal(row.stages.length,2);assert.ok(row.stages.every(stage=>stage.completeInverse));
});
