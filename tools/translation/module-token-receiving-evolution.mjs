// Later receiving-source equation only. Original case bodies remain available.
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const PATH='tools/translation/test/derive-output-effects.test.mjs';
const ORIGINAL='75faaa6f0f7e843149303901f9cd97abe73b01a1619fad4c11884c5df27f8efd';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Module-token receiving history: '+message);};
const beforeStatement="const currentSource=read(path),receivingHistory=[],logicalCurrentSource=legacyProofConsumerSource(currentSource,(kind,value)=>receivingHistory.push({kind,value})),stages=path==='tools/translation/derive-footprints.mjs'?dependencyEvolution:[];";
const afterStatement="const currentSource=read(path),receivingHistory=[];let selectedSource=currentSource;\n  if(path==='tools/translation/source-module-views.mjs'){\n   const history=prepareModuleTokenLayout();assert.equal(history.path,path);assert.equal(history.before,currentSource);assert.equal(history.after,currentSource);assert.equal(history.inverse,history.original);assert.equal(history.originalSha256,pin.sha256);assert.equal(Buffer.byteLength(history.original),pin.bytes);\n   assert.deepEqual(history.stages.map(stage=>stage.phase),['language','repository']);for(const stage of history.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.target);assert.equal(stage.inverse,stage.source);}\n   receivingHistory.push({kind:'module-token-layout',value:history});selectedSource=history.original;\n  }\n  const logicalCurrentSource=legacyProofConsumerSource(selectedSource,(kind,value)=>receivingHistory.push({kind,value})),stages=path==='tools/translation/derive-footprints.mjs'?dependencyEvolution:[];";
function grammar(ts,source){
 const file=ts.createSourceFile(PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length||source.split('\n').length>=1000)fail('complete native grammar or line budget differs');return file;
}
function one(rows,label){if(rows.length!==1)fail('one exact native selection required: '+label);return rows[0];}
function stage(before,after,phase,edits){
 const beforeMeta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(before,{language:'JavaScript'}).document),fresh=transportConcreteSyntaxMeta(beforeMeta);
 if(fresh.source!==before)fail('complete phase input differs');
 const rule={id:'module-token-receiving:'+phase,edits},sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]};
 const run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(afterMeta);
 if(parsed.source!==after)fail('complete phase output differs');
 const inverseRule={id:'module-token-receiving:complete-inverse',edits:[{span:[0,after.length],expected:after,replacement:before}]};
 const inverse=applyConcreteSyntaxSubstitutions(parsed.document,{languageRules:phase==='language'?[inverseRule]:[],repositoryRules:phase==='repository'?[inverseRule]:[]});
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==before)fail('complete phase inverse differs');
 return {phase,before,after,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:before};
}
export function deriveModuleTokenReceivingEvolution(original,current){
 if(typeof original!=='string'||typeof current!=='string'||Buffer.byteLength(current)>131072||hash(original)!==ORIGINAL)fail('complete original/current source required');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const file=grammar(ts,original),selected=[];
 function visit(node){if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>ts.isIdentifier(row.name)&&row.name.text==='currentSource'))selected.push(node);ts.forEachChild(node,visit);}
 visit(file);const statement=one(selected,'original complete receiving declaration');
 if(statement.getText(file)!==beforeStatement)fail('complete original receiving declaration differs');
 const selection={span:[statement.getStart(file),statement.end],expected:beforeStatement,replacement:afterStatement};
 const language=original.slice(0,selection.span[0])+afterStatement+original.slice(selection.span[1]);
 const languageFile=grammar(ts,language),imported=one(languageFile.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='../concrete-syntax-meta.mjs'),'actual complete CST import');
 const importEdit={span:[imported.end,imported.end],expected:'',replacement:"\nimport {prepareModuleTokenLayout} from '../prepare-module-token-layout.mjs';"};
 const after=language.slice(0,imported.end)+importEdit.replacement+language.slice(imported.end);grammar(ts,after);
 if(current!==original&&current!==after)fail('unregistered complete receiving successor');
 return {schema:'module-token-receiving-evolution-v1',path:PATH,original,current,language,after,inverse:original,originalSha256:ORIGINAL,currentSha256:hash(current),afterSha256:hash(after),nativeSelections:[selection,importEdit],
  stages:[stage(original,language,'language',[selection]),stage(language,after,'repository',[importEdit])],sourceAuthority:false,runtimeAuthority:false};
}
