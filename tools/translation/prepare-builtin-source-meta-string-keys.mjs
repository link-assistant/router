// Complete original source and native AST copies; DATA transformations only.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const path='tools/translation/builtin-source-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Builtin source string keys: '+message);};
const imports="import {builtinSourceMetaStringKeysReady} from './builtin-source-meta-intrinsics.mjs';\nimport {privateNativeProofJsonDataWithinBudget} from './private-native-proof-json.mjs';\n";
const wrapper=`// Fresh invocation-local primitive keys only. The original codec remains the
// fallback for every graph or intrinsic outside the callback-free DATA domain.
export function encodeBuiltinSourceMeta(value){
  const strings=builtinSourceMetaStringKeysReady()&&privateNativeProofJsonDataWithinBudget(value)?new Map():null;
  return encodeOriginalBuiltinSourceMeta(value,strings);
}
`;
const branch=`      if(strings){
        let index=strings.get(value);
        if(index===undefined){index=table.length;if(index>=bounds.cells)throw new TypeError('Builtin source metadata cell budget exceeded');table.push(['s',value]);strings.set(value,index);}
        return -index-1;
      }
`;
function once(source,before,after){if(source.split(before).length!==2)fail('unique complete source substitution required');return source.replace(before,()=>after);}
export function originalBuiltinSourceMetaCodec(){
 const bytes=gunzipSync(readFileSync(new URL('./source-profiles/builtin-source-meta-string-keys/complete-original-codec.mjs.gz',import.meta.url)),{maxOutputLength:32768});
 if(bytes.length!==5339||hash(bytes)!=='930c5f69c73f4016dd2ea839bf669f858c436fd999beae12b3dd32713b527cb4')fail('complete original codec differs');
 const source=bytes.toString('utf8');if(!Buffer.from(source).equals(bytes))fail('lossless original source required');return source;
}
function nativeCopies(before,after){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const parse=source=>{const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;};
 const syntax=parse(before),current=parse(after),originals=syntax.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='encodeBuiltinSourceMeta');
 if(originals.length!==1)fail('unique complete original encoder required');
 const original=originals[0],prefix='if(strings){'+branch.slice(branch.indexOf('{')+1,branch.lastIndexOf('}'))+'}',template=parse(prefix),addition=ts.getSynthesizedDeepClone(template.statements[0]);
 const detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};detach(addition);
 if(!ts.isIfStatement(addition))fail('complete native inserted statement required');
 let replacements=0;
 const transformed=ts.transform(original,[context=>node=>ts.visitNode(node,function visit(part){
  if(ts.isIfStatement(part)&&part.expression.getText(syntax)==="typeof value==='string'&&value.length>=8"){
   if(!ts.isBlock(part.thenStatement))fail('original string branch must be a complete block');replacements++;
   return ts.factory.updateIfStatement(part,part.expression,ts.factory.updateBlock(part.thenStatement,[addition,...part.thenStatement.statements]),part.elseStatement);
  }
  return ts.visitEachChild(part,visit,context);
 })]);
 try{
  if(replacements!==1)fail('one actual original AST branch required');
  const copy=transformed.transformed[0],parameter=ts.factory.createParameterDeclaration(undefined,undefined,'strings',undefined,undefined,ts.factory.createNull());
  const selected=ts.factory.updateFunctionDeclaration(copy,undefined,copy.asteriskToken,'encodeOriginalBuiltinSourceMeta',copy.typeParameters,[...copy.parameters,parameter],copy.type,copy.body);
  const matches=current.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='encodeOriginalBuiltinSourceMeta');if(matches.length!==1)fail('unique current helper required');
  const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}),printed=printer.printNode(ts.EmitHint.Unspecified,selected,syntax),actual=printer.printNode(ts.EmitHint.Unspecified,matches[0],current);
  if(printed!==actual){let at=0;while(at<printed.length&&printed[at]===actual[at])at++;fail('actual native factory copy differs from current helper: '+JSON.stringify({at,copy:printed.slice(at,at+160),actual:actual.slice(at,at+160)}));}
  return {typescriptVersion:ts.version,originalSpan:[original.getStart(syntax),original.end],originalFunction:original.getText(syntax),actualHelper:matches[0].getText(current),factoryCopy:printed,currentNativeCopy:actual,completeNativeCopy:true};
 }finally{transformed.dispose();}
}
function stage(before,after,phase,id){
 const input=transportConcreteSyntaxSource(before,{language:'JavaScript'}),wire=serializeConcreteSyntaxMeta(input.document),fresh=transportConcreteSyntaxMeta(wire);
 if(fresh.source!==before)fail('complete original CST differs');
 const edits=before===after?[]:[{span:[0,before.length],expected:before,replacement:after}],rule={id,edits},sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]};
 const run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),encoded=serializeConcreteSyntaxMeta(run.value),output=transportConcreteSyntaxMeta(encoded);if(output.source!==after)fail('complete after CST differs');
 const inverse={id:id+'-inverse',edits:before===after?[]:[{span:[0,after.length],expected:after,replacement:before}]},undo=applyConcreteSyntaxSubstitutions(output.document,{languageRules:phase==='language'?[inverse]:[],repositoryRules:phase==='repository'?[inverse]:[]});
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undo.value)).source!==before)fail('complete original inverse differs');
 return {phase,id,before,after,beforeMeta:wire,afterMeta:encoded,trace:run.trace,completeInverse:true};
}
export function prepareBuiltinSourceMetaStringKeys(){
 const before=originalBuiltinSourceMetaCodec(),signature='export function encodeBuiltinSourceMeta(value){',helper='function encodeOriginalBuiltinSourceMeta(value,strings=null){';
 let language=once(before,signature,helper);language=once(language,"    if(typeof value==='string'&&value.length>=8){\n","    if(typeof value==='string'&&value.length>=8){\n"+branch);
 const after=once(once(language,"import {createHash} from 'node:crypto';\n","import {createHash} from 'node:crypto';\n"+imports),helper,wrapper+helper),actual=readFileSync(resolve(root,path),'utf8');
 if(actual!==after)fail('complete actual source differs from proposal');
 const native=nativeCopies(before,after),stages=[stage(before,language,'language','javascript:invocation-local-primitive-string-identity'),stage(language,after,'repository','router:guard-original-codec-string-keys')];
 const ts=ownershipCompiler(),support=[];
 for(const name of ['builtin-source-meta-intrinsics.mjs','private-native-proof-json.mjs']){
  const source=readFileSync(new URL('./'+name,import.meta.url),'utf8'),file=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete support grammar differs');
  const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);if(transportConcreteSyntaxMeta(wire).source!==source)fail('complete support CST differs');
  support.push({path:'tools/translation/'+name,source,sha256:hash(source),nativeGrammar:true,completeMeta:wire});
 }
 const bytes=gunzipSync(readFileSync(new URL('./source-profiles/builtin-source-meta-string-keys/complete-original-private-native-proof-json.mjs.gz',import.meta.url)),{maxOutputLength:65536});
 if(bytes.length!==23641||hash(bytes)!=='b02892e676b928339f15d2a529d0467dfd60efedbe8e991df0910400289db338')fail('complete original scanner source differs');
 const original=bytes.toString('utf8'),current=support[1].source,oldSyntax=ts.createSourceFile('private-native-proof-json.mjs',original,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),newSyntax=ts.createSourceFile('private-native-proof-json.mjs',current,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const additions=newSyntax.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='privateNativeProofJsonDataWithinBudget');if(additions.length!==1)fail('one native stateless scan export required');
 const restored=ts.factory.updateSourceFile(newSyntax,newSyntax.statements.filter(node=>node!==additions[0])),printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true});
 if(printer.printFile(restored)!==printer.printFile(oldSyntax))fail('an original scanner API changed');
 const scannerStages=[stage(original,current,'language','javascript:expose-existing-stateless-DATA-census'),stage(current,current,'repository','router:retain-original-proof-serializer-APIs')];
 return {schema:'builtin-source-meta-string-keys-source-v1',path,before,after,beforeSha256:hash(before),afterSha256:hash(after),native,stages,support,scannerStages,originalSerializerAPIsUnchanged:true,acrossInvocationCaches:false,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,performanceQualified:false};
}
