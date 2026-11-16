// Bounded source role DATA only. Original namespace/type/ownership remain open.
import {readCarrierAliasOperand,encodeCarrierRole,decodeCarrierRole} from './primitive-carrier-local-source.mjs';
import {readLocalAliasInitializer} from './local-alias-written-source.mjs';
const ident=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text);
const fail=message=>{throw TypeError('Scoped source carrier operand: '+message);};
export function scopedCarrierWrittenRole(rows){
 const source=rows.map(row=>row.text).join(''),shared=source.replace(/^&'[A-Za-z_][A-Za-z_0-9]*/u,'&');
 if(['&str','&crate::translation_core::Str','&::core::primitive::str','&::std::primitive::str'].includes(shared))return 'payload:str';
 if(['String','std::string::String','::std::string::String','crate::translation_core::Text'].includes(source))return 'payload:text-owned';
 if(['&crate::translation_core::Json','&serde_json::Value','&::serde_json::Value'].includes(shared))return 'json:json';
 if(['bool','u64','i64'].includes(source))return 'payload:'+source;
 const option=/^(?:Option|std::option::Option|::std::option::Option|core::option::Option|::core::option::Option|crate::translation_core::Maybe)<(.+)>$/u.exec(source);
 if(option){const payload=option[1];if(['bool','u64','i64'].includes(payload))return 'option:'+payload;if(['&str','&crate::translation_core::Str'].includes(payload))return 'option:str';if(['String','crate::translation_core::Text'].includes(payload))return 'option:text-owned';}
 return null;
}
export function scopedCarrierGroupEnd(rows,start,tick=()=>{}){
 const pairs={'(':')','[':']','{':'}'},stack=[];if(!pairs[rows[start]?.text])return null;
 for(let at=start;at<rows.length;at++){tick();const word=rows[at].text;if(pairs[word]){if(stack.length>=64)fail('source delimiter depth bound');stack.push(pairs[word]);}else if([')',']','}'].includes(word)&&stack.pop()!==word)return null;if(!stack.length)return at;}return null;
}
// The original caller still enforces <=256 tokens. This successor accepts
// balanced blocks as opaque original expressions; it never evaluates a block.
export function scopedCarrierInitializerEnd(start,rows,tick=()=>{},options={}){
 const groups=[];for(let at=start;at<rows.length&&at-start<=256;at++){
  tick();const opaque=options.opaqueTokenEnds?.get(at);if(opaque!==undefined){at=opaque-1;continue;}const word=rows[at].text;
  if(word===';'&&!groups.length)return at;
  const pair={'(':')','[':']','{':'}'}[word];if(pair){if(groups.length>=64)fail('source initializer delimiter depth bound');groups.push(pair);}else if([')',']','}'].includes(word)&&groups.pop()!==word)return null;
 }return null;
}
export function readScopedCarrierOperand(rows,bindings,{wanted=null,source=null,budget={cells:0},depth=0}={}){
 const tick=()=>{if(++budget.cells>200000)fail('whole source role work bound');};tick();if(!rows.length||rows.length>256||depth>32)return null;
 const role=kind=>decodeCarrierRole(kind)?{kind,binding:null,span:[rows[0].start,rows.at(-1).end],sourceAuthority:false,semanticAuthority:false}:null;
 if(rows[0].text==='('&&scopedCarrierGroupEnd(rows,0,tick)===rows.length-1){const inner=readScopedCarrierOperand(rows.slice(1,-1),bindings,{wanted,source,budget,depth:depth+1});return inner?{...inner,span:[rows[0].start,rows.at(-1).end],parenthesized:true}:null;}
 if(rows[0].text==='{'){
  if(scopedCarrierGroupEnd(rows,0,tick)!==rows.length-1)return null;const locals=new Map(bindings),facts=[];let at=1;
  while(rows[at]?.text==='let'){
   tick();const initializer=readLocalAliasInitializer(rows,at,scopedCarrierWrittenRole);if(!initializer||!ident(rows[at+1]))return null;const end=scopedCarrierInitializerEnd(initializer.start,rows,tick);if(end===null||end>=rows.length-1)return null;
   const value=readScopedCarrierOperand(rows.slice(initializer.start,end),locals,{wanted:initializer.domain,source,budget,depth:depth+1});if(!value||initializer.domain&&initializer.domain!==value.kind)return null;
   const name=rows[at+1].text;facts.push({name,kind:value.kind,declarationSpan:[rows[at].start,rows[end].end],initializerSpan:[rows[initializer.start].start,rows[end-1].end],sourceAuthority:false});locals.set(name,value.kind);at=end+1;if(facts.length>128)return null;
  }
  const tail=rows.slice(at,-1);if(!tail.length)return null;for(let index=0;index<tail.length;index++){if([';','return','break','continue'].includes(tail[index].text))return null;if(['(','[','{'].includes(tail[index].text)){const end=scopedCarrierGroupEnd(tail,index,tick);if(end===null)return null;index=end;}}
  const value=readScopedCarrierOperand(tail,locals,{wanted,source,budget,depth:depth+1});return value?{...value,binding:null,span:[rows[0].start,rows.at(-1).end],blockLocals:facts,nestedBlockLocals:value.blockLocals??[],blockTailSpan:[tail[0].start,tail.at(-1).end],sourceAuthority:false,semanticAuthority:false}:null;
 }
 // Existing exact source readers select qualified operations/aliases. Their
 // declared return roles still do not prove actual library or std ownership.
 const result=readCarrierAliasOperand(rows,bindings,decodeCarrierRole(wanted));if(!result)return null;const kind=encodeCarrierRole(result);return kind?{...role(kind),binding:result.binding??null,bridge:result.bridge??null}:null;
}
