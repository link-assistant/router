// Proposal-only source substitutions. Installation requires every actual whole
// function to pass the original type/ownership/source/emission checks afresh.
import {primitiveOptionContract} from './primitive-option-contracts.mjs';
import {readOptionalTextFilterSource} from './optional-text-filter-source.mjs';
import {readFixedIntegerLiteralSource} from './native-integer-literal-source.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {readPrimitiveWrittenAliasDomain} from './primitive-local-argument-source.mjs';
import {createPrimitiveCarrierLocalSource,readCarrierLocalInitializer,readIntegerCarrierCallSource,encodeCarrierRole} from './primitive-carrier-local-source.mjs';
import {primitiveOptionCallbackContract} from './primitive-option-callback-contracts.mjs';
const methods=new Set(['filter','unwrap_or_default','is_some','is_none','unwrap_or','unwrap','expect','and','or','map','and_then','unwrap_or_else','or_else','ok_or_else']);
const words=tokens=>tokens.map(token=>token.text+(token.text.startsWith("'")?' ':'')).join('');
function scalarRole(source){source=source.replace(/&'[a-zA-Z_][a-zA-Z0-9_]*\s+/gu,'&').replace(/\s+/gu,'');if(['String','std::string::String','::std::string::String'].includes(source))return {kind:'payload',domain:'text-owned'};if(source==='bool')return {kind:'payload',domain:source};const primitive=readPrimitiveWrittenAliasDomain([{text:source}]);if(primitive)return {kind:'payload',domain:primitive};if(['&str','&crate::translation_core::Str','&::std::primitive::str','&::core::primitive::str'].includes(source))return {kind:'payload',domain:'str'};return null;}
function role(tokens,scoped){const source=words(tokens),outcome=/^(?:(?:::)?(?:std|core)::result::Result|Result)<([\s\S]+),(?:(?:::)?std::string::)?String>$/u.exec(source);if(outcome){const value=scalarRole(outcome[1]);return value?{kind:'result',domain:value.domain==='text-owned'?'text':value.domain}:null;}const optional=/^(?:(?:::)?(?:std|core)::option::Option|Option|crate::translation_core::Maybe)<([\s\S]+)>$/u.exec(source),payload=scalarRole(optional?optional[1]:source);if(payload)return {...payload,kind:optional?'option':'payload'};const normalized=source.replace(/&'[a-zA-Z_][a-zA-Z0-9_]*\s+/gu,'&').replace(/\s+/gu,'');if(!optional&&normalized.startsWith('&')&&(['crate::translation_core::Json','serde_json::Value','::serde_json::Value'].includes(normalized.slice(1))||scoped?.jsonNames.has(normalized.slice(1))))return {kind:'json',domain:'json'};return null;}
export function selectPrimitiveOptionCallbackMethodAdoption(source,item,_scoped,modulePath,_names,helpers){
 const {originalDeclarationHeader,close,split,ident}=helpers,tokens=item.tokens.filter(token=>token.type!=='comment'),indices=new Map(tokens.map((token,index)=>[token,index])),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),edits=[],selections=[];
 const result=reason=>({edits:reason?[]:edits,selections:reason?[]:selections,skipped:reason?[{function:item.name,reason}]:[]});if(name<0||tokens.length>200000||tokens.slice(0,name).some(token=>['async','unsafe','const','extern'].includes(token.text)))return result('complete ordinary primitive Option function required');
 let open=name+1;if(tokens[open]?.text==='<'){let end=open+1;while(end<tokens.length&&tokens[end].text!=='>')end++;if(!/^<(?:'[a-zA-Z_][a-zA-Z0-9_]*\s*,?)+>$/u.test(words(tokens.slice(open,end+1))))return result('only closed lifetime parameters may precede primitive Option inputs');open=end+1;}
 if(tokens[open]?.text!=='(')return result('ordinary complete input list required');const endParameters=close(tokens,open);if(endParameters<0)return result('complete original input delimiters required');let body=endParameters+1;while(body<tokens.length&&tokens[body].text!=='{')body++;if(body>=tokens.length||close(tokens,body)!==tokens.length-1)return result('one complete original source body required');
 const parameterDomains=new Map(),parameters=new Set();for(const row of split(tokens.slice(open+1,endParameters))){if(!ident(row[0])||row[1]?.text!==':'||parameters.has(row[0].text))return result('distinct immutable typed input bindings required');parameters.add(row[0].text);const value=role(row.slice(2),_scoped);if(value)parameterDomains.set(row[0].text,value);}
 const localNames=new Set();let work=0,callbackTextCount=0;
 const declaredOutput=role(tokens.slice(endParameters+2,body),_scoped);
 function inferred(piece,scope,wanted,depth=0){
  if(++work>200000||depth>64||!piece.length)return null;
  if(piece[0].text==='('&&close(piece,0)===piece.length-1)return inferred(piece.slice(1,-1),scope,wanted,depth+1);
  if(piece.length===1&&scope.has(piece[0].text))return scope.get(piece[0].text);
  if(piece.length===1&&['true','false'].includes(piece[0].text))return {kind:'payload',domain:'bool'};
  if(piece.length===1&&piece[0].type==='string')return {kind:'payload',domain:'str'};
  const literal=readFixedIntegerLiteralSource(piece,wanted?.kind==='payload'?wanted.domain:null);if(literal&&primitiveBitwiseType(literal.domain))return {kind:'payload',domain:literal.domain};
  if(piece[0].text==='Some'&&piece[1]?.text==='('&&close(piece,1)===piece.length-1){const value=inferred(piece.slice(2,-1),scope,wanted&&{kind:'payload',domain:wanted.domain},depth+1);return value?.kind==='payload'?{kind:'option',domain:value.domain}:null;}
  if(piece.length===1&&piece[0].text==='None')return wanted?.kind==='option'?wanted:null;
  const core=readCoreCarrierCallSource(piece,scope);if(core)return core;
  if((work+=Math.min(piece.length,257))>200000)return null;const numeric=readPrimitiveRoleExpressionSource(piece,scope,wanted);if(numeric)return numeric;
  const conditional=readCarrierConditionalSource(piece,scope,wanted,{readExpression:(part,expected)=>inferred(part,scope,expected,depth+1),readBranch:(part,expected)=>readCarrierBranchLocalSource(part,scope,expected,{readExpression:(body,visible,output)=>inferred(body,visible,output,depth+1),readWrittenRole:tokens=>role(tokens,_scoped)})});if(conditional)return conditional;
  if(piece.length>4&&piece.at(-4).text==='.'&&['to_owned','to_string'].includes(piece.at(-3).text)&&piece.at(-2).text==='('&&piece.at(-1).text===')'){const base=inferred(piece.slice(0,-4),scope,null,depth+1);if(base?.kind==='payload'&&['str','text-owned'].includes(base.domain))return {kind:'payload',domain:'text-owned'};}
  return null;
 }
 function callbackOperand(piece,input,method){
  let at=piece[0]?.text==='move'?1:0,names=[];if(piece[at]?.text==='||')at++;else if(piece[at]?.text==='|'){
   const end=piece.findIndex((token,index)=>index>at&&token.text==='|');if(end<0)return null;const arguments_=split(piece.slice(at+1,end));if(arguments_.length!==1||!ident(arguments_[0][0])||arguments_[0].length>1&&arguments_[0][1].text!==':')return null;const argument=arguments_[0],written=argument.length>1?role(argument.slice(2),_scoped):null;if(argument.length>1&&(!written||written.kind!=='payload'||written.domain!==input))return null;names=[argument[0].text];at=end+1;
  }else return null;
  if(names.length!==(['unwrap_or_else','or_else','ok_or_else'].includes(method)?0:1)||names.some(name=>['Some','None','Option'].includes(name)))return null;
  let written=null;if(piece[at]?.text==='->'){const start=at+1;at=start;while(at<piece.length&&piece[at].text!=='{')at++;written=role(piece.slice(start,at),_scoped);if(!written)return null;}
  if(!piece[at])return null;const scope=new Map(env);for(const name of names)scope.set(name,{kind:'payload',domain:input});const wanted=method==='ok_or_else'?{kind:'payload',domain:'text-owned'}:method==='or_else'?{kind:'option',domain:input}:method==='unwrap_or_else'?{kind:'payload',domain:input}:written??(declaredOutput?.kind==='option'?{kind:method==='map'?'payload':'option',domain:declaredOutput.domain}:null);let value,textSourceHistory=null,replacement=source.slice(piece[0].start,piece.at(-1).end),bodyTokens=piece.slice(at);if(callbackTextCount<32){const body=source.slice(piece[at].start,piece.at(-1).end),selected=proposeCallbackTextBodySource(body,scope);if(selected){callbackTextCount++;textSourceHistory=selected;replacement=source.slice(piece[0].start,piece[at].start)+selected.after.source;bodyTokens=rustTokens(selected.after.source).filter(row=>row.type!=='comment');}}
  if(bodyTokens[0]?.text==='{'){
   if(close(bodyTokens,0)!==bodyTokens.length-1)return null;
   if(written)value=written;
   else{const body=bodyTokens.slice(1,-1),returned=[],locals=createPrimitiveCarrierLocalSource(body,scope,new Set(scope.keys()),{readWrittenRole:tokens=>role(tokens,_scoped)});if(!locals)return null;let start=0;
    for(let index=0;index<body.length;index++)if(body[index].text==='return'){
     let end=index+1;for(;end<body.length&&body[end].text!==';';end++)if(['(','['].includes(body[end].text)){const last=close(body,end);if(last<0)return null;end=last;}const candidate=inferred(body.slice(index+1,end),locals.at(body[index+1]?.start??body[index].end),wanted);if(!candidate)return null;returned.push(candidate);index=end;start=end+1;
    }
    if(!returned.length)for(let cursor=0;cursor<body.length;cursor++){if(['(','[','{'].includes(body[cursor].text)){const end=close(body,cursor);if(end<0)return null;cursor=end;}else if(body[cursor].text===';')start=cursor+1;}
    const tail=body.slice(start);if(!returned.length)value=inferred(tail,tail.length?locals.at(tail[0].start):scope,wanted);else if(returned.every(row=>row.kind===returned[0].kind&&row.domain===returned[0].domain)&&tail.every(token=>['}',';'].includes(token.text)))value=returned[0];
   }
  }else value=inferred(bodyTokens,scope,wanted);
  if(!value||written&&(value.kind!==written.kind||value.domain!==written.domain)||value.kind!==(['and_then','or_else'].includes(method)?'option':'payload'))return null;
  if(['unwrap_or_else','or_else'].includes(method)&&value.domain!==input)return null;return {domain:value.domain,replacement,...(textSourceHistory?{textSourceHistory}: {})};
 }

 for(let at=body+1;at<tokens.length-1;at++){
  const word=tokens[at].text;if(++work>200000)return result('complete source scan bound exceeded');
  if(word==='#'||['async','unsafe','await','yield','fn','mod','use','extern','macro_rules','macro','trait','impl','struct','enum','union','type','const','static'].includes(word)||word!=='!'&&word.endsWith('!')||word==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text))return result('unknown producer closure pattern or macro scope');
  if(word==='let'){const declaration=localAliasDeclaration(tokens,at),binding=declaration?.token;if(!declaration||parameters.has(binding.text)||localNames.has(binding.text))return result('shadowed mutable or destructured local requires separate binding rules');localNames.add(binding.text);}
 }
 const localArguments=createPrimitiveCarrierLocalSource(tokens.slice(body+1,-1),parameterDomains,parameters,{readWrittenRole:tokens=>role(tokens,_scoped)});if(!localArguments)return result('complete carrier local scope requires separate source selection');let env=parameterDomains;
 function operand(piece,wanted,depth){
  if(!piece.length)return null;const start=indices.get(piece[0]),value=expression(start,depth+1);if(value&&value.after===start+piece.length&&value.kind===wanted.kind&&value.domain===wanted.domain)return value;
  if(wanted.kind!=='payload')return null;const raw=source.slice(piece[0].start,piece.at(-1).end);
  if(wanted.domain==='str'&&piece.length===1&&piece[0].type==='string'&&/^(?:"|r#{0,255}")/u.test(piece[0].text))return {replacement:raw,operations:[]};
  if(wanted.domain==='bool'&&piece.length===1&&['true','false'].includes(piece[0].text))return {replacement:raw,operations:[]};
  if(!primitiveBitwiseType(wanted.domain))return null;const literal=readFixedIntegerLiteralSource(piece,wanted.domain);return literal?{replacement:literal.decimal+'_'+wanted.domain,operations:[]}:null;
 }
 function expression(at,depth=0){
  if(++work>200000||depth>64)return null;const token=tokens[at],known=env.get(token?.text);let value=known?{...known,replacement:token.text,after:at+1,operations:[]}:null;if(!value&&token?.text==='crate'&&tokens[at+1]?.text==='::'&&tokens[at+2]?.text==='translation_integer_core'&&tokens[at+3]?.text==='::'&&tokens[at+5]?.text==='('){const end=close(tokens,at+5),selected=end>=0&&end-at<12?readIntegerCarrierCallSource(tokens.slice(at,end+1),{get:name=>encodeCarrierRole(env.get(name))}):null;if(selected)value={...selected,replacement:source.slice(token.start,tokens[end].end),after:end+1,operations:[]};}if(!value&&token?.text==='crate'&&tokens[at+1]?.text==='::'&&tokens[at+2]?.text==='translation_json_fields_core'&&tokens[at+3]?.text==='::'&&tokens[at+5]?.text==='('){const end=close(tokens,at+5),selected=end>=0&&end-at<32?readJsonFieldCarrierCallSource(tokens.slice(at,end+1),{get:name=>encodeCarrierRole(env.get(name))}):null;if(selected)value={...selected,replacement:source.slice(token.start,tokens[end].end),after:end+1,operations:[]};}if(!value&&token?.text==='crate'&&tokens[at+1]?.text==='::'&&tokens[at+3]?.text==='::'&&tokens[at+5]?.text==='('){const end=close(tokens,at+5),selected=end>=0&&end-at<128?readCoreCarrierCallSource(tokens.slice(at,end+1),env):null;if(selected)value={...selected,replacement:source.slice(token.start,tokens[end].end),after:end+1,operations:[]};}if(!value)return null;
  if(value.kind==='json'){
   const reader={as_bool:'bool',as_u64:'u64',as_i64:'i64',as_str:'str'}[tokens[value.after+1]?.text];if(reader&&tokens[value.after]?.text==='.'&&tokens[value.after+2]?.text==='('&&tokens[value.after+3]?.text===')')value={replacement:source.slice(token.start,tokens[value.after+3].end),after:value.after+4,kind:'option',domain:reader,operations:[]};
  }
  while(value.kind==='option'&&tokens[value.after]?.text==='.'&&ident(tokens[value.after+1])&&tokens[value.after+2]?.text==='('){
   if(++work>200000)return null;const cursor=value.after,method=tokens[cursor+1].text;if(!methods.has(method))break;if(method==='filter'&&['str','text-owned'].includes(value.domain)){const end=close(tokens,cursor+2),filter=end<0?null:readOptionalTextFilterSource(tokens.slice(cursor+3,end)),row=primitiveOptionContract((value.domain==='str'?'str':'text_owned')+'_filter_nonempty');if(!filter||!row)break;value={...value,replacement:row.rustPath+'('+value.replacement+', '+String(filter.trimWhitespace)+')',after:end+1,operations:[...value.operations,row.rustName]};continue;}const end=close(tokens,cursor+2);if(end<0)return null;let after=end+1;
   if(['map','and_then','unwrap_or_else','or_else','ok_or_else'].includes(method)){
    const pieces=split(tokens.slice(cursor+3,end));if(pieces.length!==1)break;const callback=callbackOperand(pieces[0],value.domain,method);if(!callback)break;
    if(value.domain==='str'&&method==='unwrap_or_else'){if(tokens[after]?.text!=='.'||!['to_owned','to_string'].includes(tokens[after+1]?.text)||tokens[after+2]?.text!=='('||tokens[after+3]?.text!==')')break;after+=4;}
    const row=primitiveOptionCallbackContract(['unwrap_or_else','or_else','ok_or_else'].includes(method)?value.domain.replace('-','_')+'_'+method:value.domain.replace('-','_')+'_to_'+callback.domain.replace('-','_')+'_'+method);if(!row)break;
    value={replacement:row.rustPath+'('+value.replacement+', '+callback.replacement+')',kind:method==='ok_or_else'?'result':method==='unwrap_or_else'?'payload':'option',domain:method==='ok_or_else'?(value.domain==='text-owned'?'text':value.domain):method==='unwrap_or_else'&&value.domain==='str'?'owned-str':callback.domain,after,operations:[...value.operations,row.rustName],callbackTextSourceHistories:[...(value.callbackTextSourceHistories??[]),...(callback.textSourceHistory?[callback.textSourceHistory]:[])]};continue;
   }
   const row=primitiveOptionContract(value.domain.replace('-','_')+'_'+method);if(!row)break;

   if(value.domain==='str'&&['unwrap_or','unwrap','expect'].includes(method)){
    if(tokens[after]?.text!=='.'||!['to_owned','to_string'].includes(tokens[after+1]?.text)||tokens[after+2]?.text!=='('||tokens[after+3]?.text!==')')break;after+=4;
   }
   const pieces=split(tokens.slice(cursor+3,end));if(pieces.length!==row.parameters.length-1)break;const args=pieces.map((piece,index)=>{const role=row.parameters[index+1],kind=role===(value.domain==='str'?'str-option-ref':value.domain+'-option')?'option':'payload',domain=role==='str'?'str':kind==='option'?value.domain:role;return operand(piece,{kind,domain},depth);});if(args.some(argument=>!argument))break;
   const optional=row.returns===(value.domain==='str'?'str-option-ref':value.domain+'-option');value={replacement:row.rustPath+'('+[value.replacement,...args.map(argument=>argument.replacement)].join(', ')+')',kind:optional?'option':'payload',domain:optional?value.domain:row.returns==='text-owned'?(value.domain==='text-owned'?'text-owned':'owned-str'):row.returns,after,operations:[...value.operations,...args.flatMap(argument=>argument.operations),row.rustName],callbackTextSourceHistories:[...(value.callbackTextSourceHistories??[]),...args.flatMap(argument=>argument.callbackTextSourceHistories??[])]};
  }return value;
 }
 function append(at,value){if(!value?.operations.length)return;const span=[tokens[at].start,tokens[value.after-1].end];edits.push({span,expected:source.slice(...span),replacement:value.replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation:value.operations.at(-1),operations:value.operations,domain:value.domain,...(value.callbackTextSourceHistories?.length?{callbackTextSourceHistories:value.callbackTextSourceHistories}:{}),oldTraitDispatchProved:false,oldDropTimingProved:false,executableAdmission:false,...(localArguments.evidence(tokens[at].text)?{localReceiverSource:localArguments.evidence(tokens[at].text)}:{}),evaluationOrder:['actual-immutable-Option-receiver-once','already-evaluated-parameters-or-closed-literals-left-to-right']});}
 for(let at=body+1;at<tokens.length-1;at++){
  if(++work>200000)return result('complete source expression bound exceeded');env=localArguments.at(tokens[at].start);
  if(tokens[at].text==='let'){
   const initializer=readCarrierLocalInitializer(tokens,at,part=>role(part,_scoped));if(!initializer)continue;const equal=initializer.start-1,written=initializer.written;env=localArguments.at(tokens[initializer.start]?.start);const value=expression(equal+1);if(value&&tokens[value.after]?.text===';'){if((!written||written.kind===value.kind&&written.domain===value.domain)&&value.operations.length)localArguments.selectedCall({span:[tokens[equal+1].start,tokens[value.after-1].end],terminator:tokens[value.after],operation:value.operations.at(-1),resultRole:{kind:value.kind,domain:value.domain}});append(equal+1,value);at=value.after-1;}else at=equal;continue;
  }
  if(['.','::'].includes(tokens[at-1]?.text))continue;const value=expression(at);if(value?.operations.length){append(at,value);at=value.after-1;}
 }return result(edits.length?null:'no closed primitive Option callback method expression');
}

import {localAliasDeclaration} from './local-alias-binding-source.mjs';

import {readJsonFieldCarrierCallSource} from './primitive-carrier-local-source.mjs';

import {readCoreCarrierCallSource} from './core-carrier-call-source.mjs';

import {proposeCallbackTextBodySource} from './callback-text-body-source.mjs';
import {rustTokens} from './rust-structure.mjs';

import {readPrimitiveRoleExpressionSource} from './primitive-carrier-expression-source.mjs';

import {readCarrierConditionalSource} from './carrier-conditional-source.mjs';

import {readCarrierBranchLocalSource} from './carrier-branch-local-source.mjs';
