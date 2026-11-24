// Closed borrowed suffix source composition; every original whole caller must
// independently establish actual bindings, types, loans, effects and emission.
import {readTextAliasOperand} from './text-local-argument-source.mjs';
import {readTextCoreCallSource} from './text-core-call-source.mjs';
import {readPrimitiveSourceBindingRole} from './primitive-core-call-source.mjs';
import {readCarrierConditionalSource} from './carrier-conditional-source.mjs';
import {readParenthesizedSourceOperandTokens} from './qualified-source-call-tokens.mjs';
export function readTextBuilderBorrowedOperandSource(rows,bindings){
 if(!Array.isArray(rows)||!rows.length||rows.length>128)return null;let work=0;const scope={get:name=>readPrimitiveSourceBindingRole(bindings.get(name))};
 function selected(part,depth){
  if(++work>256||depth>8||!part.length)return null;
  const original=readTextAliasOperand(part,bindings);if(original?.kind==='str')return {kind:'payload',domain:'str',bridge:original.bridge??'complete-original-borrowed-text-source',binding:original.binding};
  const grouped=readParenthesizedSourceOperandTokens(part);if(grouped)return selected(grouped,depth+1);
  if(part.length===2&&part[0].text==='&'&&part[1].type==='ident'&&bindings.get(part[1].text)==='text-owned')return {kind:'payload',domain:'str',binding:part[1].text,bridge:'complete-original-shared-owned-text-borrow-source'};
  const core=readTextCoreCallSource(part,bindings);if(core?.kind==='str')return {kind:'payload',domain:'str',binding:core.binding,bridge:core.bridge};
  return readCarrierConditionalSource(part,scope,{kind:'payload',domain:'str'},{readExpression:branch=>selected(branch,depth+1)});
 }
 const result=selected(rows,0);return result?{...result,operandsUnevaluated:true,originalSourceRetained:true,loanProved:false,sourceBindingProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false}:null;
}
