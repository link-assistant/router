// Complete native copy of the existing source-backed matches corpus machinery.
// Only selection grammar, explicit target name and DATA schema change. The old
// literal API, inspection issuer, other-macro barriers and callbacks stay exact.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),INPUT='tools/translation/source-backed-core-matches.mjs',OUTPUT='tools/translation/source-backed-core-unit-matches.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Source-backed unit matches preparation: '+message);};
const HEADER=String.raw`function unitMatchesFunctionHeader(tokens) {
  const fn=tokens.findIndex(token=>token.text==='fn');
  if(fn<0||tokens.slice(0,fn).some(token=>['async','unsafe','extern'].includes(token.text))||tokens[fn+2]?.text!=='(')return false;
  const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
  let at=fn+3;
  while(tokens[at]?.text!==')'){
    if(!ident(tokens[at])||tokens[at+1]?.text!==':')return false;at+=2;
    if(tokens[at]?.text==='&'){
      const borrowed=['&','crate','::','translation_core','::','Str'];
      if(!borrowed.every((word,index)=>tokens[at+index]?.text===word))return false;at+=borrowed.length;
    }else{
      if(!ident(tokens[at])||['mut','impl','dyn','Self'].includes(tokens[at].text))return false;at++;
      while(tokens[at]?.text==='::'){if(!ident(tokens[at+1]))return false;at+=2;}
    }
    if(tokens[at]?.text!==')'){if(tokens[at++]?.text!==',')return false;}
    if(at>=tokens.length)return false;
  }
  if(tokens[++at]?.text!=='->')return false;at++;
  if(tokens[at]?.text==='bool')at++;
  else{const borrowed=['&','crate','::','translation_core','::','Str'];if(!borrowed.every((word,index)=>tokens[at+index]?.text===word))return false;at+=borrowed.length;}
  return tokens[at]?.text==='{';
}`;
const INPUT_GRAMMAR=String.raw`function unitMatchesInput(tokens,at) {
  if(literalMatchesInput(tokens,at))return 'literal';
  const open=at+(tokens[at].text==='matches!'?1:2),pairs={'(':')','[':']','{':'}'};
  if(!Object.hasOwn(pairs,tokens[open]?.text))return false;
  const stack=[pairs[tokens[open].text]];let comma=-1,end=-1;
  for(let index=open+1;index<tokens.length;index++){
    const token=tokens[index];if(['string','char','comment'].includes(token.type))continue;
    if(Object.hasOwn(pairs,token.text))stack.push(pairs[token.text]);
    else if([')',']','}'].includes(token.text)){if(stack.pop()!==token.text)return false;if(!stack.length){end=index;break;}}
    else if(token.text===','&&stack.length===1&&comma<0)comma=index;
  }
  if(comma<=open+1||end<0)return false;
  const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
  let index=comma+1,alternatives=0;if(tokens[index]?.text==='|')index++;
  while(index<end){
    if(!ident(tokens[index]))return false;index++;let parts=1;
    while(tokens[index]?.text==='::'){if(!ident(tokens[index+1]))return false;index+=2;parts++;}
    if(parts<2||++alternatives>256)return false;
    if(index===end||tokens[index]?.text===','&&index+1===end)return 'unit';
    if(tokens[index++]?.text!=='|')return false;
  }
  return false;
}`;
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function originalFunction(ts,file,name){const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);if(rows.length!==1)fail('one complete original function required: '+name);return rows[0];}
function nativeCopy(ts,path,source){const file=parse(ts,path,source),detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);},nodes=file.statements.map(node=>{const copy=ts.getSynthesizedDeepClone(node);detach(copy);return copy;}),copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,nodes));const shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};if(JSON.stringify(shape(parse(ts,path,copy)))!==JSON.stringify(shape(file)))fail('complete detached native AST differs');return {source,copy,completeNativeAstCopy:true};}
function once(source,before,after){if(source.split(before).length!==2)fail('one original source equation required: '+before);return source.replace(before,()=>after);}
export function prepareSourceBackedUnitMatches({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 const source=readFileSync(resolve(root,INPUT),'utf8'),file=parse(ts,INPUT,source),header=originalFunction(ts,file,'literalMatchesFunctionHeader'),input=originalFunction(ts,file,'literalMatchesInput'),changes=[];
 const names=new Map([['migrateOriginalProducerMatches','migrateOriginalProducerUnitMatches'],['proposeSourceBackedCoreLiteralMatchesCorpus','proposeSourceBackedCoreUnitMatchesCorpus'],['literalMatchesFunctionHeader','unitMatchesFunctionHeader'],['literalMatchesInput','unitMatchesInput']]);
 const literals=new Map([['owned-literal-matches-source-adoption-v1','owned-unit-matches-source-adoption-v1'],['router-owned-source-backed-matches-corpus-proposal-v1','router-owned-source-backed-unit-matches-corpus-proposal-v1'],['router-core:adopt-owned-literal-matches','router-core:adopt-owned-unit-matches'],['router-core:restore-original-literal-matches-source','router-core:restore-original-unit-matches-source'],['requires a scalar-input boolean function and literal scalar patterns at every selected call','requires ordinary unit-enum/borrowed-text inputs, boolean/borrowed-text result and only separate literal scalar or unit constructor alternatives at every selected call']]);
 function visit(node){if(node===header||node===input)return;let after;if(ts.isIdentifier(node)&&names.has(node.text))after=names.get(node.text);else if(ts.isStringLiteral(node)&&literals.has(node.text))after=JSON.stringify(literals.get(node.text));if(after!==undefined)changes.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:after});ts.forEachChild(node,visit);}visit(file);
 changes.push({span:[header.getStart(file),header.end],expected:header.getText(file),replacement:HEADER},{span:[input.getStart(file),input.end],expected:input.getText(file),replacement:input.getText(file)+'\n'+INPUT_GRAMMAR});
 let language=source;for(const row of changes.sort((a,b)=>b.span[0]-a.span[0])){if(language.slice(...row.span)!==row.expected)fail('native selected source span differs');language=language.slice(0,row.span[0])+row.replacement+language.slice(row.span[1]);}
 const after=once(language,"replacement: 'crate::translation_core::' + token.text","replacement: 'crate::translation_core::' + (unitMatchesInput(tokens, at) === 'unit' ? 'matches_unit' : 'matches') + (token.text === 'matches!' ? '!' : '')");
 parse(ts,OUTPUT,after);const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,OUTPUT),after),before=transportConcreteSyntaxSource(source,{language:'JavaScript'}),rule=(left,right,id)=>({id,edits:[{span:[0,left.length],expected:left,replacement:right}]});
 const run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[rule(source,language,'javascript:copy-complete-source-backed-matches-and-select-unit-grammar')],repositoryRules:[rule(language,after,'router:adopt-separate-owned-unit-matches-symbol')]}),afterMeta=serializeConcreteSyntaxMeta(run.value),result=transportConcreteSyntaxMeta(afterMeta),inverse=applyConcreteSyntaxSubstitutions(result.document,{languageRules:[rule(after,source,'javascript:restore-complete-original-matches-corpus')],repositoryRules:[]});
 if(result.source!==after||transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)fail('complete native/CST source inverse differs');
 return {schema:'source-backed-unit-matches-preparation-v1',typescriptVersion:ts.version,input:{path:INPUT,source,sha256:hash(source)},files:[{path:OUTPUT,before:source,language,after,beforeMeta:before.meta,afterMeta,inverse:source,beforeSha256:hash(source),afterSha256:hash(after),nativeCopies:[nativeCopy(ts,INPUT,source),nativeCopy(ts,OUTPUT,after)],nativeBindings,trace:run.trace,nativeSelections:changes}],semanticAuthority:false,runtimeExecuted:false,rustExecuted:false,originalLiteralApiUnchanged:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode]=process.argv.slice(2);if(process.argv.length!==3||!['--write','--check'].includes(mode))fail('usage: --write|--check');const plan=prepareSourceBackedUnitMatches();
 for(const row of plan.files)if(mode==='--write')writeFileSync(resolve(ROOT,row.path),row.after);else if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.after)fail('complete unit corpus source is stale');
 console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),semanticAuthority:false}));
}
