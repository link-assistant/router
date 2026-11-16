// Candidate source equations only. Every selected whole function must later
// pass the original semantic, type, ownership, source and emission checks.
import {textContract} from './text-contracts.mjs';
const countMethods=new Map([['len','len_utf8'],['chars','len_chars'],['matches','matches_count']]);
const plainMethods=new Set(['trim','trim_start','trim_end','is_empty','contains','starts_with','ends_with','replace','replacen','repeat','strip_prefix','strip_suffix','to_ascii_lowercase','to_ascii_uppercase','is_ascii','eq_ignore_ascii_case','trim_ascii','trim_ascii_start','trim_ascii_end']);
const borrowed=source=>/^&(?:'[a-zA-Z_][a-zA-Z0-9_]*)?(?:str|crate::translation_core::Str)$/u.test(source);
export function selectTextMethodAdoption(source,item,_scoped,modulePath,_names,helpers){
 const {originalDeclarationHeader,close,split,text,ident}=helpers,tokens=item.tokens.filter(row=>row.type!=='comment'),indices=new Map(tokens.map((token,index)=>[token,index])),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(row=>row.start===header?.nameSpan?.start),edits=[],languageEdits=[],selections=[],skipped=[];
 const result=reason=>({edits:reason?[]:edits,languageEdits:reason?[]:languageEdits,selections:reason?[]:selections,skipped:reason?[...skipped,{function:item.name,reason}]:skipped});
 if(name<0||tokens.length>200000||tokens.slice(0,name).some(row=>['unsafe','async','const','extern'].includes(row.text)))return result('complete ordinary synchronous text function required');
 let open=name+1;if(tokens[open]?.text==='<'){
  let end=open+1;while(end<tokens.length&&tokens[end].text!=='>')end++;
  if(end>=tokens.length||!/^<(?:'[a-zA-Z_][a-zA-Z0-9_]*,?)+>$/u.test(text(tokens.slice(open,end+1))))return result('only written unconstrained lifetime parameters are source candidates');open=end+1;
 }
 if(tokens[open]?.text!=='(')return result('complete written input list required');const endParameters=close(tokens,open);if(endParameters<0)return result('complete original inputs required');let body=endParameters+1;while(body<tokens.length&&tokens[body].text!=='{')body++;if(body>=tokens.length||close(tokens,body)!==tokens.length-1)return result('complete original function body required');
 const domains=new Map(),parameters=new Set();for(const row of split(tokens.slice(open+1,endParameters))){if(!ident(row[0])||row[1]?.text!==':'||parameters.has(row[0].text))return result('distinct immutable input bindings required');parameters.add(row[0].text);if(borrowed(text(row.slice(2))))domains.set(row[0].text,'str');else if(text(row.slice(2))==='String')domains.set(row[0].text,'text-owned');}
 if(!domains.size)return result('an actual written immutable str or owned String input is required');
 const localNames=new Set(),projectionPipes=new Set();let work=0;
 // Only this complete destructuring identity closure can be substituted.
 // These are source candidates; actual owner/type/effect checks still follow.
 function projectedSplit(cursor){
  if(++work>200000||tokens[cursor]?.text!=='.'||!['split_once','rsplit_once'].includes(tokens[cursor+1]?.text)||tokens[cursor+2]?.text!=='(')return null;const end=close(tokens,cursor+2);if(end<0)return null;
  if(!['.','map','(','|','('].every((word,index)=>tokens[end+1+index]?.text===word)||tokens[end+7]?.text!==','||tokens[end+9]?.text!==')'||tokens[end+10]?.text!=='|'||tokens[end+12]?.text!==')')return null;
  const left=tokens[end+6],right=tokens[end+8],output=tokens[end+11];if(!ident(left)||!ident(right)||!ident(output)||output.text==='_'||left.text!=='_'&&left.text===right.text)return null;const side=output.text===left.text?'left':output.text===right.text?'right':null;if(!side)return null;return {operation:tokens[cursor+1].text+'_'+side,after:end+13,pipes:[end+4,end+10]};
 }
 for(let at=body+1;at<tokens.length-1;at++){if(++work>200000)return result('complete split projection source scan bound exceeded');if(tokens[at].text!=='.')continue;const projection=projectedSplit(at);if(projection)for(const pipe of projection.pipes)projectionPipes.add(pipe);}
 for(let at=body+1;at<tokens.length-1;at++){
  const word=tokens[at].text;if(++work>200000)return result('complete source scan bound exceeded');
  if(word==='#'||['unsafe','async','await','yield','loop','fn','mod','use','extern','macro_rules','trait','impl','struct','enum','union','type','const','static','move'].includes(word)||word==='|'&&!projectionPipes.has(at)||word==='||'&&['=','(',',','{','return','move','=>'].includes(tokens[at-1]?.text)||word!=='!'&&word.endsWith('!')||word==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text))return result('unknown local source producer, closure or macro');
  if(word==='for')return result('iterator binding scope requires a separate adoption sequence');
  if(word==='let'){
   const binding=tokens[at+1];if(!ident(binding)||binding.text==='mut'||parameters.has(binding.text)||localNames.has(binding.text)||!['=',':'].includes(tokens[at+2]?.text))return result('shadowing mutable or destructured local requires separate binding scope');localNames.add(binding.text);
  }
 }
 function literal(at,characterPattern=false){
  const row=tokens[at];if(characterPattern&&row?.type==='string'&&row.text.startsWith("'")){const scalar=decodeRustCharacter(row.text,{start:row.start,end:row.end});return {after:at+1,replacement:'"\\u{'+scalar.codePointAt(0).toString(16)+'}"',domain:'str',operations:[],characterPattern:true,languageEdits:[{span:[row.start,row.end],expected:row.text,replacement:'"\\u{'+scalar.codePointAt(0).toString(16)+'}"'}]};}return row?.type==='string'&&/^(?:"|r#{0,255}")/u.test(row.text)?{after:at+1,replacement:source.slice(row.start,row.end),domain:'str',operations:[]}:null;
 }
 function count(at){
  const row=tokens[at];if(row?.type!=='number')return null;const match=/^(0|[1-9][0-9_]{0,25})(?:_?(?:usize|u64))?$/u.exec(row.text);if(!match)return null;const digits=match[1].replaceAll('_','');if(digits.length>20||BigInt(digits)>18446744073709551615n)return null;return {after:at+1,replacement:digits+'_u64',domain:'u64',operations:[]};
 }
 function expression(at,depth=0,characterPattern=false){
  if(++work>200000||depth>64)return null;const initial=tokens[at];const initialDomain=domains.get(initial?.text);let value=['str','text-owned'].includes(initialDomain)?{after:at+1,replacement:initial.text,domain:initialDomain,operations:[]}:literal(at,characterPattern);if(!value)return null;if(value.characterPattern)return value;
  while(tokens[value.after]?.text==='.'&&ident(tokens[value.after+1])&&tokens[value.after+2]?.text==='('){
   if(++work>200000)return null;const cursor=value.after,method=tokens[cursor+1].text,end=close(tokens,cursor+2);if(end<0)return null;if(method==='as_str'&&value.domain==='text-owned'&&end===cursor+3){value={...value,after:end+1,replacement:'&('+value.replacement+')',domain:'str'};continue;}const projection=projectedSplit(cursor);let operation=projection?.operation??(plainMethods.has(method)?method:countMethods.get(method)),after=projection?.after??end+1;
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
    const piece=pieces[index],start=indices.get(piece[0]),argument=row.parameters[index+1]==='u64'?count(start):expression(start,depth+1,index===0&&['contains','starts_with','ends_with','replace','replacen','strip_prefix','strip_suffix','matches','split_once','rsplit_once'].includes(method));
    if(!argument||argument.after!==start+piece.length||argument.domain!==row.parameters[index+1]){valid=false;break;}args.push(argument);
   }
   if(!valid)break;value={after,replacement:row.rustPath+'('+[value.domain==='text-owned'?'&('+value.replacement+')':value.replacement,...args.map(argument=>argument.replacement)].join(', ')+')',domain:row.returns,operations:[...value.operations,...args.flatMap(argument=>argument.operations),row.rustName],languageEdits:[...(value.languageEdits??[]),...args.flatMap(argument=>argument.languageEdits??[])]};
  }
  return value;
 }
 function append(at,value){
  if(!value?.operations.length)return;const span=[tokens[at].start,tokens[value.after-1].end];edits.push({span,expected:source.slice(...span),replacement:value.replacement});languageEdits.push(...value.languageEdits??[]);selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation:value.operations.at(-1),operations:value.operations,receiver:tokens[at].text,domain:'str',oldTraitDispatchProved:false,oldDropTimingProved:false,executableAdmission:false,evaluationOrder:['immutable-str-receiver-once','source-arguments-left-to-right','same-native-operation-chain']});
 }
 for(let at=body+1;at<tokens.length-1;at++){
  if(++work>200000)return result('complete adoption expression scan bound exceeded');
  if(tokens[at].text==='let'){
   const name=tokens[at+1].text;let equal=at+2;if(tokens[equal].text===':'){equal++;while(equal<tokens.length&&!['=',';','{','}'].includes(tokens[equal].text))equal++;if(!borrowed(text(tokens.slice(at+3,equal))))continue;}
   if(tokens[equal]?.text!=='=')continue;const value=expression(equal+1);if(!value||tokens[value.after]?.text!==';')continue;if(['str','text-owned'].includes(value.domain))domains.set(name,value.domain);append(equal+1,value);at=value.after-1;continue;
  }
  if(['.','::'].includes(tokens[at-1]?.text))continue;const value=expression(at);if(value?.operations.length){append(at,value);at=value.after-1;}
 }
 return result(edits.length?null:'no closed immutable text method expression');
}

import {decodeRustCharacter} from './extensions/rust-character.mjs';
