// Independent source-origin domain/receipt SOURCE. All cases remain UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {captureOriginalMacroFileTokenContext,originalMacroFileTokenContextFacts,captureOriginalFileTokenContext,originalFileTokenContextFacts} from '../original-file-context-source.mjs';
import {prepareMacroFileTokenContextSources} from '../prepare-macro-file-token-context-sources.mjs';
const limits={timeout:60000};
function request(source='#[doc=include_str!("missing-source-only.md")]fn selected(){}',name='include_str'){
 const file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file,compilationProfile:null}),module={file,path:[],source,sourceView:capture.views[0],compilationProfile:null},start=source.indexOf(name);return {module,span:{start,end:start+name.length}};
}
test('a genuine ordinary macro identifier retains complete constructor CSTs and fresh source-origin equations',limits,async()=>{
 const input=request(),token=await captureOriginalMacroFileTokenContext(input),facts=await originalMacroFileTokenContextFacts(token,input),again=await originalMacroFileTokenContextFacts(token,input);assert.notStrictEqual(again,facts);assert.equal(facts.token,'include_str');assert.equal(facts.source,input.module.source);assert.equal(facts.sourceView,input.module.sourceView);assert.equal(facts.positiveOrdinaryTokenEquation,true);assert.equal(facts.positiveOrdinaryMacroIdentifierTokenEquation,true);assert.equal(facts.contextConstructor,'SyntaxContext::root()');assert.equal(facts.sourceProfile.sources.length,15);assert.equal(facts.sourceProfile.constructorCsts.length,15);assert.equal(facts.constructorPrograms.length,102);assert.equal(facts.rustcContextObject,null);assert.equal(facts.eligibleOwnerScope,null);for(const key of ['nativeSpanSourceCallsiteQualified','macroOwnerResolved','namespaceAuthority','typeAuthority','runtimeAuthority','wholeCompilerExecuted'])assert.equal(facts[key],false,key);assert.equal(again.source,facts.source);assert.equal(again.contextConstructor,facts.contextConstructor);
 await assert.rejects(()=>originalFileTokenContextFacts(token));await assert.rejects(()=>originalMacroFileTokenContextFacts({...token},input));await assert.rejects(()=>captureOriginalFileTokenContext(input));
});
test('plain raw lifetime partial and accessor source requests retain strict source boundaries',limits,async()=>{
 for(const input of [request('fn selected(){include_str;}'),request('fn selected(){r#include_str!("x");}'),request("fn selected<'include_str>(){}"),request('fn selected(){prefixinclude_str!("x");}')])await assert.rejects(()=>captureOriginalMacroFileTokenContext(input));let touched=false;const original=request();await assert.rejects(()=>captureOriginalMacroFileTokenContext({...original,get span(){touched=true;return original.span;}}));assert.equal(touched,false);
});
test('module view and span changes cannot reuse a private request and restored originals are checked afresh',limits,async()=>{
 const input=request(),token=await captureOriginalMacroFileTokenContext(input),source=input.module.source,view=input.module.sourceView;input.module.source+=' ';await assert.rejects(()=>originalMacroFileTokenContextFacts(token,input));input.module.source=source;input.module.sourceView=request().module.sourceView;await assert.rejects(()=>originalMacroFileTokenContextFacts(token,input));input.module.sourceView=view;const start=input.span.start;input.span.start++;await assert.rejects(()=>originalMacroFileTokenContextFacts(token,input));input.span.start=start;assert.equal((await originalMacroFileTokenContextFacts(token,input)).source,source);
});
test('all three complete compiler equations retain original issuer implementations native owners and both phases',limits,()=>{
 const plan=prepareMacroFileTokenContextSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
