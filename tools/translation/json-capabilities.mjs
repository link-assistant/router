// Feature activation uses the checksum-locked incoming dependency subgraph.
// Cargo targets are unioned conservatively; no platform is guessed or executed.
import {cargoLayoutManifestMatches} from './cargo-layout-input-compatibility.mjs';
import {readFileSync} from 'node:fs';
import {activateCargoFeatureRecords} from './cargo-feature-worklist.mjs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
import {freezeMacroTree} from './macro-token-trees.mjs';
const root=new URL('./source-profiles/json-capabilities/',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('manifest.json',root));
if(hash(bytes)!=='b31b059ad69822aebe097347a55dfbf590aa209085750f3821b5bd0cf8ff94cd')throw new TypeError('JSON feature source profile changed');
const INPUTS=freezeMacroTree(JSON.parse(bytes));

function actualFeatures(manifest,lock) {
  if(typeof manifest!=='string'||typeof lock!=='string'||(hash(manifest)!==INPUTS.manifestSha256&&!cargoLayoutManifestMatches(manifest,INPUTS.manifestSha256))||hash(lock)!==INPUTS.lockSha256)throw new TypeError('JSON parser lacks its exact original Cargo manifest/lock profile');
  const packages=new Map(),sources=[];
  for(const entry of INPUTS.packages) {
    if(entry.lockedArchiveSha256){const sections=lock.split('[[package]]').filter(section=>section.includes('name = '+JSON.stringify(entry.name)+'\nversion = '+JSON.stringify(entry.version)+'\n'));if(sections.length!==1||!sections[0].includes('checksum = '+JSON.stringify(entry.lockedArchiveSha256))||!sections[0].includes('source = "registry+https://github.com/rust-lang/crates.io-index"'))throw new TypeError('JSON feature package lacks its actual locked registry source');}
    for(const pin of [entry.manifest,...entry.licenses]) {
      const archive=readFileSync(new URL(pin.path,root));if(hash(archive)!==pin.archiveSha256)throw new TypeError('JSON feature input archive changed');
      const source=gunzipSync(archive,{maxOutputLength:100000});if(source.length!==pin.bytes||hash(source)!==pin.sha256)throw new TypeError('JSON feature original manifest/license changed');
      sources.push({package:entry.name,path:pin.sourcePath,sha256:pin.sha256});
    }
    if(packages.has(entry.name))throw new TypeError('Ambiguous locked JSON feature package');packages.set(entry.name,entry);
  }
  // The source registry is complete for incoming serde_json edges, not for
  // unrelated package dependencies or their generated runtime implementations.
  const active=activateCargoFeatureRecords(()=>INPUTS.root,packages,{label:'JSON'});
  const features=[...(active.get('serde_json')??[])].sort();
  if(!features.includes('std')||!active.get('serde_core')?.has('std')||features.includes('preserve_order')||features.includes('arbitrary_precision'))throw new TypeError('JSON parser requires verified std/default Map, Number and standard serializer features');
  return {features,sourceInputs:sources,serdeCoreStd:active.get('serde_core')?.has('std')===true};
}

const profiles=new WeakSet(),checkerProfiles=new WeakMap();
const parserIds=new Set(['serde_json_from_str','serde_json_from_slice']);
function parserSource() {
  for(const pin of [INPUTS.parserSource,...INPUTS.lexicalSources]) {
    const archive=readFileSync(new URL(pin.path,root));
    if(hash(archive)!==pin.archiveSha256)throw new TypeError('JSON parser branch archive changed');
    const original=gunzipSync(archive,{maxOutputLength:100000});
    if(original.length!==pin.bytes||hash(original)!==pin.sha256)throw new TypeError('JSON parser original branch changed');
  }
  return {...INPUTS.parserSource,lexicalSources:INPUTS.lexicalSources};
}
const source=freezeMacroTree(parserSource());
function seal(value){const profile=freezeMacroTree({...value,parserSource:source,runtimeParity:false,numericBranchImplemented:'not(float_roundtrip) default u64 accumulator',generatedTraitBehavior:false});profiles.add(profile);return profile;}
export const DEFAULT_JSON_PARSER_PROFILE=seal({kind:'explicit-registered-standalone-default-profile',features:['std'],parseAvailable:true,featureScope:'standalone default JSON adapter target; no actual Cargo profile asserted'});
export function actualJsonCapabilityProfile({manifest=null,lock=null,compilationProfile=null}={}) {
  try {
    if(compilationProfile?.values?.feature?.length)throw new TypeError('JSON parser default Cargo profile has no command-line feature override proof');
    const facts=actualFeatures(manifest,lock),parseAvailable=!facts.features.includes('float_roundtrip');
    return seal({kind:'actual-locked-Cargo-profile',manifestSha256:hash(manifest),lockSha256:hash(lock),sourceProfileSha256:hash(bytes),...facts,parseAvailable,featureScope:'registered default production incoming dependency union; no command-line dependency-feature overrides',diagnostic:parseAvailable?null:'actual serde_json/float_roundtrip selects lexical parsing; only not(float_roundtrip) numeric decoding is implemented'});
  } catch(error) {
    if(!(error instanceof TypeError))throw error;
    return seal({kind:'actual-Cargo-profile-unavailable',features:null,parseAvailable:false,diagnostic:error.message});
  }
}
export function configureJsonCapabilities(checker,profile) {
  if(!profiles.has(profile))throw unsupported('JSON parser target profile','requires a private explicit default or exact actual Cargo capability context',null);
  checkerProfiles.set(checker,profile);return checker;
}
export function assertJsonParserCapability(checker,contracts,span) {
  if(!contracts.some(contract=>parserIds.has(contract.id)))return;
  const profile=checkerProfiles.get(checker);
  if(!profile?.parseAvailable)throw unsupported('serde_json numeric parser feature profile',profile?.diagnostic??'actual/explicit parser capability context is missing',span);
}
export const isJsonCapabilityProfile=profile=>!!profile&&profiles.has(profile);
