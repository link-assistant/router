import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {prepareOwnedFieldGateAdoption,assertOwnedFieldGateInputsFresh} from '../prepare-owned-field-gate-adoption.mjs';
import {auditWorkflows,STAGES} from '../check-js-first-workflows.mjs';
import {stages} from '../check-js-first-local.mjs';
import {translationTimeoutMs} from '../parity-check-budgets.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
const require=createRequire(new URL('../ci/package.json',import.meta.url)),yaml=require('yaml'),root=resolve(fileURLToPath(new URL('../../',import.meta.url))),hash=value=>createHash('sha256').update(value).digest('hex');
const original=['node scripts/translate-router.mjs --check','node scripts/translate-router.mjs --profile-matrix --check'];
const current=original.map(value=>value.replace('translate-router.mjs','translate-router-owned-field-meta.mjs'));
const documents=()=>Object.fromEntries(readdirSync(join(root,'.github/workflows')).filter(name=>/\.ya?ml$/u.test(name)).map(name=>[name,readFileSync(join(root,'.github/workflows',name),'utf8')]));
function temporary(t){const path=mkdtempSync(join(tmpdir(),'router-owned-field-gate-'));t.after(()=>rmSync(path,{recursive:true,force:true}));return path;}

test('complete six-file gate proposal retains both native CST phases whole inverses and every physical source fence',{timeout:60000},()=>{
 const proposal=prepareOwnedFieldGateAdoption({root});assert.equal(proposal.files.length,6);assert.equal(proposal.fullForwardQualified,false);assert.equal(proposal.installed,false);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.fixedNineDraftPolicyRequired,false);
 for(const row of proposal.files){assert.equal(row.current,row.text,'receiving requires actual installed exact afterimages');assert.equal(row.inverse,row.source);assert.equal(row.sha256,hash(row.text));assert.deepEqual(row.trace.map(step=>step.phase),['language','repository']);
  for(const stage of row.stages){assert.equal(stage.inverse,stage.source);let restored=stage.text;for(const edit of [...stage.edits].reverse()){assert.equal(restored.slice(edit.afterStart,edit.afterEnd),edit.after);restored=restored.slice(0,edit.afterStart)+edit.before+restored.slice(edit.afterEnd);}assert.equal(restored,stage.source);
   for(const [source,wire]of [[stage.source,stage.beforeMeta],[stage.text,stage.afterMeta]]){if(row.path.endsWith('.yml')){const data=JSON.parse(wire);assert.equal(data.source,source);assert.equal(data.tokens.map(token=>yaml.CST.stringify(token)).join(''),source);}else assert.equal(transportConcreteSyntaxMeta(wire).source,source);}
  }
 }
 assert.equal(assertOwnedFieldGateInputsFresh(proposal),true);for(const path of [...proposal.protectedPaths,...proposal.callerPaths]){const input=proposal.inputs.find(row=>row.path===path);assert.ok(input,path);assert.equal(readFileSync(join(root,path),'utf8'),input.source);assert.equal(proposal.files.some(row=>row.path===path),false);}
});

test('the same complete eight CI and seven local stages select field storage and retain every owned-definition check',{timeout:60000},()=>{
 const gate=yaml.parse(documents()['javascript-first.yml']);assert.equal(STAGES.length,8);assert.equal(stages.length,7);assert.deepEqual(auditWorkflows(documents()),[]);
 const translation=stages.find(([name])=>name==='translation')[1];for(const command of current)assert.equal(translation.filter(value=>value===command).length,1);for(const command of original)assert.equal(translation.includes(command),false);
 const required=[['translation','node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --check'],['profile-matrix','node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --profile-matrix --check']];
 for(const [stage,command]of required){assert.ok(translation.includes(command));assert.ok(gate.jobs[stage].steps.some(step=>step.run===command));assert.equal(Object.hasOwn(gate.jobs[stage],'if'),false);assert.equal(gate.jobs[stage]['timeout-minutes'],60);}
 assert.equal(translationTimeoutMs,1200000);assert.deepEqual([...gate.jobs.complete.needs].sort(),[...STAGES].sort());
});

