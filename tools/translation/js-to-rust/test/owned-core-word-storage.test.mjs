import nativeTest from 'node:test';
import assert from 'node:assert/strict';
import {Hash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {writeJsonTextGzip} from '../../../evidence/write-json-gzip.mjs';
import {createOwnedCoreSourceContext,translateOwnedCoreDocumentJavaScript,parseOwnedCoreDocumentMeta,emitRust,emitTypeScript} from '../translator.mjs';
import {serializeOwnedCoreDocument} from '../owned-core-document.mjs';
import {ownedCoreRuntimeSources} from '../owned-core-source.mjs';
import {prepareOwnedCoreRuntime,evaluate} from '../interpreter.mjs';
import {encodeWord,parseLinks,textOf,writeLink} from '../vendor/lino.mjs';
import {json_macro_object,json_macro_string} from '../../json-macro-runtime.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../router-core-source-data.mjs';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),nativeJSON=JSON.stringify,apply=Reflect.apply,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const VENDOR_BEFORE=[
 "// The Links Notation subset self-translation reads and writes: one link per",
 "// line, `(head item item ...)`, where an item is a bare word, a",
 "// double-quoted text or a nested link, and `#` starts a comment line.",
 "//",
 "// Values are percent-encoded the way link-foundation/meta-language's",
 "// decorators encode theirs (docs/decorators.md): every byte outside",
 "// `[A-Za-z0-9._~*/<>=!&|+-]` is written `%XX`, so any text survives as a bare",
 "// word, and the empty text is written `%`. Portable-subset style: plain",
 "// functions and tagged arrays, no classes.",
 "",
 "const BARE = /^[A-Za-z0-9._~*/<>=!&|+-]$/u;",
 "",
 "/**",
 " * Percent-encode `text` as one bare Links Notation word.",
 " * @param {string} text",
 " * @returns {string}",
 " */",
 "export function encodeWord(text) {",
 "  if (text === '') return '%';",
 "  let out = '';",
 "  for (const byte of Buffer.from(text, 'utf8')) {",
 "    const char = String.fromCharCode(byte);",
 "    out += byte < 0x80 && BARE.test(char) ? char : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;",
 "  }",
 "  return out;",
 "}",
 "",
 "/**",
 " * Decode a word `encodeWord` wrote.",
 " * @param {string} word",
 " * @returns {string}",
 " */",
 "export function decodeWord(word) {",
 "  if (word === '%') return '';",
 "  const bytes = [];",
 "  for (let index = 0; index < word.length; index += 1) {",
 "    if (word[index] === '%') {",
 "      bytes.push(Number.parseInt(word.slice(index + 1, index + 3), 16));",
 "      index += 2;",
 "    } else {",
 "      bytes.push(word.charCodeAt(index));",
 "    }",
 "  }",
 "  return Buffer.from(bytes).toString('utf8');",
 "}",
 "",
 "/**",
 " * Parse every link of `text`. A link is an array whose items are strings",
 " * (bare words, still encoded) or nested arrays; a quoted text is an object",
 " * `{ quoted: string }`.",
 " * @param {string} text",
 " * @returns {Array<Array<unknown>>}",
 " */",
 "export function parseLinks(text) {",
 "  const links = [];",
 "  let index = 0;",
 "  const skip = () => {",
 "    while (index < text.length) {",
 "      if (/\\s/u.test(text[index])) {",
 "        index += 1;",
 "      } else if (text[index] === '#') {",
 "        while (index < text.length && text[index] !== '\\n') index += 1;",
 "      } else {",
 "        return;",
 "      }",
 "    }",
 "  };",
 "  const read = () => {",
 "    skip();",
 "    const char = text[index];",
 "    if (char === '(') {",
 "      index += 1;",
 "      const items = [];",
 "      for (;;) {",
 "        skip();",
 "        if (index >= text.length) throw new Error('unclosed link');",
 "        if (text[index] === ')') {",
 "          index += 1;",
 "          return items;",
 "        }",
 "        items.push(read());",
 "      }",
 "    }",
 "    if (char === '\"') {",
 "      const end = text.indexOf('\"', index + 1);",
 "      if (end < 0) throw new Error('unclosed quoted text');",
 "      const quoted = text.slice(index + 1, end);",
 "      index = end + 1;",
 "      return { quoted };",
 "    }",
 "    const start = index;",
 "    while (index < text.length && !/[\\s()\"]/u.test(text[index])) index += 1;",
 "    if (start === index) throw new Error(`unexpected ${JSON.stringify(char)} at ${index}`);",
 "    return text.slice(start, index);",
 "  };",
 "  for (;;) {",
 "    skip();",
 "    if (index >= text.length) return links;",
 "    const link = read();",
 "    if (!Array.isArray(link)) throw new Error('a top-level item must be a link');",
 "    links.push(link);",
 "  }",
 "}",
 "",
 "/**",
 " * The value of an item: a quoted text as written, a word decoded.",
 " * @param {unknown} item",
 " * @returns {string}",
 " */",
 "export function textOf(item) {",
 "  if (typeof item === 'string') return decodeWord(item);",
 "  if (item && typeof item === 'object' && 'quoted' in item) return item.quoted;",
 "  throw new Error('expected a word or a quoted text');",
 "}",
 "",
 "/**",
 " * The first nested link of `link` whose head is `head`.",
 " * @param {Array<unknown>} link",
 " * @param {string} head",
 " * @returns {Array<unknown> | undefined}",
 " */",
 "export function field(link, head) {",
 "  return link.find((item) => Array.isArray(item) && item[0] === head);",
 "}",
 "",
 "/**",
 " * Write a link on one line; strings are written as given (already encoded).",
 " * @param {Array<unknown>} link",
 " * @returns {string}",
 " */",
 "export function writeLink(link) {",
 "  return `(${link.map((item) => (Array.isArray(item) ? writeLink(item) : typeof item === 'string' ? item : `\"${item.quoted}\"`)).join(' ')})`;",
 "}",
 "",
].join('\n');
const DOCUMENT_BEFORE=[
 "// Storage references are never semantic receipts. Every expanded item passes",
 "// the original full-source checker, with all its fresh hash arguments intact.",
 "import {types,isDeepStrictEqual} from 'node:util';",
 "import {ownedCoreSourceData,createOwnedCoreSourceContext,requireOwnedCoreSourceCurrent,ownedPlainData,ownedSourcePath} from './owned-core-source.mjs';",
 "import {withOwnedCoreItemChecks} from './owned-core-operations.mjs';",
 "import {ownedCorePairedTypePath,prepareOwnedCorePairedTypes} from './owned-core-paired-types.mjs';",
 "import {prepareReverseConcreteSource,parseReverseConcreteSource,assertReverseConcreteSourceHost} from './concrete-source.mjs';",
 "import {encodeWord,textOf,writeLink} from './vendor/lino.mjs';",
 "const PROFILE='router-owned-core-source-document-v1',LIMIT=33554432,ITEMS=4096;",
 "const fail=message=>{throw TypeError('Owned source document: '+message);};",
 "const bare=code=>code>=65&&code<=90||code>=97&&code<=122||code>=48&&code<=57||code===46||code===95||code===126||code===42||code===47||code===60||code===62||code===61||code===33||code===38||code===124||code===43||code===45;",
 "function keys(value,expected){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('\\0')!==[...expected].sort().join('\\0'))fail('unknown record fields');}",
 "function span(value,source,whole=false){if(!Array.isArray(value)||value.length!==2||!value.every(Number.isSafeInteger)||value[0]<0||value[0]>value[1]||value[1]>source.length||whole&&(value[0]!==0||value[1]!==source.length))fail('source span differs');return value;}",
 "function inputItems(input){",
 " if(!Array.isArray(input)||types.isProxy(input)||Object.getPrototypeOf(input)!==Array.prototype)fail('ordinary program array required');",
 " const names=Reflect.ownKeys(input);if(names.some(name=>typeof name!=='string'||name==='stack'))fail('unknown program key');",
 " const fields=Object.getOwnPropertyDescriptors(input),n=fields.length?.value;",
 " if(!Number.isSafeInteger(n)||n<0||n>ITEMS||names.length!==n+1)fail('dense program bound');",
 " const result=[];for(let at=0;at<n;at++){const field=fields[at];if(!field||!Object.hasOwn(field,'value'))fail('program accessor or gap');result.push(field.value);}return result;",
 "}",
 "// Exact cost of the existing percent-encoded JSON word, before allocating it.",
 "// This operates only on fresh inert snapshots, not arbitrary caller objects.",
 "function wordCost(value,remaining){",
 " let total=0,cells=0;const add=n=>{total+=n;if(total>remaining)fail('encoded document byte bound');};",
 " function string(text){",
 "  add(6);for(let at=0;at<text.length;at++){",
 "   const code=text.charCodeAt(at);",
 "   if(code===34||code===92)add(6);",
 "   else if(code===8||code===9||code===10||code===12||code===13)add(4);",
 "   else if(code<32)add(8);",
 "   else if(code>=0xd800&&code<=0xdbff){const next=text.charCodeAt(at+1);if(next>=0xdc00&&next<=0xdfff){add(12);at++;}else add(8);}",
 "   else if(code>=0xdc00&&code<=0xdfff)add(8);",
 "   else if(code<128)add(bare(code)?1:3);",
 "   else add(code<2048?6:9);",
 "  }",
 " }",
 " function visit(row,depth){",
 "  if(++cells>2400200||depth>260)fail('encoding data bound');",
 "  if(row===null){add(4);return;}if(typeof row==='string'){string(row);return;}",
 "  if(typeof row==='boolean'){add(row?4:5);return;}if(typeof row==='number'){const text=JSON.stringify(row);for(const char of text)add(bare(char.charCodeAt(0))?1:3);return;}",
 "  if(Array.isArray(row)){add(6);for(let at=0;at<row.length;at++){if(at)add(3);visit(row[at],depth+1);}return;}",
 "  if(row&&typeof row==='object'){add(6);let at=0;for(const name of Object.keys(row)){if(at++)add(3);string(name);add(3);visit(row[name],depth+1);}return;}",
 "  fail('non-JSON data');",
 " }",
 " visit(value,0);return total;",
 "}",
 "function writer(){",
 " const prefix=[],items=[];let used=0;",
 " return {add(head,value){const overhead=head.length+4,cost=wordCost(value,LIMIT-used-overhead);used+=overhead+cost;const word=encodeWord(JSON.stringify(value));if(word.length!==cost)fail('encoded word accounting differs');const line=writeLink([head,word])+'\\n';(head==='owned-source-item'?items:prefix).push(line);},finish(){return prefix.concat(items).join('');}};",
 "}",
 "// Flat framing is checked BEFORE decoding a Links word or native JSON.",
 "function framed(text){",
 " if(typeof text!=='string'||text.length>LIMIT||Buffer.byteLength(text)>LIMIT)fail('encoded document byte bound');",
 " const rows=[];let at=0;",
 " while(at<text.length){",
 "  if(rows.length>=1+ITEMS*2||text[at++]!=='(')fail('flat framing required');const start=at;",
 "  while(at<text.length&&/[a-z-]/u.test(text[at]))at++;const head=text.slice(start,at);if(!['owned-source-document','owned-source-cst','owned-source-item'].includes(head)||text[at++]!==' ')fail('unknown document row');",
 "  const word=at;while(at<text.length&&text[at]!==')'){if(!/[A-Za-z0-9._~*/<>=!&|+%\\-]/u.test(text[at]))fail('flat encoded word required');if(text[at]==='%'){if(!/^[0-9A-F]{2}$/u.test(text.slice(at+1,at+3)))fail('noncanonical percent escape');at+=3;}else at++;}",
 "  if(at===word||text[at++]!==')'||text[at++]!=='\\n')fail('complete canonical row required');rows.push({head,word:text.slice(word,at-2)});",
 " }",
 " if(!rows.length||rows[0].head!=='owned-source-document')fail('document header required');return rows;",
 "}",
 "function payload(row){",
 " // Colons/commas are not ownedPlainData cells: each field can add two.",
 " // Container depth includes the root here; the old checker starts at zero.",
 " const text=textOf(row.word);let depth=0,cells=0;const cst=row.head==='owned-source-cst',max=cst?2000100:200000;",
 " for(let at=0;at<text.length;at++){",
 "  const char=text[at];if(char==='\"'){for(at++;at<text.length;at++){if(text[at]==='\\\\')at++;else if(text[at]==='\"')break;}}",
 "  else if(char==='{'||char==='['){if(++depth>(cst?8:161))fail('JSON depth bound');}",
 "  else if(char==='}'||char===']'){if(--depth<0)fail('JSON delimiters');}",
 "  else if(char===','||char===':'){if(++cells>max)fail('JSON cell bound');}",
 " }",
 " if(depth!==0)fail('JSON delimiters');let value;try{value=JSON.parse(text);}catch{fail('invalid JSON payload');}",
 " // Canonical encoding also rejects duplicate JSON keys and replacement-decoded",
 " // UTF8. The compact CST has its own, larger existing node budget.",
 " const cost=wordCost(value,LIMIT);if(cost!==row.word.length||encodeWord(JSON.stringify(value))!==row.word)fail('noncanonical JSON payload');",
 " return cst?value:ownedPlainData(value);",
 "}",
 "function sources(data){return new Map(data.files.map(row=>[row.path,row.source]));}",
 "function reference(path,files){ownedSourcePath(path);const source=files.get(path);if(typeof source!=='string')fail('source reference missing');return {path,span:[0,source.length]};}",
 "function expanded(ref,files){keys(ref,['path','span']);ownedSourcePath(ref.path);const source=files.get(ref.path);if(typeof source!=='string')fail('source reference missing');span(ref.span,source,true);return source;}",
 "function compact(item,files){",
 " const result={...item,source:{path:item.source.path,span:[...item.source.span],sourceRef:reference(item.source.path,files)}};",
 " if(files.get(item.source.path)!==item.source.source)fail('whole caller source differs');span(item.source.span,item.source.source);",
 " if(item.pairedSource){if(files.get(item.pairedSource.path)!==item.pairedSource.source)fail('whole pair source differs');result.pairedSource={path:item.pairedSource.path,span:[...item.pairedSource.span],sourceRef:reference(item.pairedSource.path,files)};}",
 " result.hostCalls=item.hostCalls.map(call=>({...call,links:call.links.map(link=>{if(files.get(link.path)!==link.source)fail('whole import source differs');return {path:link.path,name:link.name,sourceRef:reference(link.path,files),from:link.from};})}));return result;",
 "}",
 "function expand(item,data,files,pairs){",
 " keys(item.source,['path','span','sourceRef']);if(item.source.path!==item.source.sourceRef.path)fail('caller reference path differs');const source=expanded(item.source.sourceRef,files);span(item.source.span,source);",
 " const result={...item,source:{path:item.source.path,source,span:item.source.span}};",
 " if(item.pairedSource){",
 "  keys(item.pairedSource,['path','span','sourceRef']);const ref=item.pairedSource;",
 "  if(ref.path!==ref.sourceRef.path||ownedCorePairedTypePath(item.source.path,files,data.runtimeRoot,data.declarationRoot)!==ref.path)fail('paired reference path differs');const typed=expanded(ref.sourceRef,files);span(ref.span,typed);",
 "  let pair=pairs.get(item.source.path);if(!pair){pair=prepareOwnedCorePairedTypes(item.source.path,source,ref.path,typed);pairs.set(item.source.path,pair);}",
 "  const matches=pair.functions.filter(row=>isDeepStrictEqual(row.javascriptSpan,item.source.span)&&isDeepStrictEqual(row.typescriptSpan,ref.span));if(matches.length!==1)fail('paired declaration span differs');const evidence=matches[0];",
 "  result.pairedSource={path:ref.path,source:typed,span:ref.span,parameters:evidence.parameters,locals:evidence.locals,returnSpan:evidence.returnSpan,erasure:pair.erasure.edits};",
 " }",
 " if(!Array.isArray(item.hostCalls))fail('actual import calls required');",
 " result.hostCalls=item.hostCalls.map(call=>{if(!Array.isArray(call.links))fail('actual import links required');return {...call,links:call.links.map(link=>{keys(link,['path','name','sourceRef','from']);if(link.path!==link.sourceRef.path)fail('import reference path differs');return {path:link.path,name:link.name,source:expanded(link.sourceRef,files),from:link.from};})};});return result;",
 "}",
 "function referenced(item){return [item.source.path,...(item.pairedSource?[item.pairedSource.path]:[])];}",
 "function cstRow(path,files){",
 " const source=files.get(path),stage=prepareReverseConcreteSource(source,/\\.(?:mts|ts)$/u.test(path)?'TypeScript':'JavaScript'),document=JSON.parse(stage.concreteSyntax.meta);",
 " const {source:original,...rest}=document;if(original!==source)fail('whole CST source differs');return {path,document:{...rest,sourceRef:reference(path,files)}};",
 "}",
 "function checkCst(row,files){",
 " keys(row,['path','document']);const {sourceRef,...rest}=row.document;const source=expanded(sourceRef,files);if(row.path!==sourceRef.path)fail('CST reference path differs');",
 " // Restore the original canonical field order, including source at its original",
 " // location, before entering the unmodified complete CST reader.",
 " const document={schema:rest.schema,representationLevel:rest.representationLevel,language:rest.language,source,sourceEncoding:rest.sourceEncoding,status:rest.status,nodes:rest.nodes,diagnostics:rest.diagnostics,authority:rest.authority};",
 " keys(row.document,[...Object.keys(document).filter(key=>key!=='source'),'sourceRef']);const serialized=JSON.stringify(document),stage=parseReverseConcreteSource(serialized);",
 " if(stage.source!==source||stage.concreteSyntax.language!==( /\\.(?:mts|ts)$/u.test(row.path)?'TypeScript':'JavaScript'))fail('CST source or language differs');",
 " const {source:original,...canonical}=JSON.parse(stage.concreteSyntax.meta);if(original!==source||JSON.stringify(row)!==JSON.stringify({path:row.path,document:{...canonical,sourceRef:reference(row.path,files)}}))fail('noncanonical CST storage row');return row.path;",
 "}",
 "/** New explicit storage profile. No legacy serializer is redirected here. */",
 "export function serializeOwnedCoreDocument(program,{context}={}){",
 " assertReverseConcreteSourceHost();requireOwnedCoreSourceCurrent(context);const data=ownedCoreSourceData(context),files=sources(data),names=new Set(),paths=new Set(),output=writer();",
 " // Reserve the header and each checked compact row before retaining anything",
 " // proportional to the number of items. Only bounded encoded lines accumulate.",
 " output.add('owned-source-document',{profile:PROFILE,context:data});",
 " withOwnedCoreItemChecks(check=>{for(const original of inputItems(program)){const item=check(original,context);if(names.has(item.name))fail('duplicate function');names.add(item.name);output.add('owned-source-item',compact(item,files));for(const path of referenced(item))paths.add(path);}});",
 " // Existing CST transport has its own source/node bounds. Its stored word must",
 " // fit the SAME remaining document budget before JSON/percent serialization.",
 " for(const path of paths)output.add('owned-source-cst',cstRow(path,files));",
 " requireOwnedCoreSourceCurrent(context);assertReverseConcreteSourceHost();return output.finish();",
 "}",
 "/** Full source/CST reconstruction precedes unchanged per-item source checking. */",
 "export function readOwnedCoreDocument(text,{context}={}){",
 " assertReverseConcreteSourceHost();const rows=framed(text),header=payload(rows[0]);keys(header,['profile','context']);if(header.profile!==PROFILE)fail('unknown profile');",
 " if(context){if(!isDeepStrictEqual(ownedCoreSourceData(context),header.context))fail('current context differs');}else context=createOwnedCoreSourceContext(header.context);",
 " const data=ownedCoreSourceData(context);if(JSON.stringify(header)!==JSON.stringify({profile:PROFILE,context:data}))fail('noncanonical context header');const files=sources(data),paths=[],items=[];let inItems=false;",
 " for(let at=1;at<rows.length;at++){",
 "  const row=rows[at];if(row.head==='owned-source-cst'&&!inItems){if(paths.length>=ITEMS)fail('CST count bound');const path=checkCst(payload(row),files);if(paths.includes(path))fail('duplicate CST source');paths.push(path);}",
 "  else if(row.head==='owned-source-item'){inItems=true;if(items.length>=ITEMS)fail('item count bound');items.push(payload(row));}",
 "  else fail('row order differs');",
 " }",
 " const names=new Set(),required=new Set(),pairs=new Map(),program=[];",
 " withOwnedCoreItemChecks(check=>{for(const item of items){for(const path of referenced(item)){if(!paths.includes(path))fail('CST source missing');required.add(path);}const checked=check(expand(item,data,files,pairs),context);if(names.has(checked.name))fail('duplicate function');names.add(checked.name);if(JSON.stringify(compact(checked,files))!==JSON.stringify(item))fail('noncanonical checked item');program.push(checked);}});",
 " if(!isDeepStrictEqual(paths,[...required]))fail('unreferenced or reordered CST');requireOwnedCoreSourceCurrent(context);assertReverseConcreteSourceHost();return program;",
 "}",
 "",
].join('\n');
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const vendor=read('../vendor/lino.mjs'),adapter=read('../vendor/inert-json-word-encoding.mjs'),document=read('../owned-core-document.mjs');
const addition="import {encodeInertJsonWord} from './vendor/inert-json-word-encoding.mjs';\n";
assert.equal(vendor.slice(0,VENDOR_BEFORE.length),VENDOR_BEFORE);
assert.equal(document,DOCUMENT_BEFORE.replace("import {encodeWord,textOf,writeLink} from './vendor/lino.mjs';\n",row=>row+addition).replace('const word=encodeWord(JSON.stringify(value));','const word=encodeInertJsonWord(JSON.stringify(value));'));
const undo=document.replace(addition,'').replace('const word=encodeInertJsonWord(JSON.stringify(value));','const word=encodeWord(JSON.stringify(value));');assert.equal(undo,DOCUMENT_BEFORE);
let caseNumber=0;
function test(name,run){const index=++caseNumber;nativeTest(name,{timeout:60000},async t=>{const vectors=[];try{await run(t,vectors);}finally{const folder=process.env.ROUTER_OWNED_WORD_STORAGE_VECTOR_DIR;if(folder){mkdirSync(folder,{recursive:true});writeJsonTextGzip(join(folder,String(index).padStart(2,'0')+'-complete.json.gz'),nativeJSON({name,vendorBefore:VENDOR_BEFORE,vendor,adapter,documentBefore:DOCUMENT_BEFORE,document,undo,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value));}}});}
function temporary(t){const path=mkdtempSync(join(tmpdir(),'owned-word-storage-'));t.after(()=>rmSync(path,{recursive:true,force:true}));return path;}
function write(directory,path,source){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);}
async function oldDocument(vectors){let delta=0;const edits=[],source=DOCUMENT_BEFORE.replace(/from '(\.[^']+)'/gu,(expected,path,offset)=>{const replacement='from '+JSON.stringify(new URL(path,new URL('../owned-core-document.mjs',import.meta.url)).href);edits.push({beforeSpan:[offset,offset+expected.length],afterSpan:[offset+delta,offset+delta+replacement.length],expected,replacement});delta+=replacement.length-expected.length;return replacement;});let restored=source;for(const edit of [...edits].reverse()){assert.equal(restored.slice(...edit.afterSpan),edit.replacement);restored=restored.slice(0,edit.afterSpan[0])+edit.expected+restored.slice(edit.afterSpan[1]);}assert.equal(restored,DOCUMENT_BEFORE);vectors.push({oldDocumentSourceAdapter:{before:DOCUMENT_BEFORE,source,edits,restored}});return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
const imports="import {router_core_json_copy as copy,router_core_json_index_str as index} from './runtime/json-update-runtime.mjs';\n",types="import type {JsonValue} from './runtime/json-macro-runtime.mjs';\n";
const javascript=imports+'export function copied(value){return copy(value);}\nexport function named(value){return index(value,"name");}',typescript=imports+types+'export function copied(value:JsonValue):JsonValue{return copy(value);}\nexport function named(value:JsonValue):JsonValue{return index(value,"name");}';
function input(js=javascript,ts=typescript){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},...['Cargo.toml','Cargo.lock'].map(path=>({path,source:readFileSync(join(ROOT,path),'utf8')})),{path:'caller.mjs',source:js},{path:'caller.mts',source:ts}]};}
function receive(js=javascript,ts=typescript){const data=input(js,ts),context=createOwnedCoreSourceContext(data),options={context,sourcePath:'caller.mjs',typescriptOutputPath:'reverse.mts'},result=translateOwnedCoreDocumentJavaScript(js,options);return {data,context,options,result};}
function hashes(run){const update=descriptor(Hash.prototype,'update'),digest=descriptor(Hash.prototype,'digest'),tape=[];let value,error;try{define(Hash.prototype,'update',{...update,value:function(...args){const result=apply(update.value,this,args);tape.push({operation:'update',args:args.map(value=>typeof value==='string'?{kind:'string',value}:{kind:'bytes',value:Buffer.from(value).toString('base64')}),sameReceiver:result===this});return result;}});define(Hash.prototype,'digest',{...digest,value:function(...args){const result=apply(digest.value,this,args);tape.push({operation:'digest',args,result:typeof result==='string'?result:{base64:Buffer.from(result).toString('base64')}});return result;}});try{value=run();}catch(caught){error={name:caught.name,message:caught.message};}}finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}return {value,error,tape};}
// Each ambient-mutation control runs in a fresh child. The adapter's exact
// unique instrumentation is retained; it adds no production switch or issuer.
async function encodingOracle(mode,helperPath,vendorPath){
 const {default:assert}=await import('node:assert/strict'),{readFileSync}=await import('node:fs'),{pathToFileURL}=await import('node:url');
 const nativeFrom=Buffer.from,nativeJSON=JSON.stringify,apply=Reflect.apply,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
 const nativeString=String,nativeSymbol=Symbol,nativeTest=RegExp.prototype.test,nativeCompile=RegExp.prototype.compile;
 const typedPrototype=Object.getPrototypeOf(Uint8Array.prototype),iteratorPrototype=Object.getPrototypeOf(new Uint8Array()[nativeSymbol.iterator]());
 const old=await import(pathToFileURL(vendorPath).href),before=readFileSync(helperPath,'utf8');let sequence=0;
 const first='let guard;',second='if(state!==-1) {';assert.equal(before.split(first).length,2);assert.equal(before.split(second).length,2);
 const instrumented=before.replace(first,'let guard;let fastCalls=0,guardCalls=0;export const fastCount=()=>fastCalls;export const guardCount=()=>guardCalls;').replace('function initializeGuard() {','function initializeGuard() {guardCalls++;').replace(second,second+'fastCalls++;');
 const load=()=>{const source=instrumented.replace("'./lino.mjs'",JSON.stringify(pathToFileURL(vendorPath).href))+'\n// fresh '+sequence++;report.moduleSources.push(source);return import('data:text/javascript;base64,'+apply(nativeFrom,Buffer,[source]).toString('base64'));};
 const report={mode,before,instrumented,tapes:[],values:[],moduleSources:[],sameActualVendorPattern:true,nativeDiagnosticExpressionAndStackPreserved:false};
 const property=(object,key,value)=>{const previous=descriptor(object,key);define(object,key,{value,writable:true,configurable:true});return()=>{if(previous)define(object,key,previous);else delete object[key];};};
 const compare=async(label,setup,{warm=true,text='A ?é',fast=false,classOnly=false}={})=>{
  const actual=await load();if(warm)actual.encodeInertJsonWord('warm');const rows=[];
  for(const [kind,fn]of [['old',old.encodeWord],['actual',actual.encodeInertJsonWord]]){const trace=[],cleanup=setup(trace),start=actual.fastCount();let value,error;try{value=fn(text);}catch(caught){error={name:caught.name,message:caught.message,stack:caught.stack};}finally{cleanup();}rows.push({kind,value,error,trace,fastDelta:actual.fastCount()-start});}
  report.tapes.push({label,rows,classOnly});assert.equal(rows[1].value,rows[0].value,label);assert.deepEqual(rows[1].trace,rows[0].trace,label);
  assert.equal(rows[1].error?.name,rows[0].error?.name,label);if(!classOnly)assert.equal(rows[1].error?.message,rows[0].error?.message,label);assert.equal(rows[1].fastDelta,fast?1:0,label+' actual eligibility');
 };
 try{
 if(mode==='values'||mode==='large'){
  const actual=await load();assert.equal(actual.guardCount(),0);assert.equal(actual.encodeInertJsonWord(''),'%');assert.equal(actual.guardCount(),0);
  if(mode==='values'){
   const authored=[['','%'],['AZaz09._~*/<>=!&|+-','AZaz09._~*/<>=!&|+-'],[' ?#:%','%20%3F%23%3A%25'],['é','%C3%A9'],['\ud800','%EF%BF%BD'],['\udfff','%EF%BF%BD'],['😀','%F0%9F%98%80']];
   let units='';for(let at=0;at<65536;at++)units+=nativeString.fromCharCode(at);for(const [text,expected]of authored){const encoded=actual.encodeInertJsonWord(text),original=old.encodeWord(text);report.values.push({text,expected,encoded,original});assert.equal(encoded,expected);assert.equal(original,expected);}
   for(const text of [units,...[4095,4096,4097].flatMap(count=>['A'.repeat(count),'?'.repeat(count),'é'.repeat(count),'😀'.repeat(count)]),nativeJSON({control:'\0\n\t',number:1.25,yes:true,no:false,null:null,list:['é','😀','\ud800']})]){const encoded=actual.encodeInertJsonWord(text),original=old.encodeWord(text);report.values.push({text,encoded,original});assert.equal(encoded,original);}
  }else{
   const text=nativeJSON({padding:'\0'.repeat(65536)}),encoded=actual.encodeInertJsonWord(text),original=old.encodeWord(text);assert.equal(encoded,original);report.values.push({text,encoded,original});
   const count=4190000,large=nativeJSON({padding:'\0'.repeat(count)}),prefix=old.encodeWord('{"padding":"'),suffix=old.encodeWord('"}'),expected=prefix+'%5Cu0000'.repeat(count)+suffix,full=actual.encodeInertJsonWord(large);assert.ok(full.length<33554432);assert.equal(full,expected);report.values.push({count,input:large,expected,full});
  }assert.ok(actual.fastCount()>0,'actual normal Node/Bun native configuration must exercise fast storage');
 }
 if(mode==='iterators'){
  await compare('Buffer-once',trace=>property(Buffer,'from',function(...args){trace.push({call:'Buffer.from',args,receiver:this===Buffer});return apply(nativeFrom,this,args);} ),{fast:true});
  await compare('custom-next-getter',trace=>property(Buffer,'from',function(...args){trace.push(['Buffer.from',args]);return {[nativeSymbol.iterator](){trace.push('iterator');let index=0;return{get next(){trace.push('next-get');return()=>{trace.push('next');return index<3?{value:[65,32,255][index++],done:false}:{done:true};};},return(){trace.push('return');return{done:true};}};}};}));
  await compare('IteratorClose',trace=>{const one=property(Buffer,'from',()=>({[nativeSymbol.iterator](){trace.push('iterator');return{next(){trace.push('next');return{value:1,done:false};},return(){trace.push('return');return{done:true};}};}})),two=property(String,'fromCharCode',()=>{trace.push('byte-throw');throw Error('intentional byte error');});return()=>{two();one();};});
  await compare('coercive-byte-values',trace=>property(Buffer,'from',()=>[{valueOf(){trace.push('valueOf');return 255;},toString(radix){trace.push(['toString',radix]);return'ff';}}]));
  await compare('proxy-container',trace=>property(Buffer,'from',()=>new Proxy([65,255],{get(target,key){trace.push(['get',typeof key==='symbol'?'iterator':key]);return Reflect.get(target,key);}})));
  await compare('all256-native-bytes',()=>property(Buffer,'from',()=>{const bytes=new Uint8Array(256);for(let at=0;at<256;at++)bytes[at]=at;return bytes;}),{fast:true});
 }
 if(mode==='intrinsics'){
  for(const [object,key]of [[String,'fromCharCode'],[String.prototype,'toUpperCase'],[String.prototype,'padStart'],[Number.prototype,'toString'],[RegExp.prototype,'test'],[RegExp.prototype,'exec']]){
   await compare('warm-wrapper-'+key,trace=>{const original=object[key];return property(object,key,function(...args){trace.push([key,args]);return apply(original,this,args);});});
   await compare('warm-accessor-'+key,trace=>{const previous=descriptor(object,key);define(object,key,{configurable:true,get(){trace.push(['get',key]);return previous.value;}});return()=>define(object,key,previous);});
  }
  for(const [object,key]of [[Object,'getOwnPropertyDescriptor'],[Object,'getPrototypeOf'],[Reflect,'apply'],[Function.prototype,'toString']])await compare('cold-infrastructure-'+key,trace=>{const original=object[key];return property(object,key,function(...args){trace.push(['unexpected-guard-callback',key]);return apply(original,this,args);});},{warm:false});
  await compare('cold-fromCharCode',trace=>{const original=String.fromCharCode;return property(String,'fromCharCode',function(...args){trace.push(['fromCharCode',args]);return apply(original,this,args);});},{warm:false});
  for(const name of ['String','Object','Reflect'])await compare('mid-Buffer-global-'+name,trace=>{const previous=descriptor(globalThis,name),original=previous.value;const undo=property(Buffer,'from',function(...args){trace.push('Buffer.from');const bytes=apply(nativeFrom,this,args);const wrapper=new Proxy(original,{get(target,key){trace.push(['replacement-global',name,key]);return target[key];}});define(globalThis,name,{...previous,value:wrapper});return bytes;});return()=>{define(globalThis,name,previous);undo();};});
  for(const [object,key]of [[Object,'getOwnPropertyDescriptor'],[Object,'getPrototypeOf'],[Reflect,'apply'],[Array.prototype,'join']])await compare('mid-Buffer-property-'+key,trace=>{const previous=descriptor(object,key),undo=property(Buffer,'from',function(...args){trace.push('Buffer.from');const bytes=apply(nativeFrom,this,args);define(object,key,{...previous,value:function(...values){trace.push(['replacement-call',key]);return apply(previous.value,this,values);}});return bytes;});return()=>{define(object,key,previous);undo();};},{warm:false});
  for(const wrong of [Object.prototype.toString,String.prototype.toString,BigInt.prototype.toString,Array.prototype.toString])await compare('wrong-number-native-'+apply(Function.prototype.toString,wrong,[]),()=>property(Number.prototype,'toString',wrong),{warm:false});
  await compare('wrong-iterator-family',trace=>{const one=property(typedPrototype,nativeSymbol.iterator,Array.prototype.values),two=property(Buffer,'from',()=>{const bytes=new Uint8Array([65]);define(bytes,'length',{get(){trace.push('own-length');return 0;}});return bytes;});return()=>{two();one();};},{warm:false});
  await compare('wrong-next-family',()=>property(iteratorPrototype,'next',Object.getPrototypeOf(new Map().values()).next),{warm:false});
 }
 if(mode==='pattern'){
  const actual=await load();actual.encodeInertJsonWord('warm');let leaked;const restore=property(RegExp.prototype,'test',function(...args){leaked=this;return apply(nativeTest,this,args);});try{old.encodeWord('A');}finally{restore();}assert.ok(leaked);
  for(const mutation of ['pattern','flags','exec','lastIndex']){
   const rows=[];
   for(const [kind,fn]of [['old',old.encodeWord],['actual',actual.encodeInertJsonWord]]){
    delete leaked.exec;apply(nativeCompile,leaked,['^[A-Za-z0-9._~*/<>=!&|+-]$','u']);leaked.lastIndex=0;const trace=[];
    if(mutation==='pattern')apply(nativeCompile,leaked,['Z','u']);if(mutation==='flags')apply(nativeCompile,leaked,['^[A-Za-z0-9._~*/<>=!&|+-]$','g']);
    if(mutation==='exec')define(leaked,'exec',{configurable:true,get(){trace.push('exec-get');return function(...args){trace.push(['exec-call',this===leaked,args]);return apply(RegExp.prototype.exec,this,args);};}});
    if(mutation==='lastIndex')leaked.lastIndex={valueOf(){trace.push('lastIndex-coercion');return 0;}};
    const start=actual.fastCount(),value=fn('A ?');rows.push({kind,value,trace,fastDelta:actual.fastCount()-start});
   }
   report.tapes.push({mutation,rows});assert.equal(rows[1].value,rows[0].value);assert.deepEqual(rows[1].trace,rows[0].trace);assert.equal(rows[1].fastDelta,0);
  }
  delete leaked.exec;apply(nativeCompile,leaked,['^[A-Za-z0-9._~*/<>=!&|+-]$','u']);leaked.lastIndex=0;assert.equal(actual.encodeInertJsonWord('A'),'A');
 }
 if(mode==='private-joins'){
  await compare('late-join-wrapper',trace=>{const original=Array.prototype.join;return property(Array.prototype,'join',function(...args){trace.push('unexpected-join');return apply(original,this,args);});});
  await compare('late-join-accessor',trace=>{const previous=descriptor(Array.prototype,'join');define(Array.prototype,'join',{configurable:true,get(){trace.push('unexpected-join-get');return previous.value;}});return()=>define(Array.prototype,'join',previous);});
  await compare('cold-join-wrapper',trace=>{const original=Array.prototype.join;return property(Array.prototype,'join',function(...args){trace.push('unexpected-cold-join');return apply(original,this,args);});},{warm:false});
  await compare('wrong-native-join',()=>property(Array.prototype,'join',Array.prototype.toString),{warm:false});
  assert.equal(typedPrototype.join.name,'join');await compare('same-name-wrong-typed-join',()=>property(Array.prototype,'join',typedPrototype.join),{warm:false});
  for(const object of [Array.prototype,Object.prototype]){const actual=await load();actual.encodeInertJsonWord('warm');let touched=0;const previous=descriptor(object,'17');define(object,'17',{configurable:true,get(){touched++;throw Error('inherited slot observed');},set(){touched++;throw Error('inherited setter observed');}});let encoded;try{encoded=actual.encodeInertJsonWord('A'.repeat(4100));}finally{if(previous)define(object,'17',previous);else delete object[17];}assert.equal(touched,0);assert.equal(encoded,'A'.repeat(4100));report.values.push({touched,encoded});}
  if(typeof SharedArrayBuffer==='function')await compare('shared-buffer',()=>property(Buffer,'from',()=>new Uint8Array(new SharedArrayBuffer(2))));
  if(typeof structuredClone==='function')await compare('detached-buffer',()=>property(Buffer,'from',()=>{const bytes=new Uint8Array(2);structuredClone(bytes.buffer,{transfer:[bytes.buffer]});return bytes;}));
  for(const replacement of [null,1,{}])await compare('noniterable-native-error',trace=>property(Buffer,'from',()=>{trace.push('Buffer.from');return replacement;}),{classOnly:true});
  for(const count of [4095,4096,4097])await compare('offset-view-'+count,trace=>property(Buffer,'from',function(...args){trace.push(['Buffer.from',args]);const backing=new Uint8Array(count+4);for(let at=0;at<count;at++)backing[at+2]=at%3===0?65:at%3===1?32:255;const bytes=new Uint8Array(backing.buffer,2,count);define(bytes,'length',{value:0});return bytes;}),{fast:true});
 }
 }finally{process.stdout.write(nativeJSON(report));}
}
function child(mode,vectors){const directory=mkdtempSync(join(tmpdir(),'inert-word-oracle-'));try{const path=join(directory,'oracle.mjs');writeFileSync(path,'('+encodingOracle.toString()+')('+[mode,fileURLToPath(new URL('../vendor/inert-json-word-encoding.mjs',import.meta.url)),fileURLToPath(new URL('../vendor/lino.mjs',import.meta.url))].map(value=>nativeJSON(value)).join(',')+').catch(error=>{console.error(error);process.exitCode=1;});');let stdout='',failure;try{stdout=execFileSync(process.execPath,[path],{timeout:20000,maxBuffer:134217728,encoding:'utf8',stdio:['ignore','pipe','pipe']});}catch(error){stdout=String(error.stdout??'');failure={message:error.message,stderr:String(error.stderr??'')};}if(stdout)vectors.push(JSON.parse(stdout));if(failure){vectors.push({failure});assert.fail(failure.message+'\n'+failure.stderr);}}finally{rmSync(directory,{recursive:true,force:true});}}
test('inert word storage retains every UTF16 and exact independent old percent byte',(_t,vectors)=>child('values',vectors));
test('bounded private flat blocks retain full large JSON words without legacy API redirection',(_t,vectors)=>child('large',vectors));
test('new writer preserves complete source CST checked meta hashes and independently strict targets',async(t,vectors)=>{
 const row=receive(),old=await oldDocument(vectors),before=hashes(()=>old.serializeOwnedCoreDocument(row.result.program,{context:row.context})),after=hashes(()=>serializeOwnedCoreDocument(row.result.program,{context:row.context}));vectors.push({input:row.data,result:row.result,before,after});assert.deepEqual(after,before);assert.equal(after.value,row.result.meta);
 const parsed=parseOwnedCoreDocumentMeta(after.value,{context:row.context});assert.equal(emitRust(parsed),row.result.rust);assert.equal(emitTypeScript(parsed,{outputPath:'reverse.mts'}),row.result.typescript);
 const directory=temporary(t);for(const file of row.data.files.filter(row=>/\.(?:mjs|mts|ts)$/u.test(row.path)))write(directory,file.path,file.source);write(directory,'reverse.mts',row.result.typescript);
 execFileSync(process.execPath,[join(ROOT,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),join(directory,'caller.mts'),join(directory,'reverse.mts')],{timeout:20000,encoding:'utf8',stdio:'pipe'});
 for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write(directory,'out/'+file.path,file.source);
 const js=await import(pathToFileURL(join(directory,'caller.mjs')).href),typed=await import(pathToFileURL(join(directory,'out/caller.mjs')).href),reverse=await import(pathToFileURL(join(directory,'out/reverse.mjs')).href),runtime=await prepareOwnedCoreRuntime(parsed),value=json_macro_object([['name',json_macro_string('é🦀')]]),golden=json_macro_object([['name',json_macro_string('é🦀')]]),stored=value.field0.entries.find(row=>row.key==='name').value;
 for(const api of [js,typed,reverse,{copied:value=>evaluate(parsed,'copied',[value],runtime),named:value=>evaluate(parsed,'named',[value],runtime)}]){const output=api.copied(value);assert.deepEqual(output,golden);assert.notEqual(output,value);assert.ok(Object.isFrozen(output));assert.equal(api.named(value),stored);}
});
test('Buffer once custom iterators coercion errors and IteratorClose keep full old tapes',(_t,vectors)=>child('iterators',vectors));
test('cold warm and mid-Buffer intrinsic mutations retain original fallback work',(_t,vectors)=>child('intrinsics',vectors));
test('previously exposed actual vendor pattern state retains receiver identity and refusals',(_t,vectors)=>child('pattern',vectors));
test('private joins reject observable replacements and retain native error boundaries',(_t,vectors)=>child('private-joins',vectors));
test('unchanged early word budget and fresh source CST semantic refusals remain decisive',async(_t,vectors)=>{
 const row=receive(),old=await oldDocument(vectors),excess=input();excess.files.push({path:'too-large.txt',source:'\0'.repeat(4500000)});const excessive=createOwnedCoreSourceContext(excess);
 for(const context of [excessive,row.context]){let original,actual;try{original=old.serializeOwnedCoreDocument(context===excessive?[]:[{kind:'invalid-late-item'}],{context});}catch(error){original={name:error.name,message:error.message};}try{actual=serializeOwnedCoreDocument(context===excessive?[]:[{kind:'invalid-late-item'}],{context});}catch(error){actual={name:error.name,message:error.message};}vectors.push({original,actual});assert.deepEqual(actual,original);}
 const selected=parseLinks(row.result.meta).map(link=>({head:link[0],value:JSON.parse(textOf(link[1]))}));const storage=change=>{const rows=structuredClone(selected);change(rows);return rows.map(row=>writeLink([row.head,encodeWord(nativeJSON(row.value))])+'\n').join('');};
 const mutations=[rows=>{rows[0].value.context.files[0].source+='\n';},rows=>{rows.splice(1,1);},rows=>{rows.find(row=>row.head==='owned-source-item').value.source.span[1]--;},rows=>{rows.find(row=>row.head==='owned-source-item').value.returns='bool';}];
 for(const mutate of mutations){const text=storage(mutate);let original,actual;try{old.readOwnedCoreDocument(text,{context:row.context});}catch(error){original={name:error.name,message:error.message};}try{parseOwnedCoreDocumentMeta(text,{context:row.context});}catch(error){actual={name:error.name,message:error.message};}vectors.push({text,original,actual});assert.ok(original);assert.deepEqual(actual,original);}
 const counterfeit=input();counterfeit.files.find(row=>row.path==='src/translation_core/primitives.rs').source+='\n';assert.throws(()=>createOwnedCoreSourceContext(counterfeit),/owned Rust sources differ/u);
});
