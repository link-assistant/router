// Complete paired source proposal; no original equivalence/installation permit.
import {posix} from 'node:path';
import {ownedPlainData,ownedSourcePath,requireOwnedCoreSourceCurrent as outcomeCurrent} from './owned-text-vector-outcome-source.mjs';
import {requireOwnedCoreSourceCurrent as cancellationCurrent} from './owned-text-vector-cancellation-source.mjs';
import * as outcome from './owned-text-vector-outcome.mjs';
import * as cancellation from './owned-text-vector-cancellation.mjs';
import {projectOwnedCollectionsTypeScript} from './owned-collections-typed-source.mjs';
import {proposeOwnedTextVectorArrayJoins} from './owned-text-vector-array-join-proposals.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {withOriginalOwnedTextVectorLiteralSourceOperation} from '../current-owned-text-vector-literal-source.mjs';
import {withCompleteSourceClosingFence} from '../complete-source-closing-fence.mjs';
const fail=message=>{throw new TypeError('Paired array and String-vector join adoption: '+message);};
export function proposeOwnedTextVectorPairedArrayJoins(data,options){
 const original=ownedPlainData(data),request=ownedPlainData(options);if(Object.keys(request).length!==5||!['outcome','cancellation'].includes(request.family)||!Object.hasOwn(request,'arrays')||!Object.hasOwn(request,'joins')||original.primitiveOperators!==true)fail('exact family/javascriptPath/typescriptPath/arrays/joins request required');for(const path of [request.javascriptPath,request.typescriptPath])ownedSourcePath(path);
 if(!request.javascriptPath.endsWith('.mjs')||!/\.(?:mts|ts)$/u.test(request.typescriptPath))fail('actual JS/TS source pair required');const typedRoot=posix.dirname(original.declarationRoot),javascriptRoot=posix.dirname(original.runtimeRoot);if(typedRoot!=='.'&&!request.typescriptPath.startsWith(typedRoot+'/'))fail('typed source must remain in its declared root');const suffix=typedRoot==='.'?request.typescriptPath:request.typescriptPath.slice(typedRoot.length+1),expected=(javascriptRoot==='.'?'':javascriptRoot+'/')+suffix.replace(/\.(?:mts|ts)$/u,'.mjs');if(expected!==request.javascriptPath)fail('actual source-root projection pair required');
 const row=path=>{const values=original.files.filter(value=>value.path===path);if(values.length!==1||typeof values[0].source!=='string'||Buffer.byteLength(values[0].source)>2097152)fail('one complete bounded original source per path required');return values[0].source;},beforeJavaScript=row(request.javascriptPath),beforeTypeScript=row(request.typescriptPath),api=request.family==='outcome'?outcome:cancellation,current=request.family==='outcome'?outcomeCurrent:cancellationCurrent;let context=null,beforeProjection,afterProjection,checked;
 return withOriginalOwnedTextVectorLiteralSourceOperation(()=>withCompleteSourceClosingFence(()=>{
  context=api.createOwnedOutcomeContext(original);const run=createRulePipeline([{phase:'language',rules:[
   {id:'language:require-complete-unchanged-original-written-TypeScript-and-JavaScript-projection',apply:()=>{beforeProjection=projectOwnedCollectionsTypeScript(beforeTypeScript);if(beforeProjection.source!==beforeJavaScript)fail('concurrent differing paired JavaScript requires conflict resolution');return null;}},
   {id:'language:substitute-written-String-vector-contracts-and-reissue-both-actual-source-languages',apply:()=>{const pairedInput={...original,files:original.files.filter(value=>value.path!==request.javascriptPath)};checked=proposeOwnedTextVectorArrayJoins(pairedInput,{family:request.family,sourcePath:request.typescriptPath,arrays:request.arrays,joins:request.joins});afterProjection=projectOwnedCollectionsTypeScript(checked.files[0].after);if(checked.program.some(item=>item.source.path!==request.javascriptPath||item.source.source!==afterProjection.source))fail('actual checked complete JavaScript projection differs');return null;}},
  ]},{phase:'repository',rules:[{id:'router:retain-both-complete-originals-inverses-and-explicit-paired-contract-change',apply:()=>{
   const history=transportConcreteSourceEquations([{before:beforeJavaScript,after:afterProjection.source,language:'JavaScript'}])[0];if(history.inverse!==beforeJavaScript)fail('complete paired JavaScript inverse differs');return {...checked,schema:'owned-text-vector-paired-array-join-proposal-v1',sourcePath:request.typescriptPath,javascriptPath:request.javascriptPath,typescriptPath:request.typescriptPath,files:[checked.files[0],{path:request.javascriptPath,before:beforeJavaScript,after:afterProjection.source,inverse:beforeJavaScript,history}],pairedProjection:{before:beforeProjection.history,after:afterProjection.history,sourceAuthority:false,semanticAuthority:false},writtenTypeContractChanged:true,originalBodyEquivalenceQualified:false,sourceInstalled:false,nativeInstalled:false,productionSelected:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false};
  }}]}]).run(null);return {...run.value,pairedRuleTrace:run.trace};
 },[()=>{if(context)current(context);},()=>{context=null;}]));
}
