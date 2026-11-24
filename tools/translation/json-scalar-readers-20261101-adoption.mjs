// Actual original producer composition, SOURCE UNRUN. Candidate equations do
// not issue old trait/standard-method/closure equivalence or semantic permits.
import {proposeCoreJsonFieldCorpus} from './source-bound-owned-migrate-core-json-fields.mjs';
import {proposeCorePrimitiveOptionMethodCorpus} from './source-bound-owned-migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus} from './source-bound-owned-migrate-core-primitive-option-callback-methods.mjs';
import {translateJsonScalarReadersProject} from './json-scalar-readers-20261101-project.mjs';
import {withJsonScalarReadersInstalledSources} from './json-scalar-readers-20261101-profile.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
const fail=message=>{throw TypeError('Owned scalar reader adoption: '+message);};
function request(value){accountData(value);const input=copyMetadata(value);if(!input||Object.keys(input).sort().join(',')!=='entry,files,lock,manifest'||!Array.isArray(input.files)||input.files.length<1||input.files.length>128||typeof input.manifest!=='string'||typeof input.lock!=='string')fail('original bounded fixture request required');const seen=new Set();let bytes=0;for(const row of input.files){if(!row||Object.keys(row).sort().join(',')!=='path,source'||typeof row.path!=='string'||!row.path.endsWith('.rs')||row.path.length>4096||row.path.startsWith('/')||/[:\\\x00\r\n]/u.test(row.path)||row.path.split('/').some(part=>!part||part==='.'||part==='..')||seen.has(row.path.toLowerCase())||typeof row.source!=='string'||/\p{Surrogate}/u.test(row.source)||Buffer.byteLength(row.source)>2097152)fail('unique complete ordinary Rust source images required');seen.add(row.path.toLowerCase());if((bytes+=Buffer.byteLength(row.source))>4194304)fail('unchanged four MiB fixture source bound');}if(!input.files.some(row=>row.path===input.entry))fail('actual original source entry required');return input;}
function checked(input,files){const dependencies={manifest:input.manifest,lock:input.lock};try{const result=translateJsonScalarReadersProject({entry:input.entry,paths:Object.keys(files),readSource:path=>{if(!Object.hasOwn(files,path))fail('uncaptured original source requested');return files[path];},cargoManifest:input.manifest,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),compilationProfile:PRODUCTION_PROFILE});const data={meta:result.meta,javascript:result.javascript,typescript:result.typescript};accountData(data);return {status:'checked-or-refused',...data};}catch(error){return {status:'hard-source-refusal',diagnostic:{name:error?.name??typeof error,message:String(error?.message??error)},metadataProduced:false};}}
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function deliver(event,consume,retained){accountData({event,retained});freeze(event);return withCompleteSourceClosingFence(()=>{const result=consume(event);accountData({event,result,retained});return null;},[]);}
export function proposeJsonScalarReaderAdoption(value,consume=()=>null){
 requireSynchronousSourceCallback(consume);const input=request(value),original=Object.fromEntries(input.files.map(row=>[row.path,row.source]));
 return withJsonScalarReadersInstalledSources(()=>{
  const sources=[],index=source=>{const known=sources.indexOf(source);if(known>=0)return known;if(sources.length>=256)fail('unchanged source version table bound');sources.push(source);return sources.length-1;},histories=[],reports=[],initial=checked(input,original);let current=original;
  const pipeline=createRulePipeline([
   {phase:'language',rules:[{id:'language:actual-original-field-Option-and-callback-source-producers',apply:()=>{
    for(const [name,proposer]of [['field',proposeCoreJsonFieldCorpus],['primitive-option',proposeCorePrimitiveOptionMethodCorpus],['primitive-option-callback',proposeCorePrimitiveOptionCallbackMethodCorpus]]){
     const fresh=proposer({entry:input.entry,files:current,compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{manifest:input.manifest,lock:input.lock}}),next=fresh.after;
     if(Object.keys(next).length!==Object.keys(current).length||Object.keys(current).some(path=>!Object.hasOwn(next,path)))fail('whole original module universe must remain intact');
     for(const path of Object.keys(current)){const before=current[path],after=next[path];if(typeof after!=='string'||Buffer.byteLength(after)>2097152)fail('complete source image bound');const history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after||history.trace.map(row=>row.phase).join(',')!=='language,repository')fail('whole source/CST/physical inverse differs');const row={phase:name,path,beforeVersion:index(before),afterVersion:index(after),inverseVersion:index(before),trace:history.trace};deliver({kind:'complete-native-adoption-equation',phase:name,path,history},consume,{sources,histories,reports});histories.push(row);accountData({sources,histories,reports});}
     // Original producers close their real source/module/type/import witnesses.
     // Their candidate graphs are never submitted as compiler permission.
     reports.push({phase:name,skipped:fresh.skipped,producerEffects:fresh.producerEffects??null,proposals:fresh.proposals.map(row=>({file:row.file,selections:row.selections,preserved:row.preserved}))});current=next;accountData({sources,histories,reports});
    }return null;
   }}]},
   {phase:'repository',rules:[{id:'repository:fresh-complete-owned-adoption-or-original-refusal',apply:()=>{
    const final=checked(input,current),changedRequest={...input,files:Object.entries(current).map(([path,source])=>({path,source}))};
    for(const [phase,result]of [['original',initial],['adopted',final]])if(result.meta)deliver({kind:'complete-project-admission-and-refusal-meta',phase,meta:result.meta},consume,{sources,histories,reports});
    const result={schema:'whole-source-qualified-scalar-reader-adoption-v1',entry:input.entry,sources,histories,reports,initial,final,changedRequest,wholeOriginalOwnersRetained:true,originalBuiltinEquivalent:false,oldTraitDispatchProved:false,oldClosureEquivalenceProved:false,sourceInstalled:false,semanticAuthority:false,productionCoverageQualified:false,completeSourceInverses:true,semanticEditedInverse:'separate actual owned-domain target inverse; no edited mapping back to original standard syntax',remaining:['nonescaping immutable local-closure graph/capture proof','lazy two-arm Option source lowering with exact captures/construction order','genuine complete const/index formatter prerequisite','unknown traits/custom Display/general async and unqualified standard ownership','aggregate production resource fit and future256-version/16Mi occurrence scaling']};accountData(result);return result;
   }}]},
  ]).run(null);const result={...pipeline.value,ruleTrace:pipeline.trace};accountData(result);return result;
 });
}
