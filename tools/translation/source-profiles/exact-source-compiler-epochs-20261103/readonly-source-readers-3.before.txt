// Portable original inputs for format-source stages; partial inputs never
// supply macro, builtin-builder, formatting trait, allocator or I/O authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {freezeMacroTree} from './macro-token-trees.mjs';
const root=new URL('./source-profiles/format-arguments/',import.meta.url),states=new WeakMap(),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function loadPinnedFormatSourceStages(){
  const manifest=readFileSync(new URL('manifest.json',root));if(hash(manifest)!=='42f5415bf35c84c59eb7e6710551d44fa3c2eb7c1c0f03e314de58a3f423f6fc')throw new TypeError('Original format source profile changed');const profile=JSON.parse(manifest),inputs=new Map(),diagnostics=[];
  for(const pin of profile.inputs){let compressed;try{compressed=readFileSync(new URL(pin.input,root));}catch(error){if(error.code!=='ENOENT')throw error;diagnostics.push({code:'ERR_FORMAT_SOURCE_INPUT_UNAVAILABLE',sourcePath:pin.sourcePath,input:pin.input,requiredFor:pin.requiredFor??'original-source-stage'});continue;}
    if(compressed.length!==pin.compressedBytes||hash(compressed)!==pin.compressedSha256)throw new TypeError('Original format input archive changed: '+pin.sourcePath);const bytes=gunzipSync(compressed,{maxOutputLength:200000});if(bytes.length!==pin.sourceBytes||hash(bytes)!==pin.sourceSha256)throw new TypeError('Original format input bytes changed: '+pin.sourcePath);if(inputs.has(pin.sourcePath))throw new TypeError('Original format source path is ambiguous');inputs.set(pin.sourcePath,freezeMacroTree({...pin,source:bytes.toString('utf8')}));
  }
  for(const license of profile.licenses){const bytes=readFileSync(new URL(license.input,root));if(bytes.length!==license.bytes||hash(bytes)!==license.sha256)throw new TypeError('Original format input license changed');}
  const issued={schema:profile.schema,rust:profile.rust,profileSha256:hash(manifest),availableInputs:[...inputs].map(([sourcePath,row])=>({sourcePath,sha256:row.sourceSha256})),diagnostics,allSourceInputsVerified:diagnostics.length===0,callerMacroOwnerResolved:false,builtinBuilderOwnerResolved:false,sourceSemanticClosureVerified:false,traitSelectionVerified:false,allocatorEffectsVerified:false,ioEffectsVerified:false,namespaceAuthority:false,runtimeParity:false};const encoded=JSON.stringify(issued),proof=freezeMacroTree({...JSON.parse(encoded),privateMetaRoundtrip:true,checkedMetaSha256:hash(encoded)});states.set(proof,inputs);return proof;
}
export const isPinnedFormatSourceStages=proof=>!!proof&&states.has(proof);
export function formatSourceStageInput(proof,path){const source=states.get(proof)?.get(path);if(!source){const error=new TypeError('Unsealed or unavailable original formatting input: '+path);error.code='ERR_FORMAT_SOURCE_INPUT_UNAVAILABLE';throw error;}return source;}
