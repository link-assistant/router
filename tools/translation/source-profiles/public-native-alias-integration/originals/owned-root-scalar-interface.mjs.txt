// Root type definitions are source/interface proposals. They never supply an
// executable body: every emitted body comes from a freshly genuine program.
import {posix} from 'node:path';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {checkOwnedCoreProgram,emitOwnedCoreProgram,ownedCoreContext} from './owned-outcome-operations.mjs';
import {translateOwnedOutcomeJavaScript} from './owned-outcome.mjs';
import {ownedCoreSourceData,createOwnedCoreSourceContext,requireOwnedCoreSourceCurrent} from './owned-outcome-source.mjs';
import {readOwnedModuleRustEnvelope} from './owned-module-scalar-rust-envelope.mjs';
import {ownedRootScalarTypeSource} from './owned-root-scalar-types.mjs';
import {packageOwnedModuleAPI} from './owned-module-scalar-public-api.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Owned root scalar interface: '+message);};
function emptyValueSource(source){
 const ts=ownershipCompiler(),file=ts.createSourceFile('empty-values.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),edits=[];if(file.parseDiagnostics.length)fail('complete JavaScript source grammar differs');for(const node of file.statements)if(ts.isExportDeclaration(node)){if(node.moduleSpecifier||node.isTypeOnly||!node.exportClause||!ts.isNamedExports(node.exportClause))fail('only canonical named value export footers can be removed');edits.push([node.getStart(file),node.end]);}let after=source;for(const [start,end]of edits.reverse())after=after.slice(0,start)+after.slice(end);return {source:after,equation:transportConcreteSourceEquations([{before:source,after,language:'JavaScript'}])[0]};
}
export function applyOwnedRootScalarInterface(result,{sourceRust,context}={}){
 const parent=ownedCoreSourceData(context),envelope=readOwnedModuleRustEnvelope(sourceRust);if(!envelope.scalarTypes.length){requireOwnedCoreSourceCurrent(context);return result;}let program=checkOwnedCoreProgram(result.program),active=program.length?ownedCoreContext(program[0]):context,emptyHistory=null,checkedEmpty=null;
 if(!program.length){
  const proposal=emptyValueSource(result.javascript),used=new Set(parent.files.map(row=>row.path));let serial=0,path;do{path=posix.join(posix.dirname(parent.runtimeRoot),'.translation','router-empty-values-'+(serial++)+'.mjs');}while(used.has(path));active=createOwnedCoreSourceContext({...parent,files:parent.files.concat([{path,source:proposal.source}])});checkedEmpty=translateOwnedOutcomeJavaScript(proposal.source,{context:active,sourcePath:path});program=checkOwnedCoreProgram(checkedEmpty.program);if(program.length)fail('empty value result cannot introduce executable declarations');emptyHistory=proposal;
 }
 const data=ownedCoreSourceData(active),parentFiles=new Map(parent.files.map(row=>[row.path,row.source]));if(data.runtimeRoot!==parent.runtimeRoot||data.declarationRoot!==parent.declarationRoot)fail('receiving runtime roots differ');for(const row of data.files)if(row.path==='Cargo.toml'||row.path==='Cargo.lock'||row.path.startsWith('src/')&&row.path.endsWith('.rs')||[data.runtimeRoot,data.declarationRoot].some(root=>row.path.startsWith(root+'/')))if(parentFiles.get(row.path)!==row.source)fail('complete actual native/runtime source interface differs');
 const javascript=program.length?program[0].source.source:checkedEmpty.javascript,outputPath=result.ownedProjectTypeScriptBundlePath??posix.join(posix.dirname(data.declarationRoot),'.translation','router-project-bundle.ts'),values=result.modulePublicAPIHistory.publicExports.filter(row=>row.kind==='value'),types=envelope.scalarTypes.map(row=>({publicName:row.name,internalName:row.name,kind:'type',source:result.ownedProjectBundlePath??null,span:row.span,sourceAuthority:false,semanticAuthority:false}));
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'meta:emit-only-the-freshly-checked-current-owned-program',apply:()=>({...result,program,javascript,rust:emitOwnedCoreProgram(program,'rust'),typescript:emitOwnedCoreProgram(program,'typescript',{outputPath})})}]},
  {phase:'repository',rules:[{id:'router:attach-only-canonical-root-scalar-source-interfaces',apply:body=>{const packed=packageOwnedModuleAPI(body,{publicExports:[...values,...types],linkedSource:ownedRootScalarTypeSource(envelope,javascript),language:'TypeScript'});return {...packed,ownedRootScalarInterfaceHistory:{schema:'router-owned-root-scalar-interface-v1',sourceRust,envelope,emptyValueSourceHistory:emptyHistory,sourceRustBodyAuthority:false,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false},runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false};}}]},
 ]).run(null);requireOwnedCoreSourceCurrent(context);requireOwnedCoreSourceCurrent(active);return {...run.value,ownedRootScalarInterfaceRuleTrace:run.trace};
}
