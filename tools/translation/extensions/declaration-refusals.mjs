// Collect attributed original declaration errors. A failed phase never
// returns checked IR; callers discard this checker and recheck the survivors.
import {TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
const collectors=new WeakMap(),batches=new WeakMap();
function failedPhase(errors) {
  const error=new Error('Original declaration phase contains semantic refusals');
  batches.set(error,Object.freeze(errors.map(entry=>Object.freeze(entry))));
  return error;
}
export const declarationRefusals=error=>batches.get(error)??null;
export function withDeclarationRefusalCollection(Base) {return class extends Base {
  walk(items,path,visit,phase=null) {
    const state=collectors.get(this);
    if(!state)return super.walk(items,path,visit,phase);
    const root=state.depth===0;if(root)state.phase=phase;
    state.depth++;
    try {
      const result=super.walk(items,path,visit,phase);
      // Throw before the next signature/body pass or any program-wide proof,
      // recursion, constant evaluation or source-link association can finish.
      if(root&&state.errors.length)throw failedPhase(state.errors);
      return result;
    } finally {state.depth--;if(root)state.phase=null;}
  }
  visitDeclaration(item,path,entry,visit,phase) {
    const state=collectors.get(this);
    const body=state?.collectIndependentBodies===true&&state.phase==='declaration-bodies';
    if(!state||state.phase!=='declaration-types'&&!body)return super.visitDeclaration(item,path,entry,visit,phase);
    try {return super.visitDeclaration(item,path,entry,visit,phase);}
    catch(error) {
      const source=item.span,range=error.span;
      // Generated/host declarations without actual ranges and unattributed
      // errors keep the ordinary first-failure behavior. Internal exceptions
      // are never converted into unsupported source declarations.
      if(!(error instanceof TranslationError)||item.generated||!['data','fn'].includes(item.k)||body&&(item.k!=='fn'||item.impl)||
        !source||!range||!Number.isSafeInteger(source.start)||!Number.isSafeInteger(source.end)||
        !Number.isSafeInteger(range.start)||!Number.isSafeInteger(range.end)||
        source.start<0||source.end<source.start||range.end<range.start||range.start<source.start||range.end>source.end)throw error;
      if(state.errors.length>=20000)throw new Error('Declaration refusal collection exceeds its bounded source count');
      state.errors.push({error,name:[...path,item.name].join('.'),phase});
    }
  }
};}
export function checkCollectedDeclarationTypes(checker,surface,{collectIndependentBodies=false}={}) {
  if(typeof collectIndependentBodies!=='boolean')throw new TypeError('Independent body refusal collection requires an explicit boolean');
  if(collectors.has(checker))throw new TypeError('Declaration refusal collector is already active');
  collectors.set(checker,{depth:0,phase:null,errors:[],collectIndependentBodies});
  try {return checker.program(surface);}
  finally {collectors.delete(checker);}
}
