import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {json} from '../translate.mjs';
import {createConcreteSyntaxMeta,parseConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {planProjectMetaStorage,loadProjectMetaStorage,PROJECT_META_STORAGE_LIMITS} from '../project-meta-storage.mjs';
import {planRegeneration,applyRegenerationPlan} from '../bulk.mjs';
import {reviewTranslationDraft} from '../../../scripts/review-translation-draft.mjs';

const metaPath='tools/translation/projects/src/lib.meta.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
const vectorDirectory=process.env.ROUTER_CONCRETE_STORAGE_VECTORS;
function retain(name,value){if(vectorDirectory){mkdirSync(vectorDirectory,{recursive:true});writeFileSync(join(vectorDirectory,name+'.json'),json(value));}}
function fixture(){
  const source='\ufeff// Ω😀 retained\r\n'+Array.from({length:36},(_,at)=>`pub fn item_${at}(v:u8)->u8{v+${at}u8}`).join('\r\n');
  const document=createConcreteSyntaxMeta(source,{language:'Rust'});
  const logical={schema:'storage-concrete-test-v1',entry:'src/lib.rs',before:{value:7n},concreteSyntaxMeta:[{source:'src/lib.rs',document}],checkedSemanticProgram:{program:'x'.repeat(3000)},middle:'Ω😀',targetSemanticProgram:{program:'y'.repeat(3400)},after:new Map([['retained',true]])};
  const original=json(logical),fileBytes=Math.max(...['concreteSyntaxMeta','checkedSemanticProgram','targetSemanticProgram'].map(key=>Buffer.byteLength(json(logical[key]))))+512;
  assert.ok(fileBytes<Buffer.byteLength(original));
  const storageLimits={fileBytes,totalBytes:200000},plan=planProjectMetaStorage(metaPath,original,{storageLimits});
  const files=new Map(plan.components.map(row=>[row.path,row.text]));
  const targets={meta:metaPath,javascript:'out.mjs',typescript:'out.ts',...plan.targets};
  return {source,logical,original,storageLimits,plan,files,targets};
}
function load(f,{serialized=f.plan.text,files=f.files,targets=f.targets,read}={}){
  return loadProjectMetaStorage(serialized,{metaPath,targets,storageLimits:f.storageLimits,read:read??(name=>{assert.ok(files.has(name));return files.get(name);})});
}
function refused(call){let result;assert.throws(()=>{try{call();}catch(error){result={name:error.name,message:error.message};throw error;}});return result;}

test('complete concrete array is an independently bounded third component with exact logical order',{timeout:60000},()=>{
  const f=fixture(),loaded=load(f),wrapper=JSON.parse(f.plan.text);
  assert.deepEqual(f.plan.components.map(row=>row.field),['checkedSemanticProgram','targetSemanticProgram','concreteSyntaxMeta']);
  assert.deepEqual(Object.keys(f.plan.targets),['checkedProgramMeta','targetProgramMeta','concreteSyntaxMeta']);
  assert.equal(loaded.text,f.original);assert.deepEqual(Object.keys(loaded.meta),Object.keys(JSON.parse(f.original)));
  assert.equal(Object.hasOwn(wrapper.root,'concreteSyntaxMeta'),false);
  assert.equal(loaded.meta.concreteSyntaxMeta[0].document.source,f.source);
  for(const row of f.plan.components){assert.equal(row.text,json(JSON.parse(f.original)[row.field]));assert.equal(row.bytes,Buffer.byteLength(row.text));assert.equal(row.sha256,hash(row.text));assert.ok(row.bytes<=f.storageLimits.fileBytes);}
  retain('01-full-third-component',{...f,files:Object.fromEntries(f.files),loaded});
});

test('inline and legacy two-component formats retain their exact existing byte contracts',{timeout:60000},()=>{
  const f=fixture(),inline=planProjectMetaStorage(metaPath,f.original);assert.equal(inline.text,f.original);assert.deepEqual(inline.targets,{});
  const logical={...f.logical};delete logical.concreteSyntaxMeta;
  const original=json(logical),storageLimits={fileBytes:4000,totalBytes:20000},plan=planProjectMetaStorage(metaPath,original,{storageLimits});
  assert.deepEqual(plan.components.map(row=>row.field),['checkedSemanticProgram','targetSemanticProgram']);
  const targets={meta:metaPath,javascript:'out.mjs',typescript:'out.ts',...plan.targets};
  const loaded=loadProjectMetaStorage(plan.text,{metaPath,targets,storageLimits,read:name=>plan.components.find(row=>row.path===name).text});
  assert.equal(loaded.text,original);assert.equal(Object.hasOwn(loaded.meta,'concreteSyntaxMeta'),false);
  retain('02-inline-and-legacy',{inline,original,plan,loaded});
});

test('third-component omission ordering paths duplicate fields and unexpected inventory refuse',{timeout:60000},()=>{
  const f=fixture(),failures=[];
  for(const change of [value=>value.components.pop(),value=>value.components.reverse(),value=>value.components.push(value.components[2]),value=>{value.components[2].path='../outside.json';},value=>{value.root.concreteSyntaxMeta=[];}]){
    const wrapper=JSON.parse(f.plan.text);change(wrapper);failures.push({wrapper,error:refused(()=>load(f,{serialized:json(wrapper)}))});
  }
  for(const targets of [{...f.targets,concreteSyntaxMeta:'foreign.meta.json.parts/concreteSyntaxMeta.json'},{...f.targets,extra:'extra.json'},Object.fromEntries(Object.entries(f.targets).filter(([key])=>key!=='concreteSyntaxMeta'))]){
    let reads=0;const error=refused(()=>load(f,{targets,read(){reads++;return '';}}));assert.equal(reads,0);failures.push({targets,error,reads});
  }
  retain('03-complete-wrapper-refusals',{original:f.original,plan:f.plan,failures});
});

test('complete concrete bytes hash and original logical digest are checked independently',{timeout:60000},()=>{
  const f=fixture(),component=f.plan.components[2],files=new Map(f.files),failures=[];
  files.set(component.path,component.text.replace('retained','changed!'));failures.push(refused(()=>load(f,{files})));
  const wrapper=JSON.parse(f.plan.text),forged=JSON.parse(component.text);forged[0].document.source+=' ';
  const content=json(forged);files.set(component.path,content);wrapper.components[2].bytes=Buffer.byteLength(content);wrapper.components[2].sha256=hash(content);
  failures.push(refused(()=>load(f,{serialized:json(wrapper),files})));
  assert.match(failures[1].message,/logical metadata/);assert.equal(load(f).text,f.original);
  retain('04-component-and-logical-hash-refusals',{original:f.original,plan:f.plan,forgedWrapper:wrapper,forgedContent:content,failures});
});

test('concrete storage preserves existing maxima and lower bounds before component reads',{timeout:60000},()=>{
  const f=fixture(),failures=[];
  assert.deepEqual(PROJECT_META_STORAGE_LIMITS,{fileBytes:67108864,totalBytes:536870912});
  for(const storageLimits of [{fileBytes:67108865},{totalBytes:536870913},{fileBytes:5000,totalBytes:200000}])failures.push(refused(()=>planProjectMetaStorage(metaPath,f.original,{storageLimits})));
  let reads=0;failures.push(refused(()=>loadProjectMetaStorage(f.plan.text,{metaPath,targets:f.targets,storageLimits:{fileBytes:f.storageLimits.fileBytes,totalBytes:Buffer.byteLength(f.original)-1},read(){reads++;return '';}})));assert.equal(reads,0);
  retain('05-unchanged-and-lowered-bounds',{original:f.original,plan:f.plan,limits:PROJECT_META_STORAGE_LIMITS,failures,reads});
});

function repository(){
  const root=mkdtempSync(join(tmpdir(),'router-concrete-storage-')),source=Array.from({length:16},(_,at)=>`pub fn item_${at}(v:u8)->u8{v+${at}u8}`).join('\n');
  const write=(name,value)=>{mkdirSync(dirname(join(root,name)),{recursive:true});writeFileSync(join(root,name),value);};write('src/lib.rs',source);
  const git=args=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{cwd:root,encoding:'utf8',timeout:10000,env:{...process.env,GIT_AUTHOR_NAME:'Router fixture',GIT_AUTHOR_EMAIL:'fixture@example.invalid',GIT_COMMITTER_NAME:'Router fixture',GIT_COMMITTER_EMAIL:'fixture@example.invalid',GIT_AUTHOR_DATE:'2026-10-16T00:00:00Z',GIT_COMMITTER_DATE:'2026-10-16T00:00:00Z'}});
  git(['init','-q']);git(['add','src/lib.rs']);
  const plain=planRegeneration({root,sources:['src/lib.rs']});applyRegenerationPlan(plain);const original=readFileSync(join(root,metaPath),'utf8'),logical=JSON.parse(original),residue={...logical};
  for(const key of ['checkedSemanticProgram','targetSemanticProgram','concreteSyntaxMeta'])delete residue[key];
  const fileBytes=Math.max(Buffer.byteLength(json(residue))+1600,...['checkedSemanticProgram','targetSemanticProgram','concreteSyntaxMeta'].map(key=>Buffer.byteLength(json(logical[key]))))+128;
  assert.ok(fileBytes<Buffer.byteLength(original));const storageLimits={fileBytes,totalBytes:536870912};
  const plan=planRegeneration({root,sources:['src/lib.rs'],projectMetaStorageLimits:storageLimits});applyRegenerationPlan(plan);
  return {root,source,write,git,original,logical,storageLimits,plan,project:plan.manifest.projects[0],cleanup:()=>rmSync(root,{recursive:true,force:true})};
}

