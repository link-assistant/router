// Actual edited specialized JS/TS -> complete ordinary source -> private
// semantic meta/native inverse -> exact regenerated specialized target.
import {ownedPlainData} from './js-to-rust/owned-outcome-source.mjs';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './js-to-rust/vendor/module-syntax.mjs';
import {proposeScalarLinearKernel} from './scalar-linear-kernel-20261101.mjs';
import {withScalarLinearOriginalAssets} from './scalar-linear-kernel-20261101-assets.mjs';
import {planEditedScalarLinearBridge} from './scalar-linear-edit-20261101-syntax.mjs';
import {withOriginalPrimitiveVectorLiteralSourceOperation} from './failure-aware-primitive-vector-literal-source.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Scalar linear edited inverse: '+message);};
function configuration(input){const value=ownedPlainData(input);if(Object.keys(value).length!==2||!Object.hasOwn(value,'sourcePath')||!Object.hasOwn(value,'language')||typeof value.sourcePath!=='string'||!['JavaScript','TypeScript'].includes(value.language))fail('exact current source path/language configuration required');return value;}
export function translateEditedScalarLinearKernel(data,options,source,input){
 const original=ownedPlainData(data),request=ownedPlainData(options),config=configuration(input);
 if(typeof source!=='string'||source.length>2097152||Buffer.byteLength(source)>2097152||!Array.isArray(request.modules)||request.modules.length!==1)fail('one complete bounded edited module required');
 return withOriginalPrimitiveVectorLiteralSourceOperation(()=>withScalarLinearOriginalAssets(assets=>{
  const nativeCurrent=()=>{const ts=ownershipCompiler();if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native compiler runtime changed');};
  return withCompleteSourceClosingFence(()=>{
   let baseline,selected,artifact,originalSource,originalPath,bridge,plan,candidateData,proposal,concrete;
   const run=createRulePipeline([
    {phase:'language',rules:[
     {id:'scalar-linear-edit:reissue-original-complete-stage-and-actual-import-source-baseline',apply:()=>{
      baseline=proposeScalarLinearKernel(original,request);
      const rows=baseline.modules.filter(row=>row.artifacts.some(artifact=>artifact.path===config.sourcePath&&artifact.language===config.language));if(rows.length!==1)fail('one fresh genuine specialized target required');selected=rows[0];artifact=selected.artifacts.find(row=>row.path===config.sourcePath&&row.language===config.language);
      originalPath=selected.sourcePath;const originals=original.files.filter(row=>row.path===originalPath);if(originals.length!==1)fail('complete original application source missing');originalSource=originals[0].source;
      concrete=transportConcreteSyntaxSource(source,{language:config.language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)fail('complete authoritative edited target CST differs');return source;
     }},
     {id:'scalar-linear-edit:resolve-actual-native-imports-and-reconstruct-full-ordinary-application-bridge',apply:value=>{
      plan=planEditedScalarLinearBridge({source:value,sourcePath:config.sourcePath,expected:artifact.source,originalSource,originalPath,data:baseline.receivingData,functions:selected.functions,selections:request.modules[0].chains});
      const language=originalPath.endsWith('.mjs')?'JavaScript':'TypeScript',originalConcrete=transportConcreteSyntaxSource(originalSource,{language});if(transportConcreteSyntaxMeta(originalConcrete.meta).source!==originalSource)fail('complete original application CST inverse differs');
      const substituted=applyConcreteSyntaxSubstitutions(originalConcrete.document,{languageRules:[{id:'language:replace-only-original-source-callback-bodies-with-actual-edited-scalar-expressions',edits:plan.edits}],repositoryRules:[{id:'router:retain-original-caller-imports-signatures-domains-and-stage-order',edits:[]}]});
      bridge=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(substituted.value)).source;candidateData={...original,files:original.files.map(row=>row.path===originalPath?{...row,source:bridge}:row)};return candidateData;
     }},
     {id:'scalar-linear-edit:run-original-private-source-meta-native-inverse-and-specialization-for-edited-bridge',apply:value=>{
      proposal=proposeScalarLinearKernel(value,request);const rows=proposal.modules.filter(row=>row.sourcePath===originalPath);if(rows.length!==1)fail('one complete privately reissued edited module required');const reproduced=rows[0].artifacts.find(row=>row.path===config.sourcePath&&row.language===config.language);
      if(!reproduced||reproduced.source!==source)fail('complete authoritative edited target does not exactly reproduce; only canonical scalar-body edits are admitted');return rows[0];
     }},
    ]},
    {phase:'repository',rules:[{id:'router:retain-full-edited-target-ordinary-bridge-and-native-source-inverses',apply:row=>{
     const originalLanguage=originalPath.endsWith('.mjs')?'JavaScript':'TypeScript',histories=transportConcreteSourceEquations([{before:artifact.source,after:source,language:config.language},{before:originalSource,after:bridge,language:originalLanguage}]);
     if(histories[0].inverse!==artifact.source||histories[1].inverse!==originalSource)fail('complete edited source inverse differs');
     const metadata={schema:'scalar-linear-edited-original-source-meta-v1',family:request.family,sourcePath:config.sourcePath,language:config.language,source,originalPath,originalSource,bridge,targetConcreteSyntax:concrete.meta,proposalMeta:proposal.semanticMeta};accountPrimitiveVectorIteratorBulkData(metadata);
     const meta=JSON.stringify(metadata);if(Buffer.byteLength(meta)>16777216||JSON.stringify(JSON.parse(meta))!==meta)fail('complete edited semantic-meta serialization/reparse bound');
     return {schema:'scalar-linear-edited-inverse-source-proposal-v1',sourcePath:config.sourcePath,language:config.language,source,originalPath,originalSource,bridge,candidateData,proposal,meta,histories,targetConcreteSyntax:concrete.meta,program:row.originalProgram,rust:row.canonicalRust,javascript:row.canonicalJavaScript,typescript:row.typescript,files:[{path:originalPath,before:originalSource,after:bridge,inverse:originalSource}],nativeImportSymbolsJoined:plan.nativeOriginalImportSymbolsJoined,authoritativeTargetExactlyReproduced:true,sourceInstalled:false,nativeInstalled:false,newNativeAbi:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,receivingQualified:false,runtimeExecuted:false,rustExecuted:false,crossInvocationCache:false};
    }}]},
   ]).run(null);
   const result={...run.value,ruleTrace:run.trace};accountPrimitiveVectorIteratorBulkData(result);return result;
  },[nativeCurrent,assets.verify]);
 }));
}
export function readEditedScalarLinearKernelMeta(data,options,text){
 if(typeof text!=='string'||Buffer.byteLength(text)>16777216)fail('bounded complete edited semantic meta required');
 const input=ownedPlainData(JSON.parse(text)),keys=['schema','family','sourcePath','language','source','originalPath','originalSource','bridge','targetConcreteSyntax','proposalMeta'];
 if(!input||Object.keys(input).length!==keys.length||keys.some(key=>!Object.hasOwn(input,key))||input.schema!=='scalar-linear-edited-original-source-meta-v1')fail('complete edited semantic-meta fields required');
 const result=translateEditedScalarLinearKernel(data,options,input.source,{sourcePath:input.sourcePath,language:input.language});if(result.meta!==text)fail('stale forged or noncanonical edited source/meta receipt');return result;
}
