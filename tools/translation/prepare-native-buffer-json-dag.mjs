// Source DATA proposal only. The old closed encoder and its producer stay exact.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteSourcePhases} from './concrete-phased-equations.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PROFILE='tools/translation/source-profiles/native-buffer-json-dag/source-rules.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function prepareNativeBufferJsonDag({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
 const profileSource=readFileSync(resolve(root,PROFILE),'utf8'),profile=JSON.parse(profileSource);
 assert.equal(profile.schema,'complete-native-buffer-json-DAG-source-rules-v1');
 assert.equal(profile.semanticAuthority,false);assert.equal(profile.runtimeAuthority,false);
 const before=readFileSync(resolve(root,profile.beforePath),'utf8');
 assert.equal(hash(before),profile.beforeSha256,'Complete original codec changed');
 const sequence=createRulePipeline(['language','repository'].map(phase=>({phase,
  rules:profile[phase+'Edits'].map(([old,next],at)=>exactLiteralSubstitutionRule(
   'javascript.native-buffer-json-DAG.'+phase+'.'+at+'.v1',old,next,'Complete original codec anchor differs')),
 })));
 const {value:after,trace}=sequence.run(before);assert.equal(hash(after),profile.afterSha256);
 let inverse=after;
 for(const [old,next]of [...profile.languageEdits,...profile.repositoryEdits].reverse()){
  assert.equal(inverse.split(next).length,2);inverse=inverse.replace(next,()=>old);
 }
 assert.equal(inverse,before);
 const equations=transportConcreteSourcePhases([{before,middle:after,after,language:'JavaScript'}]);
 const reconstructed=equations[0].after;assert.equal(reconstructed,after);
 const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,profile.afterPath),reconstructed);
 assert.equal(readFileSync(resolve(root,profile.beforePath),'utf8'),before);
 assert.equal(readFileSync(resolve(root,PROFILE),'utf8'),profileSource);
 return {schema:'complete-native-buffer-json-DAG-proposal-v1',path:profile.afterPath,
  before,middle:after,after,inverse,sequence:sequence.description,trace,equations,nativeBindings,
  typescript:ts.version,originalCodecChanged:false,originalDeadlinesChanged:false,
  productionExecutableGain:0,sourceAuthority:false,runtimeAuthority:false,
  receivingQualified:false,performanceQualified:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);assert.equal(rest.length,0);
 assert.ok(['--emit','--check','--write'].includes(mode),'Use --emit|--check|--write');
 const plan=prepareNativeBufferJsonDag();
 if(mode==='--check')assert.equal(readFileSync(resolve(ROOT,plan.path),'utf8'),plan.after);
 else if(mode==='--write')writeFileSync(resolve(ROOT,plan.path),plan.after);
 process.stdout.write(JSON.stringify(mode==='--emit'?plan:{path:plan.path,mode,
  typescript:plan.typescript,completeSourceChecked:true,originalCodecChanged:false,
  productionExecutableGain:0,runtimeAuthority:false,receivingQualified:false})+'\n');
}
