// Full producer equations only; historical DATA grants no runtime authority.
import {prepareGuardedProofLexing,assertGuardedProofLexingInputsFresh} from './prepare-guarded-proof-lexing.mjs';
export function guardedProofConsumerHistory(source,path,{root}={}){
 if(typeof source!=='string'||typeof path!=='string')throw TypeError('Guarded consumer history requires complete primitive source and path');
 const plan=prepareGuardedProofLexing(root===undefined?{}:{root});
 const selected=plan.files.filter(row=>row.path===path&&row.consumerBodyUnchanged===true);
 if(selected.length!==1||selected[0].current!==source)throw TypeError('Guarded consumer history requires the exact complete current physical consumer');
 const row=selected[0];
 if(row.inverse!==row.source||row.stages.length!==2||row.stages[0].phase!=='language'||row.stages[1].phase!=='repository')throw TypeError('Guarded consumer history requires both full producer phases and inverse');
 assertGuardedProofLexingInputsFresh(plan);
 return {path,current:source,historical:row.source,equation:row,sourceAuthority:false,runtimeAuthority:false};
}
