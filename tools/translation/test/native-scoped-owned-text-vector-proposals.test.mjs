// Scoped source proposal and branch/loop original-span case sources. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeNativeOwnedTextVector as original} from '../native-owned-text-vector-proposals.mjs';
import {proposeNativeScopedOwnedTextVector as propose,proposeNativeScopedOwnedTextVectors as batch} from '../native-scoped-owned-text-vector-proposals.mjs';
import {proposeNativeScopedOwnedTextVectorDiscovery as discover} from '../native-scoped-owned-text-vector-discovery.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareOwnedTextVectorNativeScopedSources} from '../prepare-owned-text-vector-native-scoped-sources.mjs';
const limits={timeout:60000},selected={sourcePath:'rust/src/caller.rs',function:'collect',local:'values'},prefix='crate::translation_owned_text_vectors_core::';
const module=body=>'fn collect(input: String, flag: bool) -> Vec<String> {'+body+'}';
for(const middle of ['if flag { values.push(input); } else { values.push(fallback()); }','for input in inputs() { values.push(input); }','while ready() { values.push(next()); if stop() {break;} }','loop { values.push(next()); if done(){break;} continue; }','match input { Some(value) => values.push(value), None => values.push(fallback()), }'])test('scoped native source adoption preserves complete control syntax: '+middle,limits,()=>{
 const source=module('let mut values=Vec::new();'+middle+'values'),proposal=propose(source,selected),after=proposal.files[0].after;assert.throws(()=>original(source,selected));assert.equal(proposal.files[0].history.inverse,source);assert.equal(proposal.files[0].inverse,source);assert.equal(transportConcreteSyntaxMeta(proposal.concreteSyntax).source,after);assert.ok(after.includes(prefix+'vec_text_push(values,'));assert.equal(after.split('vec_text_push(values,').length-1,proposal.pushes);assert.ok(after.includes('{ let router_rule_owned_text_item'));assert.ok(proposal.controlFlowTokens.length>0);assert.equal(proposal.controlFlowSemanticQualified,false);assert.equal(proposal.originalTwoPhaseBorrowEquivalent,false);assert.equal(proposal.requiresWholeOriginalSemanticReissue,true);assert.equal(proposal.semanticReissueQualified,false);assert.equal(proposal.namespaceAuthority,false);assert.equal(proposal.runtimeExecuted,false);
});
test('unit tail and match-arm push replacements retain unit blocks, commas and comments',limits,()=>{
 const source='fn collect(flag: bool){let mut values=Vec::new();match flag {true => values /* member */ .push(/* operand */ next()),false => { values.push(fallback()) },}}',proposal=propose(source,selected),after=proposal.files[0].after;assert.equal(proposal.pushes,2);assert.match(after,/true => \{ let router_rule_owned_text_item/u);assert.ok(after.includes('},false => { { let'));for(const comment of ['/* member */','/* operand */'])assert.ok(after.includes(comment));assert.equal(proposal.files[0].inverse,source);
});
test('nested length edits stay in the once-evaluated operand inside loop bodies',limits,()=>{
 const source=module('let mut values=vec![];for input in inputs(){values.push(render(values.len(), input));}values'),proposal=propose(source,selected),after=proposal.files[0].after;assert.equal(proposal.pushes,1);assert.equal(proposal.lengths,1);assert.equal(proposal.nestedSourceEdits,1);assert.ok(after.includes(prefix+'vec_text_len(&values)'));assert.equal(after.split('render(').length-1,1);assert.equal(proposal.pushOperandEvaluatedOnceBeforeReceiverMove,true);assert.equal(proposal.controlFlowSemanticQualified,false);
});
test('branch-local binding may end in an owned tail but never crosses its block',limits,()=>{
 const source=module('if flag {let mut values=vec![];values.push(input);values} else {fallback_vec()}'),proposal=propose(source,selected);assert.equal(proposal.pushes,1);assert.ok(proposal.bindingBlockSpan[0]>source.indexOf('if flag'));assert.equal(proposal.files[0].inverse,source);
 const outside='fn collect(values: Vec<String>,flag: bool){if flag {let mut values=Vec::new();values.push(next());} use_length(values.len());}';assert.throws(()=>propose(outside,selected),/outside its complete lexical binding block/u);
});
test('shadowing, closure/loop pattern capture, aliases, consumed push and index uses stay refused',limits,()=>{
 for(const body of ['let mut values=Vec::new();if flag {let values=vec![];}values','let mut values=Vec::new();for values in inputs(){consume(values);}values','let mut values=Vec::new();let callback=|values|values.len();values','let mut values=Vec::new();let callback=|x|values.push(x);values','let mut values=Vec::new();if flag {let alias=&values;}values','let mut values=Vec::new();consume(values.push(input));values','let mut values=Vec::new();values[0]=input;values'])assert.throws(()=>propose(module(body),selected));
});
test('multiple selected locals retain chronological complete source with generated unit blocks',limits,()=>{
 const source=module('let mut first=Vec::new();if flag{first.push(input);}let mut values=vec![];while ready(){values.push(next());}values'),result=batch([{path:selected.sourcePath,source}],[{...selected,local:'first'},selected]);assert.equal(result.steps.length,2);assert.equal(result.steps[1].files[0].before,result.steps[0].files[0].after);assert.equal(result.files[0].history.inverse,source);assert.equal(result.sourceInstalled,false);
});
test('automatic scoped discovery includes branch and loop proposals without manufacturing coverage',limits,()=>{
 const source=module('let mut values=Vec::new();if flag{values.push(input);}values'),result=discover([{path:selected.sourcePath,source}]);assert.equal(result.lexicalCandidates,1);assert.equal(result.sourceProposals,1);assert.equal(result.unsupportedCandidates,0);assert.equal(result.files[0].inverse,source);assert.equal(result.namespaceAuthority,false);assert.equal(result.runtimeParity,false);assert.equal(result.semanticReissueQualified,false);
});
test('source profile preserves additive APIs, full originals and open receiving obligations',limits,()=>{const plan=prepareOwnedTextVectorNativeScopedSources();assert.ok(plan.files.some(row=>row.path==='tools/translation/native-scoped-owned-text-vector-proposals.mjs'));assert.equal(plan.receivingExecuted,false);});

test('emptiness uses actual bounded length and clear consumes the vector into truncate zero',limits,()=>{
 const source=module('let mut values=vec![];if values.is_empty(){values.push(input);}while ready(){values.clear();if values.is_empty(){break;}}values'),proposal=propose(source,selected),after=proposal.files[0].after;assert.equal(proposal.emptyChecks,2);assert.equal(proposal.lengths,0);assert.equal(proposal.clears,1);assert.equal(proposal.lengthRepresentationChanged,false);assert.equal(after.split('vec_text_len(&values) == 0u64').length-1,2);assert.ok(after.includes('values = '+prefix+'vec_text_truncate(values, 0u64);'));assert.equal(proposal.files[0].inverse,source);assert.equal(proposal.clearRetainedCapacityEquivalent,false);assert.equal(proposal.resourceEnvelopeChanged,true);assert.equal(proposal.originalBodyEquivalenceQualified,false);
});
test('clear comments survive and malformed empty/clear operands refuse',limits,()=>{
 const source=module('let mut values=Vec::new();values /* receiver */ .clear(/* empty */);values'),proposal=propose(source,selected);for(const comment of ['/* receiver */','/* empty */'])assert.ok(proposal.files[0].after.includes(comment));for(const expression of ['values.is_empty(input)','values.clear(input)'])assert.throws(()=>propose(module('let mut values=Vec::new();'+expression+';values'),selected));
});
