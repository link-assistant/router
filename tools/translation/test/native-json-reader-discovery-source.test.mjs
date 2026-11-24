// Independent bulk discovery case SOURCE. Execution remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeNativeJsonOptionalPathReaderDiscovery as discover} from '../native-json-optional-path-reader-discovery.mjs';
import {prepareNativeJsonReaderDiscoverySources} from '../prepare-native-json-reader-discovery-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000};
function reader(name='choose',key='"code"'){
 return 'pub fn '+name+'(body:&str)->Option<String>{let value:serde_json::Value=serde_json::from_str(body).ok()?;let error=value.get("error")?;[&['+key+'][..]].into_iter().find_map(|path|path.iter().try_fold(error,|node,key|node.get(key))?.as_str().map(str::to_owned))}\n';
}
test('automatic discovery retains module/function order complete sources and independent unsupported cases',limits,()=>{
 const first=reader('first')+reader('unsupported','key')+reader('last'),untouched='pub fn keep(value:bool)->bool{value}\n',input=[{path:'rust/src/a.rs',source:first},{path:'rust/src/b.rs',source:untouched},{path:'rust/src/c.rs',source:reader('third')}],result=discover(input);
 assert.equal(result.lexicalCandidates,4);assert.equal(result.sourceProposals,3);assert.equal(result.unsupportedCandidates,1);assert.equal(result.changedFiles,2);
 assert.deepEqual(result.observations.map(row=>[row.sourcePath,row.function,row.status]),[['rust/src/a.rs','first','source-proposed'],['rust/src/a.rs','unsupported','unsupported-source'],['rust/src/a.rs','last','source-proposed'],['rust/src/c.rs','third','source-proposed']]);
 assert.deepEqual(result.steps.map(row=>row.function),['first','last','third']);assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','repository']);
 for(let index=0;index<input.length;index++){assert.equal(result.files[index].before,input[index].source);assert.equal(result.files[index].inverse,input[index].source);assert.equal(result.files[index].history.inverse,input[index].source);}
 assert.equal(result.files[1].after,untouched);assert.ok(result.files[0].after.includes(reader('unsupported','key').trim()));
 const beforeLast=first.indexOf('pub fn last'),last=result.observations[2];assert.equal(last.originalSpan[0],beforeLast);assert.equal(last.coordinates,'original-supplied-module');assert.equal(last.currentCoordinates,'complete-step-input-module');assert.notEqual(last.currentSpan[0],last.originalSpan[0]);
 for(const step of result.steps){assert.equal(step.originalBodyEquivalenceQualified,false);assert.equal(step.sourceInstalled,false);assert.equal(transportConcreteSyntaxMeta(step.pipelines[1].concreteSyntax).source,step.files[0].after);}
 assert.ok(result.metadataTextUnits>0&&result.metadataTextUnits<=33554432);
});
test('actual catalog source is discovered without hardcoded paths names or semantic authority',limits,()=>{
 const before=readFileSync(new URL('../../../rust/src/model_catalog_errors.rs',import.meta.url),'utf8'),result=discover([{path:'rust/src/catalog-copy.rs',source:before}]);
 assert.equal(result.lexicalCandidates,1);assert.equal(result.sourceProposals,1);assert.equal(result.unsupportedCandidates,0);assert.equal(result.steps[0].function,'resource_error_code');assert.equal(result.steps[0].sourcePath,'rust/src/catalog-copy.rs');assert.equal(result.files[0].inverse,before);
 for(const flag of ['sourceAuthority','semanticAuthority','namespaceAuthority','runtimeAuthority','originalBodyEquivalenceQualified','sourceInstalled','nativeInstalled','productionSelected','receivingQualified','runtimeParity','wholeRouterSynchronization','runtimeExecuted','rustExecuted','crossInvocationCache'])assert.equal(result[flag],false);
 assert.equal(result.requiresWholeOriginalSemanticReissue,true);
});
test('candidate spellings in comments and literals never select an ordinary function',limits,()=>{
 const before='// serde_json::from_str(body).find_map().try_fold()\npub fn keep()->&\'static str{"serde_json::from_str(body).find_map().try_fold()"}\n',result=discover([{path:'rust/src/keep.rs',source:before}]);
 assert.equal(result.lexicalCandidates,0);assert.equal(result.sourceProposals,0);assert.equal(result.unsupportedCandidates,0);assert.equal(result.changedFiles,0);assert.equal(result.files[0].after,before);assert.equal(result.files[0].history.inverse,before);
});
test('duplicate definitions attributed functions and effectful prefixes are retained with explicit unsupported observations',limits,()=>{
 const input=[{path:'rust/src/a.rs',source:reader()+reader()},{path:'rust/src/b.rs',source:'#[unknown]\n'+reader('attributed')},{path:'rust/src/c.rs',source:reader('effectful').replace('let error=','side_effect();let error=')}],result=discover(input);
 assert.equal(result.lexicalCandidates,4);assert.equal(result.sourceProposals,0);assert.equal(result.unsupportedCandidates,4);assert.equal(result.changedFiles,0);
 for(let index=0;index<input.length;index++)assert.equal(result.files[index].after,input[index].source);
 for(const row of result.observations){assert.equal(row.status,'unsupported-source');assert.equal(typeof row.message,'string');assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);}
});
test('malformed source and explicit resource bounds remain fatal instead of unsupported candidates',limits,()=>{
 assert.throws(()=>discover([{path:'rust/src/a.rs',source:'pub fn broken(){"unterminated'}]));
 assert.throws(()=>discover([{path:'rust/src/a.rs',source:'x'.repeat(2097153)}]));
 assert.throws(()=>discover([{path:'rust/src/a.rs',source:reader().replace('let value:serde_json::Value','let value:serde_json::Value').replace('"error"','"'+'x'.repeat(4097)+'"')}]),/bound/u);
 const many=Array.from({length:129},(_,index)=>reader('function_'+index)).join('');assert.throws(()=>discover([{path:'rust/src/a.rs',source:many}]),/bound/u);
});
test('all input rows preflight before proposal work without proxies accessors holes or object coercion',limits,()=>{
 let called=0;const getter={path:'rust/src/a.rs',get source(){called++;return reader();}},proxy=new Proxy({path:'rust/src/a.rs',source:reader()},{get(){called++;throw Error('no read');}}),coerce={toString(){called++;return 'rust/src/a.rs';}};
 for(const row of [getter,proxy,{path:coerce,source:reader()}])assert.throws(()=>discover([row]));
 assert.throws(()=>discover(new Proxy([],{get(){called++;throw Error('no read');}})));assert.throws(()=>discover([,{path:'rust/src/a.rs',source:reader()}]));
 assert.throws(()=>discover([{path:'../a.rs',source:reader()}]));assert.throws(()=>discover([{path:'rust/src/a.rs',source:reader()},{path:'rust/src/a.rs',source:reader()}]));assert.equal(called,0);
});
test('later independent operations do not reuse prior source proposals or unsupported verdicts',limits,()=>{
 const path='rust/src/a.rs',bad=discover([{path,source:reader('choose','key')}]);assert.equal(bad.sourceProposals,0);
 const good=discover([{path,source:reader()}]);assert.equal(good.sourceProposals,1);
 const changed=discover([{path,source:reader('choose','"changed"')}]);assert.equal(changed.sourceProposals,1);assert.ok(changed.files[0].after.includes('error, "changed"'));assert.equal(changed.files[0].after.includes('error, "code"'),false);
 const again=discover([{path,source:reader('choose','key')}]);assert.equal(again.sourceProposals,0);assert.equal(again.unsupportedCandidates,1);
});
test('three complete implementation equations retain full originals phase order and exact source inverses',limits,()=>{
 const plan=prepareNativeJsonReaderDiscoverySources();assert.equal(plan.files.length,3);assert.equal(plan.receivingExecuted,false);
 for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}
});
