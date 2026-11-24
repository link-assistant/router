// Source candidates only; original method/Drop dispatch remains unproved.
import {ownedOutcomeContract} from './owned-outcome-contracts.mjs';
export function selectOwnedCarrierAdoption(source,item,scoped,modulePath,names,helpers){
 const {originalDeclarationHeader,close,split,text,ident,macroAt}=helpers,tokens=item.tokens.filter(token=>token.type!=='comment'),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),edits=[],selections=[],skipped=[];
 const result=reason=>({edits,selections,skipped:reason?[...skipped,{function:item.name,reason}]:skipped});if(name<0||tokens.length>200000)return result('complete bounded original function required');
 let open=name+1;if(tokens[open]?.text==='<'){let end=open+1;while(end<tokens.length&&tokens[end].text!=='>')end++;const lifetimes=split(tokens.slice(open+1,end));if(!lifetimes.length||lifetimes.some(row=>row.length!==1||row[0].type!=='char'||!/^'[A-Za-z_][A-Za-z0-9_]*$/u.test(row[0].text)))return result('only actual named lifetime parameters are admitted');open=end+1;}
 if(tokens[open]?.text!=='(')return result('ordinary original input list required');const parametersEnd=close(tokens,open);if(parametersEnd<0)return result('complete original header required');let body=parametersEnd+1;while(body<tokens.length&&tokens[body].text!=='{')body++;
 if(body>=tokens.length||close(tokens,body)!==tokens.length-1||tokens.slice(0,name).some(token=>['unsafe','async','const','extern'].includes(token.text)))return result('ordinary synchronous source function required');
 const C='crate::translation_core::',jsonNames=new Set([C+'Json',...scoped.jsonNames]),parameters=split(tokens.slice(open+1,parametersEnd)),roles=new Map(),seen=new Set(),closedTypes=new Map();let work=0;
 for(const json of jsonNames){closedTypes.set(json,'json');for(const type of ['::std::option::Option<'+json+'>',C+'Maybe<'+json+'>'])closedTypes.set(type,'option');for(const type of ['::std::result::Result<'+json+',::std::string::String>',C+'Outcome<'+json+',::std::string::String>'])closedTypes.set(type,'result');}
 for(const row of parameters){
  if(!ident(row[0])||row[1]?.text!==':'||seen.has(row[0].text))return result('distinct immutable source input bindings required');seen.add(row[0].text);let type=row.slice(2),borrowed=false;if(type[0]?.text==='&'){borrowed=true;type=type.slice(type[1]?.type==='char'?2:1);}const kind=closedTypes.get(text(type));if(kind)roles.set(row[0].text,{kind,borrowed});
 }
 const uses=new Map();for(let at=body+1;at<tokens.length-1;at++){
  const macro=macroAt(tokens,at,'json')??macroAt(tokens,at,'format');if(macro)return result('macro expansion requires a separate complete source scope');const word=tokens[at].text;
  if(word==='#'||['unsafe','async','await','yield','for','while','loop','fn','mod','use','extern','macro_rules','trait','impl','struct','enum','union','type','const','static','move'].includes(word)||word.endsWith('!')||word==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text))return result('local producer effect loop or unknown macro uncertainty');
  if(roles.has(word))uses.set(word,(uses.get(word)??0)+1);
 }
 const errorLiteral=args=>{
  let at=0;if(args[at]?.text==='||')at++;else if(args[at]?.text==='|'&&args[at+1]?.text==='|')at+=2;const closure=at>0;let tail=args.slice(at);if(closure&&tail[0]?.text==='{'&&close(tail,0)===tail.length-1)tail=tail.slice(1,-1);
  if(tail.length!==5||tail[0].type!=='string'||tail[1].text!=='.'||tail[2].text!=='to_owned'||tail[3].text!=='('||tail[4].text!==')')return null;return {source:source.slice(tail[0].start,tail[0].end),closure};
 };
 for(let at=body+1;at<tokens.length;at++){
  const receiver=tokens[at].text,role=roles.get(receiver);if(!ident(tokens[at])||!role||!['option','result'].includes(role.kind)||uses.get(receiver)!==1)continue;let cursor=at+1,cloned=false;
  if(tokens[cursor]?.text==='.'&&tokens[cursor+1]?.text==='clone'&&tokens[cursor+2]?.text==='('&&tokens[cursor+3]?.text===')'){cloned=true;cursor+=4;}
  if(role.borrowed&&!cloned||tokens[cursor]?.text!=='.'||!ident(tokens[cursor+1])||tokens[cursor+2]?.text!=='(')continue;const method=tokens[cursor+1].text,end=close(tokens,cursor+2);if(end<0)continue;if((work+=end-cursor)>200000)return result('complete method scan budget exceeded');const args=tokens.slice(cursor+3,end),arguments_=[(role.borrowed?'':'&')+receiver];let operation=null;
  if(role.kind==='result'&&method==='ok'&&!args.length)operation='json_result_to_option';
  if(method==='unwrap_or'&&args.length===1&&ident(args[0])&&roles.get(args[0].text)?.kind==='json'&&roles.get(args[0].text).borrowed===false&&uses.get(args[0].text)===1){operation=role.kind==='option'?'json_option_or':'json_result_or';arguments_.push('&'+args[0].text);}
  if(role.kind==='option'&&['ok_or','ok_or_else'].includes(method)){const error=errorLiteral(args);if(error&&error.closure===(method==='ok_or_else')){operation='json_option_to_result';arguments_.push(error.source);}}
  const row=ownedOutcomeContract(operation);if(!row)continue;const span=[tokens[at].start,tokens[end].end],replacement=row.rustPath+'('+arguments_.join(', ')+')';edits.push({span,expected:source.slice(...span),replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation,receiver,method,borrowedInput:role.borrowed,explicitClone:cloned,receiverBodyUses:1,oldTraitDispatchProved:false,oldDropTimingProved:false,executableAdmission:false,evaluationOrder:['existing-inputs-already-evaluated','receiver-once','literal-or-single-use-default-once']});at=end;
 }
 return result(edits.length?null:'no closed single-use canonical carrier method source');
}
