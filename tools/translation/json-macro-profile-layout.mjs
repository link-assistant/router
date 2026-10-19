// Historical profile compatibility is DATA only. The caller still needs its
// genuine current dependency, feature, source, ownership and semantic checks.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const requireValue=(value,message)=>{if(!value)throw TypeError('JSON profile layout: '+message);};
const root=new URL('./source-profiles/',import.meta.url);
const profilePath='tools/translation/source-profiles/json-macro/manifest.json';
const containerSha='1d0713d968e969a06efccf1e0b4a9581ad8d30224fca7c3723ec3e7a86c24eff';
const rules=createRulePipeline([
 {phase:'language',rules:[{id:'json-profile:complete-authenticated-historical-source',apply:input=>{
  const container=readFileSync(new URL('cargo-layout-before/inputs.json.gz',root));requireValue(hash(container)===containerSha,'historical container changed');
  const history=JSON.parse(gunzipSync(container,{maxOutputLength:1024*1024})),encoded=history.profiles[profilePath],original=Buffer.from(encoded,'base64');
  requireValue(original.toString('base64')===encoded&&hash(original)===input.expected,'complete original profile differs');
  const manifestBytes=Buffer.from(history.manifest,'base64');requireValue(manifestBytes.toString('base64')===history.manifest,'canonical original Cargo container required');
  const manifest=manifestBytes.toString('utf8');requireValue(Buffer.from(manifest).equals(manifestBytes),'lossless original Cargo text required');
  const before=JSON.parse(original),current=readFileSync(new URL('json-macro/manifest.json',root));
  requireValue(hash(current)===input.dependencies.profileSha256,'complete current source profile differs');
  return {...input,manifest,original,before,current,after:JSON.parse(current)};
 }}]},
 {phase:'repository',rules:[{id:'router:complete-cargo-layout-and-profile-inverse',apply:input=>{
  const {manifest,original,before,current,after,dependencies}=input;
  requireValue(hash(manifest)===before.manifestSha256&&before.lockSha256===dependencies.lockSha256&&after.manifestSha256===dependencies.manifestSha256,'original/current Cargo joins differ');
  const readme='readme = "README.md"',replacement='readme = "../README.md"';
  requireValue(manifest.split(readme).length===2,'one original README path required');
  const from=manifest.indexOf('[profile.release]'),to=manifest.indexOf('[package.metadata.cargo-semver-checks.lints]');
  requireValue(from>=0&&to>from,'complete original workspace profile section required');
  const removed=manifest.slice(from,to),withoutProfiles=manifest.slice(0,from)+manifest.slice(to),cargo=withoutProfiles.replace(readme,replacement);
  const featureArchive=readFileSync(new URL('json-macro/features/link-assistant-router-1.24.1-Cargo.toml.gz',root)),actual=gunzipSync(featureArchive,{maxOutputLength:100000});
  requireValue(actual.equals(Buffer.from(cargo))&&hash(actual)===dependencies.manifestSha256,'complete package layout equation differs');
  const restored=cargo.replace(replacement,readme),inverse=restored.slice(0,from)+removed+restored.slice(from);
  requireValue(inverse===manifest,'complete original Cargo inverse differs');
  const anchor='"manifestSha256": '+JSON.stringify(before.manifestSha256),changed='"manifestSha256": '+JSON.stringify(after.manifestSha256),text=original.toString('utf8');
  requireValue(text.split(anchor).length===2,'one original profile manifest field required');
  const projected=text.replace(anchor,changed);
  requireValue(Buffer.from(projected).equals(current)&&projected.split(changed).length===2&&projected.replace(changed,anchor)===text,'complete profile bytes or inverse differ');
  return true;
 }}]},
]);
export function jsonMacroProfileMatches(dependencies,expected){
 if(!isJsonMacroSourceProof(dependencies)||typeof expected!=='string')return false;
 if(dependencies.profileSha256===expected)return true;
 return rules.run({dependencies,expected}).value;
}
