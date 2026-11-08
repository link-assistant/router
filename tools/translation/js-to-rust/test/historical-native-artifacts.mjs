// Complete pre-privacy generated SOURCE DATA. Every receiving compiler check
// still runs afresh; this archive supplies no current freshness or parity claim.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {historicalNativeSources} from './historical-native-source.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
export function historicalNativePortableArtifacts({archive=new URL('../../fixtures/historical-native-portable-artifacts.json.gz',import.meta.url)}={}){
 const packed=readFileSync(archive);
 if(packed.length!==853030||hash(packed)!=='a9430e19f4f6960e82b4bdf056085563c48464ae4544f1ecc51ceee41502c342')throw Error('Historical native artifacts archive changed');
 const raw=gunzipSync(packed,{maxOutputLength:8*1024*1024});
 if(raw.length!==5367179||hash(raw)!=='1d783d2304d9585dfe95a08424ba0fb1a472afc84805376a60cf90dbae4b6d2c')throw Error('Complete historical native artifacts changed');
 const packet=JSON.parse(raw.toString('utf8'));
 if(packet.schema!=='historical-native-portable-artifacts-v1'||packet.revision!=='eb2dad1c0a18394dc1aad46413e11401e74eb502'||packet.sourceArchiveSha256!=='95b4576068df3bd2950509dfab7ae06965534fafc73e9543c38fca141e8a4ca6'||packet.files.length!==314||packet.runtimeParity!==false||packet.currentFreshness!==false)throw Error('Historical native artifact cohort changed');
 const files=new Map();
 for(const row of packet.files){
  if(typeof row.path!=='string'||files.has(row.path)||typeof row.source!=='string'||Buffer.byteLength(row.source)!==row.bytes||hash(row.source)!==row.sha256)throw Error('Complete historical native artifact differs');
  files.set(row.path,row.source);
 }
 const manifest=JSON.parse(files.get('parity/js-native-portable-draft.json'));
 const translation=JSON.parse(files.get('parity/js-first-translation.json'));
 const historical=historicalNativeSources();
 const paths=historical.paths.filter(path=>path.startsWith('js/src/')&&path.endsWith('.mjs'));
 if(manifest.modules.length!==52||translation.nativeCoverage.length!==52||manifest.modules.some((row,at)=>row.path!==paths[at])||translation.nativeCoverage.some((row,at)=>row.path!==paths[at]))throw Error('Complete historical native artifact sources differ');
 const expected=new Set(['parity/js-native-portable-draft.json','parity/js-first-translation.json']);
 for(const module of manifest.modules){
  const source=historical.source(module.path),coverage=translation.nativeCoverage.find(row=>row.path===module.path);
  if(module.sha256!==hash(source)||module.bytes!==Buffer.byteLength(source)||coverage.sha256!==module.sha256||module.outputs.length!==6)throw Error('Historical artifact full source pin differs');
  const stem=module.path.slice('js/src/'.length,-4);
  for(const scope of ['top-level','scoped'])for(const path of [
   `tools/translation/js-to-rust/generated/native-portable/${scope}/${stem}.lino`,
   `tools/translation/js-to-rust/generated/native-portable/${scope}/${stem}.rs.txt`,
   `ts/src/portable-draft/${scope}/${stem}.ts`,
  ]){
   const outputs=module.outputs.filter(row=>row.path===path&&row.scope===scope),content=files.get(path);
   if(outputs.length!==1||typeof content!=='string'||outputs[0].bytes!==Buffer.byteLength(content)||outputs[0].sha256!==hash(content))throw Error('Historical artifact complete output differs');
   expected.add(path);
  }
 }
 if(expected.size!==files.size||[...files.keys()].some(path=>!expected.has(path)))throw Error('Historical artifact complete file census differs');
 return {revision:packet.revision,manifest,translation,files:new Map(files),source(path){
  const source=files.get(path);
  if(source===undefined)throw Error('Unknown historical native artifact: '+path);
  return source;
 }};
}
