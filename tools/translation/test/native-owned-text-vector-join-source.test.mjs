// Independent complete module/helper join source cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeNativeJoiningOwnedTextVector as propose,proposeNativeJoiningOwnedTextVectors as batch} from '../native-joining-owned-text-vector-proposals.mjs';
import {proposeNativeJoiningOwnedTextVectorDiscovery as discover} from '../native-joining-owned-text-vector-discovery.mjs';
import {proposeNativeScopedOwnedTextVector as original} from '../native-scoped-owned-text-vector-proposals.mjs';
import {ownedTextVectorJoinHelperSources,defaultOwnedTextVectorJoinHelperNames} from '../owned-text-vector-join-helper-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareOwnedTextVectorJoinLoweringSources} from '../prepare-owned-text-vector-join-lowering-sources.mjs';
const limits={timeout:60000},selection={sourcePath:'rust/src/caller.rs',function:'collect',local:'values'};
test('native join appends one complete same-module bounded helper and keeps complete original inverse',limits,()=>{
 const source='pub fn collect(input: String,sep: &str)->String{let values=vec![input];values /* receiver */ .join(/* separator */ sep)}',proposal=propose(source,selection),after=proposal.files[0].after;assert.throws(()=>original(source,selection));assert.equal(proposal.joins,1);assert.ok(after.includes('router_rule_owned_text_join(&values, /* separator */ sep)'));assert.ok(after.includes('/* receiver */'));assert.ok(after.includes('fn router_rule_owned_text_join('));assert.equal(after.split('fn router_rule_owned_text_join(').length-1,1);assert.ok(proposal.requiredCoreFunctions.includes('crate::translation_owned_text_vectors_core::vec_text_get'));assert.ok(proposal.requiredCoreFunctions.includes('crate::translation_text_core::append_owned'));assert.equal(proposal.joinHelper.maxTextUtf8Bytes,1048576);assert.equal(proposal.joinHelper.clonesSelectedText,true);assert.equal(proposal.files[0].history.inverse,source);assert.equal(transportConcreteSyntaxMeta(proposal.concreteSyntax).source,after);assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.semanticReissueQualified,false);assert.equal(proposal.originalBodyEquivalenceQualified,false);
});
test('multiple branch joins use one helper and each separator is retained once',limits,()=>{
 const source='fn collect(input:String,flag:bool)->String{let values=vec![input];if flag{values.join(next_separator())}else{values.join("🦀\\0")}}',proposal=propose(source,selection),after=proposal.files[0].after;assert.equal(proposal.joins,2);assert.equal(after.split('next_separator()').length-1,1);assert.equal(after.split('fn router_rule_owned_text_join(').length-1,1);assert.ok(after.includes('"🦀\\0"'));assert.equal(proposal.files[0].inverse,source);
});
test('fresh helper names do not capture original module identifiers',limits,()=>{
 const source='fn router_rule_owned_text_join(){} fn collect(input:String)->String{let values=vec![input];values.join("")}',proposal=propose(source,selection);assert.equal(proposal.joinHelper.name,'router_rule_owned_text_join_0');assert.ok(proposal.files[0].after.includes('fn router_rule_owned_text_join(){}'));
});
test('automatic discovery and complete native batch preserve originals and helper chronology',limits,()=>{
 const source='fn collect(input:String)->String{let values=vec![input];values.join("\\n\\n")}',result=discover([{path:selection.sourcePath,source}]),explicit=batch([{path:selection.sourcePath,source}],[selection]);assert.equal(result.sourceProposals,1);assert.equal(result.steps[0].joins,1);assert.equal(result.files[0].inverse,source);assert.equal(explicit.files[0].history.inverse,source);assert.equal(result.runtimeParity,false);
});
test('native missing/multiple separators, aliases and source hints do not authorize joins',limits,()=>{
 for(const suffix of ['values.join()','values.join("", "")','alias.join("")']){const source='fn collect(input:String)->String{let values=vec![input];'+suffix+'}';if(suffix.startsWith('alias')){const proposal=propose(source,selection);assert.equal(proposal.joins,0);assert.equal(proposal.joinHelper,null);}else assert.throws(()=>propose(source,selection));}
 const source='fn collect(){let values=vec![true];values.join("")}';const proposal=propose(source,selection);assert.equal(proposal.requiresOriginalDomainCheck,true);assert.equal(proposal.requiresOriginalNamespaceCheck,true);assert.equal(proposal.namespaceAuthority,false);
});
test('three helper source templates keep complete CST inverses and fixed phase order',limits,()=>{
 const names={...defaultOwnedTextVectorJoinHelperNames(),functionName:'selected_join'},result=ownedTextVectorJoinHelperSources(names);assert.deepEqual(result.sources.map(row=>row.language),['Rust','JavaScript','TypeScript']);for(const row of result.sources){assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.source);assert.ok(row.source.includes('selected_join'));assert.equal(row.inverse,row.original);assert.deepEqual(row.ruleTrace.map(item=>item.phase),['language','repository']);}assert.equal(result.receivingQualified,false);assert.throws(()=>ownedTextVectorJoinHelperSources({...names,len:names.get}));assert.throws(()=>ownedTextVectorJoinHelperSources({...names,functionName:'bad::path'}));let read=false;const bad={...names};Object.defineProperty(bad,'get',{enumerable:true,get(){read=true;return 'x';}});assert.throws(()=>ownedTextVectorJoinHelperSources(bad));assert.equal(read,false);
});
test('complete join source equations retain original APIs without receiving qualification',limits,()=>{const plan=prepareOwnedTextVectorJoinLoweringSources();assert.ok(plan.files.some(row=>row.path==='tools/translation/native-joining-owned-text-vector-proposals.mjs'));assert.equal(plan.receivingExecuted,false);});
