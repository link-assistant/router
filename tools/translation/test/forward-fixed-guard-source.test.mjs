// Independent complete fixed ingress prefix/synchronization SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {captureReturnArithmeticSource} from '../return-arithmetic-source.mjs';
import {countUnchangedForwardFixedParameterGuards} from '../forward-fixed-guard-source.mjs';
import {proposeForwardControlBodySynchronization} from '../forward-control-body-synchronization.mjs';
import {proposeForwardImperativeBodySynchronization} from '../forward-imperative-body-synchronization.mjs';
import {proposeForwardRangeBodySynchronization} from '../forward-range-body-synchronization.mjs';
import {proposeForwardFloatingBodySynchronization} from '../forward-floating-body-synchronization.mjs';
import {proposeForwardStandardFloatingBodySynchronization} from '../forward-standard-floating-body-synchronization.mjs';
import {proposeForwardStandardNumericBodySynchronization} from '../forward-standard-numeric-body-synchronization.mjs';
import {prepareForwardGuardPrefixSources} from '../prepare-forward-guard-prefix-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},widths=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128'];
function fixture(type='u64'){
 const source='pub fn donor(x:'+type+',y:'+type+')->'+type+'{y}\npub fn edited(x:'+type+',y:'+type+')->'+type+'{x}\n';return {source,options:{entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source}};
}
function parsed(result,key){
 const ts=ownershipCompiler(),source=result[key],file=ts.createSourceFile(key==='javascript'?'caller.mjs':'caller.mts',source,ts.ScriptTarget.Latest,true,key==='javascript'?ts.ScriptKind.JS:ts.ScriptKind.TS),names=new Map(result.executableDeclarations.map(row=>[row.qualifiedName,row.targetBinding().javascriptName]));
 const fn=name=>{const value=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===names.get(name));assert.ok(value?.body,name);return value;};return {ts,source,file,fn,row:name=>({file,source,expression:fn(name).body})};
}
function changed(result,key){const p=parsed(result,key),target=p.fn('edited').body,donor=p.fn('donor').body;return p.source.slice(0,target.getStart(p.file))+donor.getText(p.file)+p.source.slice(target.end);}
for(const type of widths)for(const key of ['javascript','typescript'])test(key+' '+type+' keeps actual Host type and range guards while syncing the complete original module',limits,async()=>{
 const input=fixture(type),original=translateProject(input.options),p=parsed(original,key),arithmetic=captureReturnArithmeticSource(original.javascript,p.ts,key==='javascript'?p.file:null),parameters=new Map(p.fn('edited').parameters.map(node=>[node.name.text,node.name.text]));
 assert.equal(countUnchangedForwardFixedParameterGuards(p.ts,{before:p.row('edited'),after:p.row('edited'),parameters,arithmetic}),4);arithmetic.verify();
 const proposal=proposeForwardStandardNumericBodySynchronization({...input.options,[key]:changed(original,key)});assert.equal(proposal.expressionEditCount,1);assert.equal(proposal.rustEdits[0].history.inverse,input.source);assert.equal(proposal.requestedSource.source,changed(original,key));assert.equal(proposal.crossInvocationCache,false);assert.equal(proposal.sourceAuthority,false);
 await verifyTypedTargets({javascript:proposal.javascript,typescript:proposal.typescript,meta:{entry:'src/lib.rs'}},api=>{const signed=type[0]==='i',bits=BigInt(type.slice(1)),minimum=signed?-(1n<<(bits-1n)):0n,maximum=(1n<<(bits-(signed?1n:0n)))-1n;assert.equal(api.edited(minimum,maximum),maximum);assert.equal(api.edited(maximum,minimum),minimum);assert.throws(()=>api.edited(minimum-1n,maximum),RangeError);assert.throws(()=>api.edited(minimum,maximum+1n),RangeError);assert.throws(()=>api.edited(0,0n),TypeError);let converted=0;assert.throws(()=>api.edited({valueOf(){converted++;return 0n;}},0n),TypeError);assert.equal(converted,0);},{childTimeoutMs:20000});
});
for(const [label,propose]of [['control',proposeForwardControlBodySynchronization],['imperative',proposeForwardImperativeBodySynchronization],['range',proposeForwardRangeBodySynchronization],['floating',proposeForwardFloatingBodySynchronization],['standard floating',proposeForwardStandardFloatingBodySynchronization],['standard numeric',proposeForwardStandardNumericBodySynchronization]])test(label+' exported inverse consumes the same original strict prefix without changing guards or exports',limits,()=>{
 const input=fixture(),original=translateProject(input.options),proposal=propose({...input.options,javascript:changed(original,'javascript')});assert.equal(proposal.expressionEditCount,1);assert.equal(proposal.rustEdits[0].history.inverse,input.source);assert.equal(proposal.runtimeParity,false);
});
test('removed reordered changed or incomplete original type/range guards and modified helper implementations remain refusals',limits,()=>{
 const input=fixture(),original=translateProject(input.options),requested=changed(original,'javascript'),p=parsed({...original,javascript:requested},'javascript'),fn=p.fn('edited'),statements=[...fn.body.statements],replace=(a,b,text)=>requested.slice(0,a)+text+requested.slice(b),first=statements[0],second=statements[1];
 const changedSources=[replace(first.getStart(p.file),first.end,''),replace(second.getStart(p.file),second.end,''),replace(first.getStart(p.file),second.end,second.getText(p.file)+first.getText(p.file)),replace(first.getStart(p.file),first.end,first.getText(p.file).replace('bigint','number')),replace(second.getStart(p.file),second.end,second.getText(p.file).replace('0n','1n')),requested.replace('if (value < min || value > max)','if (false)')];
 for(const source of changedSources){assert.notEqual(source,requested);assert.throws(()=>proposeForwardStandardNumericBodySynchronization({...input.options,javascript:source}));}
});
test('a source-only prefix observation cannot authenticate a helper or replace original checked source inputs',limits,()=>{
 const input=fixture(),original=translateProject(input.options),p=parsed(original,'javascript'),parameters=new Map([['x','x'],['y','y']]);assert.throws(()=>countUnchangedForwardFixedParameterGuards(p.ts,{before:p.row('edited'),after:p.row('edited'),parameters,arithmetic:{names:new Set()}}));assert.throws(()=>proposeForwardStandardNumericBodySynchronization({...input.options,javascript:changed(original,'javascript'),arithmetic:{names:new Set(['ml_fixed'])}}));
});
test('nine whole compiler equations retain complete originals actual source owners ordered phases and exact inverses',limits,()=>{
 const plan=prepareForwardGuardPrefixSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