test('real bulk planning writes the whole CST sidecar and detects missing stale unexpected outputs',{timeout:60000},()=>{
  const f=repository();try{
    const path=f.project.targets.concreteSyntaxMeta;assert.ok(path);assert.ok(f.plan.outputs.some(row=>row.path===path));assert.deepEqual(applyRegenerationPlan(f.plan,{check:true}).failures,[]);
    const original=readFileSync(join(f.root,path)),extra=path+'.unexpected.json';rmSync(join(f.root,path));f.write(extra,'{}');const missing=applyRegenerationPlan(f.plan,{check:true}).failures;assert.ok(missing.includes('missing: '+path));assert.ok(missing.includes('unexpected: '+extra));
    f.write(path,'[]\n');const stale=applyRegenerationPlan(f.plan,{check:true}).failures;assert.ok(stale.includes('stale: '+path));applyRegenerationPlan(f.plan);assert.ok(readFileSync(join(f.root,path)).equals(original));assert.deepEqual(applyRegenerationPlan(f.plan,{check:true}).failures,[]);
    const loaded=loadProjectMetaStorage(readFileSync(join(f.root,metaPath)),{metaPath,targets:f.project.targets,read:name=>readFileSync(join(f.root,name)),storageLimits:f.storageLimits});assert.equal(loaded.text,f.original);assert.equal(loaded.meta.concreteSyntaxMeta[0].document.source,f.source);
    retain('06-real-bulk-component',{source:f.source,plan:f.plan,missing,stale,loaded});
  }finally{f.cleanup();}
});

