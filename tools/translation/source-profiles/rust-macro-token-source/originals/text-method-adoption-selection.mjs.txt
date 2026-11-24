// Candidate source equations only. Every selected whole function must later
// pass the original semantic, type, ownership, source and emission checks.
import {textContract} from './text-contracts.mjs';
import {readNativeCountLiteralSource} from './native-integer-literal-source.mjs';
import {createTextLocalArgumentSource,readTextWrittenAliasDomain} from './text-local-argument-source.mjs';
import {readLocalAliasInitializer} from './local-alias-written-source.mjs';
const countMethods=new Map([['len','len_utf8'],['chars','len_chars'],['matches','matches_count']]);
const plainMethods=new Set(['trim','trim_start','trim_end','is_empty','contains','starts_with','ends_with','replace','replacen','repeat','strip_prefix','strip_suffix','to_ascii_lowercase','to_ascii_uppercase','is_ascii','eq_ignore_ascii_case','trim_ascii','trim_ascii_start','trim_ascii_end']);
const borrowed=source=>/^&(?:'[a-zA-Z_][a-zA-Z0-9_]*)?(?:str|crate::translation_core::Str)$/u.test(source);
export function selectTextMethodAdoption(source,item,_scoped,modulePath,_names,helpers){
 const {originalDeclarationHeader,close,split,text,ident}=helpers,tokens=splitRustTryDotSourceTokens(item.tokens.filter(row=>row.type!=='comment'),source),indices=new Map(tokens.map((token,index)=>[token,index])),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(row=>row.start===header?.nameSpan?.start),edits=[],languageEdits=[],selections=[],skipped=[];
 const result=reason=>({edits:reason?[]:edits,languageEdits:reason?[]:languageEdits,selections:reason?[]:selections,skipped:reason?[...skipped,{function:item.name,reason}]:skipped});
 if(name<0||tokens.length>200000||tokens.slice(0,name).some(row=>['unsafe','async','const','extern'].includes(row.text)))return result('complete ordinary synchronous text function required');
 let open=name+1;if(tokens[open]?.text==='<'){
  let end=open+1;while(end<tokens.length&&tokens[end].text!=='>')end++;
  if(end>=tokens.length||!/^<(?:'[a-zA-Z_][a-zA-Z0-9_]*,?)+>$/u.test(text(tokens.slice(open,end+1))))return result('only written unconstrained lifetime parameters are source candidates');open=end+1;
 }
 if(tokens[open]?.text!=='(')return result('complete written input list required');const endParameters=close(tokens,open);if(endParameters<0)return result('complete original inputs required');let body=endParameters+1;while(body<tokens.length&&tokens[body].text!=='{')body++;if(body>=tokens.length||close(tokens,body)!==tokens.length-1)return result('complete original function body required');
 const domains=new Map(),parameters=new Set();for(const row of split(tokens.slice(open+1,endParameters))){if(!ident(row[0])||row[1]?.text!==':'||parameters.has(row[0].text))return result('distinct immutable input bindings required');parameters.add(row[0].text);if(borrowed(text(row.slice(2))))domains.set(row[0].text,'str');else if(text(row.slice(2))==='String')domains.set(row[0].text,'text-owned');else if(text(row.slice(2))==='usize')domains.set(row[0].text,'usize-count');else{const receiverRole=readJsonReceiverWrittenSourceRole(row.slice(2),_scoped??{})??readPrimitiveCoreParameterSourceRole(row.slice(2),_scoped);if(receiverRole)domains.set(row[0].text,receiverRole);}}
 const localNames=new Set(),projectionPipes=new Set();let work=0;
 // Only this complete destructuring identity closure can be substituted.
 // These are source candidates; actual owner/type/effect checks still follow.
 function projectedSplit(cursor){
  if(++work>200000||tokens[cursor]?.text!=='.'||!['split_once','rsplit_once'].includes(tokens[cursor+1]?.text)||tokens[cursor+2]?.text!=='(')return null;const end=close(tokens,cursor+2);if(end<0)return null;
  if(!['.','map','(','|','('].every((word,index)=>tokens[end+1+index]?.text===word)||tokens[end+7]?.text!==','||tokens[end+9]?.text!==')'||tokens[end+10]?.text!=='|'||tokens[end+12]?.text!==')')return null;
  const left=tokens[end+6],right=tokens[end+8],output=tokens[end+11];if(!ident(left)||!ident(right)||!ident(output)||output.text==='_'||left.text!=='_'&&left.text===right.text)return null;const side=output.text===left.text?'left':output.text===right.text?'right':null;if(!side)return null;return {operation:tokens[cursor+1].text+'_'+side,after:end+13,pipes:[end+4,end+10]};
 }
 function projectedIndex(cursor){
  if(++work>200000||tokens[cursor]?.text!=='.'||!['find','rfind'].includes(tokens[cursor+1]?.text)||tokens[cursor+2]?.text!=='(')return null;const end=close(tokens,cursor+2);if(end<0)return null;
  if(!['.','map','(','|'].every((word,index)=>tokens[end+1+index]?.text===word)||tokens[end+6]?.text!=='|'||tokens[end+8]?.text!=='as'||tokens[end+9]?.text!=='u64'||tokens[end+10]?.text!==')')return null;
  const binding=tokens[end+5],output=tokens[end+7];if(!ident(binding)||binding.text==='_'||!ident(output)||output.text!==binding.text)return null;return {operation:tokens[cursor+1].text,after:end+11,pipes:[end+4,end+6]};
 }
 const formattingHeaders=coreFormattingMacroSourceHeaders(tokens);
 const opaqueRegions=coreCarrierCallbackSourceRegions(tokens.slice(body+1,-1)),opaqueTokenEnds=opaqueSourceTokenEnds(tokens,opaqueRegions);
 for(let at=body+1;at<tokens.length-1;at++){const excluded=opaqueTokenEnds.get(at);if(excluded!==undefined){at=excluded-1;continue;}if(++work>200000)return result('complete split projection source scan bound exceeded');if(tokens[at].text!=='.')continue;const projection=projectedSplit(at)??projectedIndex(at);if(projection)for(const pipe of projection.pipes)projectionPipes.add(pipe);}
 for(let at=body+1;at<tokens.length-1;at++){const excluded=opaqueTokenEnds.get(at);if(excluded!==undefined){at=excluded-1;continue;}
  const word=tokens[at].text;if(++work>200000)return result('complete source scan bound exceeded');
  if(word==='#'||['unsafe','async','await','yield','loop','fn','mod','use','extern','macro_rules','trait','impl','struct','enum','union','type','const','static','move'].includes(word)||word==='|'&&!projectionPipes.has(at)||word==='||'&&['=','(',',','{','return','move','=>'].includes(tokens[at-1]?.text)||word!=='!'&&word.endsWith('!')||word==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text)&&!formattingHeaders.has(tokens[at].start))return result('unknown local source producer, closure or macro');
  if(word==='let'){
   const declaration=localAliasDeclaration(tokens,at),binding=declaration?.token;if(!declaration||parameters.has(binding.text)||localNames.has(binding.text))return result('shadowing mutable or destructured local requires separate binding scope');localNames.add(binding.text);
  }
 }
 const localArguments=createTextLocalArgumentSource(tokens.slice(body+1,-1),domains,parameters,{jsonNames:_scoped?.jsonNames??null,opaqueRegions});if(!localArguments)return result('complete text local scope requires separate source selection');let activeDomains=domains;
 function literal(at,characterPattern=false){
  const row=tokens[at],prefix=tokens[at-1];if(row&&prefix&&prefix.end===row.start&&['b','c'].includes(prefix.text))return null;if(characterPattern&&row?.type==='string'&&row.text.startsWith("'")){const scalar=decodeRustCharacter(row.text,{start:row.start,end:row.end});return {after:at+1,replacement:'"\\u{'+scalar.codePointAt(0).toString(16)+'}"',domain:'str',operations:[],characterPattern:true,languageEdits:[{span:[row.start,row.end],expected:row.text,replacement:'"\\u{'+scalar.codePointAt(0).toString(16)+'}"'}]};}return row?.type==='string'&&/^(?:"|r#{0,255}")/u.test(row.text)?{after:at+1,replacement:source.slice(row.start,row.end),domain:'str',operations:[]}:null;
 }
 function count(at){
  const row=tokens[at];if(ident(row)&&activeDomains.get(row.text)==='usize-count')return {after:at+1,replacement:'('+row.text+' as u64)',domain:'u64',operations:[]};const literal=readNativeCountLiteralSource(row?[row]:[]);return literal?{after:at+1,replacement:literal.magnitude+'_u64',domain:'u64',operations:[]}:null;
 }
 function expression(at,depth=0,characterPattern=false){
  if(++work>200000||depth>64)return null;const initial=tokens[at];const initialDomain=activeDomains.get(initial?.text);let value=['str','text-owned'].includes(initialDomain)?{after:at+1,replacement:initial.text,domain:initialDomain,operations:[]}:literal(at,characterPattern);if(!value&&initial?.text==='crate'&&tokens[at+1]?.text==='::'&&tokens[at+2]?.text==='translation_json_fields_core'&&tokens[at+3]?.text==='::'&&tokens[at+5]?.text==='('){let end=close(tokens,at+5);if(end>=0&&tokens[end+1]?.text==='?')end++;const selected=end>=0&&end-at<33?readJsonFieldCallSource(tokens.slice(at,end+1),activeDomains):null;if(selected?.kind==='payload'&&['str','text-owned'].includes(selected.domain))value={after:end+1,replacement:source.slice(initial.start,tokens[end].end),domain:selected.domain,operations:[]};}if(!value&&initial?.text==='crate'&&tokens[at+1]?.text==='::'&&tokens[at+3]?.text==='::'&&tokens[at+5]?.text==='('){let end=close(tokens,at+5);if(end>=0&&tokens[end+1]?.text==='?')end++;const selected=end>=0&&end-at<128?readTextCoreCallSource(tokens.slice(at,end+1),activeDomains):null;if(selected)value={after:end+1,replacement:source.slice(initial.start,tokens[end].end),domain:selected.kind,operations:[]};}if(!value&&(ident(initial)&&tokens[at+1]?.text==='?'||initial?.text==='(')){const last=initial.text==='('?close(tokens,at):at,after=last+1+(tokens[last+1]?.text==='?'?1:0),selected=last>=0&&after-at<=128?readTextCoreCallSource(tokens.slice(at,after),activeDomains):null;if(selected)value={after,replacement:source.slice(initial.start,tokens[after-1].end),domain:selected.kind,operations:[]};}if(!value&&initial?.text==='crate'&&formattingHeaders.has(tokens[at+5]?.start)){const end=close(tokens,at+6),selected=end>=0?readCoreFormattingMacroSource(tokens.slice(at,end+1)):null;if(selected)value={after:end+1,replacement:source.slice(initial.start,tokens[end].end),domain:'text-owned',operations:[]};}if(!value)return null;if(value.characterPattern)return value;
  while(tokens[value.after]?.text==='.'&&ident(tokens[value.after+1])&&tokens[value.after+2]?.text==='('){
   if(++work>200000)return null;const cursor=value.after,method=tokens[cursor+1].text,end=close(tokens,cursor+2);if(end<0)return null;if(method==='as_str'&&value.domain==='text-owned'&&end===cursor+3){value={...value,after:end+1,replacement:'&('+value.replacement+')',domain:'str'};continue;}const projection=projectedSplit(cursor)??projectedIndex(cursor);const copying=['to_owned','to_string'].includes(method)||method==='clone'&&value.domain==='text-owned';let operation=copying?'to_owned':projection?.operation??(plainMethods.has(method)?method:countMethods.get(method)),after=projection?.after??end+1;
   if(!operation||!['str','text-owned'].includes(value.domain))break;const pieces=split(tokens.slice(cursor+3,end)),args=[];
   if(countMethods.has(method)){
    if(method==='len'&&pieces.length||method==='chars'&&pieces.length)break;
    if(method!=='len'){
     if(!['.','count','(',')','as','u64'].every((word,index)=>tokens[after+index]?.text===word))break;after+=6;
    }else{if(tokens[after]?.text!=='as'||tokens[after+1]?.text!=='u64')break;after+=2;}
   }
   if(['strip_prefix','strip_suffix','split_once_left','split_once_right','rsplit_once_left','rsplit_once_right'].includes(operation)&&tokens[after]?.text==='.'&&tokens[after+2]?.text==='('){
    if(tokens[after+1]?.text==='unwrap_or_default'&&tokens[after+3]?.text===')'){operation+='_or_empty';after+=4;}
    else if(tokens[after+1]?.text==='unwrap_or'&&ident(tokens[after+3])&&tokens[after+4]?.text===')'&&value.domain==='str'&&ident(initial)&&value.replacement===initial.text&&tokens[after+3].text===initial.text){operation+='_or_self';after+=5;}
   }
   const row=textContract(operation);if(!row||pieces.length!==row.parameters.length-1)break;let valid=true;
   for(let index=0;index<pieces.length;index++){
    const piece=pieces[index],start=indices.get(piece[0]),argument=row.parameters[index+1]==='u64'?count(start):expression(start,depth+1,index===0&&['contains','starts_with','ends_with','replace','replacen','strip_prefix','strip_suffix','matches','split_once','rsplit_once','find','rfind'].includes(method));
    if(!argument||argument.after!==start+piece.length||argument.domain!==row.parameters[index+1]){valid=false;break;}args.push(argument);
   }
   if(!valid)break;value={after,replacement:row.rustPath+'('+[value.domain==='text-owned'?'&('+value.replacement+')':value.replacement,...args.map(argument=>argument.replacement)].join(', ')+')',domain:row.returns,operations:[...value.operations,...args.flatMap(argument=>argument.operations),row.rustName],languageEdits:[...(value.languageEdits??[]),...args.flatMap(argument=>argument.languageEdits??[])]};
  }
  return value;
 }
 function append(at,value){
  if(!value?.operations.length)return;const span=[tokens[at].start,tokens[value.after-1].end];edits.push({span,expected:source.slice(...span),replacement:value.replacement});languageEdits.push(...value.languageEdits??[]);selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation:value.operations.at(-1),operations:value.operations,receiver:tokens[at].text,domain:'str',oldTraitDispatchProved:false,oldDropTimingProved:false,executableAdmission:false,evaluationOrder:['immutable-str-receiver-once','source-arguments-left-to-right','same-native-operation-chain'],...(localArguments.evidence(tokens[at].text)?{localReceiverSource:localArguments.evidence(tokens[at].text)}:{})});
 }
 for(let at=body+1;at<tokens.length-1;at++){const excluded=opaqueTokenEnds.get(at);if(excluded!==undefined){at=excluded-1;continue;}
  if(++work>200000)return result('complete adoption expression scan bound exceeded');activeDomains=localArguments.at(tokens[at].start);
  if(tokens[at].text==='let'){
   const initializer=readLocalAliasInitializer(tokens,at,readTextWrittenAliasDomain);if(!initializer)continue;const equal=initializer.start-1;
   if(tokens[equal]?.text!=='=')continue;activeDomains=localArguments.at(tokens[equal+1]?.start);const value=expression(equal+1);if(!value||tokens[value.after]?.text!==';'){at=equal;continue;}if(value.operations.length)localArguments.selectedCall({span:[tokens[equal+1].start,tokens[value.after-1].end],terminator:tokens[value.after],operation:value.operations.at(-1),returnsKind:value.domain});append(equal+1,value);at=value.after-1;continue;
  }
  if(['.','::'].includes(tokens[at-1]?.text))continue;const value=expression(at);if(value?.operations.length){append(at,value);at=value.after-1;}
 }
 return result(edits.length?null:'no closed immutable text method expression');
}

import {decodeRustCharacter} from './extensions/rust-character.mjs';

import {localAliasDeclaration} from './local-alias-binding-source.mjs';

import {readJsonFieldCallSource} from './json-field-call-source.mjs';
import {readJsonReceiverWrittenSourceRole} from './json-receiver-source.mjs';

import {splitRustTryDotSourceTokens} from './rust-try-token-source.mjs';

import {readTextCoreCallSource} from './text-core-call-source.mjs';
import {readPrimitiveCoreParameterSourceRole} from './primitive-core-call-source.mjs';
import {coreCarrierCallbackSourceRegions} from './core-carrier-callback-source-regions.mjs';
import {opaqueSourceTokenEnds} from './opaque-source-token-regions.mjs';

import {coreFormattingMacroSourceHeaders} from './core-formatting-macro-source.mjs';

import {readCoreFormattingMacroSource} from './core-formatting-macro-source.mjs';