test('whole workflow audit rejects legacy storage fallback skip aliases and conditional or ignored field checks',{timeout:60000},()=>{
 for(const [index,stage]of ['translation','profile-matrix'].entries())for(const replacement of [original[index],'echo green',current[index]+' --skip',current[1-index],current[index].replace('--check','--owned-core-definitions --check')]){
  const sources=documents(),gate=yaml.parse(sources['javascript-first.yml']),step=gate.jobs[stage].steps.find(row=>row.run===current[index]);assert.ok(step);step.run=replacement;sources['javascript-first.yml']=yaml.stringify(gate);assert.ok(auditWorkflows(sources).some(error=>error.includes('missing mandatory command')));
 }
 for(const [index,stage]of ['translation','profile-matrix'].entries())for(const mutate of [step=>{step.if='${{ false }}';},step=>{step['continue-on-error']=true;}]){const sources=documents(),gate=yaml.parse(sources['javascript-first.yml']);mutate(gate.jobs[stage].steps.find(row=>row.run===current[index]));sources['javascript-first.yml']=yaml.stringify(gate);assert.ok(auditWorkflows(sources).some(error=>error.includes('cannot be conditional or ignore failures')));}
});

test('independent profile typing reverse freshness same-SHA aggregate and fatal downstream guards remain mandatory',{timeout:60000},()=>{
 const baseline=documents();for(const [stage,command]of [['typescript','node scripts/check-profile-typescript.mjs'],['typescript','node scripts/check-owned-definition-typescript.mjs'],['reverse-translation','node scripts/regenerate-js-first.mjs --check'],['reverse-translation','node scripts/regenerate-js-first.mjs --owned-core-definitions --profile-matrix --check']]){const sources={...baseline},gate=yaml.parse(sources['javascript-first.yml']);gate.jobs[stage].steps=gate.jobs[stage].steps.filter(step=>step.run!==command);sources['javascript-first.yml']=yaml.stringify(gate);assert.ok(auditWorkflows(sources).some(error=>error.includes('missing mandatory command')));}
 for(const [name,source]of Object.entries(baseline)){if(name==='javascript-first.yml')continue;const parsed=yaml.parse(source);for(const [id]of Object.entries(parsed.jobs)){if(id==='javascript')continue;const sources={...baseline},workflow=yaml.parse(source);workflow.jobs[id].if='always()';sources[name]=yaml.stringify(workflow);assert.ok(auditWorkflows(sources).some(error=>error.includes('explicit JavaScript success dependency missing')),name+'/'+id);}}
 const sources={...baseline},gate=yaml.parse(sources['javascript-first.yml']);gate.jobs.complete.steps[0].run='echo all green';sources['javascript-first.yml']=yaml.stringify(gate);assert.ok(auditWorkflows(sources).some(error=>error.includes('reject skipped')));
});

test('proposal refuses replaced command owners and changed original parity argv budgets without writing any source',{timeout:60000},t=>{
 const directory=temporary(t),paths=['.github/workflows/javascript-first.yml','scripts/check-js-first-local.mjs','scripts/check-js-first-workflows.mjs','scripts/check-router-parity.mjs','scripts/test/check-js-first-workflows.test.mjs','scripts/test/check-js-first-local.test.mjs'];
 for(const path of paths){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),readFileSync(join(root,path)));}
 const parity=readFileSync(join(directory,'scripts/check-router-parity.mjs'),'utf8'),changed=parity.replace('timeout: translationTimeoutMs','timeout: 999999999');assert.notEqual(changed,parity);writeFileSync(join(directory,'scripts/check-router-parity.mjs'),changed);assert.throws(()=>prepareOwnedFieldGateAdoption({root:directory}),/original complete parity argv\/budget differs/);assert.equal(readFileSync(join(directory,'scripts/check-router-parity.mjs'),'utf8'),changed);
 writeFileSync(join(directory,'scripts/check-router-parity.mjs'),parity);const local=readFileSync(join(directory,'scripts/check-js-first-local.mjs'),'utf8');writeFileSync(join(directory,'scripts/check-js-first-local.mjs'),local.replace(current[0],'echo unproved'));assert.throws(()=>prepareOwnedFieldGateAdoption({root:directory}),/complete native command census differs/);
});

test('whole physical input reread rejects a late byte corruption rather than trusting a copied source digest',{timeout:60000},t=>{
 const directory=temporary(t),path='complete.mjs',source='// full source Ω😀\n';writeFileSync(join(directory,path),source);const inputs=[{path,source,sha256:hash(source),bytes:Buffer.byteLength(source)}];assert.equal(assertOwnedFieldGateInputsFresh({root:directory,inputs}),true);writeFileSync(join(directory,path),source+' ');assert.throws(()=>assertOwnedFieldGateInputsFresh({root:directory,inputs}),/complete physical input changed/);inputs[0].sha256=hash(source+' ');assert.throws(()=>assertOwnedFieldGateInputsFresh({root:directory,inputs}),/complete physical input changed/);
});
