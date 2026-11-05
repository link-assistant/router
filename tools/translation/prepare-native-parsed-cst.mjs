// Source proposal only. Native JSON output is DATA; canonical equality grants
// no semantic authority and the complete original validator remains fallback.
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ARCHIVE='tools/translation/source-profiles/native-parsed-cst/complete-originals.json.gz';
const PIN='230e9770487d80c7d33fbf65c4d0f87c0d8115c35d1552d1b58cbbf77d7523f5';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Native parsed CST source: '+message);};
function one(rows,label){if(rows.length!==1)fail('one complete native '+label+' required');return rows[0];}
function grammar(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('native source grammar differs: '+path);return file;}
function rewrite(source,edits){let after=source,end=source.length+1;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(edit.span[1]>end||after.slice(...edit.span)!==edit.expected)fail('complete native source span differs');after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);end=edit.span[0];}return after;}
function inverse(after,edits){let delta=0;const back=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(edit=>{const at=edit.span[0]+delta;delta+=edit.replacement.length-edit.expected.length;return {span:[at,at+edit.replacement.length],expected:edit.replacement,replacement:edit.expected};});return {source:rewrite(after,back),edits:back};}
function deriveSourceTransforms({root=ROOT,archive=resolve(root,ARCHIVE)}={},fullReview){
 root=resolve(root);
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const archiveState=lstatSync(archive);if(!archiveState.isFile()||archiveState.isSymbolicLink()||archiveState.size>1048576)fail('bounded regular complete archive required');const packed=readFileSync(archive);if(hash(packed)!==PIN)fail('complete original archive differs');const original=JSON.parse(gunzipSync(packed,{maxOutputLength:1048576}));if(original.schema!=='native-parsed-cst-originals-v1'||original.files.length!==3)fail('complete original source census differs');
 for(const row of original.files)if(Buffer.byteLength(row.source)!==row.bytes||hash(row.source)!==row.sha256)fail('complete original source record differs');
 const concrete=original.files.at(-1);if(readFileSync(resolve(root,concrete.path),'utf8')!==concrete.source)fail('actual original concrete provider changed');const concreteFile=grammar(ts,concrete.path,concrete.source),inspected=one(concreteFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='inspected'),'original own-data inspector');
 const header=inspected.body.statements.slice(0,4).map(node=>node.getText(concreteFile));
 if(!header[0].startsWith('const row=record(value,')||!header[1].includes('row.schema!==CONCRETE_SYNTAX_SCHEMA')||!header[2].includes("text(row.source,SOURCE_LIMIT,'source');")||!header[3].includes('languageName(row.language)'))fail('complete original header/source/language checks differ');
 const helper='function originalNativeParsedConcrete(value,wire){\n '+header.join('\n ')+'\n let expected;try{expected=build(row.source,row.language);}catch{return validated(value);}\n if(stringify(expected)!==wire)return validated(value);\n checked();return expected;\n}\n';
 grammar(ts,'complete-canonical-helper.mjs',helper);const files=[];
 for(const row of original.files.slice(0,2)){
  const before=row.source,file=grammar(ts,row.path,before),declaration=one(file.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).filter(node=>ts.isIdentifier(node.name)&&node.name.text==='workflow'),'complete private workflow');
  if(!ts.isNoSubstitutionTemplateLiteral(declaration.initializer))fail('original closed workflow template required');
  const workflow=declaration.initializer.text,parsed=grammar(ts,'complete-workflow.mjs',workflow),entry=one(parsed.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='originalIdentityTransport'),'original identity transport'),calls=[];
  function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='validated'){if(node.arguments.length!==1||node.arguments[0].getText(parsed)!=='parsed')fail('original native-parsed validation call differs');calls.push(node);}ts.forEachChild(node,visit);}visit(entry);
  if(calls.length!==2)fail('both independent parsed validations required');
  const edits=calls.map((node,index)=>({span:[node.getStart(parsed),node.end],expected:node.getText(parsed),replacement:'originalNativeParsedConcrete(parsed,'+(index?'wire':'input')+')'}));
  const afterWorkflow=rewrite(workflow,edits)+'\n'+helper,compiler=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='compile'),'complete original compiler'),compilerSource=compiler.getText(file),local=grammar(ts,'complete-original-compiler.mjs',compilerSource),fn=one(local.statements.filter(ts.isFunctionDeclaration),'complete copied compiler'),uses=[];
  function compilerUses(node){if(ts.isIdentifier(node)&&node.text==='workflow')uses.push(node);ts.forEachChild(node,compilerUses);}compilerUses(fn);const use=one(uses,'original workflow binding in private compiler');
  for(const name of ['nativeParsedConcreteWorkflow','compileNativeParsedConcretePacket']){let found=false;function collision(node){if(ts.isIdentifier(node)&&node.text===name)found=true;ts.forEachChild(node,collision);}collision(file);if(found)fail('new private compiler binding captures an original identifier');}
  const rename={span:[fn.name.getStart(local),fn.name.end],expected:fn.name.getText(local),replacement:'compileNativeParsedConcretePacket'},route={span:[use.getStart(local),use.end],expected:use.getText(local),replacement:'nativeParsedConcreteWorkflow'},copied=rewrite(compilerSource,[rename]),qualified=rewrite(compilerSource,[rename,route]),marker='\n// Begin generated native-parsed canonical CST constructor.\n';
  const language=before+marker+'const nativeParsedConcreteWorkflow='+JSON.stringify(afterWorkflow)+';\n'+copied+'\n',expectedAfter=before+marker+'const nativeParsedConcreteWorkflow='+JSON.stringify(afterWorkflow)+';\n'+qualified+'\n// Select only this private constructor; the original API functions stay exact.\ncompile=compileNativeParsedConcretePacket;\n';
  const repositoryEdits=[{span:[before.length,language.length],expected:language.slice(before.length),replacement:expectedAfter.slice(before.length)}],pipeline=createRulePipeline([{phase:'language',rules:[{id:'javascript:copy-complete-original-compiler-and-canonical-rebuild',apply:source=>{if(source!==before)fail('original source differs');return language;}}]},{phase:'repository',rules:[{id:'router:select-closed-native-parsed-private-constructor',apply:source=>rewrite(source,repositoryEdits)}]}]).run(before),after=pipeline.value,repositoryBack=inverse(after,repositoryEdits);if(repositoryBack.source!==language||language.slice(0,before.length)!==before)fail('whole original source inverse differs');
  grammar(ts,'complete-received-concrete.mjs',concrete.source+'\n'+afterWorkflow);const afterFile=grammar(ts,row.path,after),changedWorkflow=one(afterFile.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).filter(node=>ts.isIdentifier(node.name)&&node.name.text==='nativeParsedConcreteWorkflow'),'output workflow');if(!ts.isStringLiteral(changedWorkflow.initializer)||changedWorkflow.initializer.text!==afterWorkflow)fail('native emitted workflow text differs');
  const unchanged=[];for(const fn of file.statements.filter(ts.isFunctionDeclaration)){const copy=one(afterFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===fn.name?.text),'unchanged original function');if(copy.getText(afterFile)!==fn.getText(file))fail('original runtime function changed');unchanged.push(fn.name?.text);}
  if(after.split('\n').length>=1000)fail('source line budget');const stages=fullReview?transportConcreteSourceEquations([{before,after:language,language:'JavaScript'},{before:language,after,language:'JavaScript'}]):[];for(const [at,stage]of stages.entries())if(stage.inverse!==(at?language:before))fail('complete stage CST inverse differs');
  const current=readFileSync(resolve(root,row.path),'utf8');
  files.push({path:row.path,before,language,after,current,stages,trace:pipeline.trace,inverse:before,nativeInverseEdits:repositoryBack.edits,nativeBindings:fullReview?verifyNativeCopiedSourceBindings(ts,resolve(root,row.path),after):null,selection:{nativeParsedCalls:edits,completeOriginalHeader:header,helper,originalCompiler:compilerSource,compilerEdits:[rename,route],copiedCompiler:qualified,unchangedOriginalFunctions:unchanged,originalPrefixUnchanged:after.startsWith(before),twoIndependentBuildsRetained:true,originalValidatorFallback:true,buildFailureUsesOriginalValidator:true,allOriginalBudgetsRetained:true,newAcrossInvocationCache:false}});
 }
 if(!readFileSync(archive).equals(packed)||readFileSync(resolve(root,concrete.path),'utf8')!==concrete.source)fail('complete original source changed');for(const row of files)if(readFileSync(resolve(root,row.path),'utf8')!==row.current)fail('actual complete output changed');
 return {schema:fullReview?'native-parsed-cst-source-proposal-v1':'native-parsed-cst-source-text-data-v1',files,originalInputs:original.files,fullCstAndNativeReview:fullReview,physicalSourcesQualified:false,noAcrossInvocationCache:true,sourceAuthority:false,runtimeAuthority:false,performanceQualified:false,rustExecuted:false};
}

