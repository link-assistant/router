// Full source equations only. A composed history grants no compiler authority.
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
export function composeConcreteSourceHistory({path,before,after,language,laterPlans=[]}){
 const fail=message=>{throw new TypeError('Concrete source successor history: '+message);};
 if(typeof path!=='string'||typeof before!=='string'||typeof after!=='string'||before.length>2097152||after.length>2097152||!Array.isArray(laterPlans)||laterPlans.length>16)fail('bounded complete original and successor source required');
 let currentAfter=after;const laterHistories=[];
 for(const plan of laterPlans){
  if(!plan||plan.sourceAuthority!==false||plan.semanticAuthority!==false||!Array.isArray(plan.files))fail('successor must be explicit source equation DATA');
  const rows=plan.files.filter(row=>row.path===path);if(rows.length>1)fail('unique whole successor file required');if(!rows.length)continue;const row=rows[0],next=row.currentAfter??row.after;
  if(row.before!==currentAfter||row.inverse!==row.before||typeof next!=='string'||next.length>2097152)fail('complete adjacent source/inverse join differs');
  const equation=transportConcreteSourceEquations([{before:currentAfter,after:next,language}])[0];if(equation.inverse!==currentAfter)fail('complete successor inverse differs');
  laterHistories.push({id:plan.id??plan.schema,before:currentAfter,after:next,equation,stages:row.stages,laterHistories:row.laterHistories??[],sourceAuthority:false,semanticAuthority:false});currentAfter=next;
 }
 return {currentAfter,laterHistories};
}
