// Paired helper source DATA. No namespace, native caller or semantic permit.
import {types} from 'node:util';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const fail=message=>{throw new TypeError('Owned text vector join helper: '+message);};
const defaults=Object.freeze({functionName:'router_rule_owned_text_join',len:'routerJoin_length',get:'routerJoin_get',copy:'routerJoin_copy',append:'routerJoin_append',bytes:'routerJoin_bytes'});
function names(input){
 if(!input||typeof input!=='object'||types.isProxy(input)||Object.getPrototypeOf(input)!==Object.prototype)fail('ordinary helper name DATA required');const keys=Reflect.ownKeys(input);if(keys.length!==6||keys.some(key=>typeof key!=='string'||!Object.hasOwn(defaults,key)))fail('exact complete helper names required');const result={};for(const key of keys){const row=Object.getOwnPropertyDescriptor(input,key);if(!row||!Object.hasOwn(row,'value')||!row.enumerable||typeof row.value!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(row.value)||row.value.length>160)fail('ordinary bounded helper identifiers required');result[key]=row.value;}if(new Set(Object.values(result)).size!==6)fail('distinct generated helper identifiers required');return result;
}
const native=`fn router_rule_owned_text_join(values: &::std::vec::Vec<::std::string::String>, separator: &str) -> ::std::string::String {
    let count = crate::translation_owned_text_vectors_core::vec_text_len(values);
    let _separator_bytes = crate::translation_text_core::len_utf8(separator);
    let mut output = crate::translation_text_core::to_owned("");
    let mut index = 0u64;
    while index < count {
        if index > 0u64 { output = crate::translation_text_core::append_owned(output, separator); }
        match crate::translation_owned_text_vectors_core::vec_text_get(values, index) {
            Some(value) => { output = crate::translation_text_core::append_owned(output, &value); }
            None => {}
        }
        index = index + 1u64;
    }
    output
}
`;
function portable(typed){return (typed?'':'/** @param {Parameters<typeof routerJoin_length>[0]} values @param {string} separator */\n')+`function router_rule_owned_text_join(values${typed?': Parameters<typeof routerJoin_length>[0]':''}, separator${typed?': string':''})${typed?': ReturnType<typeof routerJoin_copy>':''} {
 const count = routerJoin_length(values);
 const _separator_bytes = routerJoin_bytes(separator);
 let output = routerJoin_copy('');
 let index = 0n;
 while(index < count){
  if(index > 0n){ output = routerJoin_append(output,separator); }
  const item = routerJoin_get(values,index);
  if(item.$ === 'Some'){ output = routerJoin_append(output,item.field0); }
  index = index + 1n;
 }
 return output;
}
`;}
// Each template undergoes its own complete serialized/reparsed CST sequence.
// The caller separately checks the complete application+helper source graph.
export function ownedTextVectorJoinHelperSources(input){
 const selected=names(input),sources=[];
 for(const [language,source]of [['Rust',native],['JavaScript',portable(false)],['TypeScript',portable(true)]]){
  let after;const run=createRulePipeline([{phase:'language',rules:[{id:'language:retain-complete-bounded-String-vector-join-fold-body',apply:()=>{const original=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(original.meta).source!==source)fail('complete original helper inverse differs');return original.document;}}]},{phase:'repository',rules:[{id:'router:substitute-only-explicit-generated-helper-and-actual-core-import-identifiers',apply:document=>{
   const edits=[],pattern=/\b(?:router_rule_owned_text_join|routerJoin_length|routerJoin_get|routerJoin_copy|routerJoin_append|routerJoin_bytes)\b/gu,lookup=new Map(Object.entries(defaults).map(([key,value])=>[value,selected[key]]));for(const match of source.matchAll(pattern))edits.push({span:[match.index,match.index+match[0].length],expected:match[0],replacement:lookup.get(match[0])});const result=applyConcreteSyntaxSubstitutions(document,{languageRules:[],repositoryRules:[{id:'router:name-complete-join-helper-and-core-import-references',edits}]});after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(result.value));return after.source;
  }}]}]).run(null);sources.push({language,source:run.value,original:source,concreteSyntax:after.meta,inverse:source,ruleTrace:run.trace});
 }
 return {schema:'owned-text-vector-join-helper-sources-v1',sources,maxValues:4096,maxTextUtf8Bytes:1048576,clonesSelectedText:true,separatorEvaluatedOnce:true,requiresWholeOriginalSemanticReissue:true,sourceAuthority:false,namespaceAuthority:false,semanticAuthority:false,originalBodyEquivalenceQualified:false,receivingQualified:false,runtimeParity:false,runtimeExecuted:false,rustExecuted:false,crossInvocationCache:false};
}
export function defaultOwnedTextVectorJoinHelperNames(){return {...defaults};}
