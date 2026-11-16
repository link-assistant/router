// Bounded source-splice data only. No type, borrow, owner or executable issuer.
// The legacy entry keeps437's rendering and evaluation positions unchanged.
const C='crate::translation_core::';
const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const text=tokens=>tokens.map(token=>token.text).join('');
function close(tokens,start){const pairs={'(':')','[':']','{':'}'},stack=[];for(let at=start;at<tokens.length;at++){const token=tokens[at];if(['string','char','comment'].includes(token.type))continue;if(pairs[token.text])stack.push(pairs[token.text]);else if([')',']','}'].includes(token.text)){if(stack.pop()!==token.text)return -1;if(!stack.length)return at;}}return -1;}
function optionReaderBranch(receiver,called,input,payload,some,none){return '{ let '+input+' = '+receiver+'; if let '+some+'('+payload+') = '+input+' { '+called+' } else { '+none+' } }';}
export function createLegacyJsonReaderNormalizer(source,tokens,jsonNames,names){
 let serial=0;
 const fresh=()=>{let value;do{value='__router_json_collection_'+(++serial);}while(names.has(value));names.add(value);return value;};
 const normalizations=[],knownCallbackBinders=new Set();
 function readers(start,stop,parameter,depth=0){
  if(depth>32)return null;const first=tokens[start];if(first?.text!==parameter)return null;
  let at=start+1,role='value',optional=false,changed=false,rendered=source.slice(first.start,first.end);
  while(at<stop&&tokens[at]?.text==='.'&&ident(tokens[at+1])&&tokens[at+2]?.text==='('){
   const end=close(tokens,at+2);if(end<0||end>=stop)return null;
   const method=tokens[at+1].text,args=tokens.slice(at+3,end),raw=source.slice(tokens[at-1].end,tokens[end].end);
   if(method==='get'&&!optional&&role==='value'&&args.length===1&&args[0].type==='string'){rendered+=raw;optional=true;}
   else if(method==='as_str'&&!optional&&role==='value'&&!args.length){rendered+=raw;optional=true;role='str';}
   else if(method==='and_then'&&optional&&role==='value'){
    const input=fresh(),payload=fresh();let called,output;
    const fn=text(args),owner=fn.endsWith('::as_str')?fn.slice(0,-8):null;
    if(owner&&(owner===C+'Json'||jsonNames.has(owner))){called=C+'Json::as_str('+payload+')';output='str';}
    else if(args[0]?.text==='|'&&ident(args[1])&&args[2]?.text==='|'){
     const begin=at+6,finish=end;let innerStart=begin,innerEnd=finish;
     if(tokens[innerStart]?.text==='{'&&close(tokens,innerStart)===finish-1){innerStart++;innerEnd--;}
     const selected=readers(innerStart,innerEnd,args[1].text,depth+1);
     if(!selected||selected.end!==innerEnd||!selected.optional)return null;
     knownCallbackBinders.add(args[0].start);called='{ let '+args[1].text+' = '+payload+'; '+selected.value+' }';output=selected.role;
    }else return null;
    rendered=optionReaderBranch(rendered,called,input,payload,'Some','None');role=output;changed=true;
   }else if(method==='unwrap_or'&&optional&&role==='str'&&args.length===1&&args[0].type==='string'){
    const input=fresh(),fallback=fresh(),payload=fresh(),value=source.slice(args[0].start,args[0].end);
    rendered='{ let '+input+' = '+rendered+'; let '+fallback+' = '+value+'; if let Some('+payload+') = '+input+' { '+payload+' } else { '+fallback+' } }';optional=false;changed=true;
   }else if(method==='is_some'&&optional&&role==='value'&&!args.length){
    const input=fresh();rendered='{ let '+input+' = '+rendered+'; if let Some(_) = '+input+' { true } else { false } }';optional=false;role='bool';changed=true;
   }else break;
   at=end+1;
  }
  return {end:at,value:rendered,role,optional,changed};
 }
 function normalize(start,stop,parameter,from,to){
  let output='',position=from;
  for(let at=start;at<stop;at++)if(tokens[at].text===parameter){
   const read=readers(at,stop,parameter);if(read?.changed){const end=tokens[read.end-1].end;output+=source.slice(position,tokens[at].start)+read.value;normalizations.push({span:[tokens[at].start,end],expected:source.slice(tokens[at].start,end),replacement:read.value});position=end;at=read.end-1;}
  }
  return output+source.slice(position,to);
 }
 return {fresh,normalizations,knownCallbackBinders,readers,normalize};
}

