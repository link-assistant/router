// Independent source cases only. All execution UNRUN during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {sourceItems} from '../rust-structure.mjs';
import {selectLocalClosureCandidates,selectLazyOptionCandidates} from '../local-closure-option-candidate-20261101-syntax.mjs';
import {proposeLocalClosureOptionCandidates} from '../local-closure-option-candidate-20261101.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000};
const fn=source=>sourceItems(source).find(item=>item.term==='fn');
function apply(source,edits){let after=source;for(const row of [...edits].reverse()){assert.equal(source.slice(...row.span),row.expected);after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);}return after;}
function actualOwner(){const fd=openSync(new URL('../../../rust/src/token_report.rs',import.meta.url),'r');let failed=false;try{const stat=fstatSync(fd);assert.ok(stat.isFile()&&stat.size<=2097152);const bytes=Buffer.alloc(stat.size+1);let offset=0,count;while((count=readSync(fd,bytes,offset,bytes.length-offset,offset))>0){offset+=count;assert.ok(offset<=stat.size);}assert.equal(offset,stat.size);return new TextDecoder('utf8',{fatal:true}).decode(bytes.subarray(0,offset));}catch(error){failed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!failed)throw error;}}}
test('direct primitive closure binds every argument once before original parameters and preserves literal/comment bytes',limits,()=>{
 const source='pub fn run(a:u64,b:u64)->u64{let choose=|left:u64,right:u64|{ /* right is intentionally unused */ left+left };choose(first(a),second(b))}',plan=selectLocalClosureCandidates(source,fn(source)),after=apply(source,plan.edits);
 assert.equal(plan.residuals.length,0);assert.equal(plan.selections.length,1);assert.equal(after.split('first(a)').length-1,1);assert.equal(after.split('second(b)').length-1,1);assert.ok(after.indexOf('first(a)')<after.indexOf('second(b)'));assert.ok(after.indexOf('second(b)')<after.indexOf('let left ='));assert.ok(after.includes('/* right is intentionally unused */ left+left'));assert.ok(!after.includes('let choose='));assert.equal(plan.selections[0].originalClosureEquivalence,false);
});
test('lexically resolved shared root and earlier local closure graph produce source candidates without typed capture authority',limits,()=>{
 const source='pub fn run(record:&crate::translation_core::Json)->u64{let number=|key:&str|record.get(key).and_then(Value::as_u64).unwrap_or(0);let twice=|key:&str|{let used=number(key);used+number(key)};twice("n")}',plan=selectLocalClosureCandidates(source,fn(source)),after=apply(source,plan.edits);
 assert.equal(plan.residuals.length,0);assert.deepEqual(plan.selections[0].lexicalCaptures,['record']);assert.deepEqual(plan.selections[1].lexicalDependencies,['number']);assert.ok(after.includes('record.get(key)'));assert.ok(!after.includes('let number='));assert.ok(!after.includes('let twice='));assert.equal(plan.selections.every(row=>row.captureTypesChecked===false),true);
});
for(const [name,source]of [
 ['escaping closure','pub fn bad(a:u64){let f=|x:u64|x+a;consume(f)}'],
 ['mutable source capture','pub fn bad(a:u64){let f=|x:u64|{a+=x;a};f(1)}'],
 ['owning capture','pub fn bad(text:String){let f=|x:u64|text.len()+x;f(1)}'],
 ['shadowed shared root','pub fn bad(text:&str)->u64{let f=|x:u64|text.len()+x;let text="changed";f(1)}'],
 ['forward local closure','pub fn bad()->u64{let f=|x:u64|g(x);let g=|x:u64|x;f(1)}'],
 ['move capture','pub fn bad(a:u64)->u64{let f=move|x:u64|x+a;f(1)}'],
 ['unknown free capture','pub fn bad()->u64{let f=|x:u64|x+foreign;f(1)}'],
 ['nested declaration cannot bind outer call','pub fn bad()->u64{{let f=|x:u64|x;consume(f(1));}f(2)}'],
 ['second callback parameter shadows shared capture','pub fn bad(record:&str)->u64{let text=|n:u64|record.len()+n;invoke(|x,record|text(x));text(1)}'],
 ['if-let pattern shadows shared capture','pub fn bad(record:&str,other:Option<&str>)->u64{let text=|n:u64|record.len()+n;if let Some(record)=other{text(1)}else{text(2)}}'],
 ['destructured callback pattern','pub fn bad(record:&str)->u64{let text=|n:u64|record.len()+n;invoke(|(x,record)|text(x));text(1)}'],
])test(name+' is retained as an explicit lexical residual',limits,()=>{const plan=selectLocalClosureCandidates(source,fn(source));assert.equal(plan.edits.length,0);assert.ok(plan.residuals.length);});
test('two-arm Option source candidate preserves literal arm source and uses existing lazy owned wrappers',limits,()=>{
 const source='pub fn render(value:Option<u64>)->String{value.map_or_else(||crate::translation_core::format!("NONE{}", ""),|n|crate::translation_core::format!("N={}",n))}',plan=selectLazyOptionCandidates(source,fn(source)),after=apply(source,plan.edits);
 assert.equal(plan.selections.length,1);assert.ok(after.includes('u64_to_text_owned_map(value, |n|'));assert.ok(after.includes('text_owned_unwrap_or_else('));assert.ok(after.includes('||crate::translation_core::format!("NONE{}", "")'));assert.equal(after.split('value,').length-1,1);assert.equal(plan.selections[0].originalStandardOwnerProved,false);assert.equal(plan.selections[0].originalClosureConstructionOrderProved,false);
});
test('captured or named-format two-arm closure needs separate provenance and remains residual',limits,()=>{
 const source='pub fn render(value:Option<u64>,used:u64)->String{value.map_or_else(||crate::translation_core::format!("{used}/-"),|max|crate::translation_core::format!("{used}/{max}"))}',plan=selectLazyOptionCandidates(source,fn(source));assert.equal(plan.edits.length,0);assert.ok(plan.residuals.length);
});
test('whole actual token-report owner retains source and yields only explicitly unqualified local graph candidates',limits,()=>{
 const source=actualOwner(),item=sourceItems(source).find(item=>item.term==='fn'&&item.name==='row'),plan=selectLocalClosureCandidates(source,item),after=apply(source,plan.edits);assert.equal(plan.selections.length,3);assert.equal(plan.residuals.length,0);assert.ok(after.includes('const HEADERS:'));assert.ok(after.includes('pub fn print_table'));assert.ok(after.includes('mod tests;'));assert.ok(after.includes('if let crate::translation_core::Maybe::Some'));assert.ok(after.includes('.map_or_else('));for(const row of plan.selections){assert.equal(row.originalClosureEquivalence,false);assert.equal(row.captureTypesChecked,false);}assert.equal(after.includes('let used_over_max ='),false);
});
test('whole supplied module equations keep language/repository phases, physical inverses and both actual checker outcomes',limits,()=>{
 const source='pub fn simple(value:u64)->u64{let f=|x:u64|x+1;f(value)}',input={entry:'src/lib.rs',files:[{path:'src/lib.rs',source}],manifest:'[package]\nname="fixture"\nversion="0.1.0"\nedition="2021"\n',lock:'version = 4\n'};let events=0;
 const result=proposeLocalClosureOptionCandidates(input,event=>{assert.equal(event.history.inverse,event.history.before);assert.equal(transportConcreteSyntaxMeta(event.history.beforeMeta).source,event.history.before);assert.ok(Object.isFrozen(event.history));events++;return {consumed:true};});assert.equal(events,2);assert.equal(result.allSuppliedOriginalModulesRetained,true);assert.equal(result.sourceCandidateOnly,true);assert.equal(result.executableAdmission,false);assert.equal(result.oldClosureEquivalenceProved,false);assert.equal(result.originalTypedCaptureIssuerImplemented,false);assert.equal(result.semanticInverseImplemented,false);assert.deepEqual([...new Set(result.ruleTrace.map(row=>row.phase))],['language','repository']);for(const checked of [result.originalCheck,result.candidateCheck])assert.ok(['whole-project-meta','whole-project-hard-refusal'].includes(checked.status));assert.equal(result.changedRequest.files.length,1);
});
test('callback accessors/proxies/async and malformed source requests cannot authorize candidate admission',limits,()=>{
 let calls=0;assert.throws(()=>proposeLocalClosureOptionCandidates({},async()=>{calls++;}));assert.equal(calls,0);const value={get files(){calls++;return [];}};assert.throws(()=>proposeLocalClosureOptionCandidates(value));assert.equal(calls,0);
});
