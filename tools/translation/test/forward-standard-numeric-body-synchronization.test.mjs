// Independent original-factory inverse regression SOURCE. No execution in drafting phase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {proposeForwardStandardNumericBodySynchronization} from '../forward-standard-numeric-body-synchronization.mjs';
import {proposeForwardStandardFloatingBodySynchronization} from '../forward-standard-floating-body-synchronization.mjs';
import {createStandardNumericCallSource} from '../standard-numeric-call-source.mjs';
import {prepareStandardNumericCallSources} from '../prepare-standard-numeric-call-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000};
const operations=['saturating_add','saturating_sub','saturating_mul','wrapping_add','wrapping_sub','min','max','clamp'];
const types=[...Array.from([8,16,32,64,128],bits=>['u'+bits,'i'+bits]).flat(),'usize','isize'];
function fixture(type){
 const selected=operations.filter(op=>!type.endsWith('size')||!op.startsWith('wrapping_'));
 const source=selected.map(op=>{const third=op==='clamp'?',z:'+type:'';return 'pub fn original_'+op+'(x:'+type+',y:'+type+third+')->'+type+'{x.'+op+'(y'+(op==='clamp'?',z':'')+')}\npub fn edited_'+op+'(x:'+type+',y:'+type+third+')->'+type+'{x}\n';}).join('');
 return {selected,source,options:{entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source}};
}
function parse(result,key){
 const ts=ownershipCompiler(),source=result[key],file=ts.createSourceFile('original.'+(key==='typescript'?'mts':'mjs'),source,ts.ScriptTarget.Latest,true,key==='typescript'?ts.ScriptKind.TS:ts.ScriptKind.JS),names=new Map(result.executableDeclarations.map(row=>[row.qualifiedName,row.targetBinding().javascriptName]));
 const fn=name=>{const node=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===names.get(name));assert.ok(node?.body,name);return node;};return {ts,source,file,fn};
}
function copyBodies(result,key,operations){
 const row=parse(result,key),edits=operations.map(op=>{const body=row.fn('edited_'+op).body;return {start:body.getStart(row.file),end:body.end,after:row.fn('original_'+op).body.getText(row.file)};}).sort((a,b)=>b.start-a.start);
 let source=row.source;for(const edit of edits)source=source.slice(0,edit.start)+edit.after+source.slice(edit.end);return source;
}
for(const type of types)for(const key of ['javascript','typescript'])test(key+' batches original '+type+' numeric operations with exact primitive instantiations',limits,async()=>{
 const input=fixture(type),original=translateProject(input.options),proposal=proposeForwardStandardNumericBodySynchronization({...input.options,[key]:copyBodies(original,key,input.selected)});
 assert.equal(proposal.expressionEditCount,input.selected.length);assert.equal(proposal.standardRuntimeSourceInputs.bindings.length+(proposal.standardRuntimeSourceInputs.primitiveOperators?.calls.length??0),input.selected.length);assert.equal(proposal.rustEdits[0].history.inverse,input.source);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.crossInvocationCache,false);
 const bits=type.endsWith('size')?64:Number(type.slice(1)),signed=type.startsWith('i'),minimum=signed?-(2n**BigInt(bits-1)):0n,maximum=2n**BigInt(signed?bits-1:bits)-1n;
 await verifyTypedTargets({javascript:proposal.javascript,typescript:proposal.typescript,meta:{entry:'src/lib.rs'}},api=>{
  assert.equal(api.edited_saturating_add(maximum,1n),maximum);assert.equal(api.edited_saturating_sub(minimum,1n),minimum);assert.equal(api.edited_saturating_mul(maximum,2n),maximum);
  assert.equal(api.edited_saturating_add(minimum,0n),minimum);assert.equal(api.edited_saturating_mul(minimum,0n),0n);
  assert.equal(api.edited_min(maximum,minimum),minimum);assert.equal(api.edited_max(minimum,maximum),maximum);assert.equal(api.edited_clamp(3n,1n,2n),2n);assert.equal(api.edited_clamp(0n,2n,2n),2n);assert.throws(()=>api.edited_clamp(0n,2n,1n),RangeError);
  if(!type.endsWith('size')){assert.equal(api.edited_wrapping_add(maximum,1n),minimum);assert.equal(api.edited_wrapping_sub(minimum,1n),maximum);}
  if(bits>=64)assert.equal(api.edited_min(9007199254740993n,9007199254740992n),9007199254740992n);
  if(signed){assert.equal(api.edited_saturating_mul(minimum,-1n),maximum);assert.equal(api.edited_max(-2n,-1n),-1n);}
 },{childTimeoutMs:20000});
});
test('numeric candidate observations require actual immutable original import and factory member',limits,()=>{
 const input=fixture('usize'),original=translateProject(input.options),row=parse(original,'javascript'),context=createStandardNumericCallSource({entry:input.options.entry,source:row.source,file:row.file}),helper=row.file.statements.filter(row.ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).find(node=>row.ts.isIdentifier(node.name)&&context.has(node.name.text));assert.ok(helper);const name=helper.name.text;
 assert.ok(context.lower(name,['x','y']).includes('.'));assert.equal(context.evidence().semanticAuthority,false);assert.equal(context.evidence().bindings[0].originalInstantiation.source,row.source.slice(...context.evidence().bindings[0].originalInstantiation.span));assert.throws(()=>context.lower(name,[]),/arity/u);
 for(const text of [
  row.source.replace('fixed-integer-runtime.mjs','unregistered-numeric-runtime.mjs'),
  row.source.replace('"bits":64','"bits":32'),
  row.source.replace(/const (ml_host_rust_fixed_[A-Za-z0-9_]+) =/u,'let $1 ='),
 ]){assert.notEqual(text,row.source);const file=row.ts.createSourceFile('changed.mjs',text,row.ts.ScriptTarget.Latest,true,row.ts.ScriptKind.JS);try{assert.equal(createStandardNumericCallSource({entry:input.options.entry,source:text,file}).has(name),false);}catch(error){assert.ok(error instanceof TypeError);}}
 for(const text of ['{ const result='+name+'(x,y);const '+name+'=x;return result; }','{ const {'+name+'}=x;return y; }','{ function '+name+'(){} return x; }']){
  const file=row.ts.createSourceFile('shadow.mjs','function caller(x,y)'+text,row.ts.ScriptTarget.Latest,true,row.ts.ScriptKind.JS);assert.throws(()=>context.assertFunctionScope({parameters:['x','y'],expression:file.statements[0].body}),/shadowed/u);
 }
 assert.throws(()=>context.assertFunctionScope({parameters:[name],expression:row.fn('edited_min').body}),/shadowed/u);
});
test('original numeric helper introduction cannot bypass missing declarations or wrong actual operand types',limits,()=>{
 const input=fixture('usize'),original=translateProject(input.options),changed=copyBodies(original,'javascript',input.selected);assert.throws(()=>proposeForwardStandardFloatingBodySynchronization({...input.options,javascript:changed}));
 const row=parse(original,'javascript'),context=createStandardNumericCallSource({entry:input.options.entry,source:row.source,file:row.file}),name=row.file.statements.filter(row.ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).map(node=>node.name?.text).find(name=>context.has(name)),body=row.fn('edited_min').body;
 for(const expression of [name+'(x)',name+'(x,"wrong")','unregistered_numeric(x,y)']){const text=row.source.slice(0,body.getStart(row.file))+'{return '+expression+';}'+row.source.slice(body.end);assert.throws(()=>proposeForwardStandardNumericBodySynchronization({...input.options,javascript:text}));}
 const source='pub fn edited(x:u8,y:u8)->u8{x}',options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source},own=translateProject(options),native=parse(own,'javascript'),fn=native.fn('edited');assert.throws(()=>proposeForwardStandardNumericBodySynchronization({...options,javascript:native.source.slice(0,fn.body.getStart(native.file))+'{return '+name+'(x,y);}'+native.source.slice(fn.body.end)}));
});
test('numeric inverse retains complete originals actual function selections and ordered source inverses',limits,()=>{
 const plan=prepareStandardNumericCallSources();assert.equal(plan.files.length,4);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const inverse=plan.files.find(row=>row.path==='tools/translation/forward-standard-numeric-body-synchronization.mjs');assert.equal(inverse.originalPath,'tools/translation/forward-standard-floating-body-synchronization.mjs');assert.deepEqual(inverse.nativeSelections.language.map(row=>row.name),['lowerStandardFloatingExpression','lowerStandardFloatingBody','proposeForwardStandardFloatingBodySynchronization']);
});