// Fixed canonical Option equation. Both source stages still pass through the
// untrusted CST transport and the ordinary independent semantic checker.
const scalarReaders=new Set(['as_str','as_bool','as_u64','as_i64','as_null']);
export function canonicalJsonReaderMember(name){return scalarReaders.has(name);}
export function expandCanonicalJsonReaderDefault(receiver,member,input,payload){
 const fallback=member==='as_str'?'""':member==='as_bool'?'false':member==='as_u64'?'0_u64':member==='as_i64'?'0_i64':member==='as_f64'?'0.0_f64':member==='as_null'?'()':null;
 if(fallback===null||typeof receiver!=='string'||receiver.length>2000000||![input,payload].every(name=>typeof name==='string'&&name.length<=64&&/^__router_json_reader_[0-9]+$/u.test(name))||input===payload)throw new TypeError('Canonical JSON reader default requires bounded fixed source-splice operands');
 const some='::core::option::Option::Some',prefix='{ let '+input+' = '+receiver+'; if let ',source=prefix+some+'('+payload+') = '+input+' { '+payload+' } else { '+fallback+' } }',paths=[{span:[prefix.length,prefix.length+some.length],expected:some,replacement:C+'Maybe::Some'}],repository=prefix+C+'Maybe::Some('+payload+') = '+input+' { '+payload+' } else { '+fallback+' } }';
 return {source,paths,repository,defaultSource:fallback,borrowedDefault:member==='as_str'};
}

// Fixed canonical shared-Option equations. Source DATA only; no dispatch issuer.
import {isPlainSourceIdentifier} from './module-paths.mjs';
function optionSourceOperands(receiver,input,payload){
 if(typeof receiver!=='string'||receiver.length>2000000||![input,payload].every(name=>typeof name==='string'&&name.length<=64&&/^__router_json_reader_[0-9]+$/u.test(name))||input===payload)throw new TypeError('Canonical JSON Option requires bounded fixed source-splice operands');
}
function optionGeneratedPaths(source,paths){let repository=source;for(const row of [...paths].reverse()){if(repository.slice(...row.span)!==row.expected)throw new TypeError('Generated canonical Option path differs');repository=repository.slice(0,row.span[0])+row.replacement+repository.slice(row.span[1]);}return repository;}
export function expandCanonicalJsonOptionTerminal(receiver,method,fallback,input,payload,fallbackName){
 optionSourceOperands(receiver,input,payload);if(!['is_some','is_none','unwrap_or'].includes(method))throw new TypeError('Fixed canonical JSON Option terminal required');
 const eager=method==='unwrap_or';if(eager){if(typeof fallback!=='string'||!fallback.length||fallback.length>2000000||typeof fallbackName!=='string'||!/^__router_json_reader_[0-9]+$/u.test(fallbackName)||fallbackName.length>64||[input,payload].includes(fallbackName))throw new TypeError('Bounded distinct eager Option fallback required');}else if(fallback!==null||fallbackName!==null)throw new TypeError('Presence terminal takes no fallback');
 const some='::core::option::Option::Some',prefix='{ let '+input+' = '+receiver+'; '+(eager?'let '+fallbackName+' = '+fallback+'; ':'')+'if let ',bound=eager?payload:'_',yes=eager?payload:method==='is_some'?'true':'false',no=eager?fallbackName:method==='is_some'?'false':'true',source=prefix+some+'('+bound+') = '+input+' { '+yes+' } else { '+no+' } }',paths=[{span:[prefix.length,prefix.length+some.length],expected:some,replacement:C+'Maybe::Some'}];
 return {source,paths,repository:optionGeneratedPaths(source,paths),method,evaluationOrder:eager?['receiver-once','fallback-once-even-when-Some','select-payload-or-fallback']:['receiver-once','inspect-presence'],executableAdmission:false};
}
export function expandCanonicalJsonReaderClosure(receiver,binder,body,input,payload){
 optionSourceOperands(receiver,input,payload);if(typeof binder!=='string'||!isPlainSourceIdentifier(binder)||[input,payload].includes(binder)||typeof body!=='string'||!body.length||body.length>2000000)throw new TypeError('Bounded ordinary canonical JSON callback source required');
 const some='::core::option::Option::Some',none='::core::option::Option::None',prefix='{ let '+input+' = '+receiver+'; if let ',called='{ let '+binder+' = '+payload+'; '+body+' }',source=prefix+some+'('+payload+') = '+input+' { '+called+' } else { '+none+' } }',noneStart=(prefix+some+'('+payload+') = '+input+' { '+called+' } else { ').length,paths=[{span:[prefix.length,prefix.length+some.length],expected:some,replacement:C+'Maybe::Some'},{span:[noneStart,noneStart+none.length],expected:none,replacement:C+'Maybe::None'}];
 return {source,paths,repository:optionGeneratedPaths(source,paths),evaluationOrder:['receiver-once','Some-bind-and-run-body-once','None-without-body'],executableAdmission:false};
}

