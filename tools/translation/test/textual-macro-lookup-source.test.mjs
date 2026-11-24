// Independent native source premises; every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {captureOriginalTextualMacroLookupSource,originalTextualMacroLookupSourceFacts} from '../textual-macro-lookup-source.mjs';
import {originalRustFunctionInventoryData} from '../registered-builtin-caller-attribute-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareTextualMacroLookupSources} from '../prepare-textual-macro-lookup-sources.mjs';
const limits={timeout:60000},hash=value=>createHash('sha256').update(value).digest('hex');
test('all eleven whole native lookup callbacks retain complete current sources and original CST inverses',limits,()=>{
 const token=captureOriginalTextualMacroLookupSource(),result=originalTextualMacroLookupSourceFacts(token);assert.equal(Object.keys(result.callbacks).length,11);assert.equal(result.sources.length,8);assert.ok(result.retainedSourceBytes>0&&result.retainedSourceBytes<=8388608);
 for(const row of result.sources.filter(row=>row.kind==='Rust')){assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.source);assert.equal(row.inverse,row.source);assert.equal(hash(row.source),row.sourceSha256);}
 for(const callback of Object.values(result.callbacks)){const source=result.sources.find(row=>row.path===callback.path);assert.equal(source.source.slice(callback.span.start,callback.span.end),callback.original);assert.ok(callback.original.startsWith('fn '));}
 assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);assert.ok(result.remaining.includes('every modularized candidate and global export'));for(const key of ['originalCallerResolved','modularizedCandidatesClosed','macroOwnerResolved','hygieneResolved','sourceAuthority','namespaceAuthority','runtimeAuthority','wholeCompilerExecuted','crossInvocationCache'])assert.equal(result[key],false,key);
});
test('actual ambiguity mitigation retains both nearest-module equality and modularized-ancestor conditions',limits,()=>{
 const result=originalTextualMacroLookupSourceFacts(captureOriginalTextualMacroLookupSource()),source=result.callbacks.disambiguate_macro_rules_vs_modularized.original;
 assert.ok(source.includes('macro_rules.nearest_parent_mod() == modularized.nearest_parent_mod()'));assert.ok(source.includes('modularized.is_ancestor_of(*macro_rules)'));assert.ok(source.includes('_ => false'));assert.ok(result.callbacks.nearest_parent_mod.original.includes('self.parent.expect'));assert.ok(result.callbacks.is_ancestor_of.original.includes('return false'));
 assert.equal(result.conditionalPremises.actualParentMacroRulesScopeRequired,true);assert.equal(result.conditionalPremises.invocationScopeMayRemainUndetermined,true);assert.equal(result.conditionalPremises.macroRulesVersusModularizedAmbiguityMustBeResolved,true);assert.equal(result.conditionalPremises.missingBindingParentModulePreventsNativeDisambiguation,true);
});
test('copied requests and invented caller metadata cannot substitute for the original private source request',limits,()=>{
 const token=captureOriginalTextualMacroLookupSource();for(const value of [{...token},structuredClone(token),{schema:token.schema,macroOwnerResolved:true},null])assert.throws(()=>originalTextualMacroLookupSourceFacts(value),/copied or foreign/u);
 const first=originalTextualMacroLookupSourceFacts(token),second=originalTextualMacroLookupSourceFacts(token);assert.notStrictEqual(first,second);assert.notStrictEqual(first.sources,second.sources);assert.equal(first.profileSha256,second.profileSha256);assert.equal(first.macroOwnerResolved,false);
});
test('the reused public inventory accepts source DATA without granting owner or namespace permission',limits,()=>{
 const source='impl Example{fn first()->u8{3}fn second()->u8{5}}',input={path:'invented.rs',source,sourceSha256:hash(source)},result=originalRustFunctionInventoryData(input);assert.deepEqual(result.rows.map(row=>row.name),['first','second']);for(const row of result.rows)assert.equal(source.slice(row.span.start,row.span.end),row.original);assert.equal(result.sourceAuthority,false);assert.equal(result.namespaceAuthority,false);assert.equal(result.runtimeAuthority,false);
 let touched=false;assert.throws(()=>originalRustFunctionInventoryData({path:'invented.rs',get source(){touched=true;return source;},sourceSha256:hash(source)}),/closed own/u);assert.equal(touched,false);assert.throws(()=>originalRustFunctionInventoryData({...input,sourceSha256:'0'.repeat(64)}),/source inventory DATA/u);
});
test('all three complete source equations retain both ordered sequences full originals and original native owners',limits,()=>{
 const plan=prepareTextualMacroLookupSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
