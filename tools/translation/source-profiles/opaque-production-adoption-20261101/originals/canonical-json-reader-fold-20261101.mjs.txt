// Exact canonical reader source migration only; no generic if-let permission.
import {sourceItems} from './rust-structure.mjs';
import {jsonFieldContract} from './json-field-contracts.mjs';
import {scopedCarrierGroupEnd,scopedCarrierWrittenRole} from './scoped-carrier-source-20261101-operands.mjs';
import {applyLayeredCoreAdoptionSource} from './layered-core-adoption-source.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const ident=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text)&&!['_','mut','ref','self','Self'].includes(row.text);
const words=rows=>rows.map(row=>row.text).join('');
const fail=reason=>{throw TypeError('Canonical JSON reader source fold: '+reason);};
const paths=Object.freeze([
 {some:'crate::translation_core::Maybe::Some',none:'crate::translation_core::Maybe::None',owner:'crate::translation_core::Json'},
 {some:'::core::option::Option::Some',none:'::core::option::Option::None',owner:'::serde_json::Value'},
]);
function header(tokens){
 const fn=tokens.findIndex(row=>row.text==='fn');if(fn<0||tokens[fn+2]?.text!=='('||tokens.slice(0,fn).some(row=>['async','unsafe','const','extern'].includes(row.text)))return null;
 const end=scopedCarrierGroupEnd(tokens,fn+2);if(end===null)return null;const roles=new Map();let start=fn+3;
 for(let at=start;at<=end;at++){if(at===end||tokens[at].text===','){if(at>start){const part=tokens.slice(start,at);if(!ident(part[0])||part[1]?.text!==':'||roles.has(part[0].text))return null;roles.set(part[0].text,scopedCarrierWrittenRole(part.slice(2)));}start=at+1;}else if(['(','['].includes(tokens[at].text)){const last=scopedCarrierGroupEnd(tokens,at);if(last===null)return null;at=last;}}
 let body=end+1;for(;body<tokens.length&&tokens[body].text!=='{';body++);if(scopedCarrierGroupEnd(tokens,body)!==tokens.length-1)return null;return {roles,body};
}
function receiver(source,rows,roles,protectedNames){
 if(rows.length===6&&ident(rows[0])&&rows[1].text==='.'&&rows[2].text==='get'&&rows[3].text==='('&&rows[5].text===')'){
  const root=rows[0],key=rows[4];if(roles.get(root.text)!=='json:json'||protectedNames.has(root.text))return null;
  if(!(key.type==='string'&&/^(?:"|r#{0,255}")/u.test(key.text)||ident(key)&&roles.get(key.text)==='payload:str'&&!protectedNames.has(key.text)))return null;
  return {root:source.slice(root.start,root.end),key:source.slice(key.start,key.end),rootSpan:[root.start,root.end],keySpan:[key.start,key.end],sourceRootRoleOnly:true};
 }
 return null;
}
function canonical(source,part,roles,protectedNames){
 let at=1;if(part[at++]?.text!=='let'||!ident(part[at])||part[at+1]?.text!=='=')return null;const input=part[at++];at++;const begin=at;
 for(;at<part.length&&part[at].text!==';';at++)if(['(','[','{'].includes(part[at].text)){const end=scopedCarrierGroupEnd(part,at);if(end===null)return null;at=end;}
 if(at===part.length)return null;const sourceReceiver=receiver(source,part.slice(begin,at),roles,protectedNames);if(!sourceReceiver)return null;at++;
 if(part[at++]?.text!=='if'||part[at++]?.text!=='let')return null;const pathStart=at;for(;at<part.length&&part[at].text!=='(';at++);if(at===part.length)return null;const profile=paths.find(row=>row.some===words(part.slice(pathStart,at)));if(!profile)return null;
 if(!ident(part[at+1])||part[at+2]?.text!==')'||part[at+3]?.text!=='='||part[at+4]?.text!==input.text||part[at+5]?.text!=='{')return null;const payload=part[at+1];if(payload.text===input.text||[sourceReceiver.root,sourceReceiver.key].includes(payload.text)||[sourceReceiver.root,sourceReceiver.key].includes(input.text))return null;at+=5;
 const thenEnd=scopedCarrierGroupEnd(part,at);if(thenEnd===null)return null;const called=part.slice(at+1,thenEnd);let open=called.findIndex(row=>row.text==='(');if(open<0||scopedCarrierGroupEnd(called,open)!==called.length-1||called.length-open!==3||called[open+1].text!==payload.text)return null;
 const callee=words(called.slice(0,open)),member=['as_str','as_bool','as_u64'].find(name=>callee===profile.owner+'::'+name);if(!member)return null;at=thenEnd+1;
 if(part[at++]?.text!=='else'||part[at]?.text!=='{')return null;const elseEnd=scopedCarrierGroupEnd(part,at);if(elseEnd===null||words(part.slice(at+1,elseEnd))!==profile.none||elseEnd!==part.length-2)return null;
 const operation={as_str:'json_str_field',as_bool:'json_bool_field',as_u64:'json_u64_field'}[member],contract=jsonFieldContract(operation);if(!contract||contract.rustName!==operation)return null;
 return {...sourceReceiver,operation,member,inputSpan:[input.start,input.end],payloadSpan:[payload.start,payload.end],receiverSpan:[part[begin].start,part[at-1]?.end??part[begin].end],replacement:contract.rustPath+'('+sourceReceiver.root+', '+sourceReceiver.key+')'};
}
export function selectCanonicalJsonReaderFold(source,item){
 accountData({source,item});if(typeof source!=='string'||/\p{Surrogate}/u.test(source)||Buffer.byteLength(source)>2097152)fail('bounded whole original source required');const actual=sourceItems(source).filter(row=>row.term==='fn'&&row.start===item?.start&&row.end===item?.end);if(actual.length!==1)return {edits:[],selections:[],residuals:[{reason:'one actual complete top-level original function interval required'}]};const tokens=actual[0].tokens.filter(row=>row.type!=='comment');if(tokens.length>200000)fail('unchanged original token bound');const entry=header(tokens);if(!entry)return {edits:[],selections:[],residuals:[{reason:'ordinary immutable original parameter/header scope required'}]};
 const edits=[],selections=[],residuals=[],protectedNames=new Set();
 // Refusal-only shadow census. Never let an original parameter's source role
 // qualify a same-name local or callback/pattern binder elsewhere in the file.
 for(let at=entry.body+1;at<tokens.length-1;at++){
  if(['let','for'].includes(tokens[at].text)){let stop=at+1;for(;stop<tokens.length&&!['=',';','{','in'].includes(tokens[stop].text);stop++);for(const token of tokens.slice(at+1,stop))if(ident(token)&&entry.roles.has(token.text))protectedNames.add(token.text);}
  if(tokens[at].text==='|'){let stop=at+1;for(;stop<tokens.length&&tokens[stop].text!=='|';stop++);for(const token of tokens.slice(at+1,stop))if(ident(token)&&entry.roles.has(token.text))protectedNames.add(token.text);at=stop;}
 }
 for(let at=entry.body+1;at<tokens.length-1;at++){
  if(tokens[at].text!=='{')continue;const end=scopedCarrierGroupEnd(tokens,at);if(end===null)fail('complete original reader delimiters required');const part=tokens.slice(at,end+1);if(part[1]?.text!=='let'||!part.some((row,index)=>row.text==='if'&&part[index+1]?.text==='let'))continue;
  const selected=canonical(source,part,entry.roles,protectedNames);if(!selected){residuals.push({span:[tokens[at].start,tokens[end].end],reason:'reader block differs from exact canonical single-let/Some/qualified scalar/None equation'});continue;}
  const span=[tokens[at].start,tokens[end].end],comments=actual[0].tokens.filter(row=>row.type==='comment'&&row.start>=span[0]&&row.end<=span[1]).map(row=>row.text+'\n').join('');edits.push({span,expected:source.slice(...span),replacement:comments+selected.replacement});selections.push({span,operation:selected.operation,member:selected.member,rootSpan:selected.rootSpan,keySpan:selected.keySpan,inputSpan:selected.inputSpan,payloadSpan:selected.payloadSpan,receiverOnce:true,keyOnce:true,originalPatternAuthority:false,oldTraitDispatchProved:false,oldOptionOwnerProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false});at=end;
 }
 return {edits,selections,residuals,sourceAuthority:false,semanticAuthority:false};
}
export function proposeCanonicalJsonReaderFold(source,item){
 const selected=selectCanonicalJsonReaderFold(source,item),proposal=applyLayeredCoreAdoptionSource(source,selected.edits,{languageRule:'language:exact-original-canonical-scalar-reader-source-equation',repositoryRule:'repository:explicit-qualified-existing-json-field-adoption',bindings:[{native:'crate::translation_json_fields_core::',neutral:'::translation_compatibility_json_fields::'}]});let inverse=proposal.after.source;for(const row of [...proposal.mapping].reverse())if(row.kind==='substitution'){if(inverse.slice(...row.after)!==row.replacement)fail('full source inverse substitution differs');inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);}if(inverse!==source)fail('complete original physical source inverse differs');const result={...proposal,inverse,selections:selected.selections,residuals:selected.residuals,wholeOriginalSourceRetained:true,originalPatternAuthority:false,oldTraitDispatchProved:false,oldOptionOwnerProved:false,semanticAuthority:false,executableAdmission:false};accountData(result);return result;
}
