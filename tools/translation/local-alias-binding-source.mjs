// Complete original bounded alias census copy; never type/owner authority.
export function censusLocalAliasBindings(rows,parameters,{protectedNames=[],unicode=true,opaqueRegions=[]}={}){
 rows=outsideOpaqueSourceTokens(rows,opaqueRegions);
 if(rows.length>200000)return {reason:'complete local-binding token bound'};if(rows.some(row=>row.text==='match')&&collectClosedMatchPatternSource(rows).refusals.length)return {reason:'complete nonbinding match scope needs a separate source rule'};
 if(!rows.some(row=>row.text==='let'||row.text==='for'))return {reason:null,count:0};
 const names=new Set(parameters),protectedBindings=new Set(protectedNames);let count=0;
 for(let at=0;at<rows.length;at++)if(rows[at].text==='let'||rows[at].text==='for'){
  const declaration=rows[at].text==='let'?localAliasDeclaration(rows,at):localAliasForBinding(rows,at),name=declaration?.name;if(declaration?.wildcard)continue;if(!declaration||!unicode&&!/^[A-Za-z_][A-Za-z_0-9]*$/u.test(name))return {reason:'one ordinary local identifier required'};
  if(names.has(name)||protectedBindings.has(name))return {reason:'local can shadow a concrete parameter or namespace'};if(++count>4096)return {reason:'complete local binding count bound'};names.add(name);
 }
 return {reason:null,count};
}

// Lexical source DATA only. Mutable declarations are never inferred aliases.
export function localAliasDeclaration(rows,at){
 if(rows[at]?.text!=='let')return null;const mutable=rows[at+1]?.text==='mut',index=at+(mutable?2:1),token=rows[index],next=rows[index+1];if(token?.type!=='ident'||!/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text)||['mut','ref','self','Self','_'].includes(token.text)||!['=',':'].includes(next?.text))return null;return {name:token.text,token,mutable,next:index+1,initializerStart:next.text==='='?index+2:null};
}

// The iterator expression and element domain stay unproved. This selects only
// one original plain pattern name; no loop value or result facts are issued.
export function localAliasForBinding(rows,at){const token=rows[at+1];if(rows[at]?.text!=='for'||token?.type!=='ident'||rows[at+2]?.text!=='in'||!/^[_\p{ID_Start}][\p{ID_Continue}_]*$/u.test(token.text)||['mut','ref','self','Self'].includes(token.text))return null;return {name:token.text,token,wildcard:token.text==='_'};}

import {outsideOpaqueSourceTokens} from './opaque-source-token-regions.mjs';

import {collectClosedMatchPatternSource} from './match-arm-source.mjs';
