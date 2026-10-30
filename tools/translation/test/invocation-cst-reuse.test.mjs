import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {prepareInvocationCstReuse} from '../prepare-invocation-cst-reuse.mjs';
import {prepareSourcePhaseTransports} from '../prepare-source-phase-transports.mjs';
import {executePrivateConcreteSubstitutionRow as execute} from '../private-concrete-substitution-batch-operations.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const archive=JSON.parse(gunzipSync(readFileSync(new URL('../source-profiles/invocation-cst-reuse/complete-originals.json.gz',import.meta.url))));
const originalSource=archive.files.find(row=>row.path.endsWith('/private-concrete-substitution-batch-operations.mjs')).source;
const original=(await import('data:text/javascript;base64,'+Buffer.from(originalSource).toString('base64'))).executePrivateConcreteSubstitutionRow;
const operations={source:(source,language)=>transportConcreteSyntaxSource(source,{language}),transport:meta=>transportConcreteSyntaxMeta(meta),serialize:serializeConcreteSyntaxMeta,substitute:applyConcreteSyntaxSubstitutions,stringify:JSON.stringify};
const fail=message=>{throw new TypeError(message);};
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
function request(source,language){const middle=source+'\r\n// language 🦀',after=middle+'\r\n// repository é';return {source,language,stages:[{phase:'language',expected:middle,sequence:{languageRules:[rule(source,middle,'language:retain-original')],repositoryRules:[]},inverseSequence:{languageRules:[rule(middle,source,'language:restore-original')],repositoryRules:[]}},{phase:'repository',expected:after,sequence:{languageRules:[],repositoryRules:[rule(middle,after,'repository:append-trivia')]},inverseSequence:{languageRules:[],repositoryRules:[rule(after,middle,'repository:restore-trivia')]}}]};}

test('both native-selected source changes retain complete language and repository CST inverses',{timeout:60000},()=>{
 const plan=prepareInvocationCstReuse();assert.equal(plan.files.length,2);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.publicConcreteApisChanged,false);
 for(const row of plan.files){assert.equal(row.current,row.installedAfter);if(row.sourceHistory){assert.equal(row.sourceHistory.before,row.after);assert.equal(row.sourceHistory.installedAfter??row.sourceHistory.after,row.installedAfter);assert.equal(row.sourceHistory.inverse,row.after);}assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}}
});

test('complete original and optimized results agree for Unicode BOM CRLF opaque Rust JavaScript and TypeScript sources',{timeout:60000},()=>{
 for(const [source,language]of [['\uFEFF// 🦀\r\npub fn name()->&\'static str{r#"x${é}"#}','Rust'],['\uFEFF// 🦀\r\nexport const value=`x${1+2}`;','JavaScript'],['\uFEFF// 🦀\r\nexport const value:string="é";','TypeScript'],['pub fn broken( { /* unclosed','Rust']]){const row=request(source,language),expected=original(row,operations,fail),actual=execute(row,operations,fail);assert.deepEqual(actual,expected);const wire=JSON.parse(actual.wire);assert.equal(wire.inverse,source);assert.equal(wire.stages.length,2);for(const stage of wire.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}}
});

test('changed canonical transport bytes and wrong complete inverses are refused before a result is returned',{timeout:60000},()=>{
 const row=request('pub fn unchanged(){}','Rust'),middle=row.stages[0].expected;
 assert.throws(()=>execute(row,{...operations,source:(source,language)=>{const result=operations.source(source,language);return source===middle?{...result,meta:result.meta+' '}:result;}},fail),/complete phase source equation/);
 const wrong=request('export const value=1;','JavaScript');wrong.stages[1].inverseSequence.repositoryRules[0].edits[0].replacement+=' ';
 assert.throws(()=>execute(wrong,operations,fail),/complete phase inverse/);
 assert.throws(()=>original(wrong,operations,fail),/complete phase inverse/);
});

test('the phase transport successor retains both complete CST rule sequences and inverses',{timeout:60000},()=>{
 const plan=prepareSourcePhaseTransports();assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.publicConcreteApisChanged,false);for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}}
});
