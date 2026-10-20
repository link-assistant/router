// Test-only source snapshots. No original16/default CSV API or compiler proof
// is reused. Every ordinary compilation checks these complete strings afresh.
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {repositoryCratePaths} from './fixtures/repository-paths.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {staticSourceAssociatedContext,staticSourceAssociatedTextData} from './real-source-fixtures.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const fail=message=>{throw new TypeError('Associated original source data: '+message);};
export function associatedOriginalInputs(id){return staticSourceAssociatedContext(id);}
export function associatedOriginalSourceReader(id){
 let context;
 return path=>{context??=staticSourceAssociatedTextData(id);if(!context.association.parents.some(row=>row.path===path))fail('path is outside the explicit old parent association');return context.source(path);};
}
export function associatedOriginalFileReader(id){
 const source=associatedOriginalSourceReader(id);
 return function(path,encoding){if(!(path instanceof URL)||encoding!=='utf8'||arguments.length>2)fail('one original source URL and UTF8 required');const file=fileURLToPath(path),relative=file.startsWith(root)?file.slice(root.length):null;if(!relative||resolve(root,relative)!==file)fail('source URL escapes the repository');return source(repositoryCratePaths([relative],root)[0]);};
}
export function associatedOriginalDependencyInputs(context){return {manifest:context.source('Cargo.toml'),lock:context.source('Cargo.lock')};}
export function associatedOriginalProject(id,entry){
 const data=associatedOriginalInputs(id),{manifest,lock}=associatedOriginalDependencyInputs(data),paths=data.inputs.sources.filter(row=>row.source.endsWith('.rs')).map(row=>row.source);
 if(!paths.includes(entry))fail('original project entry is not in its complete universe');
 return {paths,manifest,lock,inputs:data.inputs,association:data.association,result:translateProject({entry,paths,readSource:data.source,cargoManifest:manifest,deriveDependencies:loadDeriveDependencyProof({manifest,lock}),jsonMacroDependencies:loadJsonMacroSourceProof({manifest,lock}),compilationProfile:data.inputs.compilationProfile})};
}
let csvContext;
export function associatedOriginalCsvContext(){
 if(csvContext)return csvContext;
 const data=associatedOriginalInputs('csv-original-source.test.mjs'),{manifest,lock}=associatedOriginalDependencyInputs(data),paths=Object.freeze(data.inputs.sources.filter(row=>row.source.endsWith('.rs')).map(row=>row.source)),inputs=Object.freeze({...data.inputs,association:data.association,scope:data.scope});
 const directory=process.env.ROUTER_ORIGINAL_CSV_VECTORS;
 let attempted=false,failed=false,result,failure;
 csvContext=Object.freeze({source:data.source,inputs,get result(){
  if(!attempted){attempted=true;try{result=translateProject({entry:inputs.entry,paths,readSource:data.source,cargoManifest:manifest,compilationProfile:inputs.compilationProfile,deriveDependencies:loadDeriveDependencyProof({manifest,lock})});if(directory){mkdirSync(directory,{recursive:true});writeJsonGzip(join(directory,'associated-inputs.json.gz'),inputs);writeJsonGzip(join(directory,'associated-meta.json.gz'),result.meta);writeFileSync(join(directory,'associated-result.js'),result.javascript,{flag:'wx'});writeFileSync(join(directory,'associated-result.ts'),result.typescript,{flag:'wx'});}}catch(error){failed=true;failure=error;if(directory){mkdirSync(directory,{recursive:true});writeJsonGzip(join(directory,'associated-failure.json.gz'),{inputs,error:{name:error.name,message:error.message,stack:error.stack}});}}}
  if(failed)throw failure;return result;
 }});return csvContext;
}

// The returned closure is created in this separate module-level factory.
// Its only per-call captured object is the already selected own string table.
function associatedSourceProjection(sources){
 return path=>{if(!Object.hasOwn(sources,path))fail('path is outside the projected original parents/Cargo');return sources[path];};
}
export function associatedOriginalParentInputs(id){
 const context=staticSourceAssociatedTextData(id),sources=Object.create(null);
 for(const path of [...context.association.parents.map(row=>row.path),'Cargo.toml','Cargo.lock']){
  if(Object.hasOwn(sources,path))fail('duplicate projected original path');
  sources[path]=context.source(path);
 }
 return Object.freeze({source:associatedSourceProjection(Object.freeze(sources))});
}
