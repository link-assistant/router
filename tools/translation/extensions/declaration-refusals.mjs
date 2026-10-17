// Collect attributed original declaration errors. A failed phase never
// returns checked IR; callers discard this checker and recheck the survivors.
import {TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
import {originalMethodRefusalRange} from '../source-method-admission.mjs';
import {originalProjectDeclarationRefusalRange,originalProjectDeclarationRefusalRanges} from '../project.mjs';
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
    if(state?.collectIndependentBodies&&phase==='declaration-bodies'&&item.k==='fn'&&(item.constant||item.constFunction))state.constantOrigins.set(entry,{item,path:[...path]});
    const body=state?.collectIndependentBodies===true&&state.phase==='declaration-bodies';
    if(!state||state.phase!=='declaration-types'&&!body)return super.visitDeclaration(item,path,entry,visit,phase);
    try {return super.visitDeclaration(item,path,entry,visit,phase);}
    catch(error) {
      if(!(error instanceof TranslationError))throw error;
      const {methodRange,projectRange}=originalProjectDeclarationRefusalRanges(item,path),source=methodRange??projectRange??item.span,range=error.span;
      // Generated/host declarations without actual ranges and unattributed
      // errors keep the ordinary first-failure behavior. Internal exceptions
      // are never converted into unsupported source declarations.
      if(item.generated&&!methodRange&&!projectRange||!['data','fn'].includes(item.k)||body&&(item.k!=='fn'||item.impl&&!methodRange)||
        !source||!range||!Number.isSafeInteger(source.start)||!Number.isSafeInteger(source.end)||
        !Number.isSafeInteger(range.start)||!Number.isSafeInteger(range.end)||
        source.start<0||source.end<source.start||range.end<range.start||range.start<source.start||range.end>source.end)throw error;
      if(state.errors.length>=20000)throw new Error('Declaration refusal collection exceeds its bounded source count');
      state.errors.push({error,name:[...path,item.name].join('.'),phase});
    }
  }
};}
// Check every independently attributed original constant/const function
// before any constant source links or evaluation can complete. Unsupported
// owners are removed together; no partially valid program is returned.
export function checkConstEligibilityRefusals(checker,program,verify) {
  const state=collectors.get(checker),errors=[];
  for(const entry of program.declarations.values())if(entry.constant||entry.constFunction){
    try{verify(entry);}
    catch(error){
      const origin=state?.collectIndependentBodies&&state.constantOrigins.get(entry);
      if(!(error instanceof TranslationError)||!origin)throw error;
      const {item,path}=origin,name=[...path,item.name].join('.');
      const source=originalMethodRefusalRange(item,path)??originalProjectDeclarationRefusalRange(item,path),range=error.span;
      if(entry!==checker.items.get(name)||entry.fullName!==name||!source||!range||
        !Number.isSafeInteger(source.start)||!Number.isSafeInteger(source.end)||!Number.isSafeInteger(range.start)||!Number.isSafeInteger(range.end)||
        source.start<0||source.end<source.start||range.end<range.start||range.start<source.start||range.end>source.end)throw error;
      if(errors.length>=20000)throw new Error('Constant eligibility refusal collection exceeds its bounded source count');
      errors.push({error,name,phase:'const-eligibility'});
    }
  }
  if(errors.length)throw failedPhase(errors);
}
export function checkCollectedDeclarationTypes(checker,surface,{collectIndependentBodies=false}={}) {
  if(typeof collectIndependentBodies!=='boolean')throw new TypeError('Independent body refusal collection requires an explicit boolean');
  if(collectors.has(checker))throw new TypeError('Declaration refusal collector is already active');
  collectors.set(checker,{depth:0,phase:null,errors:[],constantOrigins:new Map(),collectIndependentBodies});
  try {return checker.program(surface);}
  finally {collectors.delete(checker);}
}