export function deriveNativeParsedCstSourceTransforms(options={}){return deriveSourceTransforms(options,true);}
// Preflight equality DATA only. These strings issue no reviewed-source flag,
// parser frame or permission; actual proposals still require both full reviews.
export function knownNativeParsedCstSourceText({root=ROOT,path}){const plan=deriveSourceTransforms({root},false),row=one(plan.files.filter(row=>row.path===path),'complete original source text');return {before:row.before,after:row.after,sourceAuthority:false,runtimeAuthority:false,fullCstAndNativeReview:false};}

export function prepareNativeParsedCst(options={}){
 const plan=deriveNativeParsedCstSourceTransforms(options);for(const row of plan.files)if(row.current!==row.before&&row.current!==row.after)fail('complete current source differs from original/proposal');return {...plan,physicalSourcesQualified:true};
}

// Exact source-history join only. This does not issue parser/owner authority.
export function qualifyNativeParsedCstSourceSuccessor({root,path,before,after}){
 const current=readFileSync(resolve(root,path),'utf8');if(current===before||current===after)return after;
 const row=knownNativeParsedCstSourceText({root,path});
 if(row.before!==after||row.after!==current||!row.after.startsWith(row.before))fail('unknown complete current source successor');return row.after;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,rootArgument,archiveArgument,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--check'].includes(mode))fail('use --emit|--check [ROOT [ARCHIVE]]');
 const plan=await prepareNativeParsedCst({root:rootArgument??ROOT,...(archiveArgument?{archive:archiveArgument}:{})});
 if(mode==='--check'){if(plan.files.some(row=>row.current!==row.after))fail('native parsed CST source is stale');console.log('Complete native-parsed CST equations are current.');}else console.log(JSON.stringify(plan));
}
