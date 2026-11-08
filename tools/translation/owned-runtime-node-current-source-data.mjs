// Fresh Node source DATA for Bun composers. No Bun runtime identity is issued.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const producer=new URL('./prepare-owned-runtime-import-current.mjs',import.meta.url);
const profile='tools/translation/source-profiles/owned-runtime-import-edges/';
const paths=['tools/translation/prepare-owned-runtime-import-current.mjs',profile+'complete-original-inputs.json.gz',profile+'runtime-import-frame.mjs.txt',profile+'native-loader-identity.mjs.txt',
 'tools/translation/js-to-rust/owned-core-source.mjs','scripts/regenerate-js-first.mjs','tools/translation/js-to-rust/vendor/module-syntax.mjs','tools/translation/js-to-rust/native-typescript.mjs','tools/translation/prepare-native-regeneration-batch.mjs','tools/translation/source-profiles/native-regeneration-batch/original.mjs.gz','tools/translation/prepare-runtime-import-current-sources.mjs','tools/translation/prepare-owned-runtime-import-edges.mjs','tools/translation/concrete-sequential-equations.mjs','tools/translation/concrete-sequential-phases.mjs','tools/translation/private-parser-sequential-phases.mjs'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Owned runtime Node source DATA: '+message);};
export function freshNodeRuntimeImportSourceData(root){
 if(typeof process.versions.bun!=='string')fail('explicit Bun source composer required');
 root=resolve(root);
 const ts=ownershipCompiler(),require=createRequire(resolve(root,'js/package.json'));
 if(ts!==require('typescript')||ts.version!=='5.9.3')fail('actual installed TypeScript 5.9.3 required');
 const compiler=require.resolve('typescript'),compilerBytes=readFileSync(compiler);
 if(compilerBytes.length!==9112572||hash(compilerBytes)!=='3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675')fail('complete compiler source differs');
 const inputs=paths.map(path=>({path,bytes:readFileSync(resolve(root,path))}));
 // The original producer performs all original native selections, CST edits,
 // compiler function-source checks and physical joins in its genuine Node host.
 const script="import {gzipSync} from 'node:zlib';import {prepareOwnedRuntimeImportEdges} from "+JSON.stringify(producer.href)+";if(process.versions.bun)throw TypeError('Node source DATA requires Node');process.stdout.write(gzipSync(JSON.stringify(prepareOwnedRuntimeImportEdges({root:"+JSON.stringify(root)+"}))));";
 const packed=execFileSync(process.env.ROUTER_TRANSLATION_NODE??'node',['--max-old-space-size=512','--input-type=module','--eval',script],{maxBuffer:16*1024*1024,timeout:50000});
 const raw=gunzipSync(packed,{maxOutputLength:256*1024*1024}),plan=JSON.parse(raw.toString('utf8'));
 if(plan.schema!=='owned-runtime-import-parent-link-source-v1'||plan.typescriptVersion!=='5.9.3'||plan.semanticAuthority!==false||plan.runtimeExecuted!==false||plan.performanceQualified!==false||plan.files.length!==4)fail('complete original source-only plan required');
 if(plan.nativeCompiler.source!==compilerBytes.toString('utf8')||plan.nativeCompiler.sha256!==hash(compilerBytes))fail('complete native compiler source join differs');
 for(const origin of plan.nativeCompiler.origins){
  if(plan.nativeCompiler.source.slice(...origin.span)!==origin.source)fail('complete original compiler callable span differs');
 }
 const originals=JSON.parse(gunzipSync(inputs[1].bytes,{maxOutputLength:262144}).toString('utf8')).files;
 if(originals.length!==4||plan.inputs.length!==4)fail('complete original source domain differs');
 if(new Set(plan.files.map(row=>row.path)).size!==4||plan.files.some(row=>!originals.some(value=>value.path===row.path)))fail('complete unique original file domain required');
 for(let at=0;at<4;at++){
  const row=plan.files[at],original=originals.find(value=>value.path===row.path);
  if(!original||row.before!==original.source||row.inverse!==row.before||row.beforeSha256!==hash(row.before)||row.afterSha256!==hash(row.after)||row.current!==readFileSync(resolve(root,row.path),'utf8'))fail('complete original/current source join differs');
  if(JSON.stringify(plan.inputs.find(value=>value.path===row.path))!==JSON.stringify(original))fail('complete archived input row differs');
  if(row.stages.length!==2||row.stages[0].phase!=='language'||row.stages[1].phase!=='repository'||row.stages[0].after!==row.language)fail('both original source phases required');
  let previous=row.before;
  for(const stage of row.stages){
   if(stage.before!==previous||stage.completeInverse!==true||transportConcreteSyntaxMeta(stage.beforeMeta).source!==stage.before||transportConcreteSyntaxMeta(stage.afterMeta).source!==stage.after)fail('complete serialized source phase differs');
   previous=stage.after;
  }
  if(previous!==row.after||transportConcreteSyntaxMeta(row.beforeMeta).source!==row.before||transportConcreteSyntaxMeta(row.afterMeta).source!==row.after)fail('complete serialized source equation differs');
  for(const source of [row.before,row.language,row.after]){
   if(ts.createSourceFile(row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)fail('complete receiving native syntax differs');
  }
 }
 for(const input of inputs)if(!readFileSync(resolve(root,input.path)).equals(input.bytes))fail('complete physical input changed during fresh child');
 if(!readFileSync(compiler).equals(compilerBytes))fail('complete compiler source changed during fresh child');
 return plan;
}
