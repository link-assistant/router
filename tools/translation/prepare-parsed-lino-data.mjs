// Default source proposal: copy closed DATA instead of reparsing the same text.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),TRANSLATOR='tools/translation/js-to-rust/translator.mjs',IR='tools/translation/js-to-rust/vendor/ir.mjs',LINO='tools/translation/js-to-rust/vendor/lino.mjs',GUARDS='tools/translation/original-json-intrinsics.mjs';
const ARCHIVE=new URL('./source-profiles/native-parsed-lino-data/originals.json.gz',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Parsed Lino DATA source: '+message);};
const COPY=String.raw`
// DATA decoding only. Neither public closed DATA nor these predicates issue
// source, native grammar, type, owner or executable authority.
export function parsedLinoDataCopyReady(){
 return __linoStaticReady()&&__linoIngressReady()&&__linoFreezeReady();
}
function __copyClosedLinoData(value){
 if(!parsedLinoDataCopyReady())return null;
 const ops={proxy:__linoTypes.isProxy,array:Array.isArray,prototype:Object.getPrototypeOf,keys:Reflect.ownKeys,field:Object.getOwnPropertyDescriptor,own:Object.hasOwn,define:Object.defineProperty,apply:Reflect.apply,Set,has:Set.prototype.has,add:Set.prototype.add,remove:Set.prototype.delete,arrayPrototype:Array.prototype,objectPrototype:Object.prototype};
 const seen=new ops.Set();let cells=0,units=0,bad=false;
 function visit(value,depth){
  if(bad||++cells>200000||depth>256){bad=true;return undefined;}
  if(typeof value==='string'){units+=value.length;if(units>33554432)bad=true;return value;}
  if(!value||typeof value!=='object'||ops.proxy(value)||ops.apply(ops.has,seen,[value])){bad=true;return undefined;}
  const array=ops.array(value),parent=ops.prototype(value),names=ops.keys(value);
  if(parent!==(array?ops.arrayPrototype:ops.objectPrototype)){bad=true;return undefined;}
  if(!array){
   if(names.length!==1||names[0]!=='quoted'){bad=true;return undefined;}
   const field=ops.field(value,'quoted');if(!field||!ops.own(field,'value')||typeof field.value!=='string'||!field.enumerable||!field.writable||!field.configurable){bad=true;return undefined;}
   const quoted=visit(field.value,depth+1);return {quoted};
  }
  const length=ops.field(value,'length');
  if(!length||!ops.own(length,'value')||typeof length.value!=='number'||length.value<0||length.value%1||length.value>200000||length.enumerable||length.configurable||!length.writable||names.length!==length.value+1||names[length.value]!=='length'){bad=true;return undefined;}
  ops.apply(ops.add,seen,[value]);const copy=[];
  for(let at=0;at<length.value;at++){
   if(names[at]!==''+at){bad=true;break;}const field=ops.field(value,names[at]);
   if(!field||!ops.own(field,'value')||!field.enumerable||!field.writable||!field.configurable){bad=true;break;}
   const child=visit(field.value,depth+1);if(bad)break;ops.define(copy,''+at,{value:child,enumerable:true,writable:true,configurable:true});
  }
  ops.apply(ops.remove,seen,[value]);return copy;
 }
 if(!ops.array(value))return null;const result=visit(value,0);
 return bad||!parsedLinoDataCopyReady()?null:result;
}
export function tryDecodeCopiedLinoData(links){
 const __linoDataCopy=__copyClosedLinoData(links);if(__linoDataCopy===null)return null;
@ORIGINAL_RETURN@
}
`;
function originals(){const packed=readFileSync(ARCHIVE);if(packed.length!==34431||hash(packed)!=='b8fe71b1dfd2e860554414c5d39a53083aa5cb249c286c279203f15bf21b9da2')fail('complete original archive changed');const raw=gunzipSync(packed,{maxOutputLength:262144});if(raw.length!==159274||hash(raw)!=='dda05882b09704c145fe858cd4f549d9636c35fc6056bf50adde6d35c367b435')fail('complete original bytes changed');const packet=JSON.parse(raw.toString('utf8'));if(packet.schema!=='native-parsed-lino-data-originals-v1'||packet.files.length!==4||packet.files.map(row=>row.path).join('\n')!==[TRANSLATOR,IR,LINO,GUARDS].join('\n')||packet.files.some(row=>hash(row.source)!==row.sha256))fail('complete original census/hash differs');return {...packet,packed};}
function one(rows,label){if(rows.length!==1)fail('one actual native '+label+' required');return rows[0];}
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function bound(ts,path,source){const absolute=resolve(ROOT,path),file=parse(ts,absolute,source),host={getSourceFile:name=>name===absolute?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>resolve('/'),getDirectories:()=>[],fileExists:name=>name===absolute,readFile:name=>name===absolute?source:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};return {file,checker:ts.createProgram([absolute],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker()};}
function shape(ts,node){const children=[];ts.forEachChild(node,child=>{children.push(shape(ts,child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];}
function detached(ts,node){const copy=ts.getSynthesizedDeepClone(node),clear=value=>{ts.setTextRange(value,{pos:-1,end:-1});ts.setOriginalNode(value,undefined);ts.forEachChild(value,clear);};clear(copy);return copy;}
function nativeCopy(ts,path,source){const file=parse(ts,path,source),copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,file.statements.map(node=>detached(ts,node))));if(JSON.stringify(shape(ts,file))!==JSON.stringify(shape(ts,parse(ts,path,copy))))fail('complete detached native copy differs');return {source,copy,completeNativeAstCopy:true};}
function edits(source,rows){let after=source,last=source.length+1;for(const row of [...rows].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>last||after.slice(...row.span)!==row.expected)fail('complete native edit span differs');last=row.span[0];after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);}return after;}
function inverseEdits(source,rows){let delta=0;return [...rows].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{const start=row.span[0]+delta;delta+=row.replacement.length-row.expected.length;return {span:[start,start+row.replacement.length],expected:row.replacement,replacement:row.expected};});}
function observedCalls(ts,path,source){const file=parse(ts,path,source),calls=[];const visit=node=>{if(ts.isCallExpression(node)&&(ts.isPropertyAccessExpression(node.expression)&&['update','digest'].includes(node.expression.name.text)||ts.isPropertyAccessExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='JSON'&&['parse','stringify'].includes(node.expression.name.text)))calls.push(node.getText(file));ts.forEachChild(node,visit);};visit(file);return calls;}
function importName(ts,file,module,name){const entries=[];for(const node of file.statements)if(ts.isImportDeclaration(node)&&node.moduleSpecifier.text===module&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings))for(const spec of node.importClause.namedBindings.elements)if((spec.propertyName??spec.name).text===name)entries.push({node,spec});return one(entries,module+':'+name);}
function derive(ts,rows){
 const old=Object.fromEntries(rows.map(row=>[row.path,row.source])),ir=bound(ts,IR,old[IR]),caller=bound(ts,TRANSLATOR,old[TRANSLATOR]);
 for(const {file}of [ir,caller]){const visit=node=>{if(ts.isIdentifier(node)&&(node.text.startsWith('__lino')||['__copyClosedLinoData','parsedLinoDataCopyReady','tryDecodeCopiedLinoData'].includes(node.text)))fail('new private binding would capture original source');ts.forEachChild(node,visit);};visit(file);}
 const fn=one(ir.file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='fromLino'),'original public lowering'),returned=one(fn.body.statements.filter(ts.isReturnStatement),'complete original lowering return'),calls=[];
 const parseImport=importName(ts,ir.file,'./lino.mjs','parseLinks'),parseSymbol=ir.checker.getSymbolAtLocation(parseImport.spec.name),itemOf=one(ir.file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='itemOf'),'original decoder');
 function find(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&ir.checker.getSymbolAtLocation(node.expression)===parseSymbol)calls.push(node);ts.forEachChild(node,find);}find(returned);
 const call=one(calls,'middle syntax parse');if(call.arguments.length!==1||call.arguments[0].getText(ir.file)!=='text'||fn.parameters.length!==1||ir.checker.getSymbolAtLocation(call.arguments[0])!==ir.checker.getSymbolAtLocation(fn.parameters[0].name))fail('complete original primitive source argument differs');
 const callback=returned.expression.arguments?.[0];if(!callback||ir.checker.getSymbolAtLocation(callback)!==ir.checker.getSymbolAtLocation(itemOf.name))fail('actual original decoder lexical binding differs');
 const printed=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printNode(ts.EmitHint.Unspecified,detached(ts,returned),ir.file),lower=returned.getText(ir.file),changed=edits(lower,[{span:[call.getStart(ir.file)-returned.getStart(ir.file),call.end-returned.getStart(ir.file)],expected:call.getText(ir.file),replacement:'__linoDataCopy'}]);
 if(!printed||changed===lower)fail('complete original return copy absent');
 const irAppend=COPY.replace('@ORIGINAL_RETURN@',changed),irLanguage=old[IR]+irAppend,util=one(ir.file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='node:util'),'original util import');
 const lastImport=ir.file.statements.filter(ts.isImportDeclaration).at(-1),irImport={span:[util.getStart(ir.file),util.end],expected:util.getText(ir.file),replacement:util.getText(ir.file).replace('{','{types as __linoTypes,')},irImports=[irImport,{span:[lastImport.end,lastImport.end],expected:'',replacement:"\nimport {originalStaticSourceIntrinsicsUnchanged as __linoStaticReady,originalPrivateParserIngressUnchanged as __linoIngressReady,originalDataFreezeIntrinsicsUnchanged as __linoFreezeReady} from '../../original-json-intrinsics.mjs';"}],irAfter=edits(irLanguage,irImports);
 if(one(parse(ts,IR,irAfter).statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='fromLino'),'unchanged original public lowering').getText()!==fn.getText(ir.file))fail('original public fromLino changed');
 const entry=one(caller.file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='parseMeta'),'complete semantic parser'),originalFrom=importName(ts,caller.file,'./vendor/ir.mjs','fromLino'),originalSymbol=caller.checker.getSymbolAtLocation(originalFrom.spec.name),selected=[];
 function select(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&caller.checker.getSymbolAtLocation(node.expression)===originalSymbol)selected.push(node);ts.forEachChild(node,select);}select(entry);
 const decode=one(selected,'semantic parser original lowering call'),first=one(entry.body.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).filter(node=>node.name.getText(caller.file)==='links'),'first original syntax parse');
 const firstImport=importName(ts,caller.file,'./vendor/lino.mjs','parseLinks'),firstSymbol=caller.checker.getSymbolAtLocation(firstImport.spec.name),textSymbol=caller.checker.getSymbolAtLocation(entry.parameters[0].name);
 if(decode.getText(caller.file)!=='fromLino(text)'||first.initializer.getText(caller.file)!=='parseLinks(text)'||caller.checker.getSymbolAtLocation(first.initializer.expression)!==firstSymbol||caller.checker.getSymbolAtLocation(first.initializer.arguments[0])!==textSymbol||caller.checker.getSymbolAtLocation(decode.arguments[0])!==textSymbol)fail('complete original first/middle parse lexical binding differs');
 const sourceEdits=[{span:[entry.body.getStart(caller.file)+1,entry.body.getStart(caller.file)+1],expected:'',replacement:"\n  const __linoEntryReady=typeof text==='string'&&parsedLinoDataCopyReady();"},{span:[decode.getStart(caller.file),decode.end],expected:decode.getText(caller.file),replacement:'(__linoEntryReady?tryDecodeCopiedLinoData(links):null)??fromLino(text)'}],translatorLanguage=edits(old[TRANSLATOR],sourceEdits),specifier=originalFrom.node.importClause.namedBindings,importEdit={span:[specifier.getStart(caller.file),specifier.end],expected:specifier.getText(caller.file),replacement:specifier.getText(caller.file).replace('{','{parsedLinoDataCopyReady,tryDecodeCopiedLinoData,')},translatorAfter=edits(translatorLanguage,[importEdit]);
 const result=[{path:IR,before:old[IR],language:irLanguage,after:irAfter,selection:{completeOriginalLowering:fn.getText(ir.file),completeCopiedReturn:changed,originalReturn:lower,originalParseCall:call.getText(ir.file),actualDecoderSymbol:'itemOf',originalPublicLoweringUnchanged:true,languageEdits:[{span:[old[IR].length,old[IR].length],expected:'',replacement:irAppend}],repositoryEdits:irImports}},{path:TRANSLATOR,before:old[TRANSLATOR],language:translatorLanguage,after:translatorAfter,selection:{completeOriginalParser:entry.getText(caller.file),languageEdits:sourceEdits,repositoryEdits:[importEdit],firstSyntaxParseUnchanged:first.getText(caller.file),actualOriginalDecoderImport:originalFrom.node.getText(caller.file),originalCanonicalAndSemanticChecksUnchanged:true}}];
 for(const row of result){parse(ts,row.path,row.after);if(row.after.split('\n').length>=1000)fail('complete source line bound');const repositoryInverse=inverseEdits(row.language,row.selection.repositoryEdits),languageInverse=inverseEdits(row.before,row.selection.languageEdits);if(edits(row.after,repositoryInverse)!==row.language||edits(row.language,languageInverse)!==row.before)fail('complete independent native edit inverse differs');row.selection.nativeInverse={repositoryInverse,languageInverse,source:row.before};if(JSON.stringify(observedCalls(ts,row.path,row.before))!==JSON.stringify(observedCalls(ts,row.path,row.after)))fail('complete original Hash/JSON call sites differ');}
 return result;
}
function rule(before,after,id){return {id,edits:[{span:[0,before.length],expected:before,replacement:after}]};}
export function prepareParsedLinoData({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');const birth=originals(),derived=derive(ts,birth.files),inputs=birth.files.map(row=>{const source=readFileSync(resolve(root,row.path),'utf8'),target=derived.find(file=>file.path===row.path);if(source!==row.source&&source!==target?.after)fail('complete original/current source equation differs: '+row.path);return {path:row.path,source,sha256:hash(source)};}),files=[];
 for(const source of derived){const {before,language,after}=source,first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),stages=[];let document=first.document;
  for(const phase of ['language','repository']){const from=phase==='language'?before:language,to=phase==='language'?language:after,beforeMeta=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(beforeMeta);if(fresh.source!==from)fail('complete original stage input differs');const sequence={languageRules:phase==='language'?[rule(from,to,'javascript:copy-original-closed-Lino-DATA-decoder')]:[],repositoryRules:phase==='repository'?[rule(from,to,'router:bind-qualified-private-data-and-original-fallback')]:[]},run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==to)fail('complete stage source differs');const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:phase==='language'?[rule(to,from,'javascript:restore-whole-original-Lino-source')]:[],repositoryRules:phase==='repository'?[rule(to,from,'router:restore-original-imports-and-fallback')]:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==from)fail('complete original inverse differs');stages.push({phase,before:from,after:to,beforeMeta,afterMeta,sequence,trace:run.trace,completeInverse:true});document=last.document;}
  files.push({...source,current:inputs.find(row=>row.path===source.path).source,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.meta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:before,stages,trace:stages.flatMap(stage=>stage.trace),sourceLanguage:'JavaScript',nativeCopies:[nativeCopy(ts,source.path,before),nativeCopy(ts,source.path,after)],nativeBindings:verifyNativeCopiedSourceBindings(ts,resolve(root,source.path),after)});
 }
 for(const row of inputs)if(readFileSync(resolve(root,row.path),'utf8')!==row.source)fail('complete source changed at final input join: '+row.path);if(!readFileSync(ARCHIVE).equals(birth.packed))fail('complete original archive changed');
 return {schema:'parsed-Lino-detached-DATA-source-v1',typescriptVersion:ts.version,inputs,files,defaultAdoption:true,oldPublicFromLinoUnchanged:true,firstSyntaxAndCanonicalReparsePreserved:true,bothSemanticChecksPreserved:true,hashAndJsonCallSitesPreserved:true,newAcrossInvocationCache:false,sourceAuthority:false,runtimeAuthority:false,runtimeExecuted:false,rustExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('usage: --emit|--write|--check');const plan=prepareParsedLinoData();if(args[0]==='--emit')console.log(JSON.stringify(plan));else if(args[0]==='--write'){for(const row of plan.inputs)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.source)fail('complete input changed before write');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}else if(plan.files.some(row=>row.current!==row.after))fail('complete adopted decoder source is stale');}
