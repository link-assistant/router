// Original core crate root explicitly imports the edition prelude. Its
// complete pinned source establishes the trait route, without core runtime authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const root=new URL('../source-profiles/primitive-bool-from/',import.meta.url);
const encoded=readFileSync(new URL('core-root-profile.json',root));
if(hash(encoded)!=='8e9437620d7fb3e18a4a663545669c8ebe990d8d3a34e710b71af230a55247cb')throw new TypeError('Original core prelude profile differs');
const pin=JSON.parse(encoded),compressed=readFileSync(new URL(pin.file,root)),raw=gunzipSync(compressed,{maxOutputLength:128000});
if(compressed.length!==pin.compressedBytes||hash(compressed)!==pin.compressedSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==pin.gitBlobSha)throw new TypeError('Original core crate root differs');
const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
const words=tokens=>tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('');
const imports=sourceItems(source).filter(item=>item.term==='use'&&words(item.tokens)==='#[prelude_import]#[allow(unused)]useprelude::rust_2024::*;');
if(imports.length!==1||!words(rustTokens(source)).includes('externcrateselfascore;')||!words(rustTokens(source)).includes('#![no_core]'))throw new TypeError('Original core implicit prelude route differs');
export const ORIGINAL_CORE_PRELUDE_ROOT=Object.freeze({sourcePath:pin.path,sourceSha256:pin.sha256,profileSha256:hash(encoded),edition:'2024',importPath:Object.freeze(['core','prelude','rust_2024']),originalSpan:Object.freeze({start:imports[0].start,end:imports[0].end}),originalImport:source.slice(imports[0].start,imports[0].end),explicitPreludeImport:true,wholeCoreAuthority:false,runtimeParity:false});
