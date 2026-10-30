// Candidate source equations only. Every selected whole function must later
// pass the original semantic, type, ownership, source and emission checks.
import {textContract} from './text-contracts.mjs';
const countMethods=new Map([['len','len_utf8'],['chars','len_chars'],['matches','matches_count']]);
const plainMethods=new Set(['trim','trim_start','trim_end','is_empty','contains','starts_with','ends_with','replace','replacen','repeat','strip_prefix','strip_suffix']);
const borrowed=source=>/^&(?:'[a-zA-Z_][a-zA-Z0-9_]*)?(?:str|crate::translation_core::Str)$/u.test(source);
export function selectTextMethodAdoption(source,item,_scoped,modulePath,_names,helpers){
 const {originalDeclarationHeader,close,split,text,ident}=helpers,tokens=item.tokens.filter(row=>row.type!=='comment'),indices=new Map(tokens.map((token,index)=>[token,index])),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(row=>row.start===header?.nameSpan?.start),edits=[],selections=[],skipped=[];
 const result=reason=>({edits:reason?[]:edits,selections:reason?[]:selections,skipped:reason?[...skipped,{function:item.name,reason}]:skipped});
 if(name<0||tokens.length>200000||tokens.slice(0,name).some(row=>['unsafe','async','const','extern'].includes(row.text)))return result('complete ordinary synchronous text function required');
 let open=name+1;if(tokens[open]?.text==='<'){
  let end=open+1;while(end<tokens.length&&tokens[end].text!=='>')end++;
  if(end>=tokens.length||!/^<(?:'[a-zA-Z_][a-zA-Z0-9_]*,?)+>$/u.test(text(tokens.slice(open,end+1))))return result('only written unconstrained lifetime parameters are source candidates');open=end+1;
 }
 if(tokens[open]?.text!=='(')return result('complete written input list required');const endParameters=close(tokens,open);if(endParameters<0)return result('complete original inputs required');let body=endParameters+1;while(body<tokens.length&&tokens[body].text!=='{')body++;if(body>=tokens.length||close(tokens,body)!==tokens.length-1)return result('complete original function body required');
 const domains=new Map(),parameters=new Set();for(const row of split(tokens.slice(open+1,endParameters))){if(!ident(row[0])||row[1]?.text!==':'||parameters.has(row[0].text))return result('distinct immutable input bindings required');parameters.add(row[0].text);if(borrowed(text(row.slice(2))))domains.set(row[0].text,'str');}
 if(!domains.size)return result('an actual written immutable str input is required');
 const localNames=new Set();let work=0;
 for(let at=body+1;at<tokens.length-1;at++){
  const word=tokens[at].text;if(++work>200000)return result('complete source scan bound exceeded');
  if(word==='#'||['unsafe','async','await','yield','loop','fn','mod','use','extern','macro_rules','trait','impl','struct','enum','union','type','const','static','move','|'].includes(word)||word==='||'&&['=','(',',','{','return','move','=>'].includes(tokens[at-1]?.text)||word!=='!'&&word.endsWith('!')||word==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text))return result('unknown local source producer, closure or macro');
  if(word==='for')return result('iterator binding scope requires a separate adoption sequence');
  if(word==='let'){
   const binding=tokens[at+1];if(!ident(binding)||binding.text==='mut'||parameters.has(binding.text)||localNames.has(binding.text)||!['=',':'].includes(tokens[at+2]?.text))return result('shadowing mutable or destructured local requires separate binding scope');localNames.add(binding.text);
  }
 }
 function literal(at){
  const row=tokens[at];return row?.type==='string'&&/^(?:"|r#{0,255}")/u.test(row.text)?{after:at+1,replacement:source.slice(row.start,row.end),domain:'str',operations:[]}:null;
 }
 function count(at){
  const row=tokens[at];if(row?.type!=='number')return null;const match=/^(0|[1-9][0-9_]{0,25})(?:_?(?:usize|u64))?$/u.exec(row.text);if(!match)return null;const digits=match[1].replaceAll('_','');if(digits.length>20||BigInt(digits)>18446744073709551615n)return null;return {after:at+1,replacement:digits+'_u64',domain:'u64',operations:[]};
 }
 function expression(at,depth=0){
  if(++work>200000||depth>64)return null;const initial=tokens[at];let value=domains.get(initial?.text)==='str'?{after:at+1,replacement:initial.text,domain:'str',operations:[]}:literal(at);if(!value)return null;
  while(tokens[value.after]?.text==='.'&&ident(tokens[value.after+1])&&tokens[value.after+2]?.text==='('){
   if(++work>200000)return null;const cursor=value.after,method=tokens[cursor+1].text,end=close(tokens,cursor+2);if(end<0)return null;let operation=plainMethods.has(method)?method:countMethods.get(method),after=end+1;
   if(!operation||value.domain!=='str')break;const pieces=split(tokens.slice(cursor+3,end)),args=[];
   if(countMethods.has(method)){
    if(method==='len'&&pieces.length||method==='chars'&&pieces.length)break;
    if(method!=='len'){
     if(!['.','count','(',')','as','u64'].every((word,index)=>tokens[after+index]?.text===word))break;after+=6;
    }else{if(tokens[after]?.text!=='as'||tokens[after+1]?.text!=='u64')break;after+=2;}
   }
   const row=textContract(operation);if(!row||pieces.length!==row.parameters.length-1)break;let valid=true;
   for(let index=0;index<pieces.length;index++){
    const piece=pieces[index],start=indices.get(piece[0]),argument=row.parameters[index+1]==='u64'?count(start):expression(start,depth+1);
    if(!argument||argument.after!==start+piece.length||argument.domain!==row.parameters[index+1]){valid=false;break;}args.push(argument);
   }
   if(!valid)break;value={after,replacement:row.rustPath+'('+[value.replacement,...args.map(argument=>argument.replacement)].join(', ')+')',domain:row.returns,operations:[...value.operations,...args.flatMap(argument=>argument.operations),row.rustName]};
  }
  return value;
 }
 function append(at,value){
  if(!value?.operations.length)return;const span=[tokens[at].start,tokens[value.after-1].end];edits.push({span,expected:source.slice(...span),replacement:value.replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation:value.operations.at(-1),operations:value.operations,receiver:tokens[at].text,domain:'str',oldTraitDispatchProved:false,oldDropTimingProved:false,executableAdmission:false,evaluationOrder:['immutable-str-receiver-once','source-arguments-left-to-right','same-native-operation-chain']});
 }
 for(let at=body+1;at<tokens.length-1;at++){
  if(++work>200000)return result('complete adoption expression scan bound exceeded');
  if(tokens[at].text==='let'){
   const name=tokens[at+1].text;let equal=at+2;if(tokens[equal].text===':'){equal++;while(equal<tokens.length&&!['=',';','{','}'].includes(tokens[equal].text))equal++;if(!borrowed(text(tokens.slice(at+3,equal))))continue;}
   if(tokens[equal]?.text!=='=')continue;const value=expression(equal+1);if(!value||tokens[value.after]?.text!==';')continue;if(value.domain==='str')domains.set(name,'str');append(equal+1,value);at=value.after-1;continue;
  }
  if(['.','::'].includes(tokens[at-1]?.text))continue;const value=expression(at);if(value?.operations.length){append(at,value);at=value.after-1;}
 }
 return result(edits.length?null:'no closed immutable text method expression');
}
