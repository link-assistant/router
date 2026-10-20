// Source qualification only: complete authored JavaScript is copied through
// the native TypeScript AST and both ordered CST layers, including inverses.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Namespace feature source copy: '+message);};
export function prepareNamespaceFeatureGate(){
 const packed=readFileSync(new URL('./source-profiles/namespace-feature-gate/complete-original-feature-issuer.mjs.gz',import.meta.url)),bytes=gunzipSync(packed,{maxOutputLength:32768});
 if(bytes.length!==13319||hash(bytes)!=='edae0b25c4028cfca502b48e38ac76a9fed90ef9743b1d84193735a88175ec46')fail('complete original authored source differs');
 const original=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(bytes),actual=readFileSync(new URL('./namespace-feature-gate.mjs',import.meta.url),'utf8');if(original!==actual)fail('actual complete issuer differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const parse=source=>{const file=ts.createSourceFile('namespace-feature-gate.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native JavaScript grammar differs');return file;};
 const before=parse(original),after=parse(actual),copies=before.statements.map(node=>ts.getSynthesizedDeepClone(node));
 const detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};copies.forEach(detach);
 const copied=ts.factory.updateSourceFile(before,copies),printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}),copy=printer.printFile(copied),current=printer.printFile(after);
 const structure=node=>{const children=[];ts.forEachChild(node,child=>{children.push(structure(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 // The native printer can retain original single-line hints. Compare complete
 // reparsed syntax, including every token node and literal, across that trivia.
 if(JSON.stringify(structure(parse(copy)))!==JSON.stringify(structure(after)))fail('actual complete reparsed native AST copy differs');
 const callbacks=before.statements.filter(node=>ts.isFunctionDeclaration(node)).map(node=>({name:node.name.text,span:[node.getStart(before),node.end],original:node.getText(before)}));
 const stages=[];let document=transportConcreteSyntaxSource(original,{language:'JavaScript'}).document;
 for(const phase of ['language','repository']){
  const wire=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(wire);if(fresh.source!==original)fail('serialized original CST differs');
  const id=phase==='language'?'javascript:complete-native-feature-source-copy':'router:private-feature-evidence-boundary',rule={id,edits:[]},sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]},run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),encoded=serializeConcreteSyntaxMeta(run.value),reparsed=transportConcreteSyntaxMeta(encoded);
  if(reparsed.source!==actual)fail('complete actual CST copy differs');
  const inverse={id:id+'-inverse',edits:[]},undo=applyConcreteSyntaxSubstitutions(reparsed.document,{languageRules:phase==='language'?[inverse]:[],repositoryRules:phase==='repository'?[inverse]:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undo.value)).source!==original)fail('complete original inverse differs');
  stages.push({phase,id,before:original,after:actual,beforeMeta:wire,afterMeta:encoded,trace:run.trace,completeInverse:true});document=reparsed.document;
 }
 return {schema:'namespace-feature-complete-source-copy-v1',path:'tools/translation/namespace-feature-gate.mjs',original,actual,originalSha256:hash(original),actualSha256:hash(actual),typescriptVersion:ts.version,callbacks,completeNativeAstCopy:true,nativeFactoryCopy:copy,currentNativeSource:current,stages,RustProgramExecuted:false,namespaceAuthority:false,runtimeAuthority:false};
}
