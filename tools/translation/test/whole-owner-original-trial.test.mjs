import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {prepareWholeOwnerOriginalTrial} from '../prepare-whole-owner-original-trial.mjs';
import {proposeWholeOwnerCanonicalTrial,assertWholeOwnerTrialInputs,wholeOwnerTrialFilePacket,decodeWholeOwnerTrialFilePacket} from '../whole-owner-trial-support.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),hash=value=>createHash('sha256').update(value).digest('hex'),CODEC='tools/translation/builtin-source-meta.mjs',BANG='tools/translation/derive-bang-context.mjs';
const originalTest=()=>readFileSync(new URL('./derive-bang-context.test.mjs',import.meta.url),'utf8');
const fact=(path,bytes)=>({path,mode:0o644,bytes:bytes.length,sha256:hash(bytes)});
const fixtures=()=>[{path:CODEC,candidate:'complete candidate codec'},{path:BANG,candidate:'complete candidate creator'}];

test('whole source runner copies the actual original bounded archive and complete Node Bun joins with full CST inverses',{timeout:60000},()=>{
 const plan=prepareWholeOwnerOriginalTrial({root}),row=plan.files[0];assert.equal(plan.productionSelected,false);assert.equal(plan.originalTestChanged,false);assert.equal(plan.originalLimitsChanged,false);assert.equal(plan.performanceQualified,false);assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
 assert.equal(row.before,readFileSync(new URL('../prepare-builtin-canonical-trial.mjs',import.meta.url),'utf8'));assert.deepStrictEqual(row.changes.map(item=>item.name),['proposeCanonicalDeriveTrial','canonicalTrialFilePacket','decodeCanonicalTrialFilePacket','prepareCanonicalDeriveTrial','verifyCanonicalDeriveTrial']);
 for(const preserved of row.preserved)assert.equal(preserved.inverse,preserved.original);
 for(const name of ['discoverCanonicalTrialInputs','preflightCanonicalTrialPaths','canonicalTrialCases','joinCanonicalTrialCases','joinCanonicalTrialNode','joinCanonicalTrialBun','runCanonicalDeriveTrialNode'])assert.ok(row.preserved.some(item=>item.name===name));
 assert.match(row.after,/substitutions!==proposal\.overlays\.length/u);assert.match(row.after,/384\*1024\*1024/u);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);
});

