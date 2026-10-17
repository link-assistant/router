// Original standard-library implementation closure for borrowed word views.
// Table data is derived from Rust, independently of the JavaScript host locale.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {RUST_WHITESPACE_CODE_UNITS} from './whitespace-data.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('../source-profiles/whitespace-iterators/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
for(const input of manifest.sources){
  const packed=readFileSync(new URL(input.archive,root));
  if(hash(packed)!==input.archiveSha256)throw new TypeError('Whitespace iterator source archive changed');
  const source=gunzipSync(packed,{maxOutputLength:300_000});
  if(source.length!==input.bytes||hash(source)!==input.sha256)throw new TypeError('Whitespace iterator original source changed');
}
if(JSON.stringify(RUST_WHITESPACE_CODE_UNITS)!==JSON.stringify(manifest.whitespaceScalarCodes))throw new TypeError('Whitespace runtime table differs from its original source derivation');
export const WHITESPACE_ITERATOR_PROFILE=freeze({...manifest,sourceInputsVerified:true,constEligible:false});
