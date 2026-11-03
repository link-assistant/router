// Select only functions that actually contain the new qualified operation.
// Selection is not admission: the private native/type issuers still check it.
import {requireOriginalFromNamespaceCallbacks} from './extensions/host-contracts.mjs';
import {matchesParserFacts} from './matches-macro-context.mjs';
import {BORROWED_JSON_TOOL_PREDICATE as CONTRACT} from './borrowed-json-tool-20261103-contracts.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const active=new WeakMap(),words=CONTRACT.rustPath.split('::').flatMap((word,at)=>at?['::',word]:[word]);
// Locate only a lifetime-only binder for selection. The original named-lifetime
// parser independently checks its names, original token group and actual uses.
function lifetimeBinderEnd(tokens,at){
 if(tokens[at]?.value!=='<')return at;let count=0;at++;
 for(;;){
  if(tokens[at]?.value!=="'"||tokens[at+1]?.kind!=='identifier'||++count>32)return -1;at+=2;
  if(tokens[at]?.value==='>')return at+1;if(tokens[at]?.value!==',')return -1;at++;
  if(tokens[at]?.value==='>')return at+1;
 }
}
export function borrowedJsonToolTypeSelectionActive(parser){return active.get(parser)===true;}
export function withBorrowedJsonToolTypeSelection(parser,run){
 const cursor=parser.cursor,tokens=cursor.tokens,start=cursor.index,previous=active.get(parser);let selected=false,open=-1,level=0,end=-1;
 if(cursor.is('fn')){
  // Lifetime binders do not introduce type/const polymorphism. Generic types,
  // where bounds and associated functions retain their original refusals.
  const signature=lifetimeBinderEnd(tokens,start+2);
  if(signature!==-1)for(let at=signature;at<tokens.length;at++){const token=tokens[at],value=token.value;if(token.kind==='identifier'&&value==='where'||token.kind==='punct'&&['<',';'].includes(value))break;if(token.kind==='punct'&&value==='{'){open=at;break;}}
  if(open!==-1)for(let at=open;at<tokens.length;at++){const token=tokens[at];if(token.kind!=='punct')continue;if(token.value==='{')level++;if(token.value==='}'&&!--level){end=at;break;}}
  if(end!==-1&&!tokens.slice(open+1,end).some(token=>token.kind==='macro'||token.kind==='identifier'&&token.value==='fn'||token.kind==='punct'&&token.value==='#'))for(let at=open+1;at+words.length<end;at++)if(words.every((word,offset)=>tokens[at+offset].kind===(word==='::'?'punct':'identifier')&&tokens[at+offset].value===word)&&tokens[at+words.length].kind==='punct'&&tokens[at+words.length].value==='('){selected=true;break;}
 }
 if(!selected&&previous!==true)return run();
 const restore=()=>{if(previous===undefined)active.delete(parser);else active.set(parser,previous);};
 if(!selected){active.set(parser,false);return withCompleteSourceClosingFence(run,[restore]);}
 requireOriginalFromNamespaceCallbacks(parser);const frame=matchesParserFacts(parser);active.set(parser,true);
 return withCompleteSourceClosingFence(run,[()=>{requireOriginalFromNamespaceCallbacks(parser);if(matchesParserFacts(parser)!==frame||parser.cursor!==cursor||cursor.tokens!==tokens)throw TypeError('Original JSON predicate type-selection source frame changed');},restore]);
}
export function withBorrowedJsonToolTypeParser(Base){return class extends Base{fn(...args){return withBorrowedJsonToolTypeSelection(this,()=>super.fn(...args));}};}
