// Explicit DATA allocation candidate only; no default parser route changes.
import {readFileSync,writeFileSync,lstatSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),INPUT='tools/translation/private-parser-execution.mjs',OUTPUT='tools/translation/private-parser-assignment-data-candidate.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Private parser assignment source: '+message);};
function one(rows,label){if(rows.length!==1)fail('unique actual native declaration required: '+label);return rows[0];}
function native(ts,path,source){
 const absolute=resolve(path),file=ts.createSourceFile(absolute,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('whole actual native grammar differs');
 const host={getSourceFile:name=>name===absolute?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>resolve('/'),getDirectories:()=>[],fileExists:name=>name===absolute,readFile:name=>name===absolute?source:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 return {file,checker:ts.createProgram([absolute],{allowJs:true,noLib:true,noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host).getTypeChecker()};
}
function declaration(ts,bound,name){return one(bound.file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name);}
function copy(ts,bound,name,replacement,references){
 const node=declaration(ts,bound,name),start=node.getStart(bound.file),before=node.getText(bound.file),edits=[],targets=new Map();
 for(const [old,next]of references){const original=declaration(ts,bound,old),symbol=bound.checker.getSymbolAtLocation(original.name);if(!symbol)fail('actual original private binding absent');targets.set(symbol,{old,next,hits:0});}
 function visit(value){if(ts.isIdentifier(value)){const target=targets.get(bound.checker.getSymbolAtLocation(value));if(target){if(!ts.isCallExpression(value.parent)||value.parent.expression!==value)fail('unexpected actual private reference role');edits.push({span:[value.getStart(bound.file)-start,value.end-start],expected:value.getText(bound.file),replacement:target.next});target.hits++;}}ts.forEachChild(value,visit);}visit(node.body);
 for(const target of targets.values())if(!target.hits)fail('actual private call absent: '+target.old);
 edits.push({span:[node.name.getStart(bound.file)-start,node.name.end-start],expected:name,replacement});let after=before;
 for(const edit of edits.sort((a,b)=>b.span[0]-a.span[0]))after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);
 return {before,after,span:[start,node.end],edits};
}
export function preparePrivateParserAssignmentDataCandidate({root=ROOT}={}){
 root=resolve(root);const path=resolve(root,INPUT),stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2*1024*1024)fail('complete bounded regular original executor required');
 const before=readFileSync(path,'utf8'),sha256=hash(before),ts=ownershipCompiler();if(ts.version!=='5.9.3'||createRequire(resolve(root,'js/package.json'))('typescript')!==ts)fail('actual root TypeScript5.9.3 required');
 const bound=native(ts,path,before),data=copy(ts,bound,'data','assignmentData',new Map([['data','assignmentData']])),execute=copy(ts,bound,'execute','executeAssignmentData',new Map([['data','assignmentData']])),batch=copy(ts,bound,'lexPrivateConcreteSources','lexAssignmentPrivateConcreteSources',new Map([['data','assignmentData']]));
 const copied=native(ts,OUTPUT,data.after),fn=declaration(ts,copied,'assignmentData'),writes=[];
 function visit(node){if(ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&ts.isPropertyAccessExpression(node.expression.expression)&&node.expression.expression.expression.getText(copied.file)==='Object'&&node.expression.expression.name.text==='defineProperty')writes.push(node);ts.forEachChild(node,visit);}visit(fn);
 const write=one(writes,'actual complete data property creation'),call=write.expression;if(call.arguments.length!==3||call.arguments[0].getText(copied.file)!=='result'||call.arguments[1].getText(copied.file)!=='key'||!ts.isObjectLiteralExpression(call.arguments[2]))fail('actual original fresh output write differs');
 const locals=[];function local(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&['result','key'].includes(node.name.text))locals.push(node);ts.forEachChild(node,local);}local(fn.body);
 for(const [name,argument]of [['result',call.arguments[0]],['key',call.arguments[1]]]){const original=one(locals.filter(node=>node.name.text===name),'actual fresh output '+name);if(!copied.checker.getSymbolAtLocation(original.name)||copied.checker.getSymbolAtLocation(argument)!==copied.checker.getSymbolAtLocation(original.name))fail('actual fresh target lexical binding differs');}
 const value=one(call.arguments[2].properties.filter(node=>ts.isPropertyAssignment(node)&&node.name.getText(copied.file)==='value'),'actual complete recursive data value');
 if(!ts.isCallExpression(value.initializer)||value.initializer.expression.getText(copied.file)!=='assignmentData'||copied.checker.getSymbolAtLocation(value.initializer.expression)!==copied.checker.getSymbolAtLocation(fn.name))fail('actual recursive copied DATA binding absent');
 const expected=write.getText(copied.file),replacement="if(key==='__proto__'||key==='get'||key in result) "+expected+'\n    else result[key]='+value.initializer.getText(copied.file)+';',start=write.getStart(copied.file),end=write.end;
 const dataAfter=data.after.slice(0,start)+replacement+data.after.slice(end),language=before+'\n'+dataAfter+'\n'+execute.after+'\n'+batch.after+'\n';
 const adapters="\nexport function lexAssignmentPrivateConcreteSource(source,language){return executeAssignmentData(source,language,'tokens');}\nexport function originalAssignmentPrivateParserSourceInputs(){return executeAssignmentData('','Rust','recipes');}\n",after=language+adapters;
 if(after.split('\n').length>=1000)fail('whole copied executor must remain below1000lines');native(ts,OUTPUT,after);
 const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,OUTPUT),after),rule=(old,next,id)=>({id,edits:[{span:[0,old.length],expected:old,replacement:next}]}),sequence={languageRules:[rule(before,language,'javascript:copy-whole-original-private-DATA-operation-with-absent-key-assignment')],repositoryRules:[rule(language,after,'router:separate-explicit-private-DATA-candidate-entrypoints')]};
 const first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('complete serialized/reparsed source differs');
 const inverseSequence={languageRules:[rule(after,before,'javascript:restore-complete-original-private-executor')],repositoryRules:[]},inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(last.document,inverseSequence).value)).source;if(inverse!==before)fail('whole original source inverse differs');
 if(hash(readFileSync(path))!==sha256)fail('complete actual original executor changed');
 return {schema:'private-parser-assignment-data-source-candidate-v1',inputs:[{path:INPUT,source:before,sha256}],files:[{path:OUTPUT,before,language,after,current:existsSync(resolve(root,OUTPUT))?readFileSync(resolve(root,OUTPUT),'utf8'):null,beforeMeta:first.meta,afterMeta,sequence,inverseSequence,inverse,trace:run.trace,nativeBindings,selection:{data,execute,batch,propertyWrite:{span:[start,end],expected,replacement},originalAPIsUntouched:true,defaultChanged:false}}],defaultChanged:false,performanceQualified:false,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--write','--check'].includes(mode))fail('use --emit|--write|--check');const plan=preparePrivateParserAssignmentDataCandidate();
 if(mode==='--emit')console.log(JSON.stringify(plan));else if(mode==='--write'){for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);console.log('Prepared explicit complete private parser DATA assignment candidate.');}else{if(plan.files.some(row=>row.current!==row.after))fail('complete private executor candidate stale or not materialized');console.log('Complete private executor DATA candidate source equation is current.');}
}
