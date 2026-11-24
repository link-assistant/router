import {rustPackageSourcePath} from '../repository-layout.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import {withSerializationWriterAsync} from '../serialization-writer-layout-20261102.mjs';
import {serializationWriterGit} from '../serialization-writer-layout-20261102-git.mjs';
import { generateSerializationSchema } from './generate.mjs';
import { canonicalSerializationMeta } from './meta.mjs';
import { SerializationRefusal } from './extract.mjs';

const sourceModule='js/src/affinity-schema.mjs';
const outputs=Object.freeze({meta:'tools/translation/serialization-schema/generated/affinity-schema.meta.json',javascript:'js/src/affinity-schema-descriptor.mjs',typescript:'tools/translation/serialization-schema/generated/affinity-schema-descriptor.ts',receipt:'tools/translation/serialization-schema/generated/affinity-schema-emission.json'});
const hash=value=>createHash('sha256').update(value).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
const fail=message=>{throw new SerializationRefusal(message);};
// This opt-in producer runs only under a separate Gate grant. No generated
// artifact or native import is created merely by loading this module.
export async function produceNativeAffinityDescriptor({root,write=false,applyImport=false}={}) {
  return withSerializationWriterAsync(root,write,(writer,capturedRoot)=>produceNativeAffinityDescriptorInScope({root:capturedRoot,write,applyImport,writer}));
}
async function produceNativeAffinityDescriptorInScope({root,write,applyImport,writer}) {
  if(applyImport&&!write)fail('Native import application requires explicit artifact write mode');
  const before=readFileSync(join(root,sourceModule));
  const plan=JSON.parse(readFileSync(new URL('./native-import-plan.json',import.meta.url),'utf8'));
  const body=before.toString('utf8'),bodyStart=body.indexOf('function freezeSchema');
  if(bodyStart<0||hash(Buffer.from(body.slice(bodyStart)))!==plan.interpreter_body_sha256)fail('Native schema interpreter differs from the reviewed unchanged body');
  const beforeHash=hash(before);
  if(applyImport&&![plan.original_native_source_sha256,plan.planned_native_source_sha256].includes(beforeHash))fail('Native import requires the exact reviewed original or already imported source');
  const needsImport=applyImport&&beforeHash!==plan.planned_native_source_sha256;
  const current=()=>{writer?.verify();if(!readFileSync(join(root,sourceModule)).equals(before))fail('Native baseline changed during descriptor comparison');};
  const baseline=await import(pathToFileURL(join(root,sourceModule)).href+'?serializationBaseline='+hash(before));
  current();
  const paths=execFileSync('git',['ls-files','-z','--',rustPackageSourcePath(root,'src/*.rs')],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  const generated=generateSerializationSchema({root,paths,entry:rustPackageSourcePath(root,'src/lib.rs'),roots:['crate::response_affinity::AffinityFile'],compilationProfile:{flags:{test:false,unix:true,windows:false}},expectedDescriptor:baseline.affinitySchema,exportName:'affinitySchema'});
  current();
  const meta=JSON.parse(generated.meta),owners=meta.types.map(type=>({owner:type.owner,source:type.source,sourceSha256:type.sourceSha256,itemSha256:type.itemSha256,span:type.span}));
  if(owners.length!==7)fail('Actual original affinity source no longer has the reviewed seven reachable owners');
  const observedJS=await import('data:text/javascript;base64,'+Buffer.from(generated.javascript).toString('base64'));
  current();
  if(!isDeepStrictEqual(plain(observedJS.affinitySchema),plain(baseline.affinitySchema)))fail('Emitted descriptor runtime value differs from the actual baseline projection');
  const stable={schema:'original-affinity-descriptor-emission-v1',roots:meta.roots,sourceSetSha256:meta.context.sourceSetSha256,dependenciesDigest:meta.context.dependenciesDigest,owners,comparedActualNativeProjection:true,parsedValueEqualityAllOwners:true,descriptorSha256:hash(canonicalSerializationMeta(plain(generated.descriptor))),metadataSha256:hash(generated.meta),javascriptSha256:hash(generated.javascript),typescriptSha256:hash(generated.typescript),nativeInterpreterUnchanged:true,runtimeAuthority:false,generatedTraitBehavior:false};
  const receipt=JSON.stringify(stable,null,2)+'\n',artifacts={meta:generated.meta,javascript:generated.javascript,typescript:generated.typescript,receipt};
  if(!write) {
    for(const [name,path]of Object.entries(outputs))if(!existsSync(join(root,path))||readFileSync(join(root,path),'utf8')!==artifacts[name])fail('Native schema generated artifact is missing or has drift: '+path);
    return {checked:true,written:false,outputs:{...outputs},receipt:stable};
  }
  current();
  for(const text of Object.values(artifacts))if(Buffer.byteLength(text)>512*1024)fail('Native schema artifact exceeds bounded output size');
  const targets=Object.values(outputs).map(path=>join(root,path));
  writer.preflight(needsImport?[...targets,join(root,sourceModule)]:targets);
  const patch=needsImport?readFileSync(new URL('./native-import.patch',import.meta.url)):null;
  if(needsImport&&hash(patch)!=='4ce9f0995f143d7d577301320dad2a45e191614d583aacdb6f603ce00113a826')fail('Native import patch differs from the exact reviewed js/src patch');
  if(needsImport)serializationWriterGit(root,['apply','--check','-'],patch);
  current();
  for(const [name,path]of Object.entries(outputs))writer.writeArtifact(join(root,path),artifacts[name],'.serialization-tmp-');
  for(const [name,path]of Object.entries(outputs))if(readFileSync(join(root,path),'utf8')!==artifacts[name])fail('Written native schema artifact could not be reopened exactly');
  if(needsImport) {
    current();
    writer.mutate([join(root,sourceModule)],()=>serializationWriterGit(root,['apply','-'],patch));
    if(hash(readFileSync(join(root,sourceModule)))!==plan.planned_native_source_sha256)fail('Native schema import differs from the reviewed interpreter-preserving patch');
  }
  return {checked:true,written:true,outputs:{...outputs},baselineNativeSourceSha256:hash(before),receipt:stable,appliedImport:applyImport};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.some(argument=>!['--write','--check','--apply-import'].includes(argument))||args.includes('--check')&&args.includes('--write'))fail('Usage: native-descriptor.mjs [--check | --write [--apply-import]]');
  const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
  const result=await produceNativeAffinityDescriptor({root,write:args.includes('--write'),applyImport:args.includes('--apply-import')});
  process.stdout.write(JSON.stringify(result)+'\n');
}
