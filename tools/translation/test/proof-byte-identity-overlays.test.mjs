import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {WHOLE_OWNER_PROOF_BYTE_PHYSICAL_PATHS} from '../current-whole-owner-proof-byte-provider.mjs';
import {assertWholeOwnerProofByteTrialInputs,wholeOwnerProofByteTrialFilePacket,decodeWholeOwnerProofByteTrialFilePacket} from '../whole-owner-proof-byte-trial-support.mjs';
import {deriveBatchedProofByteAdapterSources} from '../prepare-batched-proof-byte-source-candidate.mjs';
import {prepareWholeOwnerProofByteOriginalTrial} from '../prepare-whole-owner-proof-byte-original-trial.mjs';
import {proofByteIdentityOverlaySupportEdits,proofByteIdentityOverlayHarnessEdits} from '../proof-byte-identity-overlay-source.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const CODEC='tools/translation/builtin-source-meta.mjs',SUPPORT='tools/translation/whole-owner-proof-byte-trial-support.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const source=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
const fact=(path,bytes)=>({path,mode:0o644,bytes:Buffer.byteLength(bytes),sha256:hash(bytes)});
function fixture(){
 const overlays=[CODEC,...WHOLE_OWNER_PROOF_BYTE_PHYSICAL_PATHS].map((path,index)=>{const original='// complete original '+path+' 😀\r\n';return {path,original,candidate:index>=12?original:original+'// proposed consumer\n'};});
 const requiredSourceInputs=overlays.map(row=>fact(row.path,row.original));
 return {overlays,requiredSourceInputs};
}
function apply(source,edits){let result=source;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){assert.equal(result.slice(...row.span),row.expected);result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);}return result;}
const parse=(ts,path,text)=>ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);

