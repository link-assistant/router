// Actual AST-selected written type transplantation. This constructs source
// only; the private original Rust/JS/TS traversal independently checks domains.
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {prepareOwnedVectorModulePair} from './owned-vector-module-pair.mjs';
import {prepareOwnedCorePairedTypes} from './owned-core-paired-types.mjs';
import {prepareReverseConcreteSources,assertReverseConcreteSourceHost} from './concrete-source.mjs';
const fail=message=>{throw new TypeError('Owned vector JavaScript pair: '+message);};
export function prepareOwnedVectorJavaScriptPair(javascriptPath,javascript,typescriptPath,baselineTypeScript){
 assertReverseConcreteSourceHost();if(typeof javascript!=='string'||Buffer.byteLength(javascript)>8388608||javascript.startsWith('#!'))fail('bounded ordinary complete JavaScript module required');
 const baseline=prepareOwnedVectorModulePair(javascriptPath,typescriptPath,baselineTypeScript),batch=prepareReverseConcreteSources([{source:javascript,language:'JavaScript'}]);if(batch.stages.length!==1||batch.stages[0].source!==javascript)fail('actual complete JavaScript CST required');
 const ts=ownershipCompiler(),js=ts.createSourceFile(javascriptPath,javascript,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),typed=ts.createSourceFile(typescriptPath,baseline.typescript.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);if(js.parseDiagnostics.length||typed.parseDiagnostics.length)fail('actual native source syntax required');
 const original=typed.statements.filter(ts.isFunctionDeclaration),edited=js.statements.filter(ts.isFunctionDeclaration),types=[];if(edited.length!==original.length||edited.length>4096)fail('all original typed function headers are required');
 for(const statement of typed.statements)if(ts.isImportDeclaration(statement)&&statement.importClause?.isTypeOnly)types.push(statement.getText(typed));
 const known=new Map();for(const node of original){if(!node.name||known.has(node.name.text))fail('unique complete original typed function required');known.set(node.name.text,node);}
 const changes=[],seen=new Set();let cells=0;
 for(const node of edited){
  if(++cells>4096||!node.name||!node.body||seen.has(node.name.text)||node.typeParameters?.length||node.asteriskToken||node.type)fail('ordinary distinct edited JavaScript function required');seen.add(node.name.text);const old=known.get(node.name.text);if(!old?.type||old.parameters.length!==node.parameters.length)fail('matching complete original written header required');
  for(let at=0;at<node.parameters.length;at++){
   if(++cells>100000)fail('native paired header work bound');const param=node.parameters[at],before=old.parameters[at];if(!ts.isIdentifier(param.name)||!ts.isIdentifier(before.name)||param.name.text!==before.name.text||!before.type||param.type||param.initializer||before.initializer||param.dotDotDotToken||before.dotDotDotToken||param.questionToken||before.questionToken||param.modifiers?.length||before.modifiers?.length)fail('unchanged plain original parameter bindings and written domains required');changes.push({at:param.name.end,text:': '+before.type.getText(typed)});
  }
  changes.push({at:node.body.getStart(js),text:': '+old.type.getText(typed)+' '});
 }
 changes.sort((a,b)=>a.at-b.at);for(let at=1;at<changes.length;at++)if(changes[at-1].at===changes[at].at)fail('distinct native annotation insertion positions required');let proposed=javascript;for(const change of changes.reverse())proposed=proposed.slice(0,change.at)+change.text+proposed.slice(change.at);if(types.length)proposed=types.join('\n')+'\n'+proposed;if(Buffer.byteLength(proposed)>8388608)fail('complete proposed TypeScript source bound');
 // The original checker, including its ASI/AST and whole CST comparison, owns
 // the final pair. Copied header text grants no receiving/native type permit.
 const result=prepareOwnedCorePairedTypes(javascriptPath,javascript,typescriptPath,proposed);assertReverseConcreteSourceHost();return result;
}
