// Inspection DATA only. Original attributes remain in every emitted proposal.
import {createEnclosingCoreAdoptionProducerContext,coreAdoptionProducerClosedAttributeSpans,finishCoreAdoptionProducerContext} from './core-adoption-producer-context.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
const fail=message=>{throw new TypeError('Source-backed formatting inspection: '+message);};
export function createSourceBackedFormattingInspection(graph,dependencyInputs){
 const modules=graph.modules,originals=modules.map(module=>({module,source:module.source,file:module.file,path:JSON.stringify(module.path),view:module.sourceView,condition:module.configurationCondition}));
 const context=createEnclosingCoreAdoptionProducerContext({modules,compilationProfile:graph.compilationProfile,dependencyInputs}),inspections=new Map();
 function verify(){if(modules.length!==originals.length||originals.some((row,at)=>modules[at]!==row.module||row.module.source!==row.source||row.module.file!==row.file||JSON.stringify(row.module.path)!==row.path||row.module.sourceView!==row.view||row.module.configurationCondition!==row.condition))fail('complete original module graph changed');}
 function inspect(path,source){
  verify();if(inspections.has(path)){const row=inspections.get(path);if(row.before.source!==source)fail('same physical source has different original bytes');return row;}
  const owners=modules.filter(module=>module.file===path);if(!owners.length||owners.some(module=>module.source!==source))fail('inspection source has no complete original module association');
  if(owners.some(module=>originalSourceModuleItems(module).some(item=>item.term==='opaque'&&item.tokens.some(token=>token.text==='!'||token.text.endsWith('!')))))fail('unknown original module macro producer');
  const selected=owners.flatMap(module=>coreAdoptionProducerClosedAttributeSpans(context,module)),unique=new Map();
  for(const row of selected){const key=JSON.stringify(row.span),previous=unique.get(key);if(previous&&JSON.stringify(previous)!==JSON.stringify(row))fail('original attribute associations differ');unique.set(key,row);}
  const attributes=[...unique.values()].sort((left,right)=>left.span[0]-right.span[0]),edits=attributes.map(row=>({span:row.span,expected:row.expected,replacement:row.expected.replace(/[^\r\n]/g,' ')}));
  for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('original producer attributes overlap or differ');
  const before=transportConcreteSyntaxSource(source,{language:'Rust'}),run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'rust:inspect-only-original-producer-closed-attributes',edits}],repositoryRules:[{id:'router:retain-original-attributes-in-formatting-proposals',edits:[]}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(run.value));
  let inverse=after.source;for(const edit of [...edits].reverse()){if(inverse.slice(...edit.span)!==edit.replacement)fail('inspection inverse association changed');inverse=inverse.slice(0,edit.span[0])+edit.expected+inverse.slice(edit.span[1]);}if(inverse!==source)fail('complete inspection inverse differs');
  const row={path,before:{source,meta:before.meta},after:{source:after.source,meta:after.meta},attributes,edits,inverse,trace:run.trace,sourceInspectionOnly:true,executableAdmission:false};inspections.set(path,row);return row;
 }
 return {forModule(path,scope){
  const owner=modules.find(module=>module.file===path);if(!owner)fail('original formatter source absent');
  const source=inspect(path,owner.source).after.source,rootSource=scope.ancestors.map(row=>inspect(row.path,row.source).after.source).join('\n'),macroUseSources=Object.create(null);
  for(const row of scope.macroUseOrigins){const normalized=inspect(row.path,row.source).after.source;if(Object.hasOwn(macroUseSources,row.name)&&macroUseSources[row.name]!==normalized)fail('macro import inspection origins differ');macroUseSources[row.name]=normalized;}
  return {source,rootSource,macroUseSources};
 },finish(){verify();return {producerEffects:finishCoreAdoptionProducerContext(context),bindingInspections:[...inspections.values()]};}};
}