test('all sixteen closure members retain exact packets including four unchanged physical members',{timeout:10000},()=>{
 const proposal=fixture();assert.equal(proposal.overlays.length,16);assert.equal(proposal.overlays.filter(row=>row.original===row.candidate).length,4);
 assertWholeOwnerProofByteTrialInputs({files:proposal.requiredSourceInputs},proposal);
 for(const row of proposal.overlays){
  const original=Buffer.from(row.original),trial=Buffer.from(row.candidate),input=fact(row.path,original);
  const packet=wholeOwnerProofByteTrialFilePacket(input,original,trial,proposal),roundTrip=JSON.parse(gunzipSync(gzipSync(Buffer.from(JSON.stringify(packet)))).toString('utf8'));
  assert.deepEqual(decodeWholeOwnerProofByteTrialFilePacket(roundTrip,input,proposal),{original,trial});
  assert.equal(packet.trial.sourceAssociation,'complete-candidate-source');assert.equal(packet.trial.base64,trial.toString('base64'));
 }
});
test('omitted duplicate foreign and unchanged-codec proposals remain refused',{timeout:10000},()=>{
 const proposal=fixture(),vector={files:proposal.requiredSourceInputs};
 const variants=[proposal.overlays.slice(1),[...proposal.overlays,proposal.overlays[0]],proposal.overlays.map((row,index)=>index===1?proposal.overlays[2]:row),proposal.overlays.map((row,index)=>index===1?{...row,path:'foreign.mjs'}:row),proposal.overlays.map((row,index)=>index===0?{...row,candidate:row.original}:row)];
 for(const overlays of variants)assert.throws(()=>assertWholeOwnerProofByteTrialInputs(vector,{...proposal,overlays}),/complete.*overlays/u);
 for(const files of [vector.files.slice(1),vector.files.map((row,index)=>index?row:{...row,sha256:'foreign'})])assert.throws(()=>assertWholeOwnerProofByteTrialInputs({files},proposal),/absent|join/u);
});
test('every physical member still requires both original and proposed bytes',{timeout:10000},()=>{
 const proposal=fixture();
 for(const row of proposal.overlays){
  const original=Buffer.from(row.original),trial=Buffer.from(row.candidate),input=fact(row.path,original);
  assert.throws(()=>wholeOwnerProofByteTrialFilePacket(input,original,Buffer.concat([trial,Buffer.from('\n')]),proposal),/exact/u);
  assert.throws(()=>wholeOwnerProofByteTrialFilePacket(input,Buffer.concat([original,Buffer.from('\n')]),trial,proposal),/original/u);
  if(!original.equals(trial))assert.throws(()=>wholeOwnerProofByteTrialFilePacket(input,original,original,proposal),/exact/u);
 }
 const original=Buffer.from('// unselected source\n'),input=fact('tools/translation/unselected-fixture.mjs',original),packet=wholeOwnerProofByteTrialFilePacket(input,original,original,proposal);
 assert.equal(packet.trial.sourceAssociation,'same-original-source');assert.deepEqual(decodeWholeOwnerProofByteTrialFilePacket(packet,input,proposal),{original,trial:original});
 assert.throws(()=>wholeOwnerProofByteTrialFilePacket(input,original,Buffer.from('foreign'),proposal),/exact/u);
});
test('unchanged members cannot disguise noncanonical packet fields or source bytes',{timeout:10000},()=>{
 const proposal=fixture(),row=proposal.overlays.at(-1),original=Buffer.from(row.original),input=fact(row.path,original),packet=wholeOwnerProofByteTrialFilePacket(input,original,original,proposal);
 for(const mutation of [{...packet,extra:true},{...packet,trial:{...packet.trial,sourceAssociation:'same-original-source'}},{...packet,trial:{...packet.trial,base64:Buffer.from('foreign').toString('base64')}},{...packet,original:{...packet.original,base64:Buffer.from('foreign').toString('base64')}},{...packet,trial:{...packet.trial,sha256:'foreign'}}])assert.throws(()=>decodeWholeOwnerProofByteTrialFilePacket(mutation,input,proposal),/equation|original/u);
});
test('actual native adapter equations preserve the archive and complete source inverse',{timeout:30000},()=>{
 const row=deriveBatchedProofByteAdapterSources().files.find(row=>row.path===SUPPORT);
 assert.equal(row.after,source(SUPPORT));assert.equal(apply(row.before,row.selection.edits),row.after);assert.equal(apply(row.after,row.selection.inverseEdits),row.before);
 assert.equal(row.selection.identityOverlays.nativeLexicalSymbolsChecked,true);assert.equal(row.selection.identityOverlays.codecMustChange,true);assert.equal(row.selection.originalBodiesUnchangedExceptDeclaredSourceCensus,false);
 assert.notEqual(row.previousDispatcher,row.after);assert.match(row.previousDispatcher,/row\.original===row\.candidate\|\|/u);
});
test('generated verifier counts actual changes while preserving whole original functions and CST inverses',{timeout:30000},()=>{
 const plan=prepareWholeOwnerProofByteOriginalTrial(),row=plan.files[0];
 assert.equal(row.current,row.after);assert.equal(apply(row.before,row.edits),row.after);assert.equal(apply(row.after,row.inverseEdits),row.before);
 assert.equal(row.identityOverlays.selection.allPhysicalByteChecksRetained,true);
 assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.trace.map(row=>row.phase),['language','repository']);
 for(const preserved of row.preserved)assert.equal(preserved.inverse,preserved.original,preserved.name);
 assert.match(source('tools/translation/whole-owner-resolver-original-derive-trial.mjs'),/substitutions!==proposal\.overlays\.length/u);
});
test('native selection refuses changed predicates and a captured codec binding',{timeout:30000},()=>{
 const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');const row=deriveBatchedProofByteAdapterSources().files.find(row=>row.path===SUPPORT);
 for(const text of [row.before.replace('row.original===row.candidate','row.original!==row.candidate'),row.before.replace('original.equals(trial)','original.equals(original)'),row.before.replace('function selected(overlays,path){',"function selected(overlays,path){const CODEC='foreign';")])assert.throws(()=>proofByteIdentityOverlaySupportEdits(ts,parse(ts,SUPPORT,text)),/required|captured/u);
 const path='tools/translation/whole-owner-resolver-original-derive-trial.mjs',text=source(path).replace('substitutions!==proposal.overlays.length','substitutions===proposal.overlays.length');
 assert.throws(()=>proofByteIdentityOverlayHarnessEdits(ts,parse(ts,path,text)),/required/u);
});
