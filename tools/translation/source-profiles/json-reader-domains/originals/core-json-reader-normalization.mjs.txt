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
export function expandCanonicalJsonReader(receiver,member,input,payload){
 if(typeof receiver!=='string'||!scalarReaders.has(member)||![input,payload].every(name=>/^__router_json_reader_[0-9]+$/u.test(name))||input===payload)throw new TypeError('Canonical JSON reader requires fixed source-splice operands');
 const some='::core::option::Option::Some',none='::core::option::Option::None',callee='::serde_json::Value::'+member;
 const called=callee+'('+payload+')',source=optionReaderBranch(receiver,called,input,payload,some,none),paths=[];
 // Generated regions are joined by construction, never searched in RECEIVER.
 const inputEnd=('{ let '+input+' = '+receiver+'; if let ').length;
 paths.push({span:[inputEnd,inputEnd+some.length],expected:some,replacement:C+'Maybe::Some'});
 const callStart=inputEnd+some.length+('('+payload+') = '+input+' { ').length;
 paths.push({span:[callStart,callStart+callee.length],expected:callee,replacement:C+'Json::'+member});
 const noneStart=callStart+called.length+' } else { '.length;
 paths.push({span:[noneStart,noneStart+none.length],expected:none,replacement:C+'Maybe::None'});
 let repository=source;for(const row of [...paths].reverse()){if(repository.slice(...row.span)!==row.expected)throw new TypeError('Generated canonical reader path differs');repository=repository.slice(0,row.span[0])+row.replacement+repository.slice(row.span[1]);}
 return {source,paths,repository};
}
