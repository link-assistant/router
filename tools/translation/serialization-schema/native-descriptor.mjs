import {rustPackageSourcePath} from '../repository-layout.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { generateSerializationSchema } from './generate.mjs';
import { canonicalSerializationMeta } from './meta.mjs';
import { SerializationRefusal } from './extract.mjs';

const sourceModule='js/src/affinity-schema.mjs';
const outputs={meta:'tools/translation/serialization-schema/generated/affinity-schema.meta.json',javascript:'js/src/affinity-schema-descriptor.mjs',typescript:'tools/translation/serialization-schema/generated/affinity-schema-descriptor.ts',receipt:'tools/translation/serialization-schema/generated/affinity-schema-emission.json'};
const hash=value=>createHash('sha256').update(value).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
const fail=message=>{throw new SerializationRefusal(message);};
function artifactWrite(path,text) {
  if(Buffer.byteLength(text)>512*1024)fail('Native schema artifact exceeds bounded output size');
  mkdirSync(dirname(path),{recursive:true});
  const temporary=path+'.serialization-tmp-'+process.pid;
  writeFileSync(temporary,text,{flag:'wx'});renameSync(temporary,path);
}
// This opt-in producer runs only under a separate Gate grant. No generated
// artifact or native import is created merely by loading this module.
export async function produceNativeAffinityDescriptor({root,write=false,applyImport=false}={}) {
  root=resolve(root);
  if(applyImport&&!write)fail('Native import application requires explicit artifact write mode');
  const before=readFileSync(join(root,sourceModule));
  const plan=JSON.parse(readFileSync(new URL('./native-import-plan.json',import.meta.url),'utf8'));
  const body=before.toString('utf8'),bodyStart=body.indexOf('function freezeSchema');
  if(bodyStart<0||hash(Buffer.from(body.slice(bodyStart)))!==plan.interpreter_body_sha256)fail('Native schema interpreter differs from the reviewed unchanged body');
  const baseline=await import(pathToFileURL(join(root,sourceModule)).href+'?serializationBaseline='+hash(before));
  const paths=execFileSync('git',['ls-files','-z','--',rustPackageSourcePath(root,'src/*.rs')],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  const generated=generateSerializationSchema({root,paths,entry:rustPackageSourcePath(root,'src/lib.rs'),roots:['crate::response_affinity::AffinityFile'],compilationProfile:{flags:{test:false,unix:true,windows:false}},expectedDescriptor:baseline.affinitySchema,exportName:'affinitySchema'});
  if(!readFileSync(join(root,sourceModule)).equals(before))fail('Native baseline changed during descriptor comparison');
  const meta=JSON.parse(generated.meta),owners=meta.types.map(type=>({owner:type.owner,source:type.source,sourceSha256:type.sourceSha256,itemSha256:type.itemSha256,span:type.span}));
  if(owners.length!==7)fail('Actual original affinity source no longer has the reviewed seven reachable owners');
  const observedJS=await import('data:text/javascript;base64,'+Buffer.from(generated.javascript).toString('base64'));
  if(!isDeepStrictEqual(plain(observedJS.affinitySchema),plain(baseline.affinitySchema)))fail('Emitted descriptor runtime value differs from the actual baseline projection');
  const stable={schema:'original-affinity-descriptor-emission-v1',roots:meta.roots,sourceSetSha256:meta.context.sourceSetSha256,dependenciesDigest:meta.context.dependenciesDigest,owners,comparedActualNativeProjection:true,parsedValueEqualityAllOwners:true,descriptorSha256:hash(canonicalSerializationMeta(plain(generated.descriptor))),metadataSha256:hash(generated.meta),javascriptSha256:hash(generated.javascript),typescriptSha256:hash(generated.typescript),nativeInterpreterUnchanged:true,runtimeAuthority:false,generatedTraitBehavior:false};
  const receipt=JSON.stringify(stable,null,2)+'\n',artifacts={meta:generated.meta,javascript:generated.javascript,typescript:generated.typescript,receipt};
  if(!write) {
    for(const [name,path]of Object.entries(outputs))if(!existsSync(join(root,path))||readFileSync(join(root,path),'utf8')!==artifacts[name])fail('Native schema generated artifact is missing or has drift: '+path);
    return {checked:true,written:false,outputs,receipt:stable};
  }
  if(applyImport)execFileSync('git',['apply','--check',fileURLToPath(new URL('./native-import.patch',import.meta.url))],{cwd:root});
  for(const [name,path]of Object.entries(outputs))artifactWrite(join(root,path),artifacts[name]);
  for(const [name,path]of Object.entries(outputs))if(readFileSync(join(root,path),'utf8')!==artifacts[name])fail('Written native schema artifact could not be reopened exactly');
  if(applyImport) {
    execFileSync('git',['apply',fileURLToPath(new URL('./native-import.patch',import.meta.url))],{cwd:root});
    if(hash(readFileSync(join(root,sourceModule)))!==plan.planned_native_source_sha256)fail('Native schema import differs from the reviewed interpreter-preserving patch');
  }
  return {checked:true,written:true,outputs,baselineNativeSourceSha256:hash(before),receipt:stable,appliedImport:applyImport};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.some(argument=>!['--write','--check','--apply-import'].includes(argument))||args.includes('--check')&&args.includes('--write'))fail('Usage: native-descriptor.mjs [--check | --write [--apply-import]]');
  const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
  const result=await produceNativeAffinityDescriptor({root,write:args.includes('--write'),applyImport:args.includes('--apply-import')});
  process.stdout.write(JSON.stringify(result)+'\n');
}
