// Closed mutable String builder source proposals only. These substitutions
// grant no original owner/type/trait/drop/effect or executable permission.
import {readTextConstructorSourcePrefix} from './text-constructor-source.mjs';
import {readTextWrittenAliasDomain} from './text-local-argument-source.mjs';
export function selectTextBuilderAdoption(source,item,tokens,{open,endParameters,body},helpers){
 const {close,split,text,ident}=helpers,edits=[],selections=[],skipped=[];
 const result=reason=>({edits:reason?[]:edits,languageEdits:[],selections:reason?[]:selections,skipped:reason?[{function:item.name,reason}]:skipped});
 if(tokens.length>200000||readTextWrittenAliasDomain(tokens.slice(endParameters+2,body))!=='text-owned')return result('closed String-returning builder function required');
 const reserved=new Set(['String','str','std','core','crate','self','Self','translation_core','translation_text_core','bool',...['u','i'].flatMap(prefix=>[8,16,32,64,128].map(bits=>prefix+bits))]),parameters=new Set(),borrowed=new Set(),locals=new Set();let work=0;
 const tick=()=>{if(++work>200000)throw new TypeError('Complete String builder source work bound');};
 for(const row of split(tokens.slice(open+1,endParameters))){tick();if(!ident(row[0])||row[1]?.text!==':'||parameters.has(row[0].text)||reserved.has(row[0].text))return result('distinct immutable primitive builder parameters required');parameters.add(row[0].text);const type=text(row.slice(2));if(readTextWrittenAliasDomain(row.slice(2))==='str')borrowed.add(row[0].text);else if(!/^(?:bool|[ui](?:8|16|32|64|128))$/u.test(type))return result('separate owning or nominal parameter builder rule required');}
 const forbidden=new Set(['unsafe','async','await','yield','fn','mod','use','extern','macro_rules','macro','trait','impl','struct','enum','union','type','const','static','move']);let builder=null;
 const argument=(start,end)=>{if(end!==start+1)return null;const value=tokens[start];if(ident(value)&&borrowed.has(value.text))return source.slice(value.start,value.end);if(value?.type==='string'&&/^(?:"|r#{0,255}")/u.test(value.text)&&!(['b','c'].includes(tokens[start-1]?.text)&&tokens[start-1].end===value.start))return source.slice(value.start,value.end);return null;};
 for(let at=body+1;at<tokens.length-1;at++){
  tick();const word=tokens[at].text;if(forbidden.has(word)||word==='#'||word==='|'||word==='||'||word!=='!'&&word.endsWith('!')||word==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text))return result('separate builder producer/macro/closure source scope required');
  if(word==='for'&&tokens[at+1]?.text==='mut')return result('separate mutable loop binding source rule required');
  if(word!=='let')continue;let cursor=at+1,mutable=tokens[cursor]?.text==='mut';if(mutable)cursor++;const binding=tokens[cursor++];if(!ident(binding)||reserved.has(binding.text)||parameters.has(binding.text)||locals.has(binding.text))return result('nonshadowing ordinary builder local required');locals.add(binding.text);
  if(!mutable)continue;if(builder)return result('one actual initialized String builder required');let written=null;if(tokens[cursor]?.text===':'){const first=++cursor;while(cursor<tokens.length&&!['=',';','{','}'].includes(tokens[cursor].text))cursor++;written=readTextWrittenAliasDomain(tokens.slice(first,cursor));if(written!=='text-owned')return result('separate mutable scalar builder source rule required');}
  if(tokens[cursor]?.text!=='=')return result('complete original builder initializer required');const start=cursor+1,constructor=readTextConstructorSourcePrefix(tokens,start,close);if(!constructor||tokens[constructor.end+1]?.text!==';'||constructor.method==='from'&&argument(constructor.open+1,constructor.end)===null)return result('closed original String new/borrowed from initializer required');builder={name:binding.text,bindingStart:binding.start};
 }
 if(!builder)return result('no closed actual String builder');let mutations=0;
 for(let at=body+1;at<tokens.length-1;at++){
  tick();if(tokens[at].text!==builder.name||tokens[at].start===builder.bindingStart)continue;
  if(tokens[at+1]?.text==='.'&&['push_str','clear'].includes(tokens[at+2]?.text)&&tokens[at+3]?.text==='('){
   if(!['{','}',';'].includes(tokens[at-1]?.text))return result('builder mutation requires a complete original statement');const end=close(tokens,at+3);if(end<0||tokens[end+1]?.text!==';')return result('complete builder mutation statement required');const method=tokens[at+2].text,suffix=method==='push_str'?argument(at+4,end):end===at+4?'':null;if(suffix===null)return result('actual borrowed parameter or literal builder suffix required');
   const span=[tokens[at].start,tokens[end+1].end],replacement=method==='clear'?builder.name+' = crate::translation_text_core::to_owned("");':builder.name+' = crate::translation_core::format!("{}{}", &'+builder.name+', '+suffix+');';edits.push({span,expected:source.slice(...span),replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation:'builder:'+method,operations:['builder:'+method],receiver:builder.name,domain:'text-owned',oldTraitDispatchProved:false,oldDropTimingProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false,evaluationOrder:['same-original-live-builder','original-borrowed-suffix-once','qualified-native-text-result-reinitializes-same-local']});mutations++;at=end+1;continue;
  }
  if(tokens[at+1]?.text==='}'&&at+1===tokens.length-1||tokens[at-1]?.text==='return'&&tokens[at+1]?.text===';')continue;
  return result('builder alias escape shadow or separate mutation source rule required');
 }
 return result(mutations?null:'no closed builder mutation statement');
}
