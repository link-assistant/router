// Storage references are never semantic receipts. Every expanded item passes
// the original full-source checker, with all its fresh hash arguments intact.
import {types,isDeepStrictEqual} from 'node:util';
import {ownedCoreSourceData,createOwnedCoreSourceContext,requireOwnedCoreSourceCurrent,ownedPlainData,ownedSourcePath} from './owned-text-vector-join-cancellation-source.mjs';
import {withOwnedCoreItemChecks} from './owned-text-vector-join-cancellation-operations.mjs';
import {requireOwnedLocalCallClosure} from './owned-local-function-calls.mjs';
import {ownedCorePairedTypePath,prepareOwnedCorePairedTypes} from './owned-state-paired-types.mjs';
import {prepareReverseConcreteSource,parseReverseConcreteSource,assertReverseConcreteSourceHost} from './concrete-source.mjs';
import {encodeWord,textOf,writeLink} from './vendor/lino.mjs';
import {encodeInertJsonWord} from './vendor/inert-json-word-encoding.mjs';
const PROFILE='router-owned-cancellation-text-vector-source-document-v1',LIMIT=33554432,ITEMS=4096;
const fail=message=>{throw TypeError('Owned source document: '+message);};
const bare=code=>code>=65&&code<=90||code>=97&&code<=122||code>=48&&code<=57||code===46||code===95||code===126||code===42||code===47||code===60||code===62||code===61||code===33||code===38||code===124||code===43||code===45;
function keys(value,expected){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('\0')!==[...expected].sort().join('\0'))fail('unknown record fields');}
function span(value,source,whole=false){if(!Array.isArray(value)||value.length!==2||!value.every(Number.isSafeInteger)||value[0]<0||value[0]>value[1]||value[1]>source.length||whole&&(value[0]!==0||value[1]!==source.length))fail('source span differs');return value;}
function inputItems(input){
 if(!Array.isArray(input)||types.isProxy(input)||Object.getPrototypeOf(input)!==Array.prototype)fail('ordinary program array required');
 const names=Reflect.ownKeys(input);if(names.some(name=>typeof name!=='string'||name==='stack'))fail('unknown program key');
 const fields=Object.getOwnPropertyDescriptors(input),n=fields.length?.value;
 if(!Number.isSafeInteger(n)||n<0||n>ITEMS||names.length!==n+1)fail('dense program bound');
 const result=[];for(let at=0;at<n;at++){const field=fields[at];if(!field||!Object.hasOwn(field,'value'))fail('program accessor or gap');result.push(field.value);}return result;
}
// Exact cost of the existing percent-encoded JSON word, before allocating it.
// This operates only on fresh inert snapshots, not arbitrary caller objects.
function wordCost(value,remaining){
 let total=0,cells=0;const add=n=>{total+=n;if(total>remaining)fail('encoded document byte bound');};
 function string(text){
  add(6);for(let at=0;at<text.length;at++){
   const code=text.charCodeAt(at);
   if(code===34||code===92)add(6);
   else if(code===8||code===9||code===10||code===12||code===13)add(4);
   else if(code<32)add(8);
   else if(code>=0xd800&&code<=0xdbff){const next=text.charCodeAt(at+1);if(next>=0xdc00&&next<=0xdfff){add(12);at++;}else add(8);}
   else if(code>=0xdc00&&code<=0xdfff)add(8);
   else if(code<128)add(bare(code)?1:3);
   else add(code<2048?6:9);
  }
 }
 function visit(row,depth){
  if(++cells>2400200||depth>260)fail('encoding data bound');
  if(row===null){add(4);return;}if(typeof row==='string'){string(row);return;}
  if(typeof row==='boolean'){add(row?4:5);return;}if(typeof row==='number'){const text=JSON.stringify(row);for(const char of text)add(bare(char.charCodeAt(0))?1:3);return;}
  if(Array.isArray(row)){add(6);for(let at=0;at<row.length;at++){if(at)add(3);visit(row[at],depth+1);}return;}
  if(row&&typeof row==='object'){add(6);let at=0;for(const name of Object.keys(row)){if(at++)add(3);string(name);add(3);visit(row[name],depth+1);}return;}
  fail('non-JSON data');
 }
 visit(value,0);return total;
}
function writer(){
 const prefix=[],items=[];let used=0;
 return {add(head,value){const overhead=head.length+4,cost=wordCost(value,LIMIT-used-overhead);used+=overhead+cost;const word=encodeInertJsonWord(JSON.stringify(value));if(word.length!==cost)fail('encoded word accounting differs');const line=writeLink([head,word])+'\n';(head==='owned-source-item'?items:prefix).push(line);},finish(){return prefix.concat(items).join('');}};
}
// Flat framing is checked BEFORE decoding a Links word or native JSON.
function framed(text){
 if(typeof text!=='string'||text.length>LIMIT||Buffer.byteLength(text)>LIMIT)fail('encoded document byte bound');
 const rows=[];let at=0;
 while(at<text.length){
  if(rows.length>=1+ITEMS*2||text[at++]!=='(')fail('flat framing required');const start=at;
  while(at<text.length&&/[a-z-]/u.test(text[at]))at++;const head=text.slice(start,at);if(!['owned-source-document','owned-source-cst','owned-source-item'].includes(head)||text[at++]!==' ')fail('unknown document row');
  const word=at;while(at<text.length&&text[at]!==')'){if(!/[A-Za-z0-9._~*/<>=!&|+%\-]/u.test(text[at]))fail('flat encoded word required');if(text[at]==='%'){if(!/^[0-9A-F]{2}$/u.test(text.slice(at+1,at+3)))fail('noncanonical percent escape');at+=3;}else at++;}
  if(at===word||text[at++]!==')'||text[at++]!=='\n')fail('complete canonical row required');rows.push({head,word:text.slice(word,at-2)});
 }
 if(!rows.length||rows[0].head!=='owned-source-document')fail('document header required');return rows;
}
function payload(row){
 // Colons/commas are not ownedPlainData cells: each field can add two.
 // Container depth includes the root here; the old checker starts at zero.
 const text=textOf(row.word);let depth=0,cells=0;const cst=row.head==='owned-source-cst',max=cst?2000100:200000;
 for(let at=0;at<text.length;at++){
  const char=text[at];if(char==='"'){for(at++;at<text.length;at++){if(text[at]==='\\')at++;else if(text[at]==='"')break;}}
  else if(char==='{'||char==='['){if(++depth>(cst?8:161))fail('JSON depth bound');}
  else if(char==='}'||char===']'){if(--depth<0)fail('JSON delimiters');}
  else if(char===','||char===':'){if(++cells>max)fail('JSON cell bound');}
 }
 if(depth!==0)fail('JSON delimiters');let value;try{value=JSON.parse(text);}catch{fail('invalid JSON payload');}
 // Canonical encoding also rejects duplicate JSON keys and replacement-decoded
 // UTF8. The compact CST has its own, larger existing node budget.
 const cost=wordCost(value,LIMIT);if(cost!==row.word.length||encodeWord(JSON.stringify(value))!==row.word)fail('noncanonical JSON payload');
 return cst?value:ownedPlainData(value);
}
function sources(data){return new Map(data.files.map(row=>[row.path,row.source]));}
function reference(path,files){ownedSourcePath(path);const source=files.get(path);if(typeof source!=='string')fail('source reference missing');return {path,span:[0,source.length]};}
function expanded(ref,files){keys(ref,['path','span']);ownedSourcePath(ref.path);const source=files.get(ref.path);if(typeof source!=='string')fail('source reference missing');span(ref.span,source,true);return source;}
function compact(item,files){
 const result={...item,source:{path:item.source.path,span:[...item.source.span],sourceRef:reference(item.source.path,files)}};
 if(files.get(item.source.path)!==item.source.source)fail('whole caller source differs');span(item.source.span,item.source.source);
 if(item.pairedSource){if(files.get(item.pairedSource.path)!==item.pairedSource.source)fail('whole pair source differs');result.pairedSource={path:item.pairedSource.path,span:[...item.pairedSource.span],sourceRef:reference(item.pairedSource.path,files)};}
 result.hostCalls=item.hostCalls.map(call=>({...call,links:call.links.map(link=>{if(files.get(link.path)!==link.source)fail('whole import source differs');return {path:link.path,name:link.name,sourceRef:reference(link.path,files),from:link.from};})}));return result;
}
function expand(item,data,files,pairs){
 keys(item.source,['path','span','sourceRef']);if(item.source.path!==item.source.sourceRef.path)fail('caller reference path differs');const source=expanded(item.source.sourceRef,files);span(item.source.span,source);
 const result={...item,source:{path:item.source.path,source,span:item.source.span}};
 if(item.pairedSource){
  keys(item.pairedSource,['path','span','sourceRef']);const ref=item.pairedSource;
  if(ref.path!==ref.sourceRef.path||ownedCorePairedTypePath(item.source.path,files,data.runtimeRoot,data.declarationRoot)!==ref.path)fail('paired reference path differs');const typed=expanded(ref.sourceRef,files);span(ref.span,typed);
  let pair=pairs.get(item.source.path);if(!pair){pair=prepareOwnedCorePairedTypes(item.source.path,source,ref.path,typed);pairs.set(item.source.path,pair);}
  const matches=pair.functions.filter(row=>isDeepStrictEqual(row.javascriptSpan,item.source.span)&&isDeepStrictEqual(row.typescriptSpan,ref.span));if(matches.length!==1)fail('paired declaration span differs');const evidence=matches[0];
  result.pairedSource={path:ref.path,source:typed,span:ref.span,parameters:evidence.parameters,locals:evidence.locals,returnSpan:evidence.returnSpan,erasure:pair.erasure.edits};
 }
 if(!Array.isArray(item.hostCalls))fail('actual import calls required');
 result.hostCalls=item.hostCalls.map(call=>{if(!Array.isArray(call.links))fail('actual import links required');return {...call,links:call.links.map(link=>{keys(link,['path','name','sourceRef','from']);if(link.path!==link.sourceRef.path)fail('import reference path differs');return {path:link.path,name:link.name,source:expanded(link.sourceRef,files),from:link.from};})};});return result;
}
function referenced(item){return [item.source.path,...(item.pairedSource?[item.pairedSource.path]:[])];}
function cstRow(path,files){
 const source=files.get(path),stage=prepareReverseConcreteSource(source,/\.(?:mts|ts)$/u.test(path)?'TypeScript':'JavaScript'),document=JSON.parse(stage.concreteSyntax.meta);
 const {source:original,...rest}=document;if(original!==source)fail('whole CST source differs');return {path,document:{...rest,sourceRef:reference(path,files)}};
}
function checkCst(row,files){
 keys(row,['path','document']);const {sourceRef,...rest}=row.document;const source=expanded(sourceRef,files);if(row.path!==sourceRef.path)fail('CST reference path differs');
 // Restore the original canonical field order, including source at its original
 // location, before entering the unmodified complete CST reader.
 const document={schema:rest.schema,representationLevel:rest.representationLevel,language:rest.language,source,sourceEncoding:rest.sourceEncoding,status:rest.status,nodes:rest.nodes,diagnostics:rest.diagnostics,authority:rest.authority};
 keys(row.document,[...Object.keys(document).filter(key=>key!=='source'),'sourceRef']);const serialized=JSON.stringify(document),stage=parseReverseConcreteSource(serialized);
 if(stage.source!==source||stage.concreteSyntax.language!==( /\.(?:mts|ts)$/u.test(row.path)?'TypeScript':'JavaScript'))fail('CST source or language differs');
 const {source:original,...canonical}=JSON.parse(stage.concreteSyntax.meta);if(original!==source||JSON.stringify(row)!==JSON.stringify({path:row.path,document:{...canonical,sourceRef:reference(row.path,files)}}))fail('noncanonical CST storage row');return row.path;
}
/** New explicit storage profile. No legacy serializer is redirected here. */
export function serializeOwnedCoreDocument(program,{context}={}){
 assertReverseConcreteSourceHost();requireOwnedCoreSourceCurrent(context);const data=ownedCoreSourceData(context),files=sources(data),names=new Set(),paths=new Set(),output=writer();
 // Reserve the header and each checked compact row before retaining anything
 // proportional to the number of items. Only bounded encoded lines accumulate.
 output.add('owned-source-document',{profile:PROFILE,context:data});
 withPrimitiveOwnedVectorDocumentSource(data,()=>withOwnedCoreItemChecks(check=>{const complete=inputItems(program).map(original=>check(original,context));requireOwnedLocalCallClosure(complete);for(const item of complete){if(names.has(item.name))fail('duplicate function');names.add(item.name);output.add('owned-source-item',compact(item,files));for(const path of referenced(item))paths.add(path);}}));
 // Existing CST transport has its own source/node bounds. Its stored word must
 // fit the SAME remaining document budget before JSON/percent serialization.
 for(const path of paths)output.add('owned-source-cst',cstRow(path,files));
 requireOwnedCoreSourceCurrent(context);assertReverseConcreteSourceHost();return output.finish();
}
/** Full source/CST reconstruction precedes unchanged per-item source checking. */
export function readOwnedCoreDocument(text,{context}={}){
 assertReverseConcreteSourceHost();const rows=framed(text),header=payload(rows[0]);keys(header,['profile','context']);if(header.profile!==PROFILE)fail('unknown profile');
 if(context){if(!isDeepStrictEqual(ownedCoreSourceData(context),header.context))fail('current context differs');}else context=createOwnedCoreSourceContext(header.context);
 const data=ownedCoreSourceData(context);if(JSON.stringify(header)!==JSON.stringify({profile:PROFILE,context:data}))fail('noncanonical context header');const files=sources(data),paths=[],items=[];let inItems=false;
 for(let at=1;at<rows.length;at++){
  const row=rows[at];if(row.head==='owned-source-cst'&&!inItems){if(paths.length>=ITEMS)fail('CST count bound');const path=checkCst(payload(row),files);if(paths.includes(path))fail('duplicate CST source');paths.push(path);}
  else if(row.head==='owned-source-item'){inItems=true;if(items.length>=ITEMS)fail('item count bound');items.push(payload(row));}
  else fail('row order differs');
 }
 const names=new Set(),required=new Set(),pairs=new Map(),program=[];
 withPrimitiveOwnedVectorDocumentSource(data,()=>withOwnedCoreItemChecks(check=>{for(const item of items){for(const path of referenced(item)){if(!paths.includes(path))fail('CST source missing');required.add(path);}const checked=check(expand(item,data,files,pairs),context);if(names.has(checked.name))fail('duplicate function');names.add(checked.name);if(JSON.stringify(compact(checked,files))!==JSON.stringify(item))fail('noncanonical checked item');program.push(checked);}}));
 if(!isDeepStrictEqual(paths,[...required]))fail('unreferenced or reordered CST');requireOwnedCoreSourceCurrent(context);assertReverseConcreteSourceHost();return requireOwnedLocalCallClosure(program);
}

import {withOriginalPrimitiveOwnedVectorSourceOperation} from '../failure-aware-primitive-owned-vector-source.mjs';
import {withOriginalPrimitiveVectorLiteralSourceOperation} from '../failure-aware-primitive-vector-literal-source.mjs';
function originalPrimitiveOwnedVectorDocumentSource(data,run){if(data.files.some(row=>row.path===data.runtimeRoot+'/primitive-vector-literal-runtime.mjs'))return withOriginalPrimitiveVectorLiteralSourceOperation(run);return data.files.some(row=>row.path===data.runtimeRoot+'/primitive-owned-vector-runtime.mjs')?withOriginalPrimitiveOwnedVectorSourceOperation(run):run();}

function withPrimitiveOwnedVectorDocumentSource(data,run){return withOriginalOwnedTextVectorJoinSourceOperation(()=>withOwnedTextVectorLiteralReceivingSource(data,()=>originalPrimitiveOwnedVectorDocumentSource(data,run)));}

import {withOwnedTextVectorLiteralReceivingSource} from '../current-owned-text-vector-literal-source.mjs';

import {withOriginalOwnedTextVectorJoinSourceOperation} from '../current-owned-text-vector-join-source.mjs';
