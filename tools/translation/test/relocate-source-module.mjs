// Receiving fixture source only. No source, type or executable permit is issued.
import {types} from 'node:util';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const fail=message=>{throw new TypeError('Complete receiving module: '+message);};
function concrete(source){const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);if(transportConcreteSyntaxMeta(wire).source!==source)fail('whole source CST differs');return wire;}
export function relocateSourceModule(source,origin,overrides=new Map()){
 if(typeof source!=='string'||source.length>2097152||typeof origin!=='string'||types.isProxy(overrides)||!(overrides instanceof Map))fail('bounded primitive source, origin and ordinary override map required');
 const base=new URL(origin);if(base.protocol!=='file:'||base.search||base.hash)fail('complete original file URL required');
 for(const [key,value]of overrides)if(typeof key!=='string'||typeof value!=='string')fail('primitive complete override URLs required');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const file=ts.createSourceFile(base.href,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original grammar failed');
 const selected=[];
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:native-import-and-meta-source-spans',apply:value=>{
   if(value!==source)fail('complete original source changed');
   function visit(node){
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){
     const specifier=node.moduleSpecifier.text;if(specifier.startsWith('./')||specifier.startsWith('../')){const absolute=new URL(specifier,base).href,target=overrides.get(specifier)??overrides.get(absolute)??absolute;selected.push({kind:'relative-module-specifier',start:node.moduleSpecifier.getStart(file),end:node.moduleSpecifier.end,before:node.moduleSpecifier.getText(file),after:JSON.stringify(target)});}
    }
    if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0])){
     const literal=node.arguments[0],specifier=literal.text;if(specifier.startsWith('./')||specifier.startsWith('../')){const absolute=new URL(specifier,base).href,target=overrides.get(specifier)??overrides.get(absolute)??absolute;selected.push({kind:'relative-dynamic-module-specifier',start:literal.getStart(file),end:literal.end,before:literal.getText(file),after:JSON.stringify(target)});}
    }
    if(ts.isPropertyAccessExpression(node)&&node.name.text==='url'&&ts.isMetaProperty(node.expression)&&node.expression.keywordToken===ts.SyntaxKind.ImportKeyword&&node.expression.name.text==='meta'){selected.push({kind:'original-module-url',start:node.getStart(file),end:node.end,before:node.getText(file),after:JSON.stringify(base.href)});return;}
    ts.forEachChild(node,visit);
   }
   visit(file);selected.sort((a,b)=>a.start-b.start);let end=0;for(const row of selected){if(row.start<end||source.slice(row.start,row.end)!==row.before)fail('original native spans overlap or differ');end=row.end;}return value;
  }}]},
  {phase:'repository',rules:[{id:'receiving:physical-url-substitutions-and-complete-inverse',apply:value=>{
   let text=value;for(const row of [...selected].reverse())text=text.slice(0,row.start)+row.after+text.slice(row.end);
   let delta=0;const mapping=selected.map(row=>{const start=row.start+delta;delta+=row.after.length-(row.end-row.start);return {...row,afterSpan:[start,start+row.after.length]};});
   let inverse=text;for(const row of [...mapping].reverse()){const [start,end]=row.afterSpan;if(inverse.slice(start,end)!==row.after)fail('complete inverse span differs');inverse=inverse.slice(0,start)+row.before+inverse.slice(end);}if(inverse!==source)fail('whole receiving inverse differs');
   const parsed=ts.createSourceFile(base.href,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(parsed.parseDiagnostics.length)fail('complete receiving grammar failed');
   return {source,text,origin:base.href,selected,mapping,inverse,beforeMeta:concrete(source),afterMeta:concrete(text),compilerAuthority:false};
  }}]},
 ]);
 const result=pipeline.run(source);return {...result.value,trace:result.trace};
}
