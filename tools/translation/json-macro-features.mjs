// Feature activation uses the checksum-locked incoming dependency subgraph.
// Cargo targets are unioned conservatively; no platform is guessed or executed.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {isJsonMacroSourceProof} from './json-macro-sources.mjs';
const root=new URL('./source-profiles/json-macro/features/',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('manifest.json',root));
if(hash(bytes)!=='a2c8d8a3e73ff7bafd7a27214270aa1be07bf4f51539b48560974172cc6ad982')throw new TypeError('JSON feature source profile changed');
export const JSON_MACRO_FEATURE_INPUTS=freezeMacroTree(JSON.parse(bytes));
const proofs=new WeakSet();
export function proveJsonMacroFeatures(dependencies,{includeDev=false}={}) {
  if(!isJsonMacroSourceProof(dependencies)||dependencies.manifestSha256!==JSON_MACRO_FEATURE_INPUTS.manifestSha256||dependencies.lockSha256!==JSON_MACRO_FEATURE_INPUTS.lockSha256)throw new TypeError('JSON features require original sealed manifest/lock dependencies');
  if(includeDev!==false)throw new TypeError('JSON feature profile supports ordinary production dependencies only');
  const packages=new Map(),sources=[];
  for(const entry of JSON_MACRO_FEATURE_INPUTS.packages) {
    for(const pin of [entry.manifest,...entry.licenses]) {
      const archive=readFileSync(new URL(pin.path,root));if(hash(archive)!==pin.archiveSha256)throw new TypeError('JSON feature input archive changed');
      const source=gunzipSync(archive,{maxOutputLength:100000});if(source.length!==pin.bytes||hash(source)!==pin.sha256)throw new TypeError('JSON feature original manifest/license changed');
      sources.push({package:entry.name,path:pin.sourcePath,sha256:pin.sha256});
    }
    if(packages.has(entry.name))throw new TypeError('Ambiguous locked JSON feature package');packages.set(entry.name,entry);
  }
  // The source registry is complete for incoming serde_json edges, not for
  // unrelated package dependencies or their generated runtime implementations.
  const active=new Map(),depActive=new Set(),queue=[];
  const activate=(name,feature=null)=>{if(!packages.has(name))return;if(!active.has(name)){active.set(name,new Set());queue.push([name,null]);}if(feature!==null&&!active.get(name).has(feature)){active.get(name).add(feature);queue.push([name,feature]);}};
  const dependency=(owner,entry)=>{
    const key=owner.name+':'+entry.alias;if(depActive.has(key))return;depActive.add(key);
    activate(entry.package);if(entry.defaultFeatures)activate(entry.package,'default');for(const feature of entry.features)activate(entry.package,feature);
  };
  activate(JSON_MACRO_FEATURE_INPUTS.root);activate(JSON_MACRO_FEATURE_INPUTS.root,'default');let steps=0;
  for(let at=0;at<queue.length;at++) {
    if(++steps>4096)throw new TypeError('JSON dependency feature activation budget exceeded');
    const [name,feature]=queue[at],owner=packages.get(name),dependencies_=owner.dependencies.filter(entry=>entry.kind==='dependencies');
    if(feature===null){for(const entry of dependencies_)if(!entry.optional)dependency(owner,entry);continue;}
    const values=owner.features[feature];
    if(!values){const implicit=dependencies_.find(entry=>entry.alias===feature&&entry.optional);if(implicit)dependency(owner,implicit);else if(feature!=='default'&&!owner.unrelatedDependencyAliases.includes(feature))throw new TypeError('Unregistered original Cargo feature '+name+'/'+feature);continue;}
    for(const value of values) {
      if(typeof value!=='string')throw new TypeError('Unproved Cargo feature syntax');
      if(value.startsWith('dep:')){const entry=dependencies_.find(entry=>entry.alias===value.slice(4));if(entry)dependency(owner,entry);continue;}
      const slash=value.indexOf('/');
      if(slash>=0){const raw=value.slice(0,slash),weak=raw.endsWith('?'),alias=weak?raw.slice(0,-1):raw,entry=dependencies_.find(entry=>entry.alias===alias);if(!entry)continue;if(!weak||depActive.has(name+':'+alias)){dependency(owner,entry);activate(entry.package,value.slice(slash+1));}continue;}
      activate(name,value);
    }
    // A newly enabled optional dependency may unlock an earlier weak edge.
    for(const enabled of active.get(name))for(const value of owner.features[enabled]??[])if(value.includes('?/')){const [alias,target]=value.split('?/'),entry=dependencies_.find(entry=>entry.alias===alias);if(entry&&depActive.has(name+':'+alias))activate(entry.package,target);}
  }
  const features=[...(active.get('serde_json')??[])].sort();
  if(!features.includes('std')||!active.get('serde_core')?.has('std')||features.includes('preserve_order')||features.includes('arbitrary_precision'))throw new TypeError('JSON macro requires verified std/default Map, Number and standard serializer features');
  const proof=freezeMacroTree({schema:'checked-locked-json-feature-activation-v1',dependencyDigest:dependencies.digest,sourceProfileSha256:hash(bytes),sourceInputs:sources,features,activePackages:[...active].map(([name,values])=>({name,features:[...values].sort()})),targetConditions:'conservative-union',includeDev:false,selectedCargoProfile:'registered default production dependencies; no command-line dependency-feature overrides',unifiedFeatureClosureVerified:true,scope:'incoming serde_json dependency features and actual serde_json/std -> serde_core/std forwarding only',numericDeserializeAuthority:false,runtimeParity:false,generatedTraitBehavior:false});proofs.add(proof);return proof;
}
export const isJsonMacroFeatureProof=proof=>!!proof&&proofs.has(proof);
