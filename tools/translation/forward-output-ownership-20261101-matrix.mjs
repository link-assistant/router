import {withForwardProducerSourceSharing} from './forward-output-ownership-20261101-inputs.mjs';
// A matrix's genuine profile plans and actual indexes share one transaction.
// SOURCE ONLY / UNRUN. Each collector still performs all original checks.
import {createForwardOutputCustody,applyForwardOutputCustody} from './forward-output-ownership-20261101.mjs';
function finish(operation,checks){let result,primary,failed=false;const secondary=[];try{result=operation();}catch(error){primary=error;failed=true;}for(const check of checks)try{check();}catch(error){if(!failed){failed=true;primary=error;}else secondary.push(error);}if(failed){if(primary&&typeof primary==='object')try{Object.defineProperty(primary,'matrixClosingFailures',{value:secondary,enumerable:true});}catch{}throw primary;}return result;}
export function applyForwardMatrixCollection(collect,options,settings={}){return withForwardProducerSourceSharing(()=>applyCollection(collect,options,settings));}
function applyCollection(collect,options,{check=false}={}){
 options={...options,originalDeadline:options.originalDeadline??Infinity};const initial=collect(options),deadline=Math.min(options.originalDeadline,initial.originalDeadline??Infinity);options={...options,originalDeadline:deadline};let fresh=null;
 return finish(()=>{
  const handle=createForwardOutputCustody({producer:initial.producer,root:initial.root,outputRoot:initial.outputRoot,prefixes:initial.prefixes,extraPaths:initial.extraPaths,deadline,entries:initial.entries,verify:initial.verify,mutateOutputDirectories:initial.mutateOutputDirectories,reissue:()=>{fresh=collect(options);return {entries:fresh.entries,verify:fresh.verify,mutateOutputDirectories:fresh.mutateOutputDirectories};}});
  return {manifest:initial.manifest,...applyForwardOutputCustody(handle,{check})};
 },[()=>initial.verify(),()=>{if(fresh)fresh.verify();},()=>{if(fresh)fresh.close();},()=>initial.close()]);
}
// Preserve the original session.applyAll API for genuine private profile sets.
// The ordinary matrix caller uses the collector above to include actual indexes.
export function applyForwardMatrixParts({plans,check,sourceEntries,current,root,outputRoot=root,plannerModule,reissue,mutateOutputDirectories,originalDeadline=Infinity}){
 const entries=()=> (function*(){for(const plan of plans)yield*sourceEntries(plan);})();
 const handle=createForwardOutputCustody({producer:plannerModule,root,outputRoot,prefixes:plans.map(plan=>plan.outputPrefix),deadline:originalDeadline,entries,verify:current,mutateOutputDirectories,reissue:()=>{const fresh=reissue();return {entries:()=> (function*(){for(const plan of fresh)yield*sourceEntries(plan);})(),verify:current,mutateOutputDirectories};}});
 return applyForwardOutputCustody(handle,{check}).failures;
}
