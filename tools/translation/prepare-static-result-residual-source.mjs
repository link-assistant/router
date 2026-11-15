// Complete source DATA only. Existing residual semantic checks remain independent.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-source-origin-phases.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PATH='tools/translation/extensions/source-lifetimes.mjs';
const ARCHIVE=new URL('./source-profiles/static-result-residuals/original.mjs.gz',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Static Result residual source: '+message);};
const PIN={"originalBytes":62721,"originalSha256":"8e03f056109dfe021568ec2aeef49a490a201ba0f3860d00ead764b816498ecd","archiveBytes":15670,"archiveSha256":"a4ed01346f4a16c30331f20b4f3d89ad4b7ceb11de9ae827222512230438488a","afterSha256":"1bc5c5312f18e2ce2b5592a269c1b5ed6744bc5213b11adcee953ee951c4f37b"};
const OLD_IF="if(!node.option&&(borrowed||hasBorrow(node.value.type,context))&&!closedStringErrorTry(node,context))throw unsupported('borrowed Result propagation','requires checked residual error lifetime origins',node.span);";
const NEW_IF="if(!node.option&&(borrowed||hasBorrow(node.value.type,context))&&!closedStringErrorTry(node,context)&&!closedStaticStrErrorTry(node,value,context))throw unsupported('borrowed Result propagation','requires checked residual error lifetime origins',node.span);";
const OLD_LOOP="for(const output of signature.outputs)for(const origin of at(actual,output.path))if(origin!=='static'&&origin!==output.identity)throw unsupported('escaping source borrow','the checked returned leaf lacks a proven input or static lifetime origin',entry.span);";
const NEW_LOOP="for(const output of signature.outputs)if(!emptyResultBorrowLeaf(node,output.path,{...context,entry}))for(const origin of at(actual,output.path))if(origin!=='static'&&origin!==output.identity)throw unsupported('escaping source borrow','the checked returned leaf lacks a proven input or static lifetime origin',entry.span);";
const OLD_COMMENT="// origins. Result residual lifetimes need separate error-origin lowering.";
const NEW_COMMENT="// origins. Result errors require their own checked residual origins.";
const HELPERS="// A checked Ok has no Err payload (and conversely), even when both source\n// arguments contain distinct borrowed leaves. Absence is proved from actual\n// constructor/control syntax, never inferred from a missing public map row.\nfunction emptyResultBorrowLeaf(node,path,context,depth=0){\n if(!node||depth>256)return false;\n const empty=value=>emptyResultBorrowLeaf(value,path,context,depth+1);\n if(['let','routerDiscard','routerSet','routerWhile','routerFor','routerIf'].includes(node.k))return empty(node.body);\n if(node.k==='if')return empty(node.then)&&empty(node.else);\n if(node.k==='match')return node.cases.every(arm=>empty(arm.body));\n if(node.k!=='ctor'||path[0]!=='argument'||![0,1].includes(path[1])||!context.checker)return false;\n const result=canonicalResult(context.checker,node.type,context.entry.modulePath,node.span,false);\n if(!result||node.data!==node.type.name||!['Ok','Err'].includes(node.ctor)||node.args?.length!==1||!sameType(node.args[0].type,node.ctor==='Ok'?result.success:result.error))return false;\n const selected=node.ctor==='Ok'?0:1;\n return path[1]!==selected||path.length>2&&emptyResultBorrowLeaf(node.args[0],path.slice(2),context,depth+1);\n}\n\n// The only borrowed residual admitted here is a genuine static str leaf,\n// independently proved static in both the written type and actual flow.\nfunction closedStaticStrErrorTry(node,value,context){\n const checker=context.checker;if(!checker)return false;\n const input=canonicalResult(checker,node.value.type,context.entry.modulePath,node.span,false),output=canonicalResult(checker,context.entry.ret,context.entry.modulePath,node.span,false);\n if(!input||!output||!sameType(input.error,output.error)||!sameType(input.success,node.type))return false;\n const staticStr=type=>type.kind==='string'&&type.rustSourceType===true&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&sourceBorrowRegions(type,context).length===1&&sourceBorrowRegions(type,context)[0].kind==='static';\n if(!staticStr(input.error)||!staticStr(output.error))return false;\n // A written static error type alone cannot prove the actual Err leaf.\n // Do not project with the conservative whole-value fallback: its success\n // may borrow from a caller even though the residual must be static.\n const residual=value.leaves?.get(key(['argument',1]));\n if(!residual?.size||[...residual].some(origin=>origin!=='static'))return false;\n checker.expectedOwnership(input.error,output.error,context.entry.modulePath,node.span);checker.expectedPrimitiveIdentity(input.error,output.error,context.entry.modulePath,node.span);checker.expectedOwnership(node.type,input.success,context.entry.modulePath,node.span);\n return true;\n}\n\n";
function original(){
 const packed=readFileSync(ARCHIVE);if(packed.length!==PIN.archiveBytes||hash(packed)!==PIN.archiveSha256)fail('complete original archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:131072});if(raw.length!==PIN.originalBytes||hash(raw)!==PIN.originalSha256)fail('complete original source differs');
 const source=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw);if(hash(source)!==PIN.originalSha256)fail('complete original Unicode differs');return {source,packed};
}
function parse(ts,source){const file=ts.createSourceFile(PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native syntax differs');return file;}
function shape(ts,node){const children=[];ts.forEachChild(node,child=>{children.push(shape(ts,child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];}
function nativeCopy(ts,source){
 const file=parse(ts,source),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};
 const copies=file.statements.map(node=>{const copy=ts.getSynthesizedDeepClone(node);detach(copy);return copy;});
 const copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,copies));
 if(JSON.stringify(shape(ts,file))!==JSON.stringify(shape(ts,parse(ts,copy))))fail('complete detached native AST differs');return {source,copy,completeNativeAstCopy:true};
}
export function deriveStaticResultResidualSource(ts,before){
 if(ts.version!=='5.9.3'||hash(before)!==PIN.originalSha256)fail('complete original checker and installed TypeScript 5.9.3 required');
 const file=parse(ts,before),conditions=[],loops=[],functions=[];
 function visit(node){
  if(ts.isIfStatement(node)&&node.getText(file)===OLD_IF)conditions.push(node);
  if(ts.isForOfStatement(node)&&node.getText(file)===OLD_LOOP)loops.push(node);
  if(ts.isFunctionDeclaration(node)&&node.name?.text==='closedStringErrorTry')functions.push(node);
  if(ts.isIdentifier(node)&&['emptyResultBorrowLeaf','closedStaticStrErrorTry'].includes(node.text))fail('new helper already bound in original');
  ts.forEachChild(node,visit);
 }
 visit(file);if(conditions.length!==1||loops.length!==1||functions.length!==1)fail('complete original native selections differ');
 const anchor="// Result's Err residual",at=before.indexOf(anchor,functions[0].getFullStart());
 if(at<functions[0].getFullStart()||at>=functions[0].getStart(file)||before.indexOf(anchor,at+1)!==-1)fail('original residual documentation boundary differs');
 const edits=[{span:[conditions[0].getStart(file),conditions[0].end],expected:OLD_IF,replacement:NEW_IF},{span:[loops[0].getStart(file),loops[0].end],expected:OLD_LOOP,replacement:NEW_LOOP},{span:[at,at],expected:'',replacement:HELPERS}].sort((a,b)=>a.span[0]-b.span[0]);
 let language=before,end=before.length;
 for(const edit of [...edits].reverse()){if(edit.span[1]>end||before.slice(...edit.span)!==edit.expected)fail('native spans overlap or differ');language=language.slice(0,edit.span[0])+edit.replacement+language.slice(edit.span[1]);end=edit.span[0];}
 if(language.split(OLD_COMMENT).length!==2)fail('one original repository comment required');
 const after=language.replace(OLD_COMMENT,NEW_COMMENT);parse(ts,language);parse(ts,after);
 if([before,language,after].some(source=>source.split('\n').length>=1000))fail('complete physical source line limit differs');
 let inverse=after.replace(NEW_COMMENT,OLD_COMMENT),shift=0;
 const positioned=edits.map(edit=>{const start=edit.span[0]+shift;shift+=edit.replacement.length-edit.expected.length;return {...edit,start};});
 for(const edit of positioned.reverse()){if(inverse.slice(edit.start,edit.start+edit.replacement.length)!==edit.replacement)fail('complete native inverse selection differs');inverse=inverse.slice(0,edit.start)+edit.expected+inverse.slice(edit.start+edit.replacement.length);}
 if(inverse!==before||hash(after)!==PIN.afterSha256)fail('complete native inverse or derived checker differs');
 return {language,after,selection:{edits,repositoryComment:{before:OLD_COMMENT,after:NEW_COMMENT},nativeInverse:inverse}};
}
export function prepareStaticResultResidualSource({root=ROOT}={}){
 const ts=ownershipCompiler(),input=original(),before=input.source,{language,after,selection}=deriveStaticResultResidualSource(ts,before);
 const current=readFileSync(resolve(root,PATH),'utf8');if(current!==before&&current!==after)fail('complete physical checker is outside the source equation');
 const [equation]=transportConcreteNamedSourcePhases([{before,middle:language,after,language:'JavaScript',rules:['javascript:check-static-result-error-and-absent-leaf-origins','router:describe-current-residual-boundary','javascript:restore-complete-original-lifetime-checker','router:restore-original-residual-comment']}]);
 if(equation.inverse!==before)fail('complete serialized CST inverse differs');
 const stages=equation.stages.map(stage=>({...stage,completeInverse:true}));
 const nativeCopies=[nativeCopy(ts,before),nativeCopy(ts,after)],nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,PATH),after);
 if(readFileSync(resolve(root,PATH),'utf8')!==current||!readFileSync(ARCHIVE).equals(input.packed))fail('complete inputs changed across final boundary');
 return {schema:'static-result-residual-source-v1',typescriptVersion:ts.version,files:[{path:PATH,before,language,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:equation.beforeMeta,afterMeta:equation.afterMeta,inverse:before,trace:equation.trace,stages,nativeCopies,nativeBindings,selection,sourceLanguage:'JavaScript'}],sourceAuthority:false,semanticAuthority:false,runtimeExecuted:false,rustExecuted:false};
}
export function composeStaticResultResidualSource(prior,options={}){
 const plan=prepareStaticResultResidualSource(options),sources={...prior};
 for(const row of plan.files){if(!sources[row.path]||sources[row.path].after!==row.before)fail('preceding complete lifetime equation differs');sources[row.path]=row;}
 return {sources,layers:[plan],historicalSources:prior};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--check'].includes(mode))fail('use --emit|--check');
 const plan=prepareStaticResultResidualSource();
 if(mode==='--emit')console.log(JSON.stringify(plan));else {if(plan.files.some(row=>row.current!==row.after))fail('complete current checker differs');console.log(JSON.stringify({schema:plan.schema,typescriptVersion:plan.typescriptVersion,files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),semanticAuthority:false}));}
}
