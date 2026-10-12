import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {jsonEmptyArraySources,isJsonEmptyArraySources} from '../json-macro-arrays.mjs';
import {createJsonMacroContext,assertJsonMacroCall,assertJsonEmptyArrayCall,configureJsonMacroParser,sealJsonMacroCall} from '../json-macro-context.mjs';
import {parseRust,HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {parseJsonMacroSyntax} from '../json-macro-syntax.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {serde_json_to_string} from '../extensions/json-runtime.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=()=>loadJsonMacroSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,jsonMacroDependencies:dependencies()});
const collect=(node,predicate,result=[])=>{if(node&&typeof node==='object'){if(predicate(node))result.push(node);for(const [key,value]of Object.entries(node))if(!['type','jsonMacroProof','contract'].includes(key)){if(Array.isArray(value))value.forEach(item=>collect(item,predicate,result));else collect(value,predicate,result);}}return result;};
const native=value=>{const encoded=serde_json_to_string(value);assert.equal(encoded.$,'Ok');return JSON.parse(encoded.field0);};

test('empty original alloc vec rule and RawVec sources stay sealed without broad effect authority',()=>{
  const proof=jsonEmptyArraySources(dependencies());assert.equal(isJsonEmptyArraySources(proof),true);assert.equal(isJsonEmptyArraySources(structuredClone(proof)),false);
  assert.equal(proof.emptyVecExpansion.rule,0);assert.equal(proof.emptyVecExpansion.ownerVerified,false);
  assert.equal(proof.emptyArrayContractAvailable,true);assert.equal(proof.nonemptyArrayContractAvailable,false);
  assert.equal(proof.sources.some(pin=>pin.sourcePath==='library/alloc/src/raw_vec/mod.rs'),true);
  assert.match(proof.allocation,/no.*heap|none/u);assert.match(proof.nonemptyObligation,/allocation before.*allocator/u);
  for(const key of ['namespaceAuthority','expansionAuthority','runtimeParity','generatedTraitBehavior','applicationEffectCompleteness'])assert.equal(proof[key],false,key);
  assert.throws(()=>jsonEmptyArraySources(structuredClone(dependencies())),/sealed/);
});

test('empty arrays and literal-key nested empty arrays execute both targets under bounded projection semantics',async()=>{
  // A call-site vec macro cannot replace the definition-site alloc vec owner.
  const source='use serde_json::{Value,json}; macro_rules! vec{()=>{false}} pub fn empty()->Value{json!([])} pub fn nested()->Value{json!({"β":[],"nested":{"empty":[]}})}';
  const result=project(source);assert.equal(result.meta.refused.some(item=>['empty','nested'].includes(item.name)),false);
  await verifyTypedTargets(result,translated=>{assert.deepEqual(native(translated.empty()),[]);assert.deepEqual(native(translated.nested()),{β:[],nested:{empty:[]}});});
  const nodes=collect(result.meta.checkedSemanticProgram.program,node=>node.k==='routerJsonMacro');assert.equal(nodes.length>=2,true);
  for(const node of nodes){assert.equal(node.jsonMacroProof.projectionSemanticsOnly,true);assert.equal(node.jsonMacroProof.applicationEffectCompleteness,false);assert.equal(node.jsonMacroProof.runtimeParity,false);assert.equal(node.jsonMacroProof.remainingEffectObligations.length>0,true);assert.equal(node.jsonMacroProof.arrayObligations.every(entry=>entry.empty&&entry.runtimeAvailable),true);}
});

test('nonempty syntax retains original array spans and allocator obligation without executable admission',()=>{
  const source='use serde_json::{Value,json}; pub fn rejected()->Value{json!([true,{"empty":[]}])} fn main(){}',context=createJsonMacroContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies:dependencies(),compilationProfile:PRODUCTION_PROFILE});
  const parsed=parseRust(source,{jsonMacroContext:context,jsonMacroModule:{file:'src/lib.rs'}}),node=collect(parsed,item=>item.k==='routerJsonMacro')[0];assert.ok(node);
  const proof=assertJsonMacroCall(node.jsonMacroProof);assert.equal(assertJsonEmptyArrayCall(proof).emptyArrayContractAvailable,true);
  assert.deepEqual(proof.arrayObligations.map(entry=>({text:source.slice(entry.span.start,entry.span.end),available:entry.runtimeAvailable})),[{text:'[true,{"empty":[]}]',available:false},{text:'[]',available:true}]);
  assert.throws(()=>assertJsonEmptyArrayCall(structuredClone(proof)),/private/);
  const parser=configureJsonMacroParser(new HostRustParser(tokenizeRust(source)),context,{file:'src/lib.rs'}),{start,end}=node.span;
  const copiedSyntax=structuredClone(parseJsonMacroSyntax(source.slice(start,end)));copiedSyntax.value.items=[];
  assert.throws(()=>sealJsonMacroCall(parser,{segments:['json'],start,end,syntax:copiedSyntax}),/private original/);
  const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='rejected'),false);
  assert.match(JSON.stringify(result.meta.refused),/allocation.*precedes|allocation effects/u);
});

test('empty construction does not grant custom roots Serialize Drop Deref or unknown feature profiles',()=>{
  for(const source of [
    'mod alloc {} use serde_json::{Value,json}; pub fn rejected()->Value{json!([])}',
    'use serde_json::Value; macro_rules! json{($($t:tt)*)=>{false}} pub fn rejected()->Value{json!([])}',
    'use serde_json::{Value,json}; struct Custom; impl Drop for Custom{fn drop(&mut self){}} pub fn rejected(value:Custom)->Value{json!(value)}',
    'use serde_json::{Value,json}; struct Custom; impl std::ops::Deref for Custom{type Target=Value;fn deref(&self)->&Value{loop{}}} pub fn rejected(value:Custom)->Value{json!(value)}',
    'use serde_json::{Value,json}; pub fn rejected(value:&[u8])->Value{json!(value)}',
    'use serde_json::{Value,json}; pub fn rejected(value:&Value)->Value{json!([value])}',
    '#[unknown] struct Expand; use serde_json::{Value,json}; pub fn rejected()->Value{json!([])}',
  ])assert.equal(project(source).meta.executable.some(item=>item.name==='rejected'),false,source);
  assert.throws(()=>createJsonMacroContext({modules:[{file:'src/lib.rs',path:[],source:'use serde_json::{Value,json};'}],dependencies:dependencies(),compilationProfile:{flags:{no_global_oom_handling:true}}}),/no-global-OOM/);
});

test('whole unchanged production array sources retain contextual prerequisites and original source pins',()=>{
  const receipt=JSON.parse(readFileSync(new URL('../fixtures/json-macro-frontier/array-original.json',import.meta.url),'utf8'));
  for(const row of [receipt,...receipt.additionalOriginals]){
    const source=readFileSync(new URL(row.file,root),'utf8');assert.equal(hash(source),row.fileSha256);assert.equal(hash(source.slice(row.span.start,row.span.end)),row.functionSha256);
    const result=translateProject({entry:row.file,paths:[row.file],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,jsonMacroDependencies:dependencies()});
    assert.equal(result.meta.executable.some(item=>item.name===row.function),false);assert.equal(result.meta.runtimeParity,false);
    assert.equal(row.originalFunctionExecuted,false);assert.equal(row.sourceBodyRewritten,false);
  }
});
