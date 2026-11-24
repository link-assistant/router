import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {isDeriveDependencyProof} from './derive-dependencies.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const directory=new URL('./source-profiles/derive/',import.meta.url);
const manifestBytes=readFileSync(new URL('builtin-default-manifest.json',directory));
export const BUILTIN_DEFAULT_SOURCE_PROFILE=freeze(JSON.parse(manifestBytes));
const proofs=new WeakSet(),cached=new WeakMap();
const reservedNames=new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final gen macro override priv try typeof unsized virtual yield'.split(' '));

// This proves expansion footprint, never Default::default() runtime behavior.
export function builtinDefaultDependencyProof(dependencies) {
  if(!isDeriveDependencyProof(dependencies))throw new TypeError('Builtin Default requires sealed standard source dependencies');
  if(cached.has(dependencies))return cached.get(dependencies);
  const profile=BUILTIN_DEFAULT_SOURCE_PROFILE;
  if(dependencies.rustVersion!==profile.rustVersion||dependencies.standardCore.sha256!==profile.standardCoreSha256)throw new TypeError('Builtin Default source version differs from the checked standard profile');
  for(const entry of profile.sources) {
    const archive=readFileSync(new URL(entry.archive,directory));
    if(archive.length!==entry.archiveBytes||hash(archive)!==entry.archiveSha256)throw new TypeError('Builtin Default compressed source checksum mismatch');
    const source=gunzipSync(archive,{maxOutputLength:100000});
    if(source.length!==entry.bytes||hash(source)!==entry.sha256)throw new TypeError('Builtin Default original source checksum mismatch');
  }
  const evidence={schema:profile.schema,dependenciesDigest:dependencies.digest,sourceProfileSha256:hash(manifestBytes),rustVersion:profile.rustVersion,sources:profile.sources,generatedImplBehavior:false};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.add(proof);cached.set(dependencies,proof);return proof;
}
export function isBuiltinDefaultDependencyProof(value){return !!value&&proofs.has(value);}

export function inspectBuiltinDefaultVariant(item,input) {
  const defaults=input.attributes.filter(attribute=>attribute.name==='default');
  if(!defaults.length)return null;
  if(input.kind!=='enum'||defaults.length!==1||defaults[0].position!=='variant'||defaults[0].tokens.join(' ')!=='# [ default ]'||!input.derives.some(entry=>entry.path.length===1&&entry.path[0]==='Default'))throw new TypeError('Builtin default helper requires one actual plain unit-variant Default invocation');
  const tokens=item.tokens.filter(token=>token.type!=='comment'),begin=tokens.findIndex(token=>token.text==='enum')+2;
  if(tokens[begin]?.text!=='{'||tokens.at(-1)?.text!=='}')throw new TypeError('Builtin Default requires a nongeneric original enum body');
  const attributes=new Map(input.attributes.filter(attribute=>attribute.position==='variant').map(attribute=>[attribute.span.start,attribute]));
  const names=new Set();let selected=null,at=begin+1;
  while(at<tokens.length-1) {
    const variantAttributes=[];
    while(tokens[at]?.text==='#') {
      const attribute=attributes.get(tokens[at].start);if(!attribute)throw new TypeError('Builtin Default variant attribute is unproved');
      variantAttributes.push(attribute);while(tokens[at]?.end<attribute.span.end)at++;at++;
    }
    const name=tokens[at++];
    if(name?.type!=='ident'||name.rawIdentifier||reservedNames.has(name.text)||names.has(name.text))throw new TypeError('Builtin Default requires unique bounded original unit variant names');
    names.add(name.text);
    if(variantAttributes.some(attribute=>attribute.name==='default')) {
      if(variantAttributes.some(attribute=>attribute.name==='non_exhaustive'))throw new TypeError('Builtin Default selected variant cannot be non_exhaustive');
      selected=name.text;
    }
    if(at<tokens.length-1&&tokens[at++].text!==',')throw new TypeError('Builtin Default initial footprint supports unit variants only');
  }
  if(!selected)throw new TypeError('Builtin Default selected variant is missing');
  return {profile:BUILTIN_DEFAULT_SOURCE_PROFILE.schema,variant:selected,attributeSpan:defaults[0].span,generatedImplBehavior:false,confinement:'Pinned builtin emits a single trait impl; no free type/value/attribute/bang declarations.'};
}
