// Complete receiving source proposal DATA only. No file installation or owner
// qualification follows from a module edge, spelling, source hash or inverse.
import {withFreshOwnedTextVectorInputs} from './fresh-owned-text-vector-inputs.mjs';
import {ownedTextVectorReceivingConfiguration} from './owned-text-vector-receiving-paths.mjs';
import {crateEntrySourcePath} from './repository-layout.mjs';
import {sourceItems} from './rust-structure.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
const fail=message=>{throw new TypeError('Owned text vector root source: '+message);};
export function proposeOwnedTextVectorRootSource(source,options={}){
 const {entry,runtimeRoot,declarationRoot}=ownedTextVectorReceivingConfiguration(options);
 if(typeof source!=='string'||Buffer.byteLength(source)>2097152||entry===crateEntrySourcePath(entry,'src/translation_owned_text_vectors_core.rs'))fail('complete bounded distinct original root required');
 return withFreshOwnedTextVectorInputs(frame=>withSourceInputValidation(()=>{
  const module='translation_owned_text_vectors_core',items=sourceItems(source),edges=items.filter(item=>item.term==='mod'&&item.name===module);
  if(edges.length>1||items.some(item=>['use','struct','enum','union','trait','type'].includes(item.term)&&item.tokens.some(token=>token.text===module)))fail('ambiguous receiving root declaration/import');
  if(edges.length&&source.slice(edges[0].start,edges[0].end).trim()!=='pub mod '+module+';')fail('configured or private existing edge needs its separate original source rule');
  const missing=edges.length===0,language=source+(missing?'\nmod '+module+';\n':''),after=source+(missing?'\npub mod '+module+';\n':''),original=transportConcreteSyntaxSource(source,{language:'Rust'});
  if(transportConcreteSyntaxMeta(original.meta).source!==source)fail('whole original root CST inverse differs');
  const result=applyConcreteSyntaxSubstitutions(original.document,{languageRules:[{id:'language:construct-only-the-required-owned-String-vector-module-edge',edits:missing?[{span:[0,source.length],expected:source,replacement:language}]:[]}],repositoryRules:[{id:'router:publish-the-explicit-receiving-owned-text-core-edge',edits:missing?[{span:[0,language.length],expected:language,replacement:after}]:[]}]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(result.value)).source!==after)fail('whole receiving root CST reconstruction differs');
  const histories=transportConcreteSourceEquations([{before:source,after:language,language:'Rust'},{before:language,after,language:'Rust'}]);if(histories[0].inverse!==source||histories[1].inverse!==language)fail('whole root language/repository inverse differs');
  const files=[{path:entry,before:source,after,inverse:source,histories}],seen=new Set([entry]);
  for(const row of frame.sources){if(row.path==='owned-text-vector-contracts.mjs')continue;const paths=row.language==='Rust'?[crateEntrySourcePath(entry,row.path)]:[...new Set([runtimeRoot+'/'+row.path,declarationRoot+'/'+row.path])];for(const path of paths){if(seen.has(path))fail('receiving source path collision');seen.add(path);files.push({path,source:row.source,repositoryOrigin:row.repositoryPath,language:row.language,concreteSyntax:row.concreteSyntax,inverse:row.source});}}
  return {schema:'owned-text-vector-root-source-proposal-v1',files,sourceInputs:frame.sources,configuration:{entry,runtimeRoot,declarationRoot},alreadyPresent:!missing,missingModules:missing?[module]:[],ruleTrace:result.trace,sourceInstalled:false,nativeRootActivated:false,privateCallerBindingQualified:false,nativeTypeOwnerQualified:false,originalBodyEquivalenceQualified:false,sourceAuthority:false,namespaceAuthority:false,semanticAuthority:false,runtimeAuthority:false,receivingExecuted:false,rustExecuted:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false};
 }));
}
