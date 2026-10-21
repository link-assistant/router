import {createSourceBackedFormattingInspection as createOriginalSourceBackedFormattingInspection} from './source-backed-formatting-support.mjs';
import {createWholeOwnerCoreCorpusInspectionData,wholeOwnerCoreCorpusInspectionReady} from './whole-owner-core-corpus-inspection-data.mjs';
import {wholeOwnerCoreProducerInputsCallbackFree} from './whole-owner-core-producer-inputs.mjs';
import {originalAttributeOwnerBulkCryptoReady} from './attribute-owner-bulk-crypto.mjs';
// Inspection DATA only. Original attributes remain in every emitted proposal.
import {createEnclosingCoreAdoptionProducerContext,coreAdoptionProducerClosedAttributeSpans,finishCoreAdoptionProducerContext} from './core-adoption-producer-context.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
const fail=message=>{throw new TypeError('Source-backed formatting inspection: '+message);};
export function createSourceBackedFormattingInspection(graph,dependencyInputs){
 if(!wholeOwnerCoreCorpusInspectionReady()||!wholeOwnerCoreProducerInputsCallbackFree({modules:graph.modules,compilationProfile:graph.compilationProfile,dependencyInputs}))return createOriginalSourceBackedFormattingInspection(graph,dependencyInputs);

 const modules=graph.modules,originals=modules.map(module=>({module,source:module.source,file:module.file,path:JSON.stringify(module.path),view:module.sourceView,condition:module.configurationCondition}));
 let capture;try{capture=createWholeOwnerCoreCorpusInspectionData(graph,dependencyInputs);}catch(error){if(!(error instanceof TypeError)||!originalAttributeOwnerBulkCryptoReady())throw error;return createOriginalSourceBackedFormattingInspection(graph,dependencyInputs);}const inspections=new Map();
 function verify(){if(modules.length!==originals.length||originals.some((row,at)=>modules[at]!==row.module||row.module.source!==row.source||row.module.file!==row.file||JSON.stringify(row.module.path)!==row.path||row.module.sourceView!==row.view||row.module.configurationCondition!==row.condition))fail('complete original module graph changed');}
 function inspect(path,source){
  verify();if(inspections.has(path)){const row=inspections.get(path);if(row.before.source!==source)fail('same physical source has different original bytes');return row;}
  const owners=modules.filter(module=>module.file===path);if(!owners.length||owners.some(module=>module.source!==source))fail('inspection source has no complete original module association');
  const inactiveCandidates=[];
  for(const module of owners){
   if(module.configurationCondition==='inactive')continue;
   for(const item of originalSourceModuleItems(module)){
    const condition=itemConfiguration(item.tokens,graph.compilationProfile);
    if(condition.status==='inactive'){inactiveCandidates.push({span:[item.start,item.end],expected:source.slice(item.start,item.end),module:[...module.path],sourceViewDigest:module.sourceView?.digest??null,condition});continue;}
    if(item.term==='opaque'&&item.tokens.some(token=>token.text==='!'||token.text.endsWith('!')))fail('unknown original module macro producer');
   }
  }
  const inactiveItems=[];for(const row of inactiveCandidates.sort((left,right)=>left.span[0]-right.span[0]||right.span[1]-left.span[1])){const previous=inactiveItems.at(-1);if(previous&&row.span[0]<previous.span[1]){if(row.span[1]>previous.span[1])fail('inactive original source spans overlap');continue;}inactiveItems.push(row);}
  const selected=owners.flatMap(module=>capture.attributes(module)),unique=new Map();
  for(const row of selected){const key=JSON.stringify(row.span),previous=unique.get(key);if(previous&&JSON.stringify(previous)!==JSON.stringify(row))fail('original attribute associations differ');unique.set(key,row);}
  const attributes=[...unique.values()].filter(row=>!inactiveItems.some(item=>row.span[0]>=item.span[0]&&row.span[1]<=item.span[1])).sort((left,right)=>left.span[0]-right.span[0]),edits=[...attributes,...inactiveItems].sort((left,right)=>left.span[0]-right.span[0]).map(row=>({span:row.span,expected:row.expected,replacement:row.expected.replace(/[^\r\n]/g,' ')}));
  for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('original producer attributes overlap or differ');
  const before=transportConcreteSyntaxSource(source,{language:'Rust'}),run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'rust:inspect-original-closed-producers-and-inactive-items',edits}],repositoryRules:[{id:'router:retain-original-attributes-and-items-in-formatting-proposals',edits:[]}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(run.value));
  let inverse=after.source;for(const edit of [...edits].reverse()){if(inverse.slice(...edit.span)!==edit.replacement)fail('inspection inverse association changed');inverse=inverse.slice(0,edit.span[0])+edit.expected+inverse.slice(edit.span[1]);}if(inverse!==source)fail('complete inspection inverse differs');
  const row={path,before:{source,meta:before.meta},after:{source:after.source,meta:after.meta},attributes,inactiveItems,edits,inverse,trace:run.trace,sourceInspectionOnly:true,executableAdmission:false};inspections.set(path,row);return row;
 }
 return {forModule(path,scope){
  const owner=modules.find(module=>module.file===path);if(!owner)fail('original formatter source absent');
  const source=inspect(path,owner.source).after.source,rootSource=scope.ancestors.map(row=>inspect(row.path,row.source).after.source).join('\n'),macroUseSources=Object.create(null);
  for(const row of scope.macroUseOrigins){const normalized=inspect(row.path,row.source).after.source;if(Object.hasOwn(macroUseSources,row.name)&&macroUseSources[row.name]!==normalized)fail('macro import inspection origins differ');macroUseSources[row.name]=normalized;}
  return {source,rootSource,macroUseSources,inactiveItemSpans:inspect(path,owner.source).inactiveItems.map(row=>[...row.span])};
 },finish(){try{verify();return {producerEffects:capture.effects(),bindingInspections:[...inspections.values()]};}finally{capture.close();}}};
}
