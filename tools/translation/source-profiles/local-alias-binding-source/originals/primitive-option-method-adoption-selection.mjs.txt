// Proposal-only source substitutions. Installation requires every actual whole
// function to pass the original type/ownership/source/emission checks afresh.
import {primitiveOptionContract} from './primitive-option-contracts.mjs';
import {createPrimitiveCarrierLocalSource} from './primitive-carrier-local-source.mjs';
const methods=new Set(['is_some','is_none','unwrap_or','unwrap','expect','and','or']);
const words=tokens=>tokens.map(token=>token.text+(token.text.startsWith("'")?' ':'')).join('');
function scalarRole(source){source=source.replace(/&'[a-zA-Z_][a-zA-Z0-9_]*\s+/gu,'&').replace(/\s+/gu,'');if(['bool','u64','i64'].includes(source))return {kind:'payload',domain:source};if(['&str','&crate::translation_core::Str','&::std::primitive::str','&::core::primitive::str'].includes(source))return {kind:'payload',domain:'str'};return null;}
function role(tokens,scoped){const source=words(tokens),optional=/^(?:(?:::)?(?:std|core)::option::Option|Option|crate::translation_core::Maybe)<([\s\S]+)>$/u.exec(source),payload=scalarRole(optional?optional[1]:source);if(payload)return {...payload,kind:optional?'option':'payload'};const normalized=source.replace(/&'[a-zA-Z_][a-zA-Z0-9_]*\s+/gu,'&').replace(/\s+/gu,'');if(!optional&&normalized.startsWith('&')&&(['crate::translation_core::Json','serde_json::Value','::serde_json::Value'].includes(normalized.slice(1))||scoped?.jsonNames.has(normalized.slice(1))))return {kind:'json',domain:'json'};return null;}
export function selectPrimitiveOptionMethodAdoption(source,item,_scoped,modulePath,_names,helpers){
 const {originalDeclarationHeader,close,split,ident}=helpers,tokens=item.tokens.filter(token=>token.type!=='comment'),indices=new Map(tokens.map((token,index)=>[token,index])),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),edits=[],selections=[];
 const result=reason=>({edits:reason?[]:edits,selections:reason?[]:selections,skipped:reason?[{function:item.name,reason}]:[]});if(name<0||tokens.length>200000||tokens.slice(0,name).some(token=>['async','unsafe','const','extern'].includes(token.text)))return result('complete ordinary primitive Option function required');
 let open=name+1;if(tokens[open]?.text==='<'){let end=open+1;while(end<tokens.length&&tokens[end].text!=='>')end++;if(!/^<(?:'[a-zA-Z_][a-zA-Z0-9_]*\s*,?)+>$/u.test(words(tokens.slice(open,end+1))))return result('only closed lifetime parameters may precede primitive Option inputs');open=end+1;}
 if(tokens[open]?.text!=='(')return result('ordinary complete input list required');const endParameters=close(tokens,open);if(endParameters<0)return result('complete original input delimiters required');let body=endParameters+1;while(body<tokens.length&&tokens[body].text!=='{')body++;if(body>=tokens.length||close(tokens,body)!==tokens.length-1)return result('one complete original source body required');
 const parameterDomains=new Map(),parameters=new Set();for(const row of split(tokens.slice(open+1,endParameters))){if(!ident(row[0])||row[1]?.text!==':'||parameters.has(row[0].text))return result('distinct immutable typed input bindings required');parameters.add(row[0].text);const value=role(row.slice(2),_scoped);if(value)parameterDomains.set(row[0].text,value);}
 const localNames=new Set();let work=0;
 for(let at=body+1;at<tokens.length-1;at++){
  const word=tokens[at].text;if(++work>200000)return result('complete source scan bound exceeded');
  if(word==='#'||['async','unsafe','await','yield','fn','mod','use','extern','macro_rules','macro','trait','impl','struct','enum','union','type','const','static','move','for','|'].includes(word)||word==='||'&&['=','(',',','return','{','=>'].includes(tokens[at-1]?.text)||word!=='!'&&word.endsWith('!')||word==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text))return result('unknown producer closure pattern or macro scope');
  if(word==='let'){const binding=tokens[at+1];if(!ident(binding)||binding.text==='mut'||parameters.has(binding.text)||localNames.has(binding.text)||!['=',':'].includes(tokens[at+2]?.text))return result('shadowed mutable or destructured local requires separate binding rules');localNames.add(binding.text);}
 }
 const localArguments=createPrimitiveCarrierLocalSource(tokens.slice(body+1,-1),parameterDomains,parameters,{readWrittenRole:tokens=>role(tokens,_scoped)});if(!localArguments)return result('complete carrier local scope requires separate source selection');let env=parameterDomains;
 function operand(piece,wanted,depth){
  if(!piece.length)return null;const start=indices.get(piece[0]),value=expression(start,depth+1);if(value&&value.after===start+piece.length&&value.kind===wanted.kind&&value.domain===wanted.domain)return value;
  if(wanted.kind!=='payload')return null;const raw=source.slice(piece[0].start,piece.at(-1).end);
  if(wanted.domain==='str'&&piece.length===1&&piece[0].type==='string'&&/^(?:"|r#{0,255}")/u.test(piece[0].text))return {replacement:raw,operations:[]};
  if(wanted.domain==='bool'&&piece.length===1&&['true','false'].includes(piece[0].text))return {replacement:raw,operations:[]};
  if(!['u64','i64'].includes(wanted.domain))return null;const negative=piece[0]?.text==='-',literal=piece[negative?1:0];if(piece.length!==(negative?2:1)||literal?.type!=='number')return null;const match=/^(0|[1-9][0-9_]{0,25})(?:_?(u64|i64))?$/u.exec(literal.text);if(!match||match[2]&&match[2]!==wanted.domain||negative&&wanted.domain!=='i64')return null;const digits=match[1].replaceAll('_','');if(digits.length>20)return null;const number=BigInt(digits)*(negative?-1n:1n);if(number<(wanted.domain==='i64'?-9223372036854775808n:0n)||number>(wanted.domain==='i64'?9223372036854775807n:18446744073709551615n))return null;return {replacement:(negative?'-':'')+digits+'_'+wanted.domain,operations:[]};
 }
 function expression(at,depth=0){
  if(++work>200000||depth>64)return null;const token=tokens[at],known=env.get(token?.text);if(!known)return null;let value={...known,replacement:token.text,after:at+1,operations:[]};
  if(value.kind==='json'){
   const reader={as_bool:'bool',as_u64:'u64',as_i64:'i64',as_str:'str'}[tokens[value.after+1]?.text];if(reader&&tokens[value.after]?.text==='.'&&tokens[value.after+2]?.text==='('&&tokens[value.after+3]?.text===')')value={replacement:source.slice(token.start,tokens[value.after+3].end),after:value.after+4,kind:'option',domain:reader,operations:[]};
  }
  while(value.kind==='option'&&tokens[value.after]?.text==='.'&&ident(tokens[value.after+1])&&tokens[value.after+2]?.text==='('){
   if(++work>200000)return null;const cursor=value.after,method=tokens[cursor+1].text;if(!methods.has(method))break;const row=primitiveOptionContract(value.domain+'_'+method);if(!row)break;const end=close(tokens,cursor+2);if(end<0)return null;let after=end+1;
   if(value.domain==='str'&&['unwrap_or','unwrap','expect'].includes(method)){
    if(tokens[after]?.text!=='.'||!['to_owned','to_string'].includes(tokens[after+1]?.text)||tokens[after+2]?.text!=='('||tokens[after+3]?.text!==')')break;after+=4;
   }
   const pieces=split(tokens.slice(cursor+3,end));if(pieces.length!==row.parameters.length-1)break;const args=pieces.map((piece,index)=>{const role=row.parameters[index+1],kind=['bool-option','u64-option','i64-option','str-option-ref'].includes(role)?'option':'payload',domain=role==='str'?'str':kind==='option'?value.domain:role;return operand(piece,{kind,domain},depth);});if(args.some(argument=>!argument))break;
   const optional=['bool-option','u64-option','i64-option','str-option-ref'].includes(row.returns);value={replacement:row.rustPath+'('+[value.replacement,...args.map(argument=>argument.replacement)].join(', ')+')',kind:optional?'option':'payload',domain:optional?value.domain:row.returns==='text-owned'?'owned-str':row.returns,after,operations:[...value.operations,...args.flatMap(argument=>argument.operations),row.rustName]};
  }return value;
 }
 function append(at,value){if(!value?.operations.length)return;const span=[tokens[at].start,tokens[value.after-1].end];edits.push({span,expected:source.slice(...span),replacement:value.replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation:value.operations.at(-1),operations:value.operations,domain:value.domain,oldTraitDispatchProved:false,oldDropTimingProved:false,executableAdmission:false,...(localArguments.evidence(tokens[at].text)?{localReceiverSource:localArguments.evidence(tokens[at].text)}:{}),evaluationOrder:['actual-immutable-Copy-Option-receiver-once','already-evaluated-parameters-or-closed-literals-left-to-right']});}
 for(let at=body+1;at<tokens.length-1;at++){
  if(++work>200000)return result('complete source expression bound exceeded');env=localArguments.at(tokens[at].start);
  if(tokens[at].text==='let'){
   const name=tokens[at+1].text;let equal=at+2,written=null;if(tokens[equal].text===':'){equal++;while(equal<tokens.length&&!['=',';','{','}'].includes(tokens[equal].text))equal++;written=role(tokens.slice(at+3,equal),_scoped);}
   if(tokens[equal]?.text!=='=')continue;env=localArguments.at(tokens[equal+1]?.start);const value=expression(equal+1);if(value&&tokens[value.after]?.text===';'){if((!written||written.kind===value.kind&&written.domain===value.domain)&&value.operations.length)localArguments.selectedCall({span:[tokens[equal+1].start,tokens[value.after-1].end],terminator:tokens[value.after],operation:value.operations.at(-1),resultRole:{kind:value.kind,domain:value.domain}});append(equal+1,value);at=value.after-1;}else at=equal;continue;
  }
  if(['.','::'].includes(tokens[at-1]?.text))continue;const value=expression(at);if(value?.operations.length){append(at,value);at=value.after-1;}
 }return result(edits.length?null:'no closed primitive Option method expression');
}