test('independent draft reviewer reads exact Git CST baseline and current full components',{timeout:60000},()=>{
  const f=repository();try{
    const compiler='// bounded complete storage review fixture\n',inventoryPath='parity/rust-source-inventory.json';f.write('compiler.mjs',compiler);
    const inventory=JSON.parse(readFileSync(join(f.root,inventoryPath),'utf8'));inventory.implementationHashes={'compiler.mjs':hash(compiler)};f.write(inventoryPath,json(inventory));
    const path=f.project.targets.concreteSyntaxMeta,baselineHash=hash(readFileSync(join(f.root,path)));f.git(['add','.']);f.git(['commit','-qm','complete CST storage baseline']);const baseline=f.git(['rev-parse','HEAD']).trim();
    // Reorder complete pure declarations independently of CST transport. The
    // baseline CST sidecar remains the exact original, read from Git by role.
    const current=JSON.parse(f.original);for(const key of ['checkedSemanticProgram','targetSemanticProgram'])current[key].program.items.reverse();
    const plan=planProjectMetaStorage(metaPath,json(current),{storageLimits:f.storageLimits});f.write(metaPath,plan.text);for(const row of plan.components)f.write(row.path,row.text);
    const review=reviewTranslationDraft({root:f.root,baselineSha:baseline,projectMetaStorageLimits:f.storageLimits});assert.equal(review.baselineProjectInputs.find(row=>row.path===path).sha256,baselineHash);assert.equal(review.outputs.find(row=>row.path===path).sha256,baselineHash);assert.equal(review.projects.length,1);
    retain('07-exact-baseline-and-current-CST',{source:f.source,baseline,baselineHash,path,currentPlan:plan,review});
  }finally{f.cleanup();}
});

test('valid complete storage does not turn forged concrete authority into an accepted CST',{timeout:60000},()=>{
  const f=fixture(),logical=JSON.parse(f.original);logical.concreteSyntaxMeta[0].document.authority.executable=true;
  const original=json(logical),plan=planProjectMetaStorage(metaPath,original,{storageLimits:f.storageLimits}),files=new Map(plan.components.map(row=>[row.path,row.text]));
  const loaded=loadProjectMetaStorage(plan.text,{metaPath,targets:{...f.targets,...plan.targets},storageLimits:f.storageLimits,read:name=>files.get(name)});assert.equal(loaded.text,original);
  const error=refused(()=>parseConcreteSyntaxMeta(JSON.stringify(loaded.meta.concreteSyntaxMeta[0].document)));assert.match(error.message,/authority/);
  retain('08-storage-not-concrete-or-semantic-authority',{original,plan,loaded,error});
});