// Closed noncapturing predicate equation, consumed only by the source adopter.
import {canonicalJsonPredicateMember} from './json-value-predicates.mjs';
export function expandCanonicalJsonOptionPredicate(receiver,method,predicate,negated,input,payload){
 optionSourceOperands(receiver,input,payload);if(!['is_some_and','is_none_or'].includes(method)||!canonicalJsonPredicateMember(predicate)||typeof negated!=='boolean')throw new TypeError('Fixed canonical JSON Option predicate required');
 const some='::core::option::Option::Some',callee='::serde_json::Value::'+predicate,prefix='{ let '+input+' = '+receiver+'; if let ',branch=prefix+some+'('+payload+') = '+input+' { '+(negated?'!':''),source=branch+callee+'('+payload+') } else { '+(method==='is_none_or'?'true':'false')+' } }',paths=[{span:[prefix.length,prefix.length+some.length],expected:some,replacement:C+'Maybe::Some'},{span:[branch.length,branch.length+callee.length],expected:callee,replacement:C+'Json::'+predicate}];
 return {source,paths,repository:optionGeneratedPaths(source,paths),evaluationOrder:['receiver-once','Some-predicate-once','None-without-predicate'],executableAdmission:false};
}

export function expandCanonicalJsonOptionFilter(receiver,predicate,negated,input,payload){
 optionSourceOperands(receiver,input,payload);if(!canonicalJsonPredicateMember(predicate)||typeof negated!=='boolean')throw new TypeError('Fixed shared JSON filter predicate required');
 const pieces=[],paths=[];let length=0;const push=text=>{pieces.push(text);length+=text.length;},path=(expected,replacement)=>{paths.push({span:[length,length+expected.length],expected,replacement});push(expected);},some='::core::option::Option::Some',none='::core::option::Option::None',callee='::serde_json::Value::'+predicate;
 push('{ let '+input+' = '+receiver+'; if let ');path(some,C+'Maybe::Some');push('('+payload+') = '+input+' { if '+(negated?'!':''));path(callee,C+'Json::'+predicate);push('('+payload+') { ');path(some,C+'Maybe::Some');push('('+payload+') } else { ');path(none,C+'Maybe::None');push(' } } else { ');path(none,C+'Maybe::None');push(' } }');const source=pieces.join('');
 return {source,paths,repository:optionGeneratedPaths(source,paths),evaluationOrder:['receiver-once','Some-predicate-once','preserve-matching-shared-payload','None-without-predicate'],executableAdmission:false};
}
