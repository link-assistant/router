// Independent complete text method substitution SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {proposeForwardTextPredicateSynchronization} from '../forward-text-predicate-synchronization.mjs';
import {prepareTextPredicateInverseSources} from '../prepare-text-predicate-inverse-sources.mjs';
import {captureTextMethodInverseSource} from '../text-method-inverse-source.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},source='pub fn first(value:&str,pattern:&str)->bool{value./* keep first */contains(pattern)}\npub fn second(value:&str,pattern:&str)->bool{value.starts_with(pattern)}\npub fn third(value:&str,pattern:&str)->bool{value.ends_with(pattern)}\npub fn repeated(value:&str,pattern:&str)->bool{value.contains(pattern)&&value.contains("!")}\n',options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source};
function edit(result,key,changes){
 const ts=ownershipCompiler(),text=result[key],file=ts.createSourceFile(key==='typescript'?'text.mts':'text.mjs',text,ts.ScriptTarget.Latest,true,key==='typescript'?ts.ScriptKind.TS:ts.ScriptKind.JS),names=new Map(result.executableDeclarations.map(row=>[row.qualifiedName,row.targetBinding().javascriptName])),edits=[];
 for(const [name,replacement]of Object.entries(changes)){
  const fn=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===names.get(name));assert.ok(fn?.body,name);const visit=node=>{if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&['includes','startsWith','endsWith'].includes(node.expression.name.text))edits.push({start:node.expression.name.getStart(file),end:node.expression.name.end,replacement});ts.forEachChild(node,visit);};visit(fn.body);
 }
 let after=text;for(const row of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,row.start)+row.replacement+after.slice(row.end);return after;
}
for(const key of ['javascript','typescript'])test(key+' batches exact predicate substitutions while retaining all original generated temporaries and source trivia',limits,async()=>{
 const original=translateProject(options),requested=edit(original,key,{first:'startsWith',second:'endsWith',third:'includes',repeated:'endsWith'}),proposal=proposeForwardTextPredicateSynchronization({...options,[key]:requested});assert.equal(proposal.expressionEditCount,5);assert.equal(proposal.rustEdits.length,1);assert.equal(proposal.rustEdits[0].history.inverse,source);assert.ok(proposal.rustEdits[0].after.includes('value./* keep first */starts_with(pattern)'));assert.equal(proposal.textMethodSourceInputs.semanticAuthority,false);assert.equal(proposal.crossInvocationCache,false);
 assert.deepEqual(proposal.rustEdits[0].expressionEdits.map(row=>row.kind),Array(5).fill('text-predicate-method'));
 await verifyTypedTargets({javascript:proposal.javascript,typescript:proposal.typescript,meta:{entry:'src/lib.rs'}},api=>{
  for(const [value,pattern,prefix,suffix,contains]of [['','',true,true,true],['abc','a',true,false,true],['abc','c',false,true,true],['abc','b',false,false,true],['abc','missing',false,false,false],['😀Ω','😀',true,false,true],['😀Ω','Ω',false,true,true],['e\u0301','é',false,false,false],['a!','!',false,true,true]]){assert.equal(api.first(value,pattern),prefix);assert.equal(api.second(value,pattern),suffix);assert.equal(api.third(value,pattern),contains);}
  assert.equal(api.repeated('ready!','!'),true);assert.equal(api.repeated('!ready','!'),false);assert.equal(api.repeated('ready!','ready'),false);
 },{childTimeoutMs:20000});
});
test('actual original method table retains complete CST inputs and independent source verification',limits,()=>{
 const context=captureTextMethodInverseSource();assert.equal(context.evidence.sourceAuthority,false);assert.equal(context.evidence.semanticAuthority,false);assert.deepEqual(context.evidence.operations,[{rust:'starts_with',target:'startsWith'},{rust:'ends_with',target:'endsWith'},{rust:'contains',target:'includes'}]);assert.ok(context.evidence.source.includes(context.evidence.table.source));assert.ok(context.evidence.bytes>0);context.verify();
});
test('arbitrary operand edits changed temporaries nonregistered methods and surrounding source all refuse',limits,()=>{
 const original=translateProject(options),valid=edit(original,'javascript',{first:'startsWith'}),ts=ownershipCompiler(),file=ts.createSourceFile('edited.mjs',valid,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),binding=original.executableDeclarations.find(row=>row.qualifiedName==='first').targetBinding(),fn=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===binding.javascriptName),call=[];const visit=node=>{if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='startsWith')call.push(node);ts.forEachChild(node,visit);};visit(fn.body);assert.equal(call.length,1);const argument=call[0].arguments[0];
 for(const javascript of [valid.slice(0,argument.getStart(file))+'"forged operand"'+valid.slice(argument.end),valid+'\nexport const injected=true;\n',edit(original,'javascript',{first:'match'}),valid.slice(0,fn.body.getStart(file)+1)+'\nconst injected=true;'+valid.slice(fn.body.getStart(file)+1)])assert.throws(()=>proposeForwardTextPredicateSynchronization({...options,javascript}));
 assert.throws(()=>proposeForwardTextPredicateSynchronization({...options,javascript:original.javascript}));
});
test('method source substitutions retain inline module and exact source positions',limits,()=>{
 const text='pub mod nested { pub fn first(value:&str,pattern:&str)->bool{value.contains(pattern)} }\n',own={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>text},original=translateProject(own),proposal=proposeForwardTextPredicateSynchronization({...own,typescript:edit(original,'typescript',{'nested.first':'endsWith'})});assert.equal(proposal.expressionEditCount,1);assert.equal(proposal.rustEdits[0].after,text.replace('contains','ends_with'));assert.equal(proposal.rustEdits[0].history.inverse,text);
});
test('complete actual original inverse function and project/facade source histories stay available',limits,()=>{
 const plan=prepareTextPredicateInverseSources();assert.equal(plan.files.length,4);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const inverse=plan.files.find(row=>row.path==='tools/translation/forward-text-predicate-synchronization.mjs');assert.equal(inverse.originalPath,'tools/translation/forward-standard-numeric-body-synchronization.mjs');assert.deepEqual(inverse.nativeSelections.language.map(row=>row.name),['proposeForwardStandardNumericBodySynchronization']);
});
