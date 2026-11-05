// Test DATA discovery only. Original literal assertions grant no compiler authority.
import {sourceItems} from '../rust-structure.mjs';
const words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text);
const refuse=reason=>{throw new TypeError('Original scalar assertion: '+reason);};
function close(tokens,start){const pairs={__proto__:null,'(':')','[':']','{':'}'},stack=[];for(let at=start;at<tokens.length;at++){const text=tokens[at].text;if(pairs[text])stack.push(pairs[text]);else if([')',']','}'].includes(text)){if(stack.pop()!==text)refuse('unbalanced group');if(!stack.length)return at;}}refuse('unclosed group');}
function split(tokens){const rows=[];let from=0;for(let at=0;at<tokens.length;at++){if(['(','[','{'].includes(tokens[at].text))at=close(tokens,at);else if(tokens[at].text===','){rows.push(tokens.slice(from,at));from=at+1;}}if(from<tokens.length)rows.push(tokens.slice(from));return rows;}
function trim(tokens){while(tokens[0]?.text==='('&&close(tokens,0)===tokens.length-1)tokens=tokens.slice(1,-1);return tokens;}
function bits(tokens){const tail=words(tokens.slice(-4));if(tail.join('')!=='.to_bits()')return {tokens,observe:'value'};return {tokens:trim(tokens.slice(0,-4)),observe:'f64-bits'};}
export function scalarLiteral(tokens,type){
 tokens=trim(tokens);let text=words(tokens).join('');
 if(type.kind==='string'){
  if(tokens[0]?.text==='&')tokens=tokens.slice(1);for(const ending of ['.to_string()','.to_owned()'])if(words(tokens.slice(-4)).join('')===ending)tokens=tokens.slice(0,-4);
  if(tokens.length!==1)refuse('only one original string literal');text=tokens[0].text;
  const raw=/^r(#{0,255})"([\s\S]*)"\1$/u.exec(text);if(raw)return raw[2];
  if(!text.startsWith('"')||!text.endsWith('"'))refuse('original cooked Rust string required');
  for(let at=1;at<text.length-1;at++)if(text[at]==='\\'&&!['"','\\','n','r','t'].includes(text[++at]))refuse('unsupported Rust string escape');
  try{return JSON.parse(text);}catch{refuse('string is outside JSON-compatible Rust literal subset');}
 }
 if(type.kind==='bool'){if(text==='true')return true;if(text==='false')return false;refuse('literal bool required');}
 if(type.kind==='float'){
  if(!/^-?(?:\d[\d_]*)(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?(?:_?f64)?$/u.test(text))refuse('literal f64 required');
  const value=Number(text.replace(/_?f64$/u,'').replaceAll('_',''));if(!Number.isFinite(value))refuse('finite literal required');return value;
 }
 if(type.kind==='int'||type.kind==='fixed'){
  if(!/^-?(?:0x[\da-fA-F_]+|0o[0-7_]+|0b[01_]+|\d[\d_]*)(?:_?[ui](?:8|16|32|64|128|size))?$/u.test(text))refuse('integer literal required');
  text=text.replace(/_?[ui](?:8|16|32|64|128|size)$/u,'').replaceAll('_','');try{return text.startsWith('-')?-BigInt(text.slice(1)):BigInt(text);}catch{refuse('complete Rust integer literal required');}
 }
 refuse('unsupported scalar type '+type.kind);
}
export function discoverScalarRustAssertions(source,functions){
 if(typeof source!=='string'||!(functions instanceof Map))refuse('complete source and function map required');const assertions=[],excluded=[],originalItems=sourceItems(source),owners=[{original:source,items:originalItems,offset:0,parent:true}];
 for(const module of originalItems){
  if(module.term!=='mod')continue;const tokens=module.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{');if(open<0)continue;
  const prefix=words(tokens.slice(0,open)).join('');if(!['#[cfg(test)]mod'+module.name,'mod'+module.name,'#[cfg(test)]#[rustfmt::skip]mod'+module.name].includes(prefix))continue;const end=close(tokens,open);if(end!==tokens.length-1)continue;
  const original=source.slice(tokens[open].end,tokens[end].start),items=sourceItems(original);if(items.some(item=>!['fn','use','const','static','struct','enum','type','comment','trivia'].includes(item.term)))continue;owners.push({original,items,offset:tokens[open].end,parent:false});
 }
 for(const {original,items,offset,parent}of owners){
  const uses=items.filter(item=>item.term==='use').map(item=>words(item.tokens).join(''));
  if(!parent&&(!uses.includes('usesuper::*;')||uses.some(value=>value.includes('*')&&value!=='usesuper::*;')))continue;
  const hidden=new Set(parent?[]:items.filter(item=>item.term!=='use').map(item=>item.name));
  for(const item of items){
   if(item.term!=='fn')continue;const rows=item.tokens.filter(token=>token.type!=='comment'),fn=rows.findIndex(token=>token.text==='fn');if(!['#[test]','#[cfg(test)]#[test]'].includes(words(rows.slice(0,fn)).join('')))continue;
   const names=new Set();for(let at=0;at<rows.length;at++)if(['let','const','static','fn','type','struct','enum','mod','use'].includes(rows[at].text)){for(let end=at+1;end<rows.length&&!['=',';','{'].includes(rows[end].text);end++)names.add(rows[end].text);}
   for(let at=0;at<rows.length-2;at++){
    const opening=rows[at].text==='assert_eq!'?at+1:rows[at].text==='assert_eq'&&rows[at+1].text==='!'?at+2:-1;if(opening<0||!['(','[','{'].includes(rows[opening]?.text))continue;let details;
    try{
     const end=close(rows,opening),parts=split(rows.slice(opening+1,end));if(parts.length!==2)refuse('custom diagnostic expressions excluded');const left=bits(trim(parts[0])),right=bits(trim(parts[1]));if(left.observe!==right.observe)refuse('matching original observations required');
     const call=left.tokens,position=call.findIndex(token=>token.text==='(');if(position<1||close(call,position)!==call.length-1)refuse('one direct function call required');const path=words(call.slice(0,position)),name=path.at(-1);if(path.length!==1&&path.join('')!=='super::'+name)refuse('only original parent functions');const functionItem=functions.get(name);if(!functionItem||hidden.has(name)||names.has(name)||!parent&&uses.some(value=>value!=='usesuper::*;'&&new RegExp('\\b'+name+'\\b','u').test(value)))refuse('unresolved or shadowed caller');
     const parameters=functionItem.semantic.checkedIR.params,returns=functionItem.semantic.checkedIR.ret,arguments_=split(call.slice(position+1,-1));if(arguments_.length!==parameters.length||left.observe==='f64-bits'&&returns.kind!=='float')refuse('complete original scalar signature required');const args=arguments_.map((tokens,index)=>scalarLiteral(tokens,parameters[index].type)),expected=scalarLiteral(right.tokens,returns);
     details={originalTest:item.name,name,args,expected,observe:left.observe,returns:returns.kind,sourceSpan:{start:offset+rows[at].start,end:offset+rows[end].end},assertion:original.slice(rows[at].start,rows[end].end)};
     assertions.push(details);at=end;
    }catch(error){if(!(error instanceof TypeError)||!error.message.startsWith('Original scalar assertion:'))throw error;excluded.push({test:item.name,reason:error.message});}
   }
  }
 }
 return {assertions,excluded,sourceAuthority:false,runtimeAuthority:false,rustExecuted:false};
}
