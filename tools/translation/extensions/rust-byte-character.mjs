// The written byte token has its own primitive u8 identity, independent of
// integer inference and of ordinary Unicode char/string normalization.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
const root=new URL('../source-profiles/cooked-byte-char/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
for(const entry of manifest.sources){const encoded=readFileSync(new URL(entry.file,root)),raw=gunzipSync(encoded,{maxOutputLength:512_000});if(hash(encoded)!==entry.compressedSha256||raw.length!==entry.bytes||hash(raw)!==entry.sha256||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==entry.gitBlobSha)throw new Error('Byte character original source differs');}
const archive=readFileSync(new URL(manifest.package.file,root));
if(archive.length!==manifest.package.bytes||hash(archive)!==manifest.package.sha256)throw new Error('Byte character locked escaper archive differs');
const tar=gunzipSync(archive,{maxOutputLength:256_000}),members=new Map();
for(let at=0;at+512<=tar.length;){
  const header=tar.subarray(at,at+512);if(header.every(byte=>byte===0))break;
  const text=(start,length)=>header.subarray(start,start+length).toString('utf8').split('\0')[0];
  const sizeText=text(124,12).trim(),size=parseInt(sizeText,8),checksum=parseInt(text(148,8).trim(),8),sum=header.reduce((sum,byte,index)=>sum+(index>=148&&index<156?32:byte),0);
  if(!/^[0-7]+$/u.test(sizeText)||sum!==checksum||!Number.isSafeInteger(size)||at+512+size>tar.length||!['0','','5'].includes(text(156,1)))throw new Error('Byte character escaper member differs');
  const name=[text(345,155),text(0,100)].filter(Boolean).join('/');if(members.has(name))throw new Error('Duplicate byte character escaper member');
  members.set(name,tar.subarray(at+512,at+512+size));at+=512+Math.ceil(size/512)*512;
}
for(const entry of manifest.package.members){const raw=members.get(entry.path);if(!raw||raw.length!==entry.bytes||hash(raw)!==entry.sha256)throw new Error('Byte character full escaper source differs');const lines=raw.toString('utf8').split('\n');for(const anchor of entry.anchors)if(lines.slice(anchor.startLine-1,anchor.endLine).join('\n')!==anchor.text)throw new Error('Byte character escape anchor differs');}
const lock=gunzipSync(readFileSync(new URL('rust-Cargo.lock.gz',root))).toString('utf8');
const sections=lock.split('[[package]]').filter(section=>section.includes('\nname = "rustc-literal-escaper"\n'));
if(sections.length!==1||!sections[0].includes('\nversion = "0.0.2"\n')||!sections[0].includes('\nchecksum = "'+manifest.package.sha256+'"'))throw new Error('Byte character Rust lock differs');
export const RUST_BYTE_CHARACTER_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,item:'u8',namespaceComplete:false,completeEscaperTranslation:false});
const inputs=()=>[...manifest.sources.map(({url,sha256})=>({url,sha256})),{url:manifest.package.url,sha256:manifest.package.sha256}];
export function decodeRustByteCharacter(raw,span){
  const fail=()=>{throw new TranslationError('syntax','requires a valid single cooked Rust byte character literal',span);};
  if(typeof raw!=='string'||!raw.startsWith("b'")||!raw.endsWith("'"))return fail();
  const content=raw.slice(2,-1),escapes={"\\'":39,'\\"':34,'\\n':10,'\\r':13,'\\t':9,'\\\\':92,'\\0':0};let value;
  if(Object.hasOwn(escapes,content))value=escapes[content];
  else if(/^\\x[0-9a-fA-F]{2}$/u.test(content))value=Number.parseInt(content.slice(2),16);
  else if(content.length===1&&content.charCodeAt(0)<=127&&!/[\n\r\t'\\]/u.test(content))value=content.charCodeAt(0);
  else return fail();
  return {kind:'number',value:String(value),suffix:'u8',raw,byteProfile:manifest.profile};
}
export function sourceByteLiteral(raw,span){return {profile:manifest.profile,raw,sourceInputs:inputs(),span:{...span},namespaceComplete:false,completeEscaperTranslation:false};}
export function requireByteLiteral(node,verified=false){
  const proof=node.sourceByteLiteral,decoded=decodeRustByteCharacter(proof?.raw,node.span);
  if(node.k!=='num'||node.negative||node.value!==decoded.value||node.type?.kind!=='fixed'||node.type.bits!==8||node.type.signed!==false||node.type.rustPrimitiveName!=='u8'||proof?.profile!==manifest.profile||!isDeepStrictEqual(proof.sourceInputs,inputs())||!isDeepStrictEqual(proof.span,node.span)||proof.namespaceComplete!==false||proof.completeEscaperTranslation!==false||(verified?proof.verified!==true:proof.verified!==undefined))throw new Error('missing actual cooked Rust byte character proof');
}
