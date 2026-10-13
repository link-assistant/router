// Source registration only. The private original invocation joins this leaf;
// no caller syntax, generated output or complete namespace is certified here.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
import {BUILTIN_DEFAULT_SOURCE_PROFILE,isBuiltinDefaultDependencyProof} from './derive-builtin-default.mjs';
import {sourceItems} from './rust-structure.mjs';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),sources=new WeakMap(),proofs=new WeakSet();
const identifier=node=>node?.kind==='token'&&node.type==='ident'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(node.text);
function registration(origin,attributeName,ownerName,helperName){
  const matches=[];
  for(const item of sourceItems(origin.source)){
    const written=origin.source.slice(item.start,item.end),trees=originalMacroTrees(written);let at=0;
    while(trees[at]?.text==='#'&&trees[at+1]?.delimiter==='['){
      const attribute=trees[at+1],body=attribute.children,args=body[1]?.children;
      if(body[0]?.text===attributeName&&body.length===2&&body[1]?.delimiter==='('&&args?.length===4&&args[0].text===ownerName&&args[1].text===','&&args[2].text==='attributes'&&args[3]?.delimiter==='('){
        const helpers=args[3].children,names=[];let index=0;
        while(index<helpers.length){const name=helpers[index++];if(!identifier(name)||names.includes(name.text))throw new TypeError('Original derive helper registration grammar changed');names.push(name.text);if(index<helpers.length&&helpers[index++].text!==',')throw new TypeError('Original derive helper registration separator changed');}
        if(names.includes(helperName))matches.push({source:origin.path,sourceSha256:origin.sha256,span:{start:item.start+trees[at].span.start,end:item.start+attribute.span.end},originalAttribute:written.slice(trees[at].span.start,attribute.span.end),declarationSpan:{start:item.start,end:item.end},declarationSha256:hash(written),registeredHelpers:names});
      }
      at+=2;
    }
  }
  if(matches.length!==1)throw new TypeError('Original derive helper registration is absent or ambiguous');
  return matches[0];
}
export function registeredDeriveHelperSource({dependencies,target,helperName,defaultProof=null}={}){
  if(!isDeriveDependencyProof(dependencies))throw new TypeError('Derive helper registration requires private locked source dependencies');
  const serde=Array.isArray(target)&&target.length===2&&target[0]==='serde'&&['Serialize','Deserialize'].includes(target[1])&&helperName==='serde';
  const builtin=Array.isArray(target)&&JSON.stringify(target)===JSON.stringify(['core','default','Default'])&&helperName==='default';
  if(!serde&&!builtin)return null;
  if(builtin&&(!isBuiltinDefaultDependencyProof(defaultProof)||defaultProof.dependenciesDigest!==dependencies.digest))throw new TypeError('Default helper requires its genuine original builtin dependency proof');
  let cache=sources.get(dependencies);if(!cache){cache=new Map();sources.set(dependencies,cache);}const key=JSON.stringify([target,helperName]);if(cache.has(key))return cache.get(key);
  let origin;
  if(serde)origin=deriveDependencySource(dependencies,'serde_derive','src/lib.rs');
  else{
    const entry=BUILTIN_DEFAULT_SOURCE_PROFILE.sources.find(row=>row.path==='library/core/src/default.rs'),archive=readFileSync(new URL('./source-profiles/derive/'+entry.archive,import.meta.url));
    if(archive.length!==entry.archiveBytes||hash(archive)!==entry.archiveSha256)throw new TypeError('Original Default helper archive changed');
    const bytes=gunzipSync(archive,{maxOutputLength:100000});if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw new TypeError('Original Default helper source changed');
    origin={path:entry.path,sha256:entry.sha256,source:bytes.toString('utf8')};
  }
  const original=registration(origin,serde?'proc_macro_derive':'rustc_builtin_macro',target.at(-1),helperName);
  const evidence={schema:'original-derive-helper-registration-v1',dependenciesDigest:dependencies.digest,target:[...target],helperName,registration:original,inputAuthority:false,namespaceAuthority:false,bangOutputAuthority:false,generatedImplBehavior:false};
  const proof=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});proofs.add(proof);cache.set(key,proof);return proof;
}
export const isRegisteredDeriveHelperSource=value=>!!value&&proofs.has(value);
