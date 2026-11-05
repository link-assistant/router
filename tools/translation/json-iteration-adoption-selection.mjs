// Candidate-only syntax substitutions. Full fresh semantic/ownership checking
// and independent native equivalence remain obligations after adoption.
import {JSON_ITERATION_CONTRACTS} from './json-iteration-contracts.mjs';
import {createJsonSliceLocalSource} from './json-slice-local-source.mjs';
export function selectJsonIterationAdoption(source,item,scoped,modulePath,names,helpers){
 const {originalDeclarationHeader,close,split,text,ident,macroAt,createLegacyJsonReaderNormalizer,optionNormalizationProblem}=helpers;
 const tokens=item.tokens.filter(token=>token.type!=='comment'),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(token=>token.start===header?.nameSpan?.start),params=close(tokens,name+1),edits=[],selections=[],skipped=[];
 const refused=reason=>({edits,selections,skipped:[...skipped,{function:item.name,reason}]});
 if(name<0||tokens[name+1]?.text!=='('||params<0)return refused('ordinary complete function header required');
 let body=params+1;while(body<tokens.length&&tokens[body].text!=='{')body++;
 if(body>=tokens.length||close(tokens,body)!==tokens.length-1||tokens.length>200000||tokens.slice(0,name).some(token=>['unsafe','async','const','extern'].includes(token.text)))return refused('bounded ordinary nongeneric complete function required');
 const C='crate::translation_core::',parameters=split(tokens.slice(name+2,params)),slices=new Set(),vectors=new Set(),allParameters=new Set();
 const json=type=>type===C+'Json'||scoped.jsonNames.has(type);
 for(const row of parameters){if(!ident(row[0])||row[1]?.text!==':'||allParameters.has(row[0].text))return refused('distinct immutable source parameter bindings required');allParameters.add(row[0].text);const type=text(row.slice(2));if(type.startsWith('&[')&&type.endsWith(']')&&json(type.slice(2,-1)))slices.add(row[0].text);const vector=/^&?(?:Vec|std::vec::Vec|::std::vec::Vec)<(.+)>$/u.exec(type);if(vector&&json(vector[1]))vectors.add(row[0].text);}
 const written=text(tokens.slice(params+1,body)),vector=/^->(?:Vec|std::vec::Vec|::std::vec::Vec)<(.+)>$/u.exec(written),option=/^->(?:Option|std::option::Option|::std::option::Option|crate::translation_core::Maybe)<(.+)>$/u.exec(written);
 const result=written==='->bool'?'bool':written.startsWith('->')&&json(written.slice(2))?'owned-json':vector&&json(vector[1])?'owned-json-list':option&&json(option[1])?'owned-json-option':null;
 if(!result)return refused('complete canonical bool, Json, Vec<Json> or owned Option<Json> result required');
 const {normalizations,knownCallbackBinders,normalize}=createLegacyJsonReaderNormalizer(source,tokens,scoped.jsonNames,names);
 // One local census serves every use of the same original slice parameter.
 const parameterDomains=new Map([...slices].map(name=>[name,'json-slice']).concat([...vectors].map(name=>[name,'json-vector']))),localArguments=createJsonSliceLocalSource(tokens.slice(body+1,-1),parameterDomains,allParameters);
 const shadowed=new Set();let uncertainLoop=false;
 const note=(start,end)=>{for(let at=start;at<end;at++)if(parameterDomains.has(tokens[at].text))shadowed.add(tokens[at].text);};
 for(let index=body+1;index<tokens.length;index++){
  if(['while','loop'].includes(tokens[index].text)||tokens[index].text==='for'&&!localArguments)uncertainLoop=true;
  if(tokens[index].text==='let'){let end=index+1;while(end<tokens.length&&!['=',':',';','{','}'].includes(tokens[end].text))end++;note(index+1,end);}
  if(tokens[index].text==='|'&&['=','(',',','return','{','=>','move'].includes(tokens[index-1]?.text)){let end=index+1;while(end<tokens.length&&tokens[end].text!=='|')end++;note(index+1,end);}
  if(tokens[index].text==='=>'){let start=index-1;while(start>body&&!['{','}',',',';'].includes(tokens[start-1].text))start--;note(start,index);}
 }
 function callSuffix(at,name){return tokens[at]?.text==='.'&&tokens[at+1]?.text===name&&tokens[at+2]?.text==='('&&tokens[at+3]?.text===')'?at+4:null;}
 function collectSuffix(at){
  if(tokens[at]?.text!=='.'||tokens[at+1]?.text!=='collect')return null;let cursor=at+2;
  if(tokens[cursor]?.text==='::'){
   cursor++;if(tokens[cursor]?.text!=='<')return null;const start=++cursor;let depth=1;
   while(cursor<tokens.length&&depth>0){const word=tokens[cursor].text;if(word==='<')depth++;else if(word==='>')depth--;else if(word==='>>')depth-=2;if(depth<0)return null;if(depth>0)cursor++;}
   if(depth!==0)return null;const type=text(tokens.slice(start,cursor)),match=/^(?:Vec|std::vec::Vec|::std::vec::Vec)<(.+)>$/u.exec(type+(tokens[cursor]?.text==='>>'?'>':''));if(!match||match[1]!=='_'&&!json(match[1]))return null;cursor++;
  }
  return tokens[cursor]?.text==='('&&tokens[cursor+1]?.text===')'?cursor+2:null;
 }
 for(let at=body+1;at<tokens.length;at++){
  if(uncertainLoop||!ident(tokens[at])||['.','::'].includes(tokens[at-1]?.text)||shadowed.has(tokens[at].text)||text(tokens.slice(at+1,at+6))!=='.iter().')continue;const receiver=tokens[at].text,visible=localArguments?.at(tokens[at].start)??parameterDomains,receiverRole=visible.get(receiver);if(!['json-slice','json-vector'].includes(receiverRole))continue;
  const operation=tokens[at+6]?.text,row=JSON_ITERATION_CONTRACTS.find(row=>row.rustName==='json_'+operation),open=at+7;if(!row||row.returns!==result||tokens[open]?.text!=='(')continue;
  const callbackEnd=close(tokens,open);if(callbackEnd<0)continue;let args=[tokens.slice(open+1,callbackEnd)];
  if(operation==='fold'){
   let comma=-1;for(let index=open+1;index<callbackEnd;index++){if(['(','[','{'].includes(tokens[index].text)){const end=close(tokens,index);if(end<0)break;index=end;}else if(tokens[index].text===','){comma=index;break;}}
   if(comma<0||comma===open+1)continue;args=[tokens.slice(open+1,comma),tokens.slice(comma+1,callbackEnd)];
  }
  const callbackTokens=args.at(-1),begin=tokens.indexOf(callbackTokens[0],open+1);if(begin<0||tokens[begin]?.text!=='|')continue;
  let parameterEnd=begin+1;while(parameterEnd<callbackEnd&&tokens[parameterEnd].text!=='|')parameterEnd++;if(parameterEnd>=callbackEnd)continue;
  const binders=split(tokens.slice(begin+1,parameterEnd));if(binders.length!==row.callbackParameters.length||binders.some(value=>value.length!==1||!ident(value[0]))||new Set(binders.map(value=>value[0].text)).size!==binders.length)continue;
  const parameter=binders.at(-1)[0].text,callbackStart=parameterEnd+1,isBlock=tokens[callbackStart]?.text==='{',inside=isBlock?callbackStart+1:callbackStart,bodyEnd=isBlock?close(tokens,callbackStart):callbackEnd;
  if(bodyEnd<0||isBlock&&bodyEnd!==callbackEnd-1||inside>=bodyEnd)continue;
  let end=callbackEnd+1;
  if(operation==='filter'){end=callSuffix(end,'cloned');if(end===null)continue;end=collectSuffix(end);if(end===null)continue;}
  else if(operation==='find'){end=callSuffix(end,'cloned');if(end===null)continue;}
  let uncertain=false;
  for(let index=inside;index<bodyEnd;index++){
   const macro=macroAt(tokens,index,'json')??macroAt(tokens,index,'format');if(macro){index=macro.end;continue;}
   const word=tokens[index].text;if(word==='#'||['unsafe','async','await','yield','for','while','loop','fn','mod','use','extern','macro_rules','trait','impl','struct','enum','union','type','const','static','move'].includes(word)||word.endsWith('!')&&word!=='!'||word==='!'&&ident(tokens[index-1])&&['(','[','{'].includes(tokens[index+1]?.text))uncertain=true;
   if(word==='let'){let limit=index+1;while(limit<bodyEnd&&!['=',':',';','{','}'].includes(tokens[limit].text))limit++;if(tokens.slice(index+1,limit).some(token=>binders.some(binding=>binding[0].text===token.text)))uncertain=true;}
  }
  if(uncertain){skipped.push({function:item.name,reason:'callback source producer, effect, loop or shadow uncertainty'});continue;}
  const normalizationStart=normalizations.length,low=isBlock?tokens[callbackStart].end:tokens[callbackStart].start,high=isBlock?tokens[bodyEnd].start:tokens[callbackEnd].start,callback=source.slice(tokens[begin].start,low)+normalize(inside,bodyEnd,parameter,low,high)+(isBlock?source.slice(tokens[bodyEnd].start,tokens[bodyEnd].end):'');
  const normalized=normalizations.slice(normalizationStart),problem=normalized.length?binders.map(binding=>optionNormalizationProblem(tokens,body,parameters,binding[0].text)).find(Boolean):null;
  if(problem){skipped.push({function:item.name,reason:problem});continue;}
  if(tokens.slice(inside,bodyEnd).some((token,index,list)=>token.text==='|'&&ident(list[index+1])&&list[index+2]?.text==='|'&&!knownCallbackBinders.has(token.start)||token.text==='||'&&['=','(',',','return','{','=>'].includes(list[index-1]?.text))){skipped.push({function:item.name,reason:'unknown nested callback binding/effect'});continue;}
  const initial=operation==='fold'?source.slice(args[0][0].start,args[0].at(-1).end):null,span=[tokens[at].start,tokens[end-1].end],replacement='crate::translation_collections_core::'+row.rustName+'('+(receiverRole==='json-vector'?receiver+'.as_slice()':receiver)+(initial===null?'':', '+initial)+', '+callback+')';
  edits.push({span,expected:source.slice(...span),replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation:row.rustName,receiver,receiverRole,...(localArguments?.evidence(receiver)?{localReceiverSource:localArguments.evidence(receiver)}:{}),callbackParameters:binders.map(binding=>binding[0].text),readerNormalizations:normalized,oldTraitDispatchProved:false,executableAdmission:false,evaluationOrder:['receiver-once',...(initial===null?[]:['initial-once']),'callback-once',row.shortCircuit?'ordered-short-circuit':'ordered-eager-iteration']});at=end-1;
 }
 if(!edits.length)skipped.push({function:item.name,reason:'no closed actual shared Json slice predicate/fold terminal'});return {edits,selections,skipped};
}
