import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {translateProject} from '../project.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser} from '../matches-macro-context.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {sourceDisplayStandardCandidate,sourceNominalDisplayClosure,sourceNominalDisplayClosureFacts} from '../format-display-source.mjs';
import {compileFormatSourceControlBodies,executeFormatSourceControlBodies,evaluateFormatSourceScalarExpression} from '../source-format-template.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const retain=(name,value)=>{if(process.env.ROUTER_DISPLAY_VECTOR_DIR){mkdirSync(process.env.ROUTER_DISPLAY_VECTOR_DIR,{recursive:true});writeFileSync(process.env.ROUTER_DISPLAY_VECTOR_DIR+'/'+name+'.json.gz',gzipSync(JSON.stringify(value,(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item)+'\n',{mtime:0}));}};
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
const declaration='#[derive(Clone,Copy)]pub enum Provider{First,Second}impl Provider{pub const fn as_str(self)->&\'static str{match self{Self::First=>"first",Self::Second=>"second"}}}';
const display='impl std::fmt::Display for Provider{fn fmt(&self,f:&mut std::fmt::Formatter<\'_>)->std::fmt::Result{f.pad(self.as_str())}}';
const call='pub fn show(provider:Provider)->String{format!("provider={provider};{provider}")}';
const source=declaration+display+call;
function formatNode(node){if(node?.k==='routerFormat')return node;if(!node||typeof node!=='object')return;for(const value of Object.values(node)){const found=Array.isArray(value)?value.map(formatNode).find(Boolean):formatNode(value);if(found)return found;}}
function formatProof(node){if(node?.formatProvenance)return node.formatProvenance;if(!node||typeof node!=='object')return;for(const value of Object.values(node)){const found=Array.isArray(value)?value.map(formatProof).find(Boolean):formatProof(value);if(found)return found;}}
function error(call){try{call();assert.fail('expected refusal');}catch(failure){return {name:failure.name,message:failure.message};}}
test('complete original std/core/alloc formatter source and macro references compile bounded control bodies',()=>{
 const original=sourceDisplayStandardCandidate();retain('01-complete-original-standard',original);assert.ok(original.program.functions.find(fn=>fn.key==='formatterPad').ir);assert.equal(original.namespaceAuthority,false);assert.equal(original.allocatorEffectsVerified,false);assert.ok(original.referenceDisplay.expansion.trees.length);assert.equal(original.constantSources.find(row=>row.name==='WIDTH_FLAG').result,1<<27);
 const candidates=compileFormatSourceControlBodies({originalWrite:original.helpers.formatterWrite.source});assert.throws(()=>executeFormatSourceControlBodies(structuredClone(candidates),'originalWrite',[]),/copied or forged/);assert.deepEqual(evaluateFormatSourceScalarExpression('3 << 29').result,1610612736);
});
test('production nominal Display reads its actual checked inherent source method and preserves repeated capture evaluation',async()=>{
 const result=compile(source);retain('02-production',{source,result});const row=result.meta.executable.find(row=>row.name==='show');assert.ok(row,JSON.stringify(result.meta.refused));const checked=[...parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.values()].find(row=>row.fullName==='show'),proof=formatProof(checked.body);assert.equal(proof.sourceDisplayClosures.length,2);assert.ok(proof.sourceDisplayClosures[0].formatterControlTrace.includes('formatterPad'));assert.ok(proof.sourceDisplayClosures[0].formatterControlTrace.includes('stringPush'));
 await verifyTypedTargets(result,api=>{const observations=['First','Second'].map(tag=>api.show(Object.freeze({$:tag})));retain('02-typed-observations',observations);assert.deepEqual(observations,['provider=first;first','provider=second;second']);});
});
test('changes to original enum source labels change runtime results through checked bodies without a provider table',async()=>{
 const changed=source.replace('"first"','"Ω-first"').replace('"second"','"second-😀"'),result=compile(changed);retain('03-source-mutation',{changed,result});assert.ok(result.meta.executable.some(row=>row.name==='show'));
 await verifyTypedTargets(result,api=>{const observations=['First','Second'].map(tag=>api.show(Object.freeze({$:tag})));retain('03-typed-observations',observations);assert.deepEqual(observations,['provider=Ω-first;Ω-first','provider=second-😀;second-😀']);});
});
test('actual original SubscriptionProvider body compiles and diagnostic retains its independent original ancestor macro refusal',()=>{
 const original=execFileSync('git',['show','HEAD:src/subscription/types.rs'],{encoding:'utf8'}),items=sourceItems(original),nativeDisplay=items.find(item=>item.term==='impl'&&original.slice(item.start,item.end).includes('impl std::fmt::Display for SubscriptionProvider'));
 assert.ok(nativeDisplay);const originalMethod=original.slice(nativeDisplay.start,nativeDisplay.end),recovery=execFileSync('git',['show','HEAD:src/refresh_recovery.rs'],{encoding:'utf8'}),diagnostic=sourceItems(recovery).find(item=>item.term==='fn'&&item.name==='refresh_failure_diagnostic'),nativeFunction=recovery.slice(diagnostic.start,diagnostic.end);retain('04-complete-original-router-modules',{types:{sourcePath:'src/subscription/types.rs',source:original,originalDisplay:originalMethod},recovery:{sourcePath:'src/refresh_recovery.rs',source:recovery,diagnosticRange:{start:diagnostic.start,end:diagnostic.end},nativeFunction}});
 const body=compileFormatSourceControlBodies({nativeDisplay:originalMethod});assert.ok(body.functions[0].ir);assert.match(body.functions[0].original,/f\.pad\(self\.as_str\(\)\)/);assert.equal(body.namespaceAuthority,false);
 const files={'src/lib.rs':'pub mod subscription{pub mod types;}mod refresh_recovery{use crate::subscription::types::SubscriptionProvider;'+nativeFunction+'}','src/subscription/types.rs':original},result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});retain('04-original-body-source-namespace-projection',{files,result});assert.equal(result.meta.executable.some(row=>row.name==='refresh_recovery.refresh_failure_diagnostic'),false);const refused=result.meta.refused.find(row=>row.name.includes('refresh_failure'));assert.match(refused.message,/actual source macro expansion and binding resolution/);assert.equal(result.meta.bindingEvidence.scopes.find(row=>row.path.length===0).unresolvedBangMacroScope,true);
});
test('private original nominal impl/namespace closures reject copied or getter proofs and changed nominal families',()=>{
 const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),context=createMatchesMacroContext({modules:captured.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition})),compilationProfile:PRODUCTION_PROFILE,deriveDependencies:dependencies}),parser=new HostRustParser(tokenizeRust(call));parser.compilationProfile=PRODUCTION_PROFILE;configureMatchesMacroParser(parser,context,{file:'src/lib.rs',offset:source.indexOf(call)});parser.attributes();parser.visibility();const parsed=parser.fn([]),node=formatNode(parsed.body);assert.ok(node.sourceDisplayScope);const closure=sourceNominalDisplayClosure(node.sourceDisplayScope,['crate','Provider']);retain('05-private-original-closure',closure);assert.equal(sourceNominalDisplayClosureFacts(closure).selection.nominal.family.join('.'),'crate.Provider');let reads=0;const hostile=Object.defineProperty({},'caller',{get(){reads++;return closure.caller;}});
 for(const fake of [structuredClone(closure),{...closure},new Proxy(closure,{}),hostile])assert.throws(()=>sourceNominalDisplayClosureFacts(fake),/copied or forged/);assert.equal(reads,0);assert.throws(()=>sourceNominalDisplayClosure(node.sourceDisplayScope,['crate','Different']),/actual nominal|coherent/);
 const changed={...node.sourceDisplayScope,module:['other']};assert.throws(()=>sourceNominalDisplayClosure(changed,['crate','Provider']),/forged|foreign|stale/);
});
test('shadowed standard owners, duplicate or nested impls, non-Copy consuming receivers and unproven source methods refuse independently',()=>{
 const variants=[source.replace(display,'mod std{}'+display),source+display,source+'fn hidden(){impl std::fmt::Display for Provider{fn fmt(&self,f:&mut std::fmt::Formatter<\'_>)->std::fmt::Result{f.pad(self.as_str())}}}',source.replace('#[derive(Clone,Copy)]',''),source.replace('f.pad(self.as_str())','f.pad("constant")'),source.replace('f.pad(self.as_str())','unresolved(self,f)'),source.replace('->&\'static str','->String').replace('Self::First=>"first"','Self::First=>String::from("first")').replace('Self::Second=>"second"','Self::Second=>String::from("second")')];
 const results=variants.map(source=>({source,result:compile(source)}));retain('06-coherence-owner-method-negatives',results);for(const row of results)assert.equal(row.result.meta.executable.some(row=>row.name==='show'),false, row.source);
});
test('format specifications, explicit arguments and serde Value remain outside nominal default Display admission',()=>{
 const variants=[source.replace('{provider};{provider}','{provider:>10}'),source.replace('format!("provider={provider};{provider}")','format!("{}",provider)'),declaration+display+'pub fn bad(event:serde_json::Value)->String{format!("{event}")}'];
 const results=variants.map(source=>({source,result:compile(source)}));retain('07-spec-argument-value-negatives',results);for(const row of results)assert.equal(row.result.meta.executable.some(row=>['show','bad'].includes(row.name)),false);
});
test('default formatter specializations refuse nondefault options and cannot forge source helper control',()=>{
 const original=sourceDisplayStandardCandidate(),changed=compileFormatSourceControlBodies({pad:original.helpers.formatterPad.source.replace('return self.buf.write_str(s);','return unknown_helper(s);')});
 const selected={options:{flags:0,width:0,precision:0},buf:{}},failure=error(()=>executeFormatSourceControlBodies(changed,'pad',[selected,'checked']));assert.match(failure.message,/unresolved original path unknown_helper/);const nondefault=error(()=>executeFormatSourceControlBodies(compileFormatSourceControlBodies({pad:original.helpers.formatterPad.source}),'pad',[{options:{flags:1<<28,width:0,precision:1},buf:{}},'checked']));retain('08-original-pad-negatives',{changed,failure,nondefault});assert.match(nondefault.message,/unresolved/);
});
