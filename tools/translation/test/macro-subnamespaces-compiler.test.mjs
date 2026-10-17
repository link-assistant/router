import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});
const program=result=>parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
const pins=[
  {file:'credential_acceptance',sha:'4a10a1e016936d2f4dd8fddc21ed400f8ed72794343b09d5bc2e779525231b10',owner:'AcceptanceFailure',methods:[['kind',3322,3413,'5db1342f07a3aa4ff9e4f27d3c8b0b277849c96e16f59446ef1126316c9ec6ce',['NotAttempted','ExchangeRejected','ExchangeUncertain','PersistenceUncertain','SuccessorRetained']],['phase',3419,3506,'44512b3bd9903704e721250f7b0d2fb6f91022b1cb7316602747a5dc367c7c66',['Preflight','Exchange','Persistence','Catalog','Promotion']]]},
  {file:'lefine',sha:'bb07ea2db551cc85bc19403bfd2c160f439d6c48fe7ffc49a1e0cad249dc2093',owner:'CatalogFailure',methods:[['kind',728,816,'94e8ab3912278b56a741af2f4053741defc93021345d921a7ad50cb154efc997',['CredentialRejected','RateLimited','Unavailable']]]},
  {file:'zai_coding_plan',sha:'47c521e6806fa8d543d939fd6b1751fb48b180874322cf0699957c9c85b79aa2',owner:'ZaiProbeFailure',methods:[['kind',1968,2057,'4e2b5cfeeca2ba823930b036d1e33887ff66f4a628e9bd68ae3d890a0de75364',['CredentialRejected','RateLimited','Unverified']]]},
];

test('four pinned original Copy field getters execute from full tracked files despite sibling bang-export uncertainty',async()=>{
  let checkedBodies=0,literalOutcomes=0;
  for(const pin of pins){
    const source=readFileSync(new URL(`../../../src/${pin.file}.rs`,import.meta.url),'utf8');assert.equal(hash(source),pin.sha);
    const methods=extractImplDeclarations(source).implementations.flatMap(impl=>impl.methods);
    for(const [name,start,end,digest] of pin.methods){assert.ok(methods.some(method=>method.name===name&&method.span.start===start&&method.span.end===end));assert.equal(hash(source.slice(start,end)),digest);}
    const root=`mod ${pin.file}; mod uncertain; pub fn text()->String{format!("standard")}`;
    const result=project({'src/lib.rs':root,[`src/${pin.file}.rs`]:source,'src/uncertain.rs':'#[derive(Unproved)] struct Auxiliary;'});
    const rootScope=result.meta.bindingEvidence.scopes.find(scope=>scope.path.length===0);
    assert.equal(rootScope.unresolvedBangMacroScope,true);assert.equal(rootScope.unresolvedAttributeMacroScope,false);
    assert.equal(result.meta.executable.some(entry=>entry.name==='text'),false,'unknown bang expansion still blocks format');
    const checked=program(result),target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));let aliases='';const runs=[];
    for(const [name,start,end,,variants] of pin.methods){
      const semanticName=`${pin.file}.${pin.owner}.${name}`;
      assert.ok(result.meta.checkedMethods.some(method=>method.name===semanticName&&method.span.start===start&&method.span.end===end),semanticName);
      const entry=[...checked.declarations.values()].find(entry=>entry.impl?.method===name&&entry.modulePath.join('.')===pin.file);
      assert.ok(entry,semanticName);const emitted=target.declarations.get(`rp_${Buffer.from(entry.fullName).toString('hex')}`);assert.ok(emitted);
      assert.equal(entry.params[0].type.rustReference.kind,'shared');
      const alias=`original_${name}`;aliases+=`\nexport {${emitted.name} as ${alias}};`;runs.push({alias,name,variants});checkedBodies++;
    }
    await verifyTypedTargets({...result,javascript:result.javascript+aliases,typescript:result.typescript+aliases},(_api,_result,module)=>{
      for(const {alias,name,variants} of runs)for(const variant of variants){
        const expected=Object.freeze({$:variant}),record=Object.freeze({$:pin.owner,kind:name==='kind'?expected:Object.freeze({$:'NotAttempted'}),...(pin.owner==='AcceptanceFailure'?{phase:name==='phase'?expected:Object.freeze({$:'Preflight'}),transaction_id:Object.freeze({$:'None'})}:{}),message:'fixture'});
        assert.strictEqual(module[alias](record),expected);literalOutcomes++;
      }
      for(const {alias} of runs)assert.throws(()=>module[alias]({$:pin.owner,kind:{$:'Wrong'},...(pin.owner==='AcceptanceFailure'?{phase:{$:'Preflight'},transaction_id:{$:'None'}}:{}),message:'fixture'}),TypeError);
    });
    assert.equal(result.meta.runtimeParity,false);
  }
  assert.equal(checkedBodies,4);assert.equal(literalOutcomes,32,'16 literal source outcomes in both targets');
});

test('actual bang Copy names permit source derives while the bang invocation itself remains unresolved',async()=>{
  const result=project({'src/lib.rs':'macro_rules! Copy {()=>{false}} macro_rules! Clone {()=>{false}} #[derive(Clone,Copy)] pub enum Kind{Ready} pub struct Record{kind:Kind} impl Record{pub fn kind(&self)->Kind{self.kind}} pub fn bad()->bool{Copy!()}'});
  assert.ok(result.meta.checkedMethods.some(method=>method.name==='Record.kind'));
  assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false);
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),entry=[...target.declarations.values()].find(entry=>entry.impl?.method==='kind'),alias=`\nexport {${entry.name} as originalKind};`;
  await verifyTypedTargets({...result,javascript:result.javascript+alias,typescript:result.typescript+alias},(_api,_result,module)=>{const expected=Object.freeze({$:'Ready'});assert.strictEqual(module.originalKind(Object.freeze({$:'Record',kind:expected})),expected);});
});

test('unknown local derive provenance globs item macros and duplicate imports still refuse Copy getters',()=>{
  const body='#[derive(Clone,Copy)] pub enum Kind{Ready} pub struct Record{kind:Kind} impl Record{pub fn kind(&self)->Kind{self.kind}}';
  for(const prefix of ['#[unknown] struct Auxiliary;','#[derive(Unproved)] struct Auxiliary;','use unknown::*;','inject_items!();','use unknown::Copy;','use unknown::Copy; use other::Copy;']){
    const result=project({'src/lib.rs':prefix+body});assert.equal(result.meta.checkedMethods.some(method=>method.name==='Record.kind'),false,prefix);
  }
});
