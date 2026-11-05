// Closed syntax candidates only. The receiver/source-role scope is captured by
// the complete copied adopter; every resulting whole function must recheck.
import {jsonFieldContract} from './json-field-contracts.mjs';
import {readNativeCountLiteralSource} from './native-integer-literal-source.mjs';
import {createJsonFieldLocalSource} from './json-field-local-source.mjs';
import {readTextAliasOperand} from './text-local-argument-source.mjs';
export function selectJsonFieldAdoption(source,item,scoped,modulePath,names,helpers){
 const {originalDeclarationHeader,close,split,text,ident,macroAt}=helpers,tokens=item.tokens.filter(token=>token.type!=='comment'),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),edits=[],selections=[],skipped=[];
 const result=reason=>({edits,selections,skipped:reason?[...skipped,{function:item.name,reason}]:skipped});if(name<0||tokens.length>200000)return result('bounded original function required');
 let open=name+1;
 if(tokens[open]?.text==='<'){let end=open+1;while(end<tokens.length&&tokens[end].text!=='>')end++;const lifetimes=split(tokens.slice(open+1,end));if(!lifetimes.length||lifetimes.some(row=>row.length!==1||row[0].type!=='char'||!/^'[A-Za-z_][A-Za-z0-9_]*$/u.test(row[0].text)))return result('only original named lifetime parameters are admitted');open=end+1;}
 if(tokens[open]?.text!=='(')return result('ordinary original parameter list required');const parametersEnd=close(tokens,open);if(parametersEnd<0)return result('complete original function header required');
 let body=parametersEnd+1;while(body<tokens.length&&tokens[body].text!=='{')body++;if(body>=tokens.length||close(tokens,body)!==tokens.length-1||tokens.slice(0,name).some(token=>['unsafe','async','const','extern'].includes(token.text)))return result('bounded ordinary synchronous function required');
 const C='crate::translation_core::',jsonNames=new Set([C+'Json',...scoped.jsonNames]),strNames=new Set(['str',C+'Str']),receivers=new Set(),keys=new Set(),textValues=new Set(),countKeys=new Set(),allParameters=new Set(),parameters=split(tokens.slice(open+1,parametersEnd));
 for(const row of parameters){if(!ident(row[0])||row[1]?.text!==':'||allParameters.has(row[0].text))return result('distinct actual immutable input parameters required');allParameters.add(row[0].text);const type=row.slice(2);if(['String','std::string::String','::std::string::String'].includes(text(type)))textValues.add(row[0].text);if(['usize','::std::primitive::usize','::core::primitive::usize'].includes(text(type)))countKeys.add(row[0].text);if(type[0]?.text!=='&')continue;const shared=text(type.slice(type[1]?.type==='char'?2:1));if(jsonNames.has(shared))receivers.add(row[0].text);if(strNames.has(shared))keys.add(row[0].text);}
 if(!receivers.size)return result('actual shared canonical Json parameter required');
 const parameterDomains=new Map([...receivers].map(name=>[name,'json-reference']).concat([...keys].map(name=>[name,'str']),[...textValues].map(name=>[name,'text-owned']),[...countKeys].map(name=>[name,'usize-count']))),localArguments=createJsonFieldLocalSource(tokens.slice(body+1,-1),parameterDomains,allParameters);
 const shadowed=new Set(),watched=new Set([...receivers,...keys,...textValues,...countKeys,...(localArguments?.names??[])]),members={as_str:'json_str_field',as_bool:'json_bool_field',as_u64:'json_u64_field',as_i64:'json_i64_field'};
 const note=(start,end)=>{for(let at=start;at<end;at++)if(watched.has(tokens[at].text))shadowed.add(tokens[at].text);};
 for(let at=body+1;at<tokens.length;at++){
  const macro=macroAt(tokens,at,'json')??macroAt(tokens,at,'format');if(macro){at=macro.end;continue;}
  const word=tokens[at].text;if(word==='for'&&!localArguments)return result('ordinary unshadowed complete iterator pattern source required');if(word==='#'||['unsafe','async','await','yield','while','loop','fn','mod','use','extern','macro_rules','trait','impl','struct','enum','union','type','const','static','move'].includes(word)||word.endsWith('!')&&word!=='!'||word==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text)&&!['if','else','return','match'].includes(tokens[at-1].text))return result('local producer, effect, loop or unknown expansion uncertainty');
  if(word==='let'){let end=at+1;while(end<tokens.length&&!['=',':',';','{','}'].includes(tokens[end].text))end++;if(!localArguments?.names.has(tokens[at+1]?.text))note(at+1,end);}
  if(word==='|'&&['=','(',',','return','{','=>'].includes(tokens[at-1]?.text)){
   const endCall=tokens[at-1]?.text==='('&&tokens[at-2]?.text==='and_then'?close(tokens,at-1):-1;if(endCall>=0&&scalar(tokens.slice(at,endCall))){at=endCall;continue;}
   let end=at+1;while(end<tokens.length&&tokens[end].text!=='|')end++;note(at+1,end);
  }
  if(word==='=>'){let start=at-1;while(start>body&&!['{','}',',',';'].includes(tokens[start-1]?.text))start--;note(start,at);}
 }
 function scalar(args){
  const path=text(args);for(const [member,operation]of Object.entries(members))for(const owner of jsonNames)if(path===owner+'::'+member)return {member,operation};
  if(args[0]?.text!=='|'||!ident(args[1])||args[2]?.text!=='|')return null;let tail=args.slice(3);if(tail[0]?.text==='{'&&close(tail,0)===tail.length-1)tail=tail.slice(1,-1);if(tail.length!==5||tail[0].text!==args[1].text||tail[1].text!=='.'||tail[3].text!=='('||tail[4].text!==')'||!members[tail[2].text])return null;return {member:tail[2].text,operation:members[tail[2].text]};
 }
 for(let at=body+1;at<tokens.length;at++){
  if(!ident(tokens[at])||['.','::'].includes(tokens[at-1]?.text)||shadowed.has(tokens[at].text)||tokens[at+1]?.text!=='.'||tokens[at+2]?.text!=='get'||tokens[at+3]?.text!=='(')continue;const visible=localArguments?.at(tokens[at].start)??parameterDomains;if(visible.get(tokens[at].text)!=='json-reference')continue;
  const getterEnd=close(tokens,at+3);if(getterEnd<0)continue;const argument=tokens.slice(at+4,getterEnd);if(argument.length!==1&&argument.length!==5)continue;const key=argument[0],keyOperand=readTextAliasOperand(argument,visible),literal=argument.length===1&&key.type==='string'&&/^(?:"|r#{0,255}")/u.test(key.text),borrowed=keyOperand?.kind==='str'&&!literal&&!shadowed.has(key.text),numericBinding=keyOperand?.kind==='usize-count'&&!shadowed.has(key.text),numericLiteral=readNativeCountLiteralSource(argument,{suffixes:['','usize'],maximum:'4294967295'}),numeric=numericBinding||numericLiteral;if(!literal&&!borrowed&&!numeric)continue;
  let end=getterEnd+1,operation=numeric?'json_index':'json_field',member=null;
  if(!numeric&&tokens[end]?.text==='.'&&tokens[end+1]?.text==='and_then'&&tokens[end+2]?.text==='('){const closeThen=close(tokens,end+2),selected=closeThen<0?null:scalar(tokens.slice(end+3,closeThen));if(selected){operation=selected.operation;member=selected.member;end=closeThen+1;}}
  const row=jsonFieldContract(operation);if(!row)continue;const keySource=source.slice(key.start,argument.at(-1).end),span=[tokens[at].start,tokens[end-1].end],receiver=tokens[at].text,replacement=row.rustPath+'('+receiver+', '+(numericBinding?'('+keySource+' as u64)':numericLiteral?numericLiteral.magnitude+'_u64':keySource)+')';
  edits.push({span,expected:source.slice(...span),replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation,receiver,keySource,member,keyKind:numericBinding?'native-usize-binding':numericLiteral?'closed-index-literal':borrowed?'shared-text-binding':'closed-text-literal',...(localArguments?.evidence(receiver)?{localReceiverSource:localArguments.evidence(receiver)}:{}),...(localArguments?.evidence(key.text)?{localKeySource:localArguments.evidence(key.text)}:{}),oldTraitDispatchProved:false,executableAdmission:false,evaluationOrder:['receiver-once','key-once','conditional-canonical-reader']});at=end-1;
 }
 return result(edits.length?null:'no closed canonical field/index reader source');
}
