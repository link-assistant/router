// Opt-in immutable traversal DATA. The installed default has no active index.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const OUTPUT='tools/translation/builtin-derive-ast-meta.mjs',PROFILE='tools/translation/source-profiles/builtin-definition-positions/';
const ARCHIVE=PROFILE+'original-builtin-derive-ast-meta.mjs.gz',FRAGMENT=PROFILE+'definition-position-frame.mjs.txt';
const PIN='e568e87935e993223b820a84c45f4aa1b9eca2d96a515f2adebd38a8bfca0ca5',PACKED_PIN='ceeb4436b00db5e94914e400f202f751e08e51c2b7354cfd2eb3a6b395e003be';
const FRAGMENT_PIN='4582aefcb0870d7a70742d8da7c6959ace7840e13563da38a687616dfdff2921';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Builtin definition position source: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one actual native selection required: '+label);return rows[0];};
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function nativeCopy(ts,path,source){
 const file=parse(ts,path,source),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};
 const nodes=file.statements.map(node=>{const copy=ts.getSynthesizedDeepClone(node);detach(copy);return copy;}),copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,nodes));
 const shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 if(JSON.stringify(shape(parse(ts,path,copy)))!==JSON.stringify(shape(file)))fail('complete detached native AST differs');return {source,copy,completeNativeAstCopy:true};
}
function nativeFunction(ts,file,name){return one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name);}
function bind(ts,path,file){
 const absolute=resolve(path),host={getSourceFile:name=>name===absolute?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>resolve('/'),getDirectories:()=>[],fileExists:name=>name===absolute,readFile:name=>name===absolute?file.text:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 return ts.createProgram([absolute],{allowJs:true,noLib:true,noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host).getTypeChecker();
}
function apply(source,edits){let result=source;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(result.slice(...edit.span)!==edit.expected)fail('native original source span changed');result=result.slice(0,edit.span[0])+edit.replacement+result.slice(edit.span[1]);}return result;}
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
function equation(path,before,language,after,ts,nativePath=resolve(ROOT,path)){
 const sequence={languageRules:[rule(before,language,'javascript:index-immutable-original-definition-occurrence-positions')],repositoryRules:[rule(language,after,'router:explicit-synchronous-definition-position-operation')]},first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),stages=[];let document=first.document;
 for(const phase of ['language','repository']){
  const from=phase==='language'?before:language,to=phase==='language'?language:after,beforeMeta=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(beforeMeta);if(fresh.source!==from)fail('complete stage input differs');
  const run=applyConcreteSyntaxSubstitutions(fresh.document,{languageRules:phase==='language'?sequence.languageRules:[],repositoryRules:phase==='repository'?sequence.repositoryRules:[]}),afterMeta=serializeConcreteSyntaxMeta(run.value),readback=transportConcreteSyntaxMeta(afterMeta);if(readback.source!==to)fail('complete stage output differs');
  const inverse=applyConcreteSyntaxSubstitutions(readback.document,{languageRules:phase==='language'?[rule(to,from,'javascript:restore-complete-original-definition-traversal')]:[],repositoryRules:phase==='repository'?[rule(to,from,'router:restore-unexported-private-operation')]:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==from)fail('complete stage inverse differs');
  stages.push({phase,before:from,after:to,beforeMeta,afterMeta,trace:run.trace,completeInverse:true});document=readback.document;
 }
 if(after.split('\n').length>=1000)fail('complete source must remain below1000lines');
 return {path,before,language,after,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.meta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:before,sequence,stages,trace:stages.flatMap(stage=>stage.trace),nativeCopies:[nativeCopy(ts,path,before),nativeCopy(ts,path,after)],nativeBindings:verifyNativeCopiedSourceBindings(ts,nativePath,after),semanticAuthority:false};
}
export function prepareBuiltinDefinitionPositions({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 const packed=readFileSync(resolve(root,ARCHIVE));if(packed.length!==6971||hash(packed)!==PACKED_PIN)fail('complete original archive differs');const raw=gunzipSync(packed,{maxOutputLength:262144});if(raw.length!==25881||hash(raw)!==PIN)fail('complete original module differs');const before=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw),fragment=readFileSync(resolve(root,FRAGMENT),'utf8');
 if(hash(fragment)!==FRAGMENT_PIN)fail('complete authored private frame differs');
 const file=parse(ts,resolve(root,OUTPUT),before),owner=nativeFunction(ts,file,'originalAstDefinition'),calls=[];parse(ts,FRAGMENT,fragment);
 function find(node){if(ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='visit'&&node.expression.arguments.length===1&&ts.isIdentifier(node.expression.arguments[0])&&node.expression.arguments[0].text==='roots')calls.push(node);ts.forEachChild(node,find);}find(owner.body);
 const selected=one(calls,'complete original recursive root scan'),replacement='if(!indexedDefinitionPositions(roots,kind,name,matches,sharing))visit(roots);',edits=[{span:[owner.getStart(file),owner.getStart(file)],expected:'',replacement:fragment+'\n'},{span:[selected.getStart(file),selected.end],expected:selected.getText(file),replacement}];
 if(selected.getText(file)!=='visit(roots);')fail('actual original scan statement differs');
 const checker=bind(ts,resolve(root,OUTPUT),file),visitor=one(owner.body.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='visit'),'actual local recursive visitor'),roots=[];
 function rootBinding(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='roots')roots.push(node);ts.forEachChild(node,rootBinding);}rootBinding(owner.body);const rootDeclaration=one(roots,'actual original immutable roots');
 for(const [reference,declaration]of [[selected.expression.expression,visitor.name],[selected.expression.arguments[0],rootDeclaration.name]]){const symbol=checker.getSymbolAtLocation(declaration);if(!symbol||checker.getSymbolAtLocation(reference)!==symbol)fail('actual selected root scan binding differs');}
 const language=apply(before,edits),after=language+'\nexport {withBuiltinAstDefinitionPositions,builtinAstDefinitionPositionFacts};\n',row=equation(OUTPUT,before,language,after,ts,resolve(root,OUTPUT)),afterFile=parse(ts,OUTPUT,after),copied=nativeFunction(ts,afterFile,'originalAstDefinition');
 const expectedOwner=apply(owner.getText(file),[{span:[selected.getStart(file)-owner.getStart(file),selected.end-owner.getStart(file)],expected:selected.getText(file),replacement}]);if(copied.getText(afterFile)!==expectedOwner)fail('original function contains an unselected source change');
 row.current=readFileSync(resolve(root,OUTPUT),'utf8');if(row.current!==before&&row.current!==after)fail('current complete source differs from both exact layers');
 if(readFileSync(resolve(root,FRAGMENT),'utf8')!==fragment||hash(readFileSync(resolve(root,ARCHIVE)))!==PACKED_PIN)fail('complete producer inputs changed');
 return {schema:'builtin-definition-position-source-v1',typescriptVersion:ts.version,inputs:[{path:ARCHIVE,sha256:PACKED_PIN,source:before,sourceSha256:PIN},{path:FRAGMENT,source:fragment,sha256:hash(fragment)}],files:[{...row,nativeSelections:edits,originalScanBindings:{sameNativeVisitor:true,sameNativeRoots:true},originalOwner:{source:owner.getText(file),span:[owner.getStart(file),owner.end]},unchangedParseHashTail:before.slice(selected.end,owner.end)}],defaultOperationUnchanged:true,allOriginalHashSitesRetained:true,newAcrossInvocationCache:false,semanticAuthority:false,performanceQualified:false};
}
// Receiving-only pure DATA probe copied from the actual installed function.
// No private source/owner issuer or profile tables are exported or reproduced.
export function prepareBuiltinDefinitionPositionDataProbe({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');const path=resolve(root,OUTPUT),before=readFileSync(path,'utf8'),file=parse(ts,path,before),owner=nativeFunction(ts,file,'buildDefinitionPositionIndex'),language=owner.getText(file),after=language+'\nexport {buildDefinitionPositionIndex};\n',row=equation('builtin-definition-position-DATA-probe.mjs',before,language,after,ts);
 if(readFileSync(path,'utf8')!==before)fail('whole actual probe parent changed');return {schema:'builtin-definition-position-DATA-probe-v1',file:row,selection:{span:[owner.getStart(file),owner.end],source:language},semanticAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('use --emit|--write|--check');const plan=prepareBuiltinDefinitionPositions();
 if(args[0]==='--write'){for(const row of plan.files){if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('current source changed before explicit write');writeFileSync(resolve(ROOT,row.path),row.after);}}
 else if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.after))fail('complete generated source is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),semanticAuthority:false,performanceQualified:false}));
}
