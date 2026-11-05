// Independent ordinary alias source cases. All UNRUN during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {ordinaryTypeAliasDeclarationSource} from '../local-type-alias-declaration-source.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {originalUseDeclarationLeaves} from '../module-bindings.mjs';
import {createLiteralTextImportRoles as ordinaryRoles} from '../literal-text-import-roles.mjs';
import {createLiteralTextImportRoles as boundRoles} from '../source-bound-owned-literal-text-import-roles.mjs';
import {createSourceBoundToolAwareCoreAdoptionProducerContext,createSourceBoundToolAwareCoreAdoptionNonTraitImportSelector,finishSourceBoundToolAwareCoreAdoptionProducerContext} from '../core-adoption-producer-context.mjs';
import {proposeCoreLiteralTextCorpus as ordinaryAdopt} from '../migrate-core-literal-text.mjs';
import {proposeCoreLiteralTextCorpus as boundAdopt} from '../source-bound-owned-migrate-core-literal-text.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {prepareLocalTypeAliasSources} from '../prepare-local-type-alias-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const text='pub fn answer()->String{"ordinary alias Ω😀".to_owned()}',base={'src/lib.rs':'pub mod translation_core;mod model;mod consumer;','src/model.rs':'pub type Error = Box<dyn std::error::Error + Send + Sync>;pub type Values<T = Vec<u8>> = Vec<T>;','src/consumer.rs':'use crate::model::{Error,Values};'+text,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE};
function graph(files=base){return resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});}
function selected(g){const module=g.modules.find(row=>row.file==='src/consumer.rs'),item=originalSourceModuleItems(module).find(row=>row.term==='use');return {module,item,leaves:originalUseDeclarationLeaves(item,module.path)};}
function inverse(row){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let value=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution'){assert.equal(value.slice(...part.after),part.replacement);value=value.slice(0,part.after[0])+part.expected+value.slice(part.after[1]);}assert.equal(value,row.before.source);assert.equal(row.executableAdmission,false);}

test('written ordinary aliases preserve generic defaults function types and dyn payloads as source DATA',limits,()=>{
 for(const source of ['type A = String;','pub(super) type A = Vec<(String, Option<String>)>;','pub type A<T> = Vec<T>;','type A<T = Vec<u8>> = Vec<T>;',"type A<'a> = &'a dyn Fn(&str) -> Option<String>;",'type A<const N:usize = {1 << 2}> = [u8;N];','type A = fn() -> String;']){const item=sourceItems(source).find(row=>row.term==='type'),result=ordinaryTypeAliasDeclarationSource(item,['model']);assert.equal(result.kind,'type',source);assert.equal(result.name,'A');assert.equal(result.aliasExpanded,false);assert.equal(result.namespaceComplete,false);assert.equal(result.semanticAuthority,false);assert.equal(result.executableAdmission,false);assert.equal(source.slice(...result.equalsSpan),'=');assert.ok(source.slice(...result.rhsSpan).trim());}
 for(const source of ['trait A {}','trait A = std::fmt::Debug;','struct A;','type A;','type A<T> where T:Copy = T;'])assert.equal(ordinaryTypeAliasDeclarationSource(sourceItems(source)[0]),null,source);
 const item=sourceItems('type A<T = Vec<u8>> = Vec<T>;')[0];assert.equal(ordinaryTypeAliasDeclarationSource({...item,tokens:item.tokens.filter(row=>row.text!=='=')}),null);assert.equal(ordinaryTypeAliasDeclarationSource({...item,tokens:Array(1025).fill(item.tokens[0])}),null);
});
for(const [label,make]of [['ordinary',ordinaryRoles],['source-bound',boundRoles]])test(label+' original graph alias imports retain exact declaration/source roles without Cargo-derived authority',limits,()=>{
 const g=graph(),{module,item,leaves}=selected(g),role=make(g.modules,null);for(const leaf of leaves){const result=role(module,item,leaf);assert.ok(result,leaf.name);assert.equal(result.namespaceComplete,false);assert.equal(result.originalDispatchProved,false);assert.equal(result.executableAdmission,false);assert.ok(JSON.stringify(result).includes('type'));}
});
test('private source-bound selector independently rejoins actual alias owners and refuses changed original graph',limits,()=>{
 const g=graph(),{module,item,leaves}=selected(g),context=createSourceBoundToolAwareCoreAdoptionProducerContext({modules:g.modules,dependencyInputs:cargo}),selector=createSourceBoundToolAwareCoreAdoptionNonTraitImportSelector({modules:g.modules,context});for(const leaf of leaves){const result=selector.select(module,item,leaf);assert.ok(result,leaf.name);assert.ok(result.roles.every(row=>row.kind==='type'&&row.declaration.original.includes('type ')));assert.equal(result.executableAdmission,false);}assert.equal(finishSourceBoundToolAwareCoreAdoptionProducerContext(context).semanticAuthority,false);const saved=module.source;try{module.source+=' ';assert.throws(()=>selector.verify(),TypeError);}finally{module.source=saved;}selector.verify();
});
for(const [label,adopt]of [['ordinary',ordinaryAdopt],['source-bound',boundAdopt]])test(label+' literal callers retain complete CST source inverses beside imported aliases',limits,async()=>{
 const proposal=adopt({entry:'src/lib.rs',files:{...base},dependencyInputs:cargo}),row=proposal.proposals.find(row=>row.file==='src/consumer.rs');assert.ok(row);inverse(row);assert.equal(row.importRoles.length,2);assert.equal(row.selections.length,1);assert.equal(proposal.after['src/model.rs'],base['src/model.rs']);
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path]}),declaration=result.executableDeclarations.find(row=>row.name==='answer');assert.ok(declaration,JSON.stringify(result.meta.refused));const emitted=declaration.lower().emitted,mapping=emitted.mappings.find(row=>row.source==='answer');assert.ok(mapping);await verifyTypedTargets({...result,javascript:result.javascript+'\nexport {'+mapping.target+' as aliasAnswer};',typescript:result.typescript+'\nexport {'+mapping.target+' as aliasAnswer};'},(_api,_result,module)=>assert.equal(module.aliasAnswer(),'ordinary alias Ω😀'),{childTimeoutMs:20000});
});
test('traits unknown producers conditional aliases and unreviewed alias headers remain unselected',limits,()=>{
 for(const declaration of ['pub trait Error {}','#[unknown]pub type Error = String;','#[cfg(unresolved)]pub type Error = String;','emit!();pub type Error = String;','pub type Error<T> where T:Copy = T;']){const files={...base,'src/model.rs':declaration,'src/consumer.rs':'use crate::model::Error;'+text},g=graph(files),{module,item,leaves}=selected(g),roles=boundRoles(g.modules,null);assert.equal(roles(module,item,leaves[0]),null,declaration);}
});
test('six complete compiler equations retain full originals two phases and exact source inverses',limits,()=>{
 const plan=prepareLocalTypeAliasSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
