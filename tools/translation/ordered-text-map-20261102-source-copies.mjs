// Complete source-copy substitutions. Proposal DATA; no automatic install.
import {createHash} from 'node:crypto';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const roles=[{"originalPath":"rust/src/lib.rs","path":"rust/src/lib.rs","language":"Rust","sha256":"5525534dcae9a34e0df52a420997163410403ab365784ebeafbd79f758d5d6b5","sequences":[{"phase":"language","rows":[]},{"phase":"repository","rows":[{"id":"repository:actual-ordered-text-map-root-edge","before":"pub mod translation_owned_text_vectors_core;","after":"pub mod translation_owned_text_vectors_core;\n\npub mod translation_ordered_text_map_core;","count":1}]}]},{"originalPath":"tools/translation/fixed-type-core-interface.mjs","path":"tools/translation/ordered-text-map-20261102-interface.mjs","language":"JavaScript","sha256":"d43587a74248d34bbb80361057013385abba7271fdfce78999e7d1395b7d0043","sequences":[{"phase":"language","rows":[{"id":"language:ordered-text-map-source-binding-0","before":"selectOriginalFixedTypeCore","after":"selectOriginalOrderedTextMapCore","count":1},{"id":"language:ordered-text-map-source-binding-1","before":"FIXED_TYPE_CORE_NATIVE_SOURCE","after":"ORDERED_TEXT_MAP_NATIVE_SOURCE","count":2},{"id":"language:ordered-text-map-source-binding-2","before":"Owned fixed primitive type requires its actual owned facade and qualified source binding","after":"Owned ordered text map requires its actual owned facade and qualified source binding","count":1}]},{"phase":"repository","rows":[{"id":"repository:ordered-text-map-source-binding-0","before":"./fixed-type-core-source.mjs","after":"./ordered-text-map-20261102-source.mjs","count":1},{"id":"repository:ordered-text-map-source-binding-1","before":"translation_fixed_types_core","after":"translation_ordered_text_map_core","count":7}]}]}];
export function proposeOrderedTextMapSourceCopies(input){
 account(input);const sources=copyMetadata(input);if(!Array.isArray(sources)||sources.length!==roles.length)throw TypeError('all complete original map source modules required');
 const rows=roles.map((role,index)=>{
  const row=sources[index];if(!row||Object.keys(row).sort().join(',')!=='path,source'||row.path!==role.originalPath||typeof row.source!=='string'||createHash('sha256').update(row.source).digest('hex')!==role.sha256)throw TypeError('exact complete original map source module required');
  const pipeline=createRulePipeline(role.sequences.map(sequence=>({phase:sequence.phase,rules:sequence.rows.map(rule=>countedLiteralSubstitutionRule(rule.id,rule.before,rule.after,rule.count,'complete original map source occurrence count differs'))}))).run(row.source);
  const history=transportConcreteSourceEquations([{before:row.source,after:pipeline.value,language:role.language}])[0];
  if(history.inverse!==row.source||transportConcreteSyntaxMeta(history.beforeMeta).source!==row.source||transportConcreteSyntaxMeta(history.afterMeta).source!==pipeline.value)throw TypeError('whole map source CST or inverse differs');
  return {originalPath:role.originalPath,path:role.path,before:row.source,after:pipeline.value,history,ruleTrace:pipeline.trace};
 });account(rows);return {rows,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,privateCallerBindingQualified:false,receivingExecuted:false};
}
