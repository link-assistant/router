// General complete source type-position selection. No binding/native authority.
// Parent adopters supply their current whole-owner scope checks and type rules.
const identifier=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const fail=message=>{throw new TypeError('Fixed declaration type positions: '+message);};
function close(rows,begin){
 const pairs={'(':')','[':']','{':'}'},stack=[];
 for(let at=begin;at<rows.length;at++){const word=rows[at].text;if(pairs[word]){if(stack.length>=64)fail('delimiter depth exceeds bound');stack.push(pairs[word]);}else if([')',']','}'].includes(word)){if(stack.pop()!==word)fail('unbalanced declaration group');if(!stack.length)return at;}}
 fail('unclosed declaration group');
}
function list(rows){
 const result=[];let begin=0,angle=0;
 for(let at=0;at<rows.length;at++){const word=rows[at].text;if(['(','[','{'].includes(word)){at=close(rows,at);continue;}if(word==='<')angle++;else if(word==='>')angle--;else if(word==='>>')angle-=2;if(angle<0||angle>64)fail('unsupported type argument delimiters');if(word===','&&!angle){if(at===begin)fail('empty declaration component');result.push(rows.slice(begin,at));begin=at+1;}}
 if(angle)fail('unclosed type arguments');if(begin<rows.length)result.push(rows.slice(begin));return result;
}
function visibility(rows){
 if(rows[0]?.text!=='pub')return rows;
 let at=1;if(rows[at]?.text==='('){const end=close(rows,at),words=rows.slice(at+1,end).map(row=>row.text);if(!words.length||words.some(word=>!['crate','super','self','in','::'].includes(word)&&!/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(word)))fail('unsupported field visibility');at=end+1;}return rows.slice(at);
}
function fields(rows,record,parseType){
 const edits=[],names=new Set();
 for(const original of list(rows)){
  const row=visibility(original);if(row[0]?.text==='#')fail('field attributes require separate source producer integration');
  if(record){if(!identifier(row[0])||row[1]?.text!==':'||names.has(row[0].text))fail('complete unique named field required');names.add(row[0].text);edits.push(...parseType(row.slice(2)));}
  else edits.push(...parseType(row));
 }
 return edits;
}
export function fixedTypeDeclarationEdits(item,header,parseType,{lifetimes=[]}={}){
 if(typeof parseType!=='function')fail('whole source type selector required');
 const rows=item.tokens.filter(row=>row.type!=='comment');if(rows.length>200000)fail('declaration token count exceeds bound');
 const name=rows.findIndex(row=>row.start===header.nameSpan.start);if(name<0||!identifier(rows[name])||header.rawIdentifier)fail('actual ordinary declaration name required');const binders=readLifetimeOnlySourceBinders(rows,name+1,lifetimes),selectType=tokens=>parseType(tokens,{lifetimes:binders.lifetimes});let at=binders.after;
 if(rows[at]?.text==='where'){const begin=at;while(at<rows.length&&!['{',';','='].includes(rows[at].text))at++;readLifetimeOnlyWhereSource(rows,begin,at,binders.lifetimes);}
 if(header.kind==='type'){
  if(rows[at]?.text!=='='||rows.at(-1)?.text!==';')fail('generic or conditional alias requires separate binder integration');return selectType(rows.slice(at+1,-1));
 }
 if(['struct','union'].includes(header.kind)){
  if(header.kind==='struct'&&rows[at]?.text===';'&&at===rows.length-1)return [];
  const group=rows[at]?.text;if(!['{','('].includes(group)||header.kind==='union'&&group!=='{')fail('generic or conditional field owner requires separate integration');
  const end=close(rows,at);if(group==='('){if(rows.at(-1)?.text!==';')fail('complete tuple declaration terminator required');readLifetimeOnlyWhereSource(rows,end+1,rows.length-1,binders.lifetimes);}else if(end!==rows.length-1)fail('complete field declaration terminator required');
  return fields(rows.slice(at+1,end),group==='{',selectType);
 }
 if(header.kind!=='enum'||rows[at]?.text!=='{'||close(rows,at)!==rows.length-1)fail('monomorphic complete enum owner required');
 const edits=[],names=new Set();
 for(const variant of list(rows.slice(at+1,-1))){
  if(!identifier(variant[0])||names.has(variant[0].text))fail('complete unique unadorned variant required');names.add(variant[0].text);
  if(variant.length===1)continue;const group=variant[1]?.text;if(!['{','('].includes(group)||close(variant,1)!==variant.length-1)fail('variant attributes or discriminants require separate source integration');
  edits.push(...fields(variant.slice(2,-1),group==='{',selectType));
 }
 return edits;
}

import {readLifetimeOnlySourceBinders,readLifetimeOnlyWhereSource} from './lifetime-only-declaration-source.mjs';
