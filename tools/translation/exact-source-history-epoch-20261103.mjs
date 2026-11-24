// Adapt exact composed SOURCE DATA to the original two-stage history contract.
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
export function exactSourceHistoryEpoch(input){
 account(input);input=copyMetadata(input);
 if(!input||typeof input.path!=='string'||typeof input.before!=='string'||typeof input.after!=='string'||!['Rust','JavaScript','TypeScript'].includes(input.language))throw TypeError('Complete exact source-history DATA required');
 const id='repository:compose-complete-reviewed-source-epoch',rule=input.before===''?{id,apply:source=>{if(source!=='')throw TypeError('Complete empty source required');return input.after;}}:countedLiteralSubstitutionRule(id,input.before,input.after,1,'whole original source epoch differs');
 const result=createRulePipeline([{phase:'language',rules:[]},{phase:'repository',rules:[rule]}]).run(input.before);
 if(result.value!==input.after)throw TypeError('Complete composed source epoch differs');
 const stages=transportConcreteSourceEquations([{before:input.before,after:input.before,language:input.language},{before:input.before,after:input.after,language:input.language}]).map((history,at)=>({...history,phase:at?'repository':'language'}));
 if(stages.some(stage=>stage.inverse!==input.before))throw TypeError('Complete source epoch inverse differs');
 return {path:input.path,before:input.before,language:input.before,after:input.after,current:input.current,currentAfter:input.after,inverse:input.before,
  stages,trace:result.trace,history:stages[1],sourceSuccessorChain:input,sourceAuthority:false,semanticAuthority:false,nativeBindingQualified:false,verification:'UNRUN'};
}
