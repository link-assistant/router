// Whole-source CST adoption DATA cases; all execution remains deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeNativeOwnedTextVector as propose,proposeNativeOwnedTextVectors as batch} from '../native-owned-text-vector-proposals.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareOwnedTextVectorNativeAdoptionSources} from '../prepare-owned-text-vector-native-adoption-sources.mjs';
const limits={timeout:60000},select=(name='collect',local='values')=>({sourcePath:'rust/src/caller.rs',function:name,local});
const core='crate::translation_owned_text_vectors_core::';
for(const constructor of ['Vec::new()','::std::vec::Vec::new()','Vec::<String>::new()','std::vec::Vec::<String>::new()'])test('native constructor, discarded push and final owned return: '+constructor,limits,()=>{
 const source='// whole module retained\npub fn collect(input: String) -> Vec<String> { let mut values: Vec<String> = '+constructor+'; values /* member */ .push(/* operand */ input /* suffix */); values }\n',proposal=propose(source,select()),after=proposal.files[0].after;
 assert.equal(proposal.files[0].inverse,source);assert.equal(proposal.files[0].history.inverse,source);assert.equal(transportConcreteSyntaxMeta(proposal.concreteSyntax).source,after);assert.ok(after.includes(core+'vec_text_new()'));assert.ok(after.includes(core+'vec_text_push(values, router_rule_owned_text_item)'));for(const comment of ['// whole module retained','/* member */','/* operand */','/* suffix */'])assert.ok(after.includes(comment));assert.deepEqual(proposal.ruleTrace.map(row=>row.phase),['language','repository']);assert.equal(proposal.pushes,1);assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.semanticReissueQualified,false);assert.equal(proposal.requiresOriginalNamespaceCheck,true);assert.equal(proposal.originalBodyEquivalenceQualified,false);assert.equal(proposal.runtimeParity,false);
});
test('literal keeps Unicode, NUL spelling, trailing commas and original comments',limits,()=>{
 const source='pub fn collect(input: String) -> Vec<String> { let values = vec! /* macro */ [ /* before */ String::from("🦀\\0é"), input /* final */, ]; values }',proposal=propose(source,select()),after=proposal.files[0].after;assert.ok(after.includes(core+'vec_text_from_slice(&['));for(const part of ['/* macro */','/* before */','String::from("🦀\\0é")','input /* final */, '])assert.ok(after.includes(part));assert.equal(proposal.literalClonesChanged,true);assert.equal(proposal.files[0].inverse,source);assert.equal(proposal.maxLiteralElements,64);assert.equal(proposal.maxValues,4096);
});
test('push operand is retained once, including nested selected length, before receiver move',limits,()=>{
 const source='fn collect() -> Vec<String> { let mut values = vec![]; values.push(render(values /* nested */ .len()), /* trailing */); values }',proposal=propose(source,select()),after=proposal.files[0].after;assert.equal(proposal.nestedSourceEdits,1);assert.equal(proposal.lengths,1);assert.match(after,/let router_rule_owned_text_item = render\(/u);assert.ok(after.indexOf('render(')<after.indexOf(core+'vec_text_push'));assert.equal(after.split('render(').length-1,1);assert.ok(after.includes(core+'vec_text_len(&values)'));assert.ok(after.includes('/* nested */'));assert.ok(after.includes('/* trailing */'));assert.equal(proposal.pushOperandEvaluatedOnceBeforeReceiverMove,true);assert.equal(proposal.originalTwoPhaseBorrowEquivalent,false);assert.equal(proposal.lengthRepresentationChanged,true);
});
test('fresh placeholders and operand locals avoid the complete original identifier census',limits,()=>{
 const source='fn collect(router_rule_owned_text_item: String) -> Vec<String> { let router_rule_owned_text_vec_new = 0; let mut values = Vec::new(); values.push(router_rule_owned_text_item); values }',after=propose(source,select()).files[0].after;assert.ok(after.includes('let router_rule_owned_text_item_0 = router_rule_owned_text_item;'));assert.ok(after.includes('let router_rule_owned_text_vec_new = 0;'));assert.ok(after.includes(core+'vec_text_new()'));
});
test('all complete batch files and unchanged modules retain original inverses',limits,()=>{
 const first='fn collect(input: String) -> Vec<String> {let mut values = Vec::new();values.push(input);values}',second='fn untouched() {}',result=batch([{path:'rust/src/caller.rs',source:first},{path:'rust/src/untouched.rs',source:second}],[select()]);assert.equal(result.changedFiles,1);assert.equal(result.files[0].inverse,first);assert.equal(result.files[1].before,second);assert.equal(result.files[1].after,second);assert.equal(result.files[1].history.inverse,second);assert.equal(result.selectedLocals,1);assert.equal(result.namespaceAuthority,false);
});
test('explicit multiple locals compose using each complete preceding source',limits,()=>{
 const source='fn collect(input: String) -> Vec<String> {let mut first = Vec::new();first.push(input);let values = vec![];values}',result=batch([{path:'rust/src/caller.rs',source}],[select('collect','first'),select()]);assert.equal(result.steps.length,2);assert.equal(result.steps[1].files[0].before,result.steps[0].files[0].after);assert.equal(result.files[0].inverse,source);assert.equal(result.sourceInstalled,false);
});
test('syntax hints and apparent standard names grant no String, namespace or caller authority',limits,()=>{
 const source='type Vec = Alternate; fn collect() {let values = Vec::new();values}',proposal=propose(source,select());assert.equal(proposal.namespaceAuthority,false);assert.equal(proposal.requiresOriginalNamespaceCheck,true);assert.equal(proposal.requiresOriginalDomainCheck,true);assert.equal(proposal.receivingQualified,false);assert.equal(proposal.runtimeExecuted,false);assert.equal(proposal.rustExecuted,false);assert.equal(proposal.crossInvocationCache,false);
});
test('unsupported repeat, alias, borrow, index, consumed push, scopes and shadowing refuse explicitly',limits,()=>{
 for(const body of ['let values = vec![make(); 2];values','let values = vec![,make()];values','let mut values = Vec::new();let alias=&values;values','let mut values = Vec::new();return values.push(make());','let mut values = Vec::new();values.push(make(),make());values','let values = Vec::new();values.push(make());values','let mut values = Vec::new();values[0]=make();values','let values = Vec::new();let values = Vec::new();values','let mut values = Vec::new();if ready(){values.push(make());}values','let mut values = Vec::new();values.push(values);values'])assert.throws(()=>propose('fn collect(){'+body+'}',select()));
 assert.throws(()=>propose('fn collect(){let values=vec!['+Array.from({length:65},()=> 'make()').join(',')+'];values}',select()));
});
test('descriptor, dense batch, duplicate selection and path guards remain strict',limits,()=>{
 const source='fn collect(){let values=vec![];values}';for(const selection of [{...select(),sourcePath:'../caller.rs'},{...select(),semanticAuthority:true},{...select(),local:''},new Proxy(select(),{})])assert.throws(()=>propose(source,selection));let read=false;const selection=select();Object.defineProperty(selection,'local',{enumerable:true,get(){read=true;return 'values';}});assert.throws(()=>propose(source,selection));assert.equal(read,false);assert.throws(()=>batch([{path:'rust/src/caller.rs',source}],[select(),select()]));assert.throws(()=>batch(new Array(1),[select()]));assert.throws(()=>propose(source+'\n'.repeat(1000),select()));
});
test('complete source equations retain both ordered phases without granting receiving qualification',limits,()=>{
 const plan=prepareOwnedTextVectorNativeAdoptionSources();assert.ok(plan.files.some(row=>row.path==='tools/translation/native-owned-text-vector-proposals.mjs'));assert.notEqual(plan.receivingExecuted,true);
});
