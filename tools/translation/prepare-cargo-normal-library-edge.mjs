// Source qualification only: complete authored JavaScript is copied through
// the native TypeScript AST and both ordered CST layers, including inverses.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Cargo normal-library source copy: '+message);};
export function prepareCargoNormalLibraryEdge(){
 const packed=readFileSync(new URL('./source-profiles/cargo-normal-library-edge/complete-original.mjs.gz',import.meta.url)),bytes=gunzipSync(packed,{maxOutputLength:32768});
 if(bytes.length!==12862||hash(bytes)!=='e837abdf0a32c2a3650952b1d25703e1da612a5bec20b0f0d0ab81bb4b783c98')fail('complete original authored source differs');
 const original=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(bytes),actual=readFileSync(new URL('./cargo-normal-library-edge.mjs',import.meta.url),'utf8');
 const substitutions=[
  [
    "import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';",
    "import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalPrivateParserIngressUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';"
  ],
  [
    "const initial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();",
    "const initial=originalPrivateParserIngressUnchanged()&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();"
  ],
  [
    "const plans=new WeakSet(),edges=new WeakMap();",
    "const plans=initial?new WeakSet():null,edges=initial?new WeakMap():null;"
  ],
  [
    "const hash=value=>createHash('sha256').update(value).digest('hex');",
    "const hash=value=>{const result=createHash('sha256').update(value).digest('hex');guard();return result;};"
  ],
  [
    "function guard(){if(!initial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('qualified original source operations changed');assertPrivateOriginalCargoTomlExecution();}",
    "function guard(){if(!initial||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('qualified original source operations changed');assertPrivateOriginalCargoTomlExecution();}"
  ]
];
 let language=original;for(const [before,after]of substitutions){if(language.split(before).length!==2)fail('one complete original guard source required');language=language.replace(before,()=>after);}if(language!==actual)fail('actual complete issuer differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const parse=source=>{const file=ts.createSourceFile('cargo-normal-library-edge.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native JavaScript grammar differs');return file;};
 const before=parse(language),after=parse(actual),copies=before.statements.map(node=>ts.getSynthesizedDeepClone(node));
 const detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};copies.forEach(detach);
 const copied=ts.factory.updateSourceFile(before,copies),printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}),copy=printer.printFile(copied),current=printer.printFile(after);
 const structure=node=>{const children=[];ts.forEachChild(node,child=>{children.push(structure(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 // The native printer can retain original single-line hints. Compare complete
 // reparsed syntax, including every token node and literal, across that trivia.
 if(JSON.stringify(structure(parse(copy)))!==JSON.stringify(structure(after)))fail('actual complete reparsed native AST copy differs');
 const callbacks=before.statements.filter(node=>ts.isFunctionDeclaration(node)).map(node=>({name:node.name.text,span:[node.getStart(before),node.end],original:node.getText(before)}));
 const stages=[];let document=transportConcreteSyntaxSource(original,{language:'JavaScript'}).document;
 for(const phase of ['language','repository']){
  const source=phase==='language'?original:language,wire=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(wire);if(fresh.source!==source)fail('serialized original CST differs');
  const id=phase==='language'?'javascript:complete-native-library-edge-source-copy':'router:private-library-edge-relational-boundary',rule={id,edits:phase==='language'?[{span:[0,original.length],expected:original,replacement:language}]:[]},sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]},run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),encoded=serializeConcreteSyntaxMeta(run.value),reparsed=transportConcreteSyntaxMeta(encoded);
  if(reparsed.source!==actual)fail('complete actual CST copy differs');
  const inverse={id:id+'-inverse',edits:phase==='language'?[{span:[0,language.length],expected:language,replacement:original}]:[]},undo=applyConcreteSyntaxSubstitutions(reparsed.document,{languageRules:phase==='language'?[inverse]:[],repositoryRules:phase==='repository'?[inverse]:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undo.value)).source!==source)fail('complete original inverse differs');
  stages.push({phase,id,before:source,after:actual,beforeMeta:wire,afterMeta:encoded,trace:run.trace,completeInverse:true});document=reparsed.document;
 }
 return {schema:'cargo-normal-library-edge-complete-source-copy-v1',path:'tools/translation/cargo-normal-library-edge.mjs',original,actual,originalSha256:hash(original),actualSha256:hash(actual),typescriptVersion:ts.version,callbacks,completeNativeAstCopy:true,nativeFactoryCopy:copy,currentNativeSource:current,stages,RustProgramExecuted:false,namespaceAuthority:false,runtimeAuthority:false};
}