test('actual finite proposal routes the physical original creator to the fresh additive operation and preserves the complete original twelve',{timeout:60000},()=>{
 const testBefore=originalTest(),creatorBefore=readFileSync(new URL('../derive-bang-context.mjs',import.meta.url),'utf8'),plan=proposeWholeOwnerCanonicalTrial({root});assert.equal(plan.productionSelected,false);assert.equal(plan.performanceQualified,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.originalTestUnchanged,true);
 assert.deepStrictEqual(plan.overlays.map(row=>row.path),[CODEC,BANG]);assert.equal(plan.test.source,testBefore);assert.equal(plan.test.sha256,'e3a53b40da1ec47965be2c21c063b4297f7394c00ffd827cd30715ee74756e0e');assert.equal(plan.test.cases.length,12);assert.deepStrictEqual(plan.test.cases.filter(row=>row.deadline.kind==='finite-source-deadline').map(row=>row.deadline.milliseconds),[60000,60000]);
 const bang=plan.overlays[1];assert.equal(bang.original,creatorBefore);assert.equal(bang.inverse,creatorBefore);assert.notEqual(bang.candidate,bang.original);assert.equal(bang.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(bang.sequence.languageRules.length,1);assert.equal(bang.sequence.repositoryRules.length,1);
 const ts=ownershipCompiler(),file=ts.createSourceFile(BANG,bang.candidate,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),creator=file.statements.find(row=>ts.isFunctionDeclaration(row)&&row.name?.text==='createDeriveBangContext');assert.equal(creator.body.getText(file),'{return createWholeOwnerDeriveBangContext({deriveContext});}');assert.ok(file.statements.some(row=>ts.isFunctionDeclaration(row)&&row.name?.text==='createWholeOwnerDeriveBangContext'));assert.ok(file.statements.some(row=>ts.isFunctionDeclaration(row)&&row.name?.text==='createUnscopedDeriveBangContext'));
 const vector={files:[...plan.requiredSourceInputs]};for(const row of plan.overlays)if(!vector.files.some(item=>item.path===row.path))vector.files.push(fact(row.path,Buffer.from(row.original)));assertWholeOwnerTrialInputs(vector,plan);
 const corrupt=structuredClone(vector);corrupt.files.find(row=>row.path.endsWith('whole-owner-original-derive-trial.mjs')).sha256='0'.repeat(64);assert.throws(()=>assertWholeOwnerTrialInputs(corrupt,plan),/candidate input absent/u);
 assert.equal(originalTest(),testBefore);assert.equal(readFileSync(new URL('../derive-bang-context.mjs',import.meta.url),'utf8'),creatorBefore);
});

test('two-overlay wire packets retain every original byte once and complete candidate bytes with independent gzip reconstruction',{timeout:60000},()=>{
 const overlays=fixtures();for(const path of [CODEC,BANG,'tools/translation/test/derive-bang-context.test.mjs']){
  const original=Buffer.from('full original source\0'+path),selected=overlays.find(row=>row.path===path),trial=selected?Buffer.from(selected.candidate):original,identity=fact(path,original),packet=wholeOwnerTrialFilePacket(identity,original,trial,{overlays}),parsed=JSON.parse(gunzipSync(gzipSync(JSON.stringify(packet)))),decoded=decodeWholeOwnerTrialFilePacket(parsed,identity,{overlays});
  assert.deepStrictEqual(parsed,packet);assert.deepStrictEqual(decoded.original,original);assert.deepStrictEqual(decoded.trial,trial);assert.equal(packet.original.base64,original.toString('base64'));assert.equal(packet.trial.sourceAssociation,selected?'complete-candidate-source':'same-original-source');assert.equal(Object.hasOwn(packet.trial,'base64'),!!selected);
 }
});

test('forged omitted aliased extra and corrupted physical source overlays cannot pass full source equations',{timeout:60000},()=>{
 const overlays=fixtures(),original=Buffer.from('full original codec'),identity=fact(CODEC,original),packet=wholeOwnerTrialFilePacket(identity,original,Buffer.from(overlays[0].candidate),{overlays});
 for(const change of [row=>{row.original.mode=0o755;},row=>{row.original.sha256='0'.repeat(64);},row=>{row.original.base64+='\n';},row=>{row.trial.bytes++;},row=>{row.trial.sha256='0'.repeat(64);},row=>{row.trial.sourceAssociation='same-original-source';delete row.trial.base64;},row=>{row.trial.base64=original.toString('base64');},row=>{row.path=BANG;}]){const corrupt=structuredClone(packet);change(corrupt);assert.throws(()=>decodeWholeOwnerTrialFilePacket(corrupt,identity,{overlays}),/source packet equation differs/u);}
 for(const changed of [overlays.slice(1),[...overlays,{path:'extra.mjs',candidate:'extra'}],[overlays[0],{...overlays[1],path:CODEC}]])assert.throws(()=>decodeWholeOwnerTrialFilePacket(packet,identity,{overlays:changed}),/exact complete physical/u);
 assert.throws(()=>wholeOwnerTrialFilePacket(identity,original,original,{overlays}),/exact complete proposed overlays/u);assert.throws(()=>wholeOwnerTrialFilePacket(fact('unlisted.mjs',original),original,Buffer.from('changed'),{overlays}),/exact complete proposed overlays/u);
 const changed=structuredClone(overlays);changed[0].candidate+=' ';assert.throws(()=>decodeWholeOwnerTrialFilePacket(packet,identity,{overlays:changed}),/source packet equation differs/u);
});
