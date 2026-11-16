// Source scope composition only. Method spelling grants no dispatch/body,
// namespace, type or executable permission. Every original body stays intact.
import {qualifiedCoreCallbackSourceRegions} from './qualified-core-callback-source-regions.mjs';
import {readParenthesizedSourcePrefixTokens} from './qualified-source-call-tokens.mjs';
import {readInlineClosureSourceTokens} from './inline-closure-source-tokens.mjs';
const arities=new Map([['map',[1]],['and_then',[1]],['map_err',[1]],['or_else',[0,1]],['unwrap_or_else',[0,1]],['ok_or_else',[0]],['filter',[1]]]);
export function coreCarrierCallbackSourceRegions(rows){
 const regions=qualifiedCoreCallbackSourceRegions(rows),pending=new Map(regions.map(row=>[row.start,row.end]));let work=0;
 for(let at=0;at<rows.length;at++){
  if(++work>200000)throw new TypeError('Complete carrier callback source work bound');const excluded=pending.get(rows[at].start);if(excluded!==undefined){while(at<rows.length&&rows[at].end<excluded){if(++work>200000)throw new TypeError('Complete carrier callback scope work bound');at++;}continue;}
  if(rows[at].text!=='.'||rows[at+1]?.type!=='ident'||!arities.has(rows[at+1].text)||rows[at+2]?.text!=='(')continue;const group=readParenthesizedSourcePrefixTokens(rows,at+2);if(!group)continue;if((work+=group.tokens.length)>200000)throw new TypeError('Complete carrier callback argument work bound');const closure=readInlineClosureSourceTokens(group.body);if(!closure||!arities.get(rows[at+1].text).includes(closure.parameters.length))continue;
  const groups=[],pairs={'(':')','[':']','{':'}'};let complete=true;for(const row of closure.body){if(pairs[row.text])groups.push(pairs[row.text]);else if([')',']','}'].includes(row.text)){if(groups.pop()!==row.text){complete=false;break;}}else if(!groups.length&&[',',';'].includes(row.text)){complete=false;break;}}if(!complete||groups.length)continue;
  const start=group.body[0].start,end=group.body.at(-1).end;if(regions.length>=8192)throw new TypeError('Complete carrier callback candidate bound');regions.push({start,end,method:rows[at+1].text,methodDispatchProved:false,callbackBodyChecked:false,callbackTypesChecked:false,sourceBindingProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false});at=group.end-1;
 }
 const sorted=regions.sort((a,b)=>a.start-b.start||b.end-a.end),output=[];for(const row of sorted){const previous=output.at(-1);if(previous&&row.start<previous.end){if(row.end>previous.end)throw new TypeError('Original callback scopes overlap without nesting');continue;}if(output.length>=4096)throw new TypeError('Complete carrier callback region bound');output.push(row);}return output;
}
