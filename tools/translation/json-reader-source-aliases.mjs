// Untrusted source-role data only. This helper grants no native/type/loan authority.
// The public adopter supplies these private source helpers, never caller hooks.
export function createJsonReaderSourceAliasWalk({source,tokens,body,parameters,owners,close,ident,canonicalReader,typedParameters}){
 let work=0;const tick=(count=1)=>{work+=count;if(work>200000)throw new TypeError('JSON reader lexical source-role work bound');},blocked=new Set(),pending=new Map(),stack=[],roots=new Map(parameters);let current=roots;
 tick(roots.size);
 for(let at=body+1;at<tokens.length-1;at++){
  tick();const token=tokens[at];
  if(token.text==='let'){
   let equal=at+1;while(equal<tokens.length&&!['=',';','{','}'].includes(tokens[equal].text)){tick();equal++;}
   const pattern=tokens.slice(at+1,equal),plain=ident(pattern[0])&&pattern[0].text!=='mut'&&(pattern.length===1||pattern[1]?.text===':'),statement=['{',';','}'].includes(tokens[at-1]?.text);
   if(!plain||!statement)for(const token of pattern)if(ident(token))blocked.add(token.text);
  }
  if(token.text==='|'&&['=','(',',','return','{','=>','move'].includes(tokens[at-1]?.text)){
   let end=at+1;while(end<tokens.length&&tokens[end].text!=='|'){tick();if(ident(tokens[end]))blocked.add(tokens[end].text);end++;}at=end;
  }
  if(token.text==='=>'){let start=at-1;while(start>body&&!['{','}',',',';','=>'].includes(tokens[start-1].text)){tick();start--;}for(const token of tokens.slice(start,at))if(ident(token))blocked.add(token.text);}
 }
 const lookup=name=>!blocked.has(name)?current.get(name)??null:null;
 function key(piece,role,env){
  if(piece.length!==1)return false;const token=piece[0],known=env.get(token.text),text=token.type==='string'&&/^(?:"|r#*")/u.test(token.text)||ident(token)&&!blocked.has(token.text)&&known?.keyRole==='str',index=ident(token)&&!blocked.has(token.text)&&known?.keyRole==='usize'||token.type==='number'&&/^(?:0|[1-9][0-9_]*)(?:_?usize)?$/u.test(token.text);
  return role==='json'&&(text||index)||role==='map'&&text||role==='array'&&index;
 }
 function infer(piece,env,declared=null,depth=0){
  tick(piece.length+1);if(!piece.length||depth>32)return null;if(piece[0].text==='('&&close(piece,0)===piece.length-1)return infer(piece.slice(1,-1),env,declared,depth+1);
  if(piece.length===1&&piece[0].type==='string'&&/^(?:"|r#*")/u.test(piece[0].text))return {role:null,keyRole:'str',type:'&str',sourceName:null,aliasOrigins:[]};
  if(piece.length===1&&piece[0].type==='number'&&/^(?:0|[1-9][0-9_]*)(?:_?usize)?$/u.test(piece[0].text)&&(/usize$/u.test(piece[0].text)||declared?.keyRole==='usize'))return {role:null,keyRole:'usize',type:'usize',sourceName:null,aliasOrigins:[]};
  if(!ident(piece[0])||blocked.has(piece[0].text))return null;let value=env.get(piece[0].text);if(!value)return null;value={...value};let at=1;
  for(let step=0;at<piece.length&&step<32;step++){
   tick();if(piece[at].text==='?'&&value.role?.startsWith('optional-')){value.role=value.role.slice(9);at++;continue;}
   if(piece[at].text!=='.'||!ident(piece[at+1])||piece[at+2]?.text!=='(')return null;const end=close(piece,at+2);if(end<0)return null;const method=piece[at+1].text,args=piece.slice(at+3,end);
   if(method==='get'&&key(args,value.role,env)){value.role='optional-json';value.keyRole=null;}
   else if(['as_object','as_array'].includes(method)&&value.role==='json'&&!args.length){value.role=method==='as_object'?'optional-map':'optional-array';value.keyRole=null;}
   else if(method==='and_then'&&['optional-json','optional-map','optional-array'].includes(value.role)){
    const selected=value.role==='optional-json'?canonicalReader(args):null;if(selected&&['as_object','as_array'].includes(selected.member))value.role=selected.member==='as_object'?'optional-map':'optional-array';
    else{if(args[0]?.text!=='|'||!ident(args[1])||args[2]?.text!=='|')return null;const binder=args[1].text;let body=args.slice(3);if(body[0]?.text==='{'){if(close(body,0)!==body.length-1)return null;body=body.slice(1,-1);}if(body[0]?.text!==binder||body[1]?.text!=='.'||body[2]?.text!=='get'||body[3]?.text!=='('||close(body,3)!==body.length-1||!key(body.slice(4,-1),value.role.slice(9),env))return null;value.role='optional-json';}value.keyRole=null;
   }
   else if(method==='filter'&&value.role==='optional-json'){
    if(args[0]?.text!=='|'||!ident(args[1])||args[2]?.text!=='|')return null;const binder=args[1].text;let body=args.slice(3);if(body[0]?.text==='{'){if(close(body,0)!==body.length-1)return null;body=body.slice(1,-1);}if(body[0]?.text==='!')body=body.slice(1);if(body.length!==5||body[0].text!==binder||body[1].text!=='.'||!canonicalJsonPredicateMember(body[2].text)||body[3].text!=='('||body[4].text!==')')return null;
   }
   else if(method==='unwrap_or'&&value.role==='optional-json'&&args.length===1&&ident(args[0])&&!blocked.has(args[0].text)&&env.get(args[0].text)?.role==='json')value.role='json';
   else return null;at=end+1;
  }
  return at===piece.length?value:null;
 }
 function planLet(at){
  const name=tokens[at+1];if(!ident(name)||name.text==='mut'||!['{',';','}'].includes(tokens[at-1]?.text))return;
  if(owners.has(name.text)||['serde_json','core','crate','translation_core'].includes(name.text))return;
  let equal=at+2,angle=0;while(equal<tokens.length){tick();const token=tokens[equal];if(!angle&&token.text==='=')break;if([';','{','}'].includes(token.text))return;if(['(','['].includes(token.text)){const end=close(tokens,equal);if(end<0)return;equal=end;}else if(token.text==='<')angle++;else if(token.text==='>')angle--;else if(token.text==='>>')angle-=2;equal++;}
  if(equal>=tokens.length)return;let end=equal+1;for(;end<tokens.length;end++){tick();if(tokens[end].text===';')break;if(tokens[end].text==='}')return;if(['(','[','{'].includes(tokens[end].text)){const finish=close(tokens,end);if(finish<0)return;end=finish;}}
  if(end>=tokens.length)return;const pattern=tokens.slice(at+1,equal),plain=pattern.length===1||pattern[1]?.text===':';if(!plain)return;
  const written=pattern.length>1?typedParameters(pattern)?.parameters.get(name.text)??null:null,derived=infer(tokens.slice(equal+1,end),current,written),valid=derived&&(!written||written.role===derived.role&&written.keyRole===derived.keyRole),origins=derived?.aliasOrigins??[];let value=null;
  if(valid&&origins.length<32&&!blocked.has(name.text))value={...derived,sourceName:name.text,formalSourceName:derived.formalSourceName??derived.sourceName,aliasOrigins:[...origins,{name:name.text,span:[tokens[at].start,tokens[end].end],initializerSpan:[tokens[equal+1].start,tokens[end].start],source:source.slice(tokens[at].start,tokens[end].end),sourceRoleOnly:true}]};
  pending.set(end,{target:current,name:name.text,value});
 }
 return {lookup,finish(){tick();if(current!==roots||stack.length||pending.size)throw new TypeError('JSON reader lexical source walk did not finish');},advance(at){
  tick();const token=tokens[at];if(token.text==='{'){tick(current.size+1);stack.push(current);current=new Map(current);}else if(token.text==='}'){if(!stack.length)throw new TypeError('JSON reader lexical block stack differs');current=stack.pop();}
  if(token.text==='let')planLet(at);const next=pending.get(at);if(next){next.target.set(next.name,next.value);pending.delete(at);}
 }};
}

import {canonicalJsonPredicateMember} from './json-value-predicates.mjs';
