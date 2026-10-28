// Whole-function source proposal only. Parent module/type-producer guards and
// actual paired library validation run before this candidate reader is called.
import {censusLocalAliasBindings,localAliasDeclaration} from './local-alias-binding-source.mjs';
import {readLifetimeOnlySourceBinders,readLifetimeOnlySelfSource} from './lifetime-only-declaration-source.mjs';
import {FIXED_TYPE_CORE_ALIASES} from './fixed-type-core-source.mjs';
const integer=word=>typeof word==='string'&&/^[iu](?:8|16|32|64|128)$/u.test(word);
const identifier=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text);
function close(rows,start){const pairs={'(':')','[':']','{':'}'},stack=[];for(let at=start;at<rows.length;at++){const word=rows[at].text;if(pairs[word]){if(stack.length>=64)throw new TypeError('constant source depth bound');stack.push(pairs[word]);}else if([')',']','}'].includes(word)){if(stack.pop()!==word)throw new TypeError('constant source delimiter mismatch');if(!stack.length)return at;}}throw new TypeError('constant source delimiter unavailable');}
export function fixedConstantFunctionSourceEdits(item,header,{lifetimes=[],parseType=null}={}){
 const refusal=reason=>({edits:[],reason,sourceAuthority:false,semanticAuthority:false,executableAdmission:false}),rows=item.tokens.filter(row=>row.type!=='comment');
 if(rows.length>200000)return refusal('complete constant source token bound');
 // No scope construction for functions without an actual candidate token triple.
 const candidates=[];for(let at=0;at+2<rows.length;at++)if(identifier(rows[at])&&integer(rows[at].text)&&rows[at+1].text==='::'&&['MIN','MAX'].includes(rows[at+2].text))candidates.push(at);
 const typedLocals=[];for(let at=0;at<rows.length;at++)if(rows[at].text==='let'){const declaration=localAliasDeclaration(rows,at);if(declaration&&rows[declaration.next]?.text===':')typedLocals.push({at,declaration});}
 if(!candidates.length&&!typedLocals.length)return refusal(null);
 try{
  const name=rows.findIndex(row=>row.start===header.nameSpan.start),binders=readLifetimeOnlySourceBinders(rows,name+1,lifetimes),open=binders.after;if(rows[open]?.text!=='(')return refusal('complete lifetime-only input owner required');const end=close(rows,open),parameters=new Set();let begin=open+1,angle=0;
  for(let at=begin;at<=end;at++){
   if(at<end&&['(','[','{'].includes(rows[at].text)){at=close(rows,at);continue;}
   if(at<end){const word=rows[at].text;if(word==='<')angle++;else if(word==='>')angle--;else if(word==='>>')angle-=2;if(angle<0||angle>64)return refusal('constant input type delimiter bound');}if(at!==end&&(rows[at].text!==','||angle))continue;if(at===end&&angle)return refusal('constant input type delimiter mismatch');const parameter=rows.slice(begin,at);begin=at+1;if(!parameter.length)continue;if(readLifetimeOnlySelfSource(parameter,binders.lifetimes)){parameters.add('self');continue;}
   const offset=parameter[0]?.text==='mut'?1:0;if(!identifier(parameter[offset])||parameter[offset+1]?.text!==':'||integer(parameter[offset].text)||parameters.has(parameter[offset].text))return refusal('closed distinct ordinary input patterns required for constant body scope');parameters.add(parameter[offset].text);
  }
  let body=end+1;while(body<rows.length&&rows[body].text!=='{')body++;if(body>=rows.length||close(rows,body)!==rows.length-1)return refusal('complete original function body required');
  const bodyCandidates=candidates.filter(at=>at>body&&at<rows.length-1);const localCandidates=typedLocals.filter(row=>row.at>body&&row.at<rows.length-1);if(!bodyCandidates.length&&!localCandidates.length)return refusal(null);
  const bodyRows=rows.slice(body+1,-1),producers=new Set(['type','struct','enum','union','trait','impl','mod','use','extern','macro','macro_rules','macro_rules!','fn','const','static','#','|','||']);if(bodyRows.some((row,at)=>producers.has(row.text)||row.text!=='!'&&row.text.endsWith('!')||row.text==='!'&&identifier(bodyRows[at-1])))return refusal('local type/declaration/attribute/macro/closure scope requires separate rules');
  const census=censusLocalAliasBindings(bodyRows,parameters,{protectedNames:FIXED_TYPE_CORE_ALIASES.map(row=>row.primitive)});if(census.reason)return refusal('constant body scope: '+census.reason);
  const edits=[];for(const local of localCandidates){
   if(typeof parseType!=='function')return refusal('complete original type selector required for local annotations');let at=local.declaration.next+1,angle=0,steps=0;const begin=at;
   for(;at<rows.length-1;at++){
    if(++steps>200000)return refusal('complete local type source work bound');const word=rows[at].text;if(['(','[','{'].includes(word)){at=close(rows,at);continue;}if(word==='<')angle++;else if(word==='>')angle--;else if(word==='>>')angle-=2;if(angle<0||angle>64)return refusal('local type argument delimiter bound');if(!angle&&word==='=')break;if(!angle&&[';','else'].includes(word))return refusal('initialized complete local type annotation required');
   }
   if(rows[at]?.text!=='='||at===begin||angle)return refusal('complete local type initializer unavailable');try{edits.push(...parseType(rows.slice(begin,at),{lifetimes:binders.lifetimes}));}catch(error){if(!(error instanceof Error))throw error;return refusal('local type grammar: '+error.message);}
  }
  for(const at of bodyCandidates){const previous=rows[at-1]?.text,next=rows[at+3]?.text;if(['.','::'].includes(previous)||['(','<','::'].includes(next))continue;const selected=FIXED_TYPE_CORE_ALIASES.find(row=>row.primitive===rows[at].text);if(!selected)continue;const token=rows[at];edits.push({span:[token.start,token.end],expected:token.text,replacement:'crate::translation_fixed_types_core::'+selected.name});}
  return {edits,reason:null,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
 }catch(error){if(!(error instanceof TypeError))throw error;return refusal(error.message);}
}
