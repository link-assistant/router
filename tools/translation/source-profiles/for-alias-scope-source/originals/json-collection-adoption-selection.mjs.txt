// Complete original collection selector copy; source DATA only.
import {createJsonSliceLocalSource} from './json-slice-local-source.mjs';
export function selectJsonCollectionAdoption(source,item,scoped,modulePath,names,helpers){
 const {originalDeclarationHeader,close,split,text,ident,macroAt,createLegacyJsonReaderNormalizer,optionNormalizationProblem,sliceRole}=helpers,C='crate::translation_core::';
 const tokens=item.tokens.filter(token=>token.type!=='comment'),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),params=close(tokens,name+1),edits=[],selections=[],skipped=[];
 if(name<0||tokens[name+1]?.text!=='('||params<0)return {edits,selections,skipped};
 let body=params+1;while(body<tokens.length&&tokens[body].text!=='{')body++;
 if(body>=tokens.length||close(tokens,body)!==tokens.length-1||tokens.length>200000||tokens.slice(0,name).some(token=>['unsafe','async','const','extern'].includes(token.text)))return {edits,selections,skipped:[{function:item.name,reason:'bounded ordinary nongeneric complete function required'}]};
 const parameters=split(tokens.slice(name+2,params)),slices=new Set(),vectors=new Set(),allParameters=new Set();
 for(const row of parameters){if(!ident(row[0])||row[1]?.text!==':'||allParameters.has(row[0].text))return {edits,selections,skipped:[{function:item.name,reason:'distinct immutable parameter binding required'}]};allParameters.add(row[0].text);if(sliceRole(row.slice(2),scoped))slices.add(row[0].text);const vector=/^&?(?:Vec|std::vec::Vec|::std::vec::Vec)<(.+)>$/u.exec(text(row.slice(2)));if(vector&&(vector[1]===C+'Json'||scoped.jsonNames.has(vector[1])))vectors.add(row[0].text);}
 const result=text(tokens.slice(params+1,body)),vector=/^->(?:Vec|std::vec::Vec|::std::vec::Vec)<(.+)>$/u.exec(result);
 if(!vector||!(vector[1]===C+'Json'||scoped.jsonNames.has(vector[1])))return {edits,selections,skipped:[{function:item.name,reason:'actual canonical Vec<Json> result syntax required'}]};
 const {fresh,normalizations,knownCallbackBinders,readers,normalize}=createLegacyJsonReaderNormalizer(source,tokens,scoped.jsonNames,names);
 const parameterDomains=new Map([...slices].map(name=>[name,'json-slice']).concat([...vectors].map(name=>[name,'json-vector']))),localArguments=createJsonSliceLocalSource(tokens.slice(body+1,-1),parameterDomains,allParameters);
 for(let at=body+1;at<tokens.length;at++){
  if(!ident(tokens[at])||['.','::'].includes(tokens[at-1]?.text)||text(tokens.slice(at+1,at+6))!=='.iter().')continue;const visible=localArguments?.at(tokens[at].start)??parameterDomains,receiverRole=visible.get(tokens[at].text);if(!['json-slice','json-vector'].includes(receiverRole))continue;
  // The receiver is an unshadowed immutable source parameter for this first
  // profile. A declaration anywhere with that spelling remains uncertain.
  const receiver=tokens[at].text;let receiverShadow=false;
  for(let index=body+1;index<tokens.length;index++){
   if(['for','while','loop'].includes(tokens[index].text))receiverShadow=true;
   if(tokens[index].text==='let'){let end=index+1;while(end<tokens.length&&!['=',';','{','}'].includes(tokens[end].text))end++;if(!localArguments?.names.has(tokens[index+1]?.text)&&tokens.slice(index+1,end).some(token=>token.text===receiver))receiverShadow=true;}
   if(tokens[index].text==='=>'){let start=index-1;while(start>body&&!['{','}',',',';'].includes(tokens[start-1].text))start--;if(tokens.slice(start,index).some(token=>token.text===receiver))receiverShadow=true;}
  }
  if(receiverShadow)continue;
  const operation=tokens[at+6]?.text,open=at+7;if(!['map','filter_map'].includes(operation)||tokens[open]?.text!=='(')continue;
  const callbackEnd=close(tokens,open),begin=open+1;if(callbackEnd<0||tokens[begin]?.text!=='|'||!ident(tokens[begin+1])||tokens[begin+2]?.text!=='|'||tokens[begin+3]?.text!=='{')continue;
  const callbackBody=begin+3,bodyEnd=close(tokens,callbackBody);if(bodyEnd!==callbackEnd-1)continue;
  let collect=callbackEnd+1;if(tokens[collect]?.text!=='.'||tokens[collect+1]?.text!=='collect'||tokens[collect+2]?.text!=='('||tokens[collect+3]?.text!==')')continue;
  const end=collect+3,parameter=tokens[begin+1].text;
  let uncertain=false;for(let index=callbackBody+1;index<bodyEnd;index++){
   const macro=macroAt(tokens,index,'json')??macroAt(tokens,index,'format');if(macro){index=macro.end;continue;}
   const word=tokens[index].text;if(word==='#'||['unsafe','async','await','yield','for','while','loop','fn','mod','use','extern','macro_rules','trait','impl','struct','enum','union','type','const','static','move'].includes(word)||word.endsWith('!')&&word!=='!'||word==='!'&&ident(tokens[index-1])&&['(','[','{'].includes(tokens[index+1]?.text))uncertain=true;
   if(word==='let'){let end=index+1;while(end<bodyEnd&&!['=',';','{','}'].includes(tokens[end].text))end++;if(tokens.slice(index+1,end).some(token=>token.text===parameter))uncertain=true;}
  }
  if(uncertain){skipped.push({function:item.name,reason:'callback producer, effect, loop or shadow uncertainty'});continue;}
  const normalizationStart=normalizations.length,callback=source.slice(tokens[begin].start,tokens[callbackBody].end)+normalize(callbackBody+1,bodyEnd,parameter,tokens[callbackBody].end,tokens[bodyEnd].start)+source.slice(tokens[bodyEnd].start,tokens[bodyEnd].end);
  const optionProblem=normalizations.length>normalizationStart?optionNormalizationProblem(tokens,body,parameters,parameter):null;
  if(optionProblem){skipped.push({function:item.name,reason:optionProblem});continue;}
  if(tokens.slice(callbackBody+1,bodyEnd).some((token,index,list)=>token.text==='|'&&ident(list[index+1])&&list[index+2]?.text==='|'&&!knownCallbackBinders.has(token.start)||token.text==='||'&&['=','(',',','return','{','=>'].includes(list[index-1]?.text))){skipped.push({function:item.name,reason:'unknown nested callback binding/effect'});continue;}
  const span=[tokens[at].start,tokens[end].end],replacement=C+'json_'+operation+'('+(receiverRole==='json-vector'?receiver+'.as_slice()':receiver)+', '+callback+')';
  edits.push({span,expected:source.slice(...span),replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation:'json_'+operation,receiver,receiverRole,...(localArguments?.evidence(receiver)?{localReceiverSource:localArguments.evidence(receiver)}:{}),callbackParameter:parameter,readerNormalizations:[...normalizations],oldTraitDispatchProved:false,executableAdmission:false,evaluationOrder:['receiver-once','callback-once','ordered-eager-collection']});at=end;
 }
 if(!edits.length)skipped.push({function:item.name,reason:'no closed canonical borrowed Json slice terminal map/filter_map collection'});return {edits,selections,skipped};
}
