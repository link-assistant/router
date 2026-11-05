// Explicit source-expanded project entry. Default project APIs stay unchanged.
import {types} from 'node:util';
import {proposeTrackedLocalDeclarativeSources} from './tracked-local-declarative-source.mjs';
import {translateProjectWithFlatEnclosingSemanticMeta} from './project.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const need=(value,message)=>{if(!value)throw new TypeError('Local declarative project: '+message);};
const path=value=>{need(typeof value==='string'&&value.endsWith('.rs')&&!/[\\\0:]/u.test(value)&&value.split('/').every(part=>part&&part!=='.'&&part!=='..'),'repository-relative Rust source path required');return value;};

export function translateTrackedLocalDeclarativeProject(options){
 need(options&&typeof options==='object'&&!types.isProxy(options)&&Object.getPrototypeOf(options)===Object.prototype,'ordinary explicit project options required');
 const allowed=new Set(['entry','paths','readSource','compilationProfile','jsonMacroDependencies','deriveDependencies','cargoManifest']),fields=Object.getOwnPropertyDescriptors(options);
 for(const key of Reflect.ownKeys(fields))need(typeof key==='string'&&allowed.has(key)&&Object.hasOwn(fields[key],'value'),'unknown or accessor project option');const input=Object.fromEntries(Object.entries(fields).map(([key,row])=>[key,row.value]));
 const entry=path(input.entry);need(Array.isArray(input.paths)&&!types.isProxy(input.paths)&&Object.getPrototypeOf(input.paths)===Array.prototype&&input.paths.length>0&&input.paths.length<=4096,'bounded complete source universe required');
 const array=Object.getOwnPropertyDescriptors(input.paths);need(Reflect.ownKeys(array).length===input.paths.length+1,'dense ordinary source paths required');const paths=[];
 for(let index=0;index<input.paths.length;index++){need(array[index]&&Object.hasOwn(array[index],'value'),'own source path required');paths.push(path(array[index].value));}
 need(new Set(paths).size===paths.length&&paths.includes(entry)&&typeof input.readSource==='function'&&!types.isProxy(input.readSource),'unique source universe including entry and ordinary reader required');
 const originals=new Map();let bytes=0;for(const name of paths){const source=input.readSource(name);need(typeof source==='string'&&Buffer.byteLength(source)<=8388608&&!/\p{Surrogate}/u.test(source),'bounded well-formed complete Rust source required');bytes+=Buffer.byteLength(source);need(bytes<=134217728,'complete original project byte budget');originals.set(name,source);}
 const current=()=>{for(const [name,source]of originals)need(input.readSource(name)===source,'complete original source changed during the proposal');};
 let proposals,expanded,compiled,moduleExpansion;
 const result=createRulePipeline([
  {phase:'language',rules:[
   {id:'attributed-scoped-local-declarative-project:propose-complete-original-source-substitutions',apply:()=>{
    current();moduleExpansion=proposeTrackedLocalDeclarativeSources({entry,paths,readSource:name=>{need(originals.has(name),'source expander requested uncaptured original');return originals.get(name);},compilationProfile:input.compilationProfile});proposals=moduleExpansion.files;expanded=new Map();let retained=0;for(const proposal of proposals){const source=originals.get(proposal.sourcePath);need(proposal.before===source&&proposal.history.inverse===source,'full original source proposal join');retained+=Buffer.byteLength(source)+Buffer.byteLength(proposal.after);need(retained<=201326592,'complete original and expanded raw-source budget');expanded.set(proposal.sourcePath,proposal.after);}need(expanded.size===originals.size,'every complete original physical source proposal required');current();return proposals;
   }},
   {id:'attributed-scoped-local-declarative-project:original-frontend-checked-meta-roundtrip-and-target-emission',apply:()=>{
    current();compiled=translateProjectWithFlatEnclosingSemanticMeta({entry,paths,readSource:name=>{need(expanded.has(name),'compiler requested uncaptured source');return expanded.get(name);},compilationProfile:input.compilationProfile,jsonMacroDependencies:input.jsonMacroDependencies,deriveDependencies:input.deriveDependencies,cargoManifest:input.cargoManifest});current();return compiled;
   }},
  ]},
  {phase:'repository',rules:[{id:'router:package-original-and-expanded-source-domains-separately',apply:()=>{
   current();return {...compiled,sourceExpansion:{schema:'tracked-local-declarative-project-source-expansion-v1',entry,sourceInputs:[...originals].map(([path,source])=>({path,source})),proposals,moduleExpansion,compilerSourceDomain:'expanded-source',originalSourceEquivalenceQualified:false,originalApplicationCoverageQualified:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeParity:false,crossInvocationCache:false,receivingExecuted:false}};
  }}]},
 ]).run(null);current();return {...result.value,sourceExpansion:{...result.value.sourceExpansion,ruleTrace:result.trace}};
}
