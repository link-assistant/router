/** Lossless TOML field substitutions; native parsing remains an external library. */
import TOML from '@iarna/toml';
import {types,isDeepStrictEqual} from 'node:util';
import {clientFailure} from './client-files.mjs';
const LIMIT=8*1024*1024;
const samePath=(left,right)=>left.length===right.length&&left.every((key,at)=>key===right[at]);
const prefix=(left,right)=>left.length<=right.length&&left.every((key,at)=>key===right[at]);
const fail=(message)=>{throw clientFailure(message);};
export function parseClientTomlSource(source){if(typeof source!=='string'||Buffer.byteLength(source)>LIMIT)fail('Client TOML source exceeds its bound');try{return TOML.parse(source[0]==='\uFEFF'?source.slice(1):source);}catch{return fail('Client configuration contains invalid TOML');}}
function keyPath(text){
 let value;try{value=TOML.parse(text+' = 0');}catch{fail('Client TOML key syntax is invalid');}const path=[];
 for(let depth=0;depth<64;depth++){if(value===0)return path;const keys=Object.keys(value);if(keys.length!==1)fail('Client TOML key must have one source path');path.push(keys[0]);value=value[keys[0]];}return fail('Client TOML key depth exceeds its bound');
}
function tokenize(source){
 const cells=[];let at=0;
 while(at<source.length){if(cells.length>=200000)fail('Client TOML source token bound');const start=at,char=source[at];let kind='token';
  if(/[ \t\r\n\uFEFF]/u.test(char)){kind='trivia';while(at<source.length&&/[ \t\r\n\uFEFF]/u.test(source[at]))at++;}
  else if(char==='#'){kind='comment';while(at<source.length&&source[at]!=='\n')at++;}
  else if(char==='"'||char==="'"){
   kind='string';const triple=source.slice(at,at+3)===char.repeat(3);at+=triple?3:1;let closed=false;
   while(at<source.length){if(char==='"'&&source[at]==='\\'){at+=2;continue;}if(source[at]===char){if(!triple){at++;closed=true;break;}let end=at;while(source[end]===char)end++;if(end-at>=3){at=end;closed=true;break;}at=end;}else at++;}
   if(!closed)fail('Client TOML string is incomplete');
  }else if('[]=,.{}'.includes(char)){at++;}
  else {while(at<source.length&&!/[ \t\r\n#"'\[\]{}=,.]/u.test(source[at]))at++;if(at===start)at++;}
  cells.push({kind,start,end:at,text:source.slice(start,at)});
 }
 const meta=JSON.stringify({schema:'router-client-toml-cst-v1',language:'TOML',representation:'ConcreteSyntax',cells}),decoded=JSON.parse(meta);let end=0,copy='';for(const cell of decoded.cells){if(cell.start!==end||cell.end!==cell.start+cell.text.length||source.slice(cell.start,cell.end)!==cell.text)fail('Client TOML CST span differs');end=cell.end;copy+=cell.text;}if(end!==source.length||copy!==source)fail('Client TOML CST inverse differs');return decoded.cells;
}
function structure(source){
 const tokens=tokenize(source),nodes=[],headers=[];let work=0;
 const trivia=(at)=>{while(at<tokens.length&&['trivia','comment'].includes(tokens[at].kind))at++;return at;};
 const is=(at,word)=>tokens[at]?.kind==='token'&&tokens[at].text===word;
 const lineStart=(at)=>{const start=source.lastIndexOf('\n',at-1)+1;return start===0&&source[0]==='\uFEFF'?1:start;};
 const lineEnd=(at)=>{const end=source.indexOf('\n',at);return end<0?source.length:end+1;};
 function value(at,path,id,depth){
  if(++work>200000||depth>64)fail('Client TOML structure bound');at=trivia(at);const start=tokens[at]?.start;if(start===undefined)fail('Client TOML value is incomplete');
  if(is(at,'{')){const children=[];let previous=null;at=trivia(at+1);while(!is(at,'}')){const entry=assignment(at,path,true,id,depth+1);entry.node.commaBefore=previous;children.push(entry.node.id);at=trivia(entry.after);if(is(at,',')){previous={start:tokens[at].start,end:tokens[at].end};entry.node.commaAfter=previous;at=trivia(at+1);}else if(!is(at,'}'))fail('Client TOML inline separator is incomplete');}return {after:at+1,start,end:tokens[at].end,kind:'inline',close:tokens[at].start,children};}
  if(is(at,'[')){const stack=[']'];let end=at+1;for(;end<tokens.length&&stack.length;end++){if(tokens[end].kind!=='token')continue;const word=tokens[end].text;if(word==='[')stack.push(']');else if(word==='{')stack.push('}');else if(word===']'||word==='}'){if(stack.pop()!==word)fail('Client TOML array delimiter differs');}if(stack.length>64)fail('Client TOML array depth bound');}if(stack.length)fail('Client TOML array is incomplete');return {after:end,start,end:tokens[end-1].end,kind:'value'};}
  let end=at,last=at;for(;end<tokens.length;end++){const token=tokens[end];if(token.kind==='comment'||token.kind==='trivia'&&/[\r\n]/u.test(token.text)||token.kind==='token'&&[',','}',']'].includes(token.text))break;if(token.kind!=='trivia')last=end;}if(end===at)fail('Client TOML scalar is incomplete');return {after:end,start,end:tokens[last].end,kind:'value'};
 }
 function assignment(at,scope,inline,parent,depth){
  const begin=at;while(at<tokens.length&&!is(at,'='))at++;if(at===tokens.length)fail('Client TOML assignment is incomplete');const path=[...scope,...keyPath(source.slice(tokens[begin].start,tokens[at].start))],node={id:nodes.length,path,start:tokens[begin].start,inline,parent};nodes.push(node);const parsed=value(at+1,path,node.id,depth);Object.assign(node,{valueStart:parsed.start,valueEnd:parsed.end,valueKind:parsed.kind,close:parsed.close,children:parsed.children??[],lineStart:lineStart(node.start),lineEnd:lineEnd(parsed.end)});return {after:parsed.after,node};
 }
 let at=trivia(0),scope=[];while(at<tokens.length){if(++work>200000||nodes.length+headers.length>=16384)fail('Client TOML record bound');if(is(at,'[')){const start=at,array=is(at+1,'[');at+=array?2:1;const begin=at;while(at<tokens.length&&!is(at,']'))at++;if(at===tokens.length||array&&!is(at+1,']'))fail('Client TOML table header is incomplete');scope=keyPath(source.slice(tokens[begin].start,tokens[at].start));at+=array?2:1;headers.push({path:scope,start:lineStart(tokens[start].start),end:lineEnd(tokens[at-1].end),array});}else at=assignment(at,scope,false,null,0).after;at=trivia(at);}
 const tables=[{path:[],start:0,bodyEnd:headers[0]?.start??source.length}];for(let index=0;index<headers.length;index++)tables.push({...headers[index],bodyEnd:headers[index+1]?.start??source.length});return {nodes,headers,tables};
}
function changeData(input){
 if(!Array.isArray(input)||types.isProxy(input)||input.length>64)fail('Client TOML mutations require a bounded ordinary list');const changes=[];
 for(let index=0;index<input.length;index++){const slot=Object.getOwnPropertyDescriptor(input,String(index));if(!slot||!Object.hasOwn(slot,'value'))fail('Client TOML mutation accessors are unsupported');const value=slot.value;if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('Client TOML mutations require ordinary data');const fields=Object.getOwnPropertyDescriptors(value);if(Reflect.ownKeys(fields).some(key=>typeof key!=='string'||!['path','action','value'].includes(key)||!Object.hasOwn(fields[key],'value')))fail('Client TOML mutation fields differ');const path=fields.path?.value,action=fields.action?.value,replacement=fields.value?.value;if(!Array.isArray(path)||types.isProxy(path)||!path.length||path.length>64)fail('Client TOML mutation path is invalid');const copied=[];for(let at=0;at<path.length;at++){const key=Object.getOwnPropertyDescriptor(path,String(at));if(!key||!Object.hasOwn(key,'value')||typeof key.value!=='string'||key.value.length>4096)fail('Client TOML mutation path fields differ');copied.push(key.value);}if(!['set','delete'].includes(action)||action==='set'&&!['string','boolean'].includes(typeof replacement))fail('Client TOML field mutation requires a scalar string or Boolean');if(changes.some(row=>prefix(row.path,copied)||prefix(copied,row.path)))fail('Client TOML mutation paths overlap');changes.push({path:copied,action,value:replacement});}return changes;
}
const own=(object,key)=>object&&typeof object==='object'&&Object.hasOwn(object,key)?object[key]:undefined;
function assign(document,path,value,remove){let cursor=document;for(const key of path.slice(0,-1)){let child=own(cursor,key);if(child===undefined){if(remove)return;child={};Object.defineProperty(cursor,key,{value:child,writable:true,enumerable:true,configurable:true});}if(!child||typeof child!=='object'||Array.isArray(child)||child instanceof Date)fail('Client TOML field parent is not a table');cursor=child;}if(remove)delete cursor[path[path.length-1]];else Object.defineProperty(cursor,path[path.length-1],{value,writable:true,enumerable:true,configurable:true});}
export function editClientTomlSource(source,input){
 if(typeof source!=='string'||Buffer.byteLength(source)>LIMIT)fail('Client TOML source exceeds its bound');const changes=changeData(input);let expected;try{expected=parseClientTomlSource(source);}catch{fail('Client configuration contains invalid TOML');}const newline=source.indexOf('\n')>0&&source[source.indexOf('\n')-1]==='\r'?'\r\n':'\n',tree=structure(source),edits=[],inserts=new Map(),deletions=[];
 const erase=(node)=>{if(node.inline){const start=node.commaAfter?node.start:node.commaBefore?.start??node.start,end=node.commaAfter?.end??node.valueEnd;deletions.push({start,end});}else deletions.push({start:node.lineStart,end:node.lineEnd});};
 const remove=(path)=>{for(const node of tree.nodes)if(prefix(path,node.path))erase(node);for(const table of tree.tables)if(table.path.length&&prefix(path,table.path))deletions.push({start:table.start,end:table.bodyEnd});};
 const put=(at,inline,container,text)=>{const row=inserts.get(at)??{inline,container,texts:[]};row.texts.push(text);inserts.set(at,row);};
 for(const change of changes){assign(expected,change.path,change.value,change.action==='delete');if(change.action==='delete'){remove(change.path);continue;}const exact=tree.nodes.filter((node)=>samePath(node.path,change.path));if(exact.length>1)fail('Client TOML field has ambiguous source bindings');const stringify=TOML.stringify,text=stringify.value(change.value);if(exact.length){edits.push({start:exact[0].valueStart,end:exact[0].valueEnd,replacement:text});continue;}
  const ancestors=tree.nodes.filter((node)=>node.valueKind==='inline'&&prefix(node.path,change.path)).sort((left,right)=>right.path.length-left.path.length);if(ancestors.length){const ancestor=ancestors[0],key=change.path.slice(ancestor.path.length).map(part=>JSON.stringify(part)).join('.');put(ancestor.close,true,ancestor,key+' = '+text);continue;}
  remove(change.path);const table=tree.tables.filter((row)=>row.path.length<change.path.length&&prefix(row.path,change.path)&&!changes.some(other=>prefix(other.path,row.path))).sort((left,right)=>right.path.length-left.path.length)[0];if(!table)fail('Client TOML field lacks an insertion scope');put(table.bodyEnd,false,null,change.path.slice(table.path.length).map(part=>JSON.stringify(part)).join('.')+' = '+text);
 }
 deletions.sort((left,right)=>left.start-right.start||left.end-right.end);const removed=[];for(const row of deletions){const previous=removed.at(-1);if(previous&&row.start<=previous.end)previous.end=Math.max(previous.end,row.end);else removed.push({...row});}for(const row of removed)edits.push({...row,replacement:''});
 for(const [at,row]of inserts){let replacement;if(row.inline){const remaining=row.container.children.map((id)=>tree.nodes[id]).filter((node)=>!changes.some(change=>change.action==='delete'&&prefix(change.path,node.path)));replacement=(remaining.length?', ':' ')+row.texts.join(', ')+' ';}else replacement=(at&&source[at-1]!=='\n'?newline:'')+row.texts.join(newline)+newline;edits.push({start:at,end:at,replacement});}
 edits.sort((left,right)=>left.start-right.start||left.end-right.end);let after='',cursor=0;for(const edit of edits){if(edit.start<cursor)fail('Client TOML source substitutions overlap');after+=source.slice(cursor,edit.start)+edit.replacement;cursor=edit.end;}after+=source.slice(cursor);if(Buffer.byteLength(after)>LIMIT)fail('Client TOML result exceeds its bound');let actual;try{actual=parseClientTomlSource(after);}catch{fail('Client TOML source substitutions produce invalid syntax');}
 // TOML implicit parents disappear when their last source binding is removed.
 for(const change of changes)if(change.action==='delete')for(let depth=change.path.length-1;depth>0;depth--){const path=change.path.slice(0,depth);let parent=expected;for(const key of path.slice(0,-1))parent=own(parent,key);const value=own(parent,path[path.length-1]);if(value&&typeof value==='object'&&!Array.isArray(value)&&!Object.keys(value).length&&!tree.headers.some((row)=>samePath(row.path,path))&&!tree.nodes.some((row)=>row.valueKind==='inline'&&samePath(row.path,path)))delete parent[path[path.length-1]];}
 if(!isDeepStrictEqual(actual,expected))fail('Client TOML source substitutions differ from the requested field values');return {before:source,after,inverse:source,edits,stages:['language','repository'],sourceAuthority:false,semanticAuthority:false};
}
