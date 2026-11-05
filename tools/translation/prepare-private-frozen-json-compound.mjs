// Explicit copies only. Original guards, byte helpers and their defaults stay
// unchanged. Native source spans/CST transport own every proposed output.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/',JSON_SOURCE=BASE+'private-frozen-json.mjs',LEX_SOURCE=BASE+'original-lexing-intrinsics.mjs',GUARD_SOURCE=BASE+'original-json-intrinsics.mjs',JSON_OUTPUT=BASE+'private-frozen-json-compound-candidate.mjs',LEX_OUTPUT=BASE+'private-frozen-json-compound-lexing-candidate.mjs';
const TAIL='originalBatchedLexingAfterFreshNamespaceIntrinsicsUnchanged',COMPOUND='compoundCompositionAndFreezeIntrinsics';
const SOURCE_PINS={[JSON_SOURCE]:'6da6243dd4c2d9f48ca86c5a9e13f88b3b2ea6ad8f7a79df525128c11e732c5f',[LEX_SOURCE]:'d800a2ed58fe82dc488c1ba6a02c440602501785b3ee7080265eef95690cc54d',[GUARD_SOURCE]:'8b505ecb5e5211496dc5586439e8c8c8c936df1beb29292ede36eef419621f45'};
const fail=message=>{throw TypeError('Private JSON compound source: '+message);},hash=source=>createHash('sha256').update(source).digest('hex');
function syntax(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function unique(rows,reason){if(rows.length!==1)fail(reason);return rows[0];}
function fn(ts,file,name){return unique(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),'one complete actual function required: '+name);}
function once(source,before,after){if(source.split(before).length!==2)fail('one actual source anchor required: '+before);return source.replace(before,()=>after);}
function nativeCalls(ts,node){const rows=[];function visit(value){if(ts.isCallExpression(value))rows.push(value);ts.forEachChild(value,visit);}visit(node);return rows;}
export function preparePrivateFrozenJsonCompound({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3'||createRequire(resolve(root,'js/package.json'))('typescript')!==ts)fail('this source root installed TypeScript5.9.3 required');
 const inputs=[JSON_SOURCE,LEX_SOURCE,GUARD_SOURCE].map(path=>{const source=readFileSync(resolve(root,path),'utf8');if(hash(source)!==SOURCE_PINS[path])fail('complete actual proof source pin differs: '+path);return {path,source,sha256:hash(source)};}),json=inputs[0].source,lex=inputs[1].source,guard=inputs[2].source,lexFile=syntax(ts,LEX_SOURCE,lex),jsonFile=syntax(ts,JSON_SOURCE,json),guardFile=syntax(ts,GUARD_SOURCE,guard),files=[];
 // Source-backed dominance: the actual freeze predicate invokes the actual
 // namespace predicate, which reaches the JSON predicate through its private
 // path guard. Preserve all three complete source equations as review DATA.
 const freeze=fn(ts,guardFile,'originalBatchedDataFreezeIntrinsicsUnchanged'),namespace=fn(ts,guardFile,'originalBatchedNamespaceTraversalIntrinsicsUnchanged'),kindNamespace=fn(ts,guardFile,'kindBatchedExpectedNamespaceTraversalIntrinsicsUnchanged'),kindPath=fn(ts,guardFile,'kindBatchedExpectedPathMembershipIntrinsicsUnchanged');
 if(!nativeCalls(ts,freeze).some(node=>node.expression.getText(guardFile)==='originalBatchedNamespaceTraversalIntrinsicsUnchanged')||!nativeCalls(ts,namespace).some(node=>node.expression.getText(guardFile)==='kindBatchedExpectedNamespaceTraversalIntrinsicsUnchanged')||!nativeCalls(ts,kindNamespace).some(node=>node.expression.getText(guardFile)==='kindBatchedExpectedPathMembershipIntrinsicsUnchanged')||!nativeCalls(ts,kindPath).some(node=>node.expression.getText(guardFile)==='kindBatchedExpectedJsonIntrinsicsUnchanged'))fail('actual fresh namespace/JSON implication differs');
 const lexical=fn(ts,lexFile,'originalBatchedLexingIntrinsicsUnchanged'),lexicalSource=lexical.getText(lexFile),tail=once(once(lexicalSource,'function originalBatchedLexingIntrinsicsUnchanged(', 'function '+TAIL+'('),'!originalBatchedJsonIntrinsicsUnchanged()||','');
 const lexLanguage=lex+'\n// Private-copy conjunction tail; consumers first prove fresh namespace.\n'+tail+'\n';
 let language=json;const edits=[];
 function editFunction(name,run){const parsed=syntax(ts,JSON_OUTPUT,language),node=fn(ts,parsed,name),before=node.getText(parsed),after=run(before);edits.push({name,sourceSpan:[node.getStart(parsed),node.end],before,after});language=language.slice(0,node.getStart(parsed))+after+language.slice(node.end);}
 const intrinsic=fn(ts,jsonFile,'intrinsics'),composition=fn(ts,jsonFile,'compositionIntrinsics'),intrinsicBody=[...intrinsic.body.statements],compositionBody=[...composition.body.statements];
 if(intrinsicBody.length!==3||compositionBody.length!==3||!ts.isIfStatement(intrinsicBody[0])||!ts.isReturnStatement(intrinsicBody[2])||!ts.isIfStatement(compositionBody[0]))fail('actual complete compound predicate layout differs');
 const compound='function '+COMPOUND+'(){\n '+once(once(intrinsicBody[0].getText(jsonFile),'originalNamespaceTraversalIntrinsicsUnchanged()','originalDataFreezeIntrinsicsUnchanged()'),'originalLexingIntrinsicsUnchanged()',TAIL+'()')+'\n '+intrinsicBody[1].getText(jsonFile)+'\n if(!('+intrinsicBody[2].expression.getText(jsonFile)+'))return false;\n '+once(compositionBody[0].getText(jsonFile),'!intrinsics()||','')+'\n '+compositionBody.slice(1).map(node=>node.getText(jsonFile)).join('\n ')+'\n}\n';
 editFunction('intrinsics',body=>once(body,'originalLexingIntrinsicsUnchanged()',TAIL+'()'));
 editFunction('privateFrozenJsonEqualHint',body=>{
  let value=once(once(body,'!compositionIntrinsics()||!originalDataFreezeIntrinsicsUnchanged()','!'+COMPOUND+'()'),'compositionIntrinsics()&&originalDataFreezeIntrinsicsUnchanged()',COMPOUND+'()');
  value=once(value,'  let first=null,last=null;\n','');
  value=once(value,'   const child={left:af.value,right:bf.value,next:null};if(last)last.next=child;else first=child;last=child;','   an[at]=af.value;bn[at]=bf.value;');
  return once(value,'  for(let child=first;child;child=child.next)if(!equal(child.left,child.right,depth+1))return false;','  for(let at=0;at<count;at++)if(!equal(an[at],bn[at],depth+1))return false;');
 });
 const originalComposer=fn(ts,jsonFile,'createPrivateFrozenJsonComposer').getText(jsonFile),legacyComposer=once(originalComposer,'export function createPrivateFrozenJsonComposer(){','function createOriginalPrivateFrozenJsonComposer(){');
 editFunction('createPrivateFrozenJsonComposer',body=>{
  let value=once(once(body,' return value=>{',' const originalComposer=createOriginalPrivateFrozenJsonComposer();\n return value=>{'),'if(!compositionIntrinsics())return JSON.stringify(value);','if(!'+COMPOUND+'())return originalComposer(value);');
  value=once(value,'   const fields=[];','   const children=[];');
  value=once(value,'fields[at]={name,value:field.value};','children[at]={name,child:field.value};');
  value=once(value,'   apply(setAdd,active,[value]);const children=[];','   apply(setAdd,active,[value]);');
  return once(value,'   for(let at=0;at<fields.length;at++){const field=fields[at],child=inspect(field.value,depth+1,field.name,substrate&&array);if(!child){apply(setDelete,active,[value]);return null;}children[at]={name:field.name,child};}','   for(let at=0;at<children.length;at++){const field=children[at],child=inspect(field.child,depth+1,field.name,substrate&&array);if(!child){apply(setDelete,active,[value]);return null;}field.child=child;}');
 });
 // Native ownKeys returns fresh dense ordinary arrays with writable own slots.
 // Descriptor validation remains before descent; reuse adds no inherited write.
 language=once(language,'  // Own literal fields and a linked continuation avoid numeric array writes.','  // Reuse existing writable native ownKeys slots; no inherited slot is added.');language+='\n'+compound+'\n'+legacyComposer+'\n';
 const imported="import {"+TAIL+"} from './private-frozen-json-compound-lexing-candidate.mjs';\n",after=imported+language;
 function whole(path,before,middle,after,changes){
  if(after.split('\n').length>=1000)fail('complete candidate must remain below1000lines');syntax(ts,path,after);const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),rule=(old,value,id)=>({id,edits:[{span:[0,old.length],expected:old,replacement:value}]}),sequence={languageRules:[rule(before,middle,'javascript:complete-source-fresh-conjunction-and-private-scratch-reuse')],repositoryRules:[rule(middle,after,'router:separate-private-json-compound-candidate')]},first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('whole serialized/reparsed source equation differs');const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[rule(after,before,'javascript:restore-complete-original-private-json-source')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==before)fail('whole source inverse differs');files.push({path,before,language:middle,after,current:existsSync(resolve(root,path))?readFileSync(resolve(root,path),'utf8'):null,beforeMeta:first.meta,afterMeta,sequence,trace:run.trace,inverse:before,nativeBindings,changes});
 }
 whole(LEX_OUTPUT,lex,lexLanguage,'// Explicit lexical conjunction copy; default lexical guards unchanged.\n'+lexLanguage,[{source:lexicalSource,tail}]);whole(JSON_OUTPUT,json,language,after,edits);
 for(const input of inputs)if(readFileSync(resolve(root,input.path),'utf8')!==input.source)fail('complete actual input changed during preparation');
 return {schema:'complete-private-json-compound-source-candidate-v1',typescriptVersion:ts.version,inputs,files,compound:{source:compound,lexicalSource,tail,originalComposer,legacyComposer,namespaceImplication:[freeze,namespace,kindNamespace,kindPath].map(node=>({source:node.getText(guardFile),span:[node.getStart(guardFile),node.end]})),sharedCurrentVerdict:false},storageLimitsUnchanged:true,originalDefaultsUnchanged:true,hashCallsChanged:false,newAcrossInvocationCache:false,performanceQualified:false,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('use --emit|--write|--check');const result=preparePrivateFrozenJsonCompound();if(args[0]==='--emit')console.log(JSON.stringify(result));else if(args[0]==='--write'){for(const row of result.files)writeFileSync(resolve(ROOT,row.path),row.after);console.log('Prepared separate private JSON compound copies; defaults unchanged.');}else{if(result.files.some(row=>row.current!==row.after))fail('complete compound source copies are stale or ungenerated');console.log('Complete private JSON compound source equations are current.');}}
