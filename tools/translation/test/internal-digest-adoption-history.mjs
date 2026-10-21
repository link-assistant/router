// Receiving history DATA only. Every current digest operation still executes
// the actual complete module; this capture grants no compiler or source permit.
import {types} from 'node:util';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {PRIVATE_METADATA_DIGEST_SOURCE_PATHS,restorePrivateMetadataDigestSources,proposePrivateMetadataDigestSources} from '../migrate-private-metadata-digests.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const marker='\n\n// Private internal-source digest copy; derived from the complete 645 kernel.\n';
const fail=message=>{throw new TypeError('Complete internal digest adoption history: '+message);};
function concrete(source){const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);if(transportConcreteSyntaxMeta(wire).source!==source)fail('whole source CST differs');return wire;}
export function internalDigestAdoptionHistory(input){
 if(!input||typeof input!=='object'||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('ordinary own source record required');
 const keys=Reflect.ownKeys(input),fields=Object.getOwnPropertyDescriptors(input),sources={};
 if(keys.length!==3||keys.some(path=>!PRIVATE_METADATA_DIGEST_SOURCE_PATHS.includes(path)))fail('exact complete source set required');
 for(const path of PRIVATE_METADATA_DIGEST_SOURCE_PATHS){const field=fields[path];if(!field||!Object.hasOwn(field,'value')||!field.enumerable||typeof field.value!=='string'||field.value.length>524288)fail('bounded primitive source fields required');sources[path]=field.value;}
 const path=PRIVATE_METADATA_DIGEST_SOURCE_PATHS[0],source=sources[path],ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'history:native-complete-adopted-kernel',apply:()=>{
   const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete current grammar failed');
   const selected=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createOriginalDigestMetadataCopierForInternalSources');if(selected.length!==1)fail('one complete actual adopted factory required');
   const node=selected[0],at=source.indexOf(marker);if(at<0||source.indexOf(marker,at+1)!==-1||at+marker.length!==node.getStart(file)||source[node.end]!=='\n')fail('exact original adoption boundary required');
   const end=node.end+1,adoptionSources={...sources,[path]:source.slice(0,end)},before=restorePrivateMetadataDigestSources(adoptionSources),proposal=proposePrivateMetadataDigestSources(before);
   for(const row of proposal.rows)if(row.after.source!==adoptionSources[row.file])fail('complete original three-source producer equation differs');
   return {path,source,adoptionSources,before,proposal,span:[node.getStart(file),node.end],suffixSpan:[end,source.length],suffix:source.slice(end)};
  }}]},
  {phase:'repository',rules:[{id:'history:retain-every-later-source-byte-and-inverse',apply:row=>{
   const adoptionSource=row.adoptionSources[path],restored=adoptionSource+row.suffix;if(restored!==source)fail('whole current source inverse differs');
   const documents=Object.entries(sources).map(([path,source])=>({path,source,meta:concrete(source)}));
   return {...row,documents,adoptionMeta:concrete(adoptionSource),inverse:restored,compilerAuthority:false,scope:'Exact original adoption equation plus every later appended source byte; current runtime tests execute the complete actual module.'};
  }}]},
 ]);
 const result=pipeline.run(null);return {...result.value,trace:result.trace};
}
