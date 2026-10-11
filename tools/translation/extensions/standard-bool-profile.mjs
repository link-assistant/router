import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../source-profiles/standard-bool/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const compressed=readFileSync(new URL(manifest.source.file,root)),source=gunzipSync(compressed,{maxOutputLength:16_384});
if(hash(compressed)!==manifest.source.compressedSha256||source.length!==manifest.source.bytes||hash(source)!==manifest.source.sha256||manifest.constEligible!==false)throw new Error('Standard bool source differs from the checked Rust 1.89 profile');
export const BOOL_THEN_SOME_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,sha256:manifest.source.sha256,constEligible:false});
