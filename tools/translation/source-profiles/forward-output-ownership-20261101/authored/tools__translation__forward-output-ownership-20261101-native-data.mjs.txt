// DATA locators into an original private producer's already-retained full IR.
// This module issues no source, corpus, type, ownership or semantic authority.
// Its caller must retain the genuine private expected map and reissue the full
// original producer. Public/generated metadata never enters that admission.
const need=(yes,message)=>{if(!yes)throw new TypeError('Forward private native DATA: '+message);};
function white(text,at,end){while(at<end&&/[\t\r\n ]/u.test(text[at]))at++;return at;}
function stringEnd(text,at,end){
 need(text[at]==='"','JSON string required');
 for(let cursor=at+1;cursor<end;cursor++){
  if(text[cursor]==='\\'){cursor++;need(cursor<end,'complete JSON escape required');}
  else if(text[cursor]==='"')return cursor+1;
 }
 need(false,'complete JSON string required');
}
function valueEnd(text,at,end){
 at=white(text,at,end);const first=text[at];if(first==='"')return stringEnd(text,at,end);
 if(first==='{'||first==='['){
  let depth=1;
  for(let cursor=at+1;cursor<end;cursor++){
   const character=text[cursor];if(character==='"'){cursor=stringEnd(text,cursor,end)-1;continue;}
   if(character==='{'||character==='[')depth++;
   else if(character==='}'||character===']'){if(--depth===0)return cursor+1;}
  }
  need(false,'complete retained JSON container required');
 }
 let cursor=at;while(cursor<end&&!/[\t\r\n ,}\]]/u.test(text[cursor]))cursor++;
 need(cursor>at,'retained JSON value required');return cursor;
}
function member(text,start,end,name){
 let at=white(text,start,end);need(text[at++]==='{','retained JSON object required');let found=null;
 for(;;){
  at=white(text,at,end);if(text[at]==='}'){at++;break;}
  const keyStart=at,keyEnd=stringEnd(text,at,end);at=white(text,keyEnd,end);need(text[at++]===':','retained JSON member required');
  const begin=white(text,at,end),finish=valueEnd(text,begin,end);
  // The original json() serializer spells these fixed ASCII keys literally.
  // Do not allocate arbitrary names or a second complete IR object graph.
  if(keyEnd-keyStart===name.length+2&&text.slice(keyStart+1,keyEnd-1)===name){need(found===null,'unambiguous original member required');found=[begin,finish];}
  at=white(text,finish,end);if(text[at]==='}'){at++;break;}need(text[at++]===',','retained JSON comma required');
 }
 need(white(text,at,end)===end&&found!==null,'complete original object/member required');return found;
}
export function locatePrivateNativeSource(text,source){
 need(typeof text==='string'&&typeof source==='string','original private IR/source strings required');
 const [start,end]=member(text,0,text.length,'concreteSyntaxMeta'),[begin,finish]=member(text,start,end,'source');
 need(text[begin]==='"'&&JSON.parse(text.slice(begin,finish))===source,'full original CST source must reproduce the actual decoded native source');
 // A locator is DATA. Its consumer must bind it to its genuine private map.
 return Object.freeze({begin,finish});
}
export function readPrivateNativeSource(text,locator){
 need(typeof text==='string'&&Number.isSafeInteger(locator.begin)&&Number.isSafeInteger(locator.finish)&&locator.begin>=0&&locator.finish>locator.begin&&locator.finish<=text.length,'complete private source locator required');
 const value=JSON.parse(text.slice(locator.begin,locator.finish));need(typeof value==='string','complete original native source required');return value;
}
