// Validate original cfg_attr syntax before proving a false predicate absent.
// Only the separately pinned exact allow(dead_code) builtin is inert under
// both branches. Other active expansions require checked owner consumers.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tokenizeRust} from './extensions/lexical.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('./source-profiles/conditional-attributes/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const keywords=new Set();
for(const input of manifest.sources){
  const packed=readFileSync(new URL(input.archive,root));
  if(hash(packed)!==input.archiveSha256)throw new TypeError('Conditional attribute source archive changed');
  const source=gunzipSync(packed,{maxOutputLength:120_000});
  if(source.length!==input.bytes||hash(source)!==input.sha256)throw new TypeError('Conditional attribute original source changed');
  if(input.keywordLines){const [start,end]=input.keywordLines;for(const line of source.toString('utf8').split('\n').slice(start-1,end)){const match=/^\s+[A-Za-z]+:\s+"([A-Za-z]+)"/u.exec(line);if(match)keywords.add(match[1]);}}
}
export const CONDITIONAL_ATTRIBUTE_PROFILE=freeze({...manifest,activeExpansionAuthority:false,namespaceAuthority:false,runtimeAuthority:false});
const text=token=>token?.text??token?.raw??token?.value;
const identifier=/^[\p{XID_Start}_][\p{XID_Continue}_]*$/u;
const pathName=token=>{const name=text(token);return typeof name==='string'&&name!=='_'&&identifier.test(name)&&name.normalize('NFC')===name&&!keywords.has(name);};
const pairs={'(':')','[':']','{':'}'};
function groupEnd(tokens,start){
  const stack=[];
  for(let at=start;at<tokens.length;at++){
    const value=text(tokens[at]);
    if(Object.hasOwn(pairs,value)){if(stack.length>=64)throw new TypeError('Conditional attribute nesting exceeds its bound');stack.push(pairs[value]);}
    else if([')',']','}'].includes(value)){
      if(stack.pop()!==value)throw new TypeError('Conditional attribute has mismatched delimiters');
      if(!stack.length)return at;
    }
  }
  throw new TypeError('Conditional attribute has an unterminated group');
}
function argument(tokens){
  let at=0;
  if(!pathName(tokens[at++]))throw new TypeError('Conditional attribute input requires an original path');
  while(text(tokens[at])==='::'){at++;if(!pathName(tokens[at++]))throw new TypeError('Conditional attribute input has an incomplete path');}
  if(at===tokens.length)return;
  if(Object.hasOwn(pairs,text(tokens[at]))){if(groupEnd(tokens,at)!==tokens.length-1)throw new TypeError('Conditional attribute input has trailing tokens');return;}
  // Other expressions are valid in Rust but need their own checked grammar.
  if(text(tokens[at])==='='&&at+2===tokens.length){
    const literal=tokenizeRust(text(tokens[at+1])??'').filter(token=>token.kind!=='eof');
    if(literal.length===1&&literal[0].kind==='string')return;
  }
  throw new TypeError('Conditional attribute input is outside the bounded original grammar');
}
export function inspectConditionalAttribute(body){
  if(!Array.isArray(body)||body.length>8192||text(body[0])!=='cfg_attr'||text(body[1])!=='('||groupEnd(body,1)!==body.length-1)throw new TypeError('cfg_attr requires one bounded parenthesized original input');
  const tokens=body.slice(2,-1),parts=[];let start=0,separators=0;
  for(let at=0;at<tokens.length;at++){
    const value=text(tokens[at]);
    if(Object.hasOwn(pairs,value)){at=groupEnd(tokens,at);continue;}
    if([')',']','}'].includes(value))throw new TypeError('Conditional attribute has an unmatched delimiter');
    if(value===','){parts.push(tokens.slice(start,at));separators++;start=at+1;if(parts.length>257)throw new TypeError('Conditional attribute input count exceeds its bound');}
  }
  if(start<tokens.length)parts.push(tokens.slice(start));
  if(!parts.length||!parts[0].length||!separators)throw new TypeError('cfg_attr requires a predicate followed by a comma');
  const attributes=parts.slice(1);
  for(const entry of attributes){if(!entry.length)throw new TypeError('Conditional attribute has an empty input');argument(entry);}
  const inertDeadCodeLint=attributes.length>0&&attributes.every(entry=>['allow(dead_code)','allow(dead_code,)'].includes(entry.map(text).join('')));
  return {predicate:parts[0],inertDeadCodeLint,attributes:attributes.map(entry=>({tokens:entry.map(text),span:{start:entry[0].start,end:entry.at(-1).end}}))};
}
