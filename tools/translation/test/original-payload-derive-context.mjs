// Test-only complete original composition shared by payload derive regressions.
// Capture source inputs only: never ask originalCsvContext to translate them.
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {originalCsvContext} from './original-csv-context.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {captureJsonSerializationSources,jsonSerializationExternalModule} from '../serialization-schema/json-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
let attempted=false,captured,failure;
function retain(name,value){
 const directories=new Set([process.env.ROUTER_PAYLOAD_DERIVE_VECTOR_DIR,process.env.ROUTER_EQ_PAYLOAD_VECTOR_DIR].filter(Boolean));
 for(const directory of directories){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,'original-payload-'+name+'.json'),JSON.stringify(value),{flag:'wx'});}
}
function originalContext(){
 if(attempted){if(failure)throw failure;return captured;}attempted=true;
 try{
  const corpus=originalCsvContext(),inputs=corpus.inputs,manifest=corpus.source('Cargo.toml'),lock=corpus.source('Cargo.lock'),paths=inputs.sources.map(row=>row.source).filter(path=>path.endsWith('.rs'));
  retain('complete-inputs',{inputs,sources:inputs.sources.map(row=>({...row,content:corpus.source(row.source)}))});
  const graph=resolveModuleGraph({entry:inputs.entry,paths,readSource:corpus.source,compilationProfile:inputs.compilationProfile});
  retain('complete-graph',{inputs,graph});
  const dependencies=loadDeriveDependencyProof({manifest,lock}),json=captureJsonSerializationSources({manifest,lock,deriveDependencies:dependencies,compilationProfile:inputs.compilationProfile}),externalModules=new Map([['serde_json',jsonSerializationExternalModule(json)]]);
  // Match the actual schema capture order: the genuine JSON export table is
  // part of the original composition BEFORE the private derive issuer runs.
  const context=createDeriveFootprintContext({modules:graph.modules,dependencies,externalModules,compilationProfile:inputs.compilationProfile});
  retain('complete-derive',{inputs,json,externalModules:[...externalModules],context});
  captured={corpus,inputs,graph,dependencies,json,context};return captured;
 }catch(error){failure=error;throw error;}
}
export function originalPayloadDeriveSelection({file,name,owner}){
 const state=originalContext(),source=state.corpus.source(file),modules=state.graph.modules.filter(module=>module.file===file),certificates=state.context.certificates.filter(row=>row.source===file&&row.name===name);
 if(!modules.length||modules.some(module=>module.source!==source)||certificates.length!==1)throw new TypeError('Original payload derive requires its unique complete graph module/certificate: '+file+'::'+name);
 const certificate=certificates[0],invocations=certificate.attributes.filter(attribute=>attribute.name==='derive').flatMap(attribute=>attribute.derives.filter(path=>path.length===1&&path[0]===owner).map(path=>({path,attributeSpan:attribute.span})));
 if(certificate.sourceSha256!==hash(source)||invocations.length!==1)throw new TypeError('Original payload derive requires its unique original source/owner invocation: '+file+'::'+name+'::'+owner);
 return {context:state.context,certificate,invocation:invocations[0]};
}
export function originalPayloadDeriveInputs(){return originalContext().inputs;}
