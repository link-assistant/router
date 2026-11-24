// Independent actual native attached macro token SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rustTokens} from '../rust-structure.mjs';
import {splitRustMacroBangSourceTokens,splitRustTryDotSourceTokens} from '../rust-macro-token-source.mjs';
import {readQualifiedSourceMacroTokens} from '../qualified-source-call-tokens.mjs';
import {readCoreFormattingMacroSource,coreFormattingMacroSourceHeaders} from '../core-formatting-macro-source.mjs';
import {readCoreCarrierCallSource} from '../core-carrier-call-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {applyLayeredCoreAdoptionSource,applyLayeredCoreOrFormatAdoptionSource} from '../layered-core-format-adoption-source.mjs';
import {proposeCallbackCoreBodySource} from '../callback-core-body-source.mjs';
import {prepareRustMacroTokenSources} from '../prepare-rust-macro-token-sources.mjs';
const limits={timeout:60000},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),format='crate::translation_core::format!';
test('actual pinned Rust lexer attaches macro bangs and the source-only view preserves every original UTF16 token slice',limits,()=>{
 const source='crate:: /* Ω😀 */ translation_core::format!("{}", item)',before=tokens(source),actual=before.find(row=>row.text==='format!');assert.ok(actual);assert.equal(actual.type,'ident');const after=splitRustMacroBangSourceTokens(before,source);assert.equal(after.length,before.length+1);assert.ok(before.includes(actual));assert.ok(!after.includes(actual));const at=after.findIndex(row=>row.text==='format');assert.equal(after[at].start,actual.start);assert.equal(after[at].end,actual.end-1);assert.deepEqual(after[at+1],{type:'punct',text:'!',start:actual.end-1,end:actual.end});for(const token of after)assert.equal(source.slice(token.start,token.end),token.text);const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});assert.equal(transportConcreteSyntaxMeta(concrete.meta).source,source);
 const native=readFileSync(new URL('../source-profiles/rust-macro-token-source/originals/lexer.mjs.txt',import.meta.url),'utf8');assert.ok(native.includes("language === 'Rust' && source[index] === '!'"));
});
test('separated bangs reuse the input view, and only actual identifier bang tokens are split',limits,()=>{
 for(const source of ['crate::translation_core::format !("{}", item)','!flag','value != other','"format!"']){const rows=tokens(source);assert.strictEqual(splitRustMacroBangSourceTokens(rows,source),rows);}
 const source='value?.method()',rows=tokens(source),trySplit=splitRustTryDotSourceTokens(rows,source);assert.equal(trySplit.filter(row=>row.text==='?'||row.text==='.').length,2);assert.strictEqual(splitRustMacroBangSourceTokens(trySplit,source),trySplit);
 const source2='unknown!(item)',rows2=tokens(source2);assert.ok(splitRustMacroBangSourceTokens(rows2,source2).some(row=>row.text==='unknown'));assert.throws(()=>splitRustMacroBangSourceTokens(rows2,'changed'),/Exact original Rust macro/u);assert.throws(()=>splitRustMacroBangSourceTokens([{type:'ident',text:'macro!',start:0,end:1}]),/Exact original Rust macro/u);
});
test('generic macro syntax canonical formatting roles and header positions consume both real attached and separated forms',limits,()=>{
 for(const source of [format+'("{}", item)','crate::translation_core::format !("{}", item)']){const rows=tokens(source),macro=readQualifiedSourceMacroTokens(rows);assert.deepEqual(macro.path,['crate','translation_core','format']);assert.equal(macro.macroOwnerProved,false);const selected=readCoreFormattingMacroSource(rows);assert.equal(selected.domain,'text-owned');assert.equal(selected.macroOwnerProved,false);assert.equal(selected.formatArgumentsChecked,false);assert.equal(readCoreCarrierCallSource(rows,new Map()).domain,'text-owned');const bang=source.indexOf('!');assert.deepEqual([...coreFormattingMacroSourceHeaders(rows)],[bang]);}
 for(const source of ['format!("{}", item)','other::format!("{}", item)','crate::translation_core::format_args!("{}", item)'])assert.equal(readCoreFormattingMacroSource(tokens(source)),null,source);
});
test('the additive CST macro lane consumes actual attached native tokens while the old call-only lane retains its refusal',limits,()=>{
 const source='item.to_string()',replacement=format+'("{}", item)',edits=[{span:[0,source.length],expected:source,replacement}],settings={languageRule:'primitive-display:retain-source',repositoryRule:'router-core:bind-formatting',bindings:[{native:'crate::translation_core::',neutral:'::translation_compatibility_format::'}]},proposal=applyLayeredCoreOrFormatAdoptionSource(source,edits,settings);assert.equal(proposal.after.source,replacement);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(transportConcreteSyntaxMeta(proposal.after.meta).source,replacement);assert.throws(()=>applyLayeredCoreAdoptionSource(source,edits,settings),/actual selected qualified compatibility call/u);
});
test('actual callback numeric Display uses the shared attached macro view and retains full source inverses',limits,()=>{
 const body='item.saturating_add(2).to_string()',proposal=proposeCallbackCoreBodySource(body,new Map([['item',{kind:'payload',domain:'u64'}]]));assert.ok(proposal);assert.ok(proposal.after.source.includes(format+'("{}",'));let inverse=proposal.after.source;for(const row of [...proposal.mapping].reverse())if(row.kind==='substitution')inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);assert.equal(inverse,body);assert.equal(proposal.functionOwnerProved,false);assert.equal(proposal.sourceStagesComplete,false);assert.equal(proposal.executableAdmission,false);
});
test('eleven complete source equations preserve the original punctuation helper native lexer DATA and complete two-phase inverses',limits,()=>{
 const plan=prepareRustMacroTokenSources();assert.equal(plan.files.length,11);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const helper=plan.files.find(row=>row.path==='tools/translation/rust-macro-token-source.mjs');assert.ok(helper.before.includes('export function splitRustTryDotSourceTokens'));assert.ok(helper.after.includes('export function splitRustMacroBangSourceTokens'));assert.equal(plan.receivingExecuted,false);
});
