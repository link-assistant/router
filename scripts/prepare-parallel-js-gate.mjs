// Complete workflow SOURCE proposal; no check result or Rust permission.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Parallel JavaScript gate source: '+message);};
const PLANS=[
 {id:'translation',parts:['tests','canonical','owned-definitions'],commands:[
  ['tests','node scripts/run-node-tests.mjs --outer-timeout-ms=3600000 --test-concurrency=2 tools/translation/test/*.test.mjs tools/translation/serialization-schema/*.test.mjs'],
  ['canonical','node scripts/translate-router-flat-native-owned-field-meta.mjs --retain-output-text --check'],
  ['owned-definitions','node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --check']
 ]},
 {id:'profile-matrix',parts:['canonical','owned-definitions'],commands:[
  ['canonical','node scripts/translate-router-flat-native-owned-field-meta.mjs --retain-output-text --profile-matrix --check'],
  ['owned-definitions','node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --profile-matrix --check']
 ]}
];
function rewrite(source,edits){let after=source,end=source.length+1;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(edit.span[1]>end||after.slice(...edit.span)!==edit.expected)fail('native source span differs');after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);end=edit.span[0];}return after;}
function inverse(after,edits){let offset=0;const mapped=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(edit=>{const start=edit.span[0]+offset;offset+=edit.replacement.length-edit.expected.length;return {span:[start,start+edit.replacement.length],expected:edit.replacement,replacement:edit.expected};});return {source:rewrite(after,mapped),edits:mapped};}
export async function prepareParallelJavaScriptGate({root=ROOT}={}){
 root=resolve(root);const path='.github/workflows/javascript-first.yml',current=readFileSync(resolve(root,path),'utf8'),require=createRequire(resolve(root,'scripts/ci/package.json')),{parseDocument,Parser,CST,isMap,isScalar,isSeq}=require('yaml'),{readCurrentFixedNineDraftWorkflowSources}=await import(pathToFileURL(resolve(root,'scripts/fixed-nine-draft-policy.mjs'))),currentPacket=readCurrentFixedNineDraftWorkflowSources({root}),history=currentPacket.currentWorkflowSourceEvolution;const before=history?.parallelismSourceLayer?.source??current;if(history&&history.after!==current)fail('complete actual source history differs');
 function grammar(source){if(typeof source!=='string'||source.length>524288)fail('complete workflow source bound');const doc=parseDocument(source,{version:'1.2',uniqueKeys:true,keepSourceTokens:true});if(doc.errors.length)fail('native YAML grammar differs');return doc;}
 function concrete(source){const document=grammar(source),tokens=[...new Parser().parse(source)],wire=JSON.stringify({schema:'fixed-nine-native-yaml-CST-v1',source,tokens});if(wire.length>4194304)fail('complete YAML CST bound');const fresh=JSON.parse(wire);if(fresh.source!==source||fresh.tokens.map(token=>CST.stringify(token)).join('')!==source)fail('complete serialized/reparsed CST inverse differs');return {source,meta:wire,document};}
 const first=concrete(before),beforeData=first.document.toJS(),expected=JSON.parse(JSON.stringify(beforeData)),languageEdits=[],repositoryEdits=[],selection=[];
 const stages=['lint','node-tests','bun-tests','typescript','parity','translation','profile-matrix','reverse-translation'];if(stages.some(id=>!beforeData.jobs?.[id])||!Array.isArray(beforeData.jobs?.complete?.needs)||JSON.stringify([...beforeData.jobs.complete.needs].sort())!==JSON.stringify([...stages].sort()))fail('all eight original stages and exact aggregate dependencies required');
 for(const plan of PLANS){
  const job=first.document.getIn(['jobs',plan.id],true),steps=job?.get('steps',true),timeout=job?.get('timeout-minutes',true);if(!isMap(job)||!isSeq(steps)||!isScalar(timeout)||timeout.value!==60||job.has('strategy'))fail('complete original bounded job required: '+plan.id);
  const position=before.indexOf('\n',timeout.range[1])+1;if(position<=0)fail('complete timeout line required');const strategy='    strategy:\n      fail-fast: false\n      matrix:\n        part: ['+plan.parts.join(', ')+']\n';languageEdits.push({span:[position,position],expected:'',replacement:strategy});expected.jobs[plan.id].strategy={'fail-fast':false,matrix:{part:plan.parts}};
  for(const [part,command]of plan.commands){
   const candidates=steps.items.map((step,index)=>({step,index,run:step.get?.('run',true)})).filter(row=>isScalar(row.run)&&row.run.value===command);if(candidates.length!==1||candidates[0].step.items.length!==1)fail('one complete original mandatory command required');const {run,index}=candidates[0],start=before.lastIndexOf('\n',run.range[0])+1,old=before.slice(start,run.range[0]);if(old!=='      - run: ')fail('complete original plain run prefix required');const condition="${{ matrix.part == '"+part+"' }}",edit={span:[start,run.range[0]],expected:old,replacement:'      - if: '+condition+'\n        run: '};repositoryEdits.push(edit);expected.jobs[plan.id].steps[index].if=condition;selection.push({job:plan.id,part,command,originalStep:index,edit});
  }
  if(plan.id==='translation'){
   const uploads=steps.items.map((step,index)=>({step,index})).filter(row=>row.step.get?.('uses')==='actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');if(uploads.length!==1)fail('one complete original deadline uploader required');const {step,index}=uploads[0],condition=step.get('if',true),value="${{ always() && matrix.part == 'tests' }}";if(!isScalar(condition)||condition.value!=='${{ always() }}'||before.slice(...condition.range.slice(0,2))!==condition.value)fail('complete original always-retained upload condition required');repositoryEdits.push({span:condition.range.slice(0,2),expected:condition.value,replacement:value});expected.jobs[plan.id].steps[index].if=value;
  }
 }
 const {createRulePipeline}=await import(pathToFileURL(resolve(root,'tools/translation/rule-pipeline.mjs'))),mappedRepository=repositoryEdits.map(edit=>{const offset=languageEdits.filter(row=>row.span[0]<=edit.span[0]).reduce((sum,row)=>sum+row.replacement.length,0);return {...edit,span:edit.span.map(at=>at+offset)};});let language;const run=createRulePipeline([{phase:'language',rules:[{id:'yaml:separate-complete-independent-command-processes',apply:source=>language=rewrite(source,languageEdits)}]},{phase:'repository',rules:[{id:'router:require-every-fixed-matrix-member-and-test-evidence',apply:source=>rewrite(source,mappedRepository)}]}]).run(before),after=run.value,last=concrete(after),back=inverse(after,[...languageEdits,...repositoryEdits]);assert.deepEqual(last.document.toJS(),expected);if(back.source!==before||inverse(language,languageEdits).source!==before||inverse(after,mappedRepository).source!==language)fail('whole original workflow or phase inverse differs');
 // All original jobs, source checks, tests, full matrix commands, timeouts,
 // runtime pins and the unchanged eight-result aggregate remain present.
 for(const plan of PLANS)for(const [part,command]of plan.commands){const count=expected.jobs[plan.id].strategy.matrix.part.filter(value=>value===part).length;if(count!==1||!expected.jobs[plan.id].steps.some(step=>step.run===command&&step.if==="${{ matrix.part == '"+part+"' }}"))fail('every full command must execute in exactly one required matrix member');}
 const middle=concrete(language);if(readFileSync(resolve(root,path),'utf8')!==current)fail('complete actual workflow changed');
 return {schema:'parallel-javascript-gate-source-proposal-v1',path,before,language,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.meta,afterMeta:last.meta,inverse:back.source,nativeInverseEdits:back.edits,languageEdits,repositoryEdits,selection,trace:run.trace,stages:[{phase:'language',before,after:language,beforeMeta:first.meta,afterMeta:middle.meta,inverse:before,completeInverse:true},{phase:'repository',before:language,after,beforeMeta:middle.meta,afterMeta:last.meta,inverse:language,completeInverse:true}],allOriginalCommandsRequired:true,allEightStagesRetained:true,originalTimeoutsUnchanged:true,cancelSiblingJobs:false,rustAuthority:false,performanceQualified:false,defaultWritesAllowed:false};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,rootArgument,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--check'].includes(mode))fail('use --emit|--check [ROOT]');const plan=await prepareParallelJavaScriptGate({root:rootArgument??ROOT});if(mode==='--check'){if(plan.current!==plan.after)fail('parallel JavaScript gate source is stale');console.log('Complete parallel JavaScript gate source equations are current.');}else console.log(JSON.stringify(plan));
}
