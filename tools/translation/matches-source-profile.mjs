// Original standard macro data, not a macro-owner or runtime admission grant.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {stablePublicReexportCandidates} from './namespace-census.mjs';
const directory=new URL('./source-profiles/matches-source/',import.meta.url);
const PROFILE_SHA='67ac28c46d6e1164bbfdfff65bd95b0a4dd4e753e7ecc85b8ff805970f57c214';
const states=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const flags={sourceMacroOwnerResolved:false,fragmentGrammarChecked:false,opaqueAstProjectionChecked:false,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false,constEligible:false};
export function loadStandardMatchesSourceProfile() {
  const manifestBytes=readFileSync(new URL('manifest.json',directory));
  if(hash(manifestBytes)!==PROFILE_SHA)throw new TypeError('Standard matches source profile differs from its original pin');
  const manifest=JSON.parse(manifestBytes),sources=new Map();
  for(const pin of manifest.licenses){const bytes=readFileSync(new URL(pin.path,directory));if(bytes.length!==pin.bytes||hash(bytes)!==pin.sha256)throw new TypeError('Standard matches source license differs');}
  for(const pin of manifest.sources) {
    const archive=readFileSync(new URL(pin.archive,directory));
    if(archive.length!==pin.archiveBytes||hash(archive)!==pin.archiveSha256)throw new TypeError('Standard matches source archive differs');
    const bytes=gunzipSync(archive,{maxOutputLength:128000});
    if(bytes.length!==pin.bytes||hash(bytes)!==pin.sha256||sources.has(pin.sourcePath))throw new TypeError('Standard matches original source differs or is ambiguous');
    sources.set(pin.sourcePath,{pin,source:bytes.toString('utf8')});
  }
  const cargo=sources.get('library/core/Cargo.toml').source,packageHeader=cargo.indexOf('[package]\n'),packageEnd=cargo.indexOf('\n[',packageHeader+1);
  if(packageHeader<0||packageEnd<0)throw new TypeError('Standard macro definition lacks its original package table');
  const packageText=cargo.slice(packageHeader,packageEnd),editions=[...packageText.matchAll(/^edition\s*=\s*"(20[0-9]{2})"\s*$/gmu)];
  if(editions.length!==1||editions[0][1]!==manifest.definitionEdition)throw new TypeError('Standard macro definition edition differs from its original package');
  const definitionEditionSource={sourcePath:'library/core/Cargo.toml',span:{start:packageHeader+editions[0].index,end:packageHeader+editions[0].index+editions[0][0].length},sha256:hash(editions[0][0]),edition:editions[0][1]};
  const source=sources.get(manifest.definition.sourcePath)?.source,range=manifest.definition.span;
  const original=source?.slice(range.start,range.end);
  if(!original||Buffer.byteLength(original)!==manifest.definition.bytes||hash(original)!==manifest.definition.sha256)throw new TypeError('Standard matches original definition span differs');
  const items=sourceItems(source).filter(item=>!item.comment&&item.name===manifest.macroName&&item.start<=range.start&&item.end>=range.end);
  if(items.length!==1)throw new TypeError('Standard matches enclosing source declaration is ambiguous');
  const item=items[0],trees=originalMacroTrees(original);
  if(trees.length!==4||trees[0].text!=='macro_rules'||trees[1].text!=='!'||trees[2].text!==manifest.macroName||trees[3].delimiter!=='{')throw new TypeError('Standard matches original definition grammar differs');
  const reexports=stablePublicReexportCandidates(sources.get('library/std/src/lib.rs').source).filter(row=>row.name===manifest.macroName&&row.path.join('::')==='core::'+manifest.macroName);
  if(reexports.length!==1)throw new TypeError('Standard matches original std reexport is absent or ambiguous');
  const evidence={schema:manifest.schema,profileSha256:PROFILE_SHA,rustVersion:manifest.rustVersion,definitionEdition:definitionEditionSource.edition,definitionEditionSource,name:manifest.macroName,
    sources:manifest.sources,licenses:manifest.licenses,definition:manifest.definition,originalDefinitionTrees:trees,
    enclosingOriginalItem:{term:item.term,name:item.name,span:{start:item.start,end:item.end},sha256:hash(source.slice(item.start,item.end)),tokens:item.tokens},
    stdReexport:reexports[0],remainingObligations:manifest.remainingObligations,...flags};
  const profile=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});states.set(profile,{sources,original});return profile;
}
export const isStandardMatchesSourceProfile=profile=>!!profile&&states.has(profile);
export function standardMatchesOriginalSource(profile,path) {
  const facts=states.get(profile);if(!facts)throw new TypeError('Unsealed standard matches source profile');
  const source=facts.sources.get(path);if(!source)throw new TypeError('Standard matches source is outside the pinned input profile');
  return freezeMacroTree({sourcePath:path,source:source.source,...source.pin});
}
export function standardMatchesOriginalDefinition(profile) {
  const facts=states.get(profile);if(!facts)throw new TypeError('Unsealed standard matches source profile');return facts.original;
}
