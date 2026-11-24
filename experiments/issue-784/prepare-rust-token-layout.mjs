// Uninstalled experimental source DATA; token layout grants no semantic authority.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../../tools/translation/concrete-syntax-meta.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PATH='tools/translation/rust-structure.mjs';
const ORIGINAL='experiments/issue-784/rust-token-original-source.mjs.txt';
const PIN='ea09bde0452ff0e8021454e2c0040b6bdd8493163b0ab48cea496353e6b92261';
const COPY='token => ({ ...token, text: source.slice(token.start, token.end) })';
const LITERAL='token => ({ type: token.type, text: source.slice(token.start, token.end), start: token.start, end: token.end })';
const GUARD="  // Only the private lexer under unchanged native operations has this shape.\n  // Customized operations retain every original spread observation.\n  const ordinaryTokens = typeof source === 'string' && originalStaticSourceIntrinsicsUnchanged();\n";
const IMPORT="import {originalStaticSourceIntrinsicsUnchanged} from './original-json-intrinsics.mjs';\n";
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Rust token layout source: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one actual '+label+' required');return rows[0];};
function apply(source,edits){
 let result=source,end=source.length+1;
 for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(row.span[1]>end||result.slice(...row.span)!==row.expected)fail('exact nonoverlapping native spans required');
  end=row.span[0];result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);
 }
 return result;
}
function select(source){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const file=ts.createSourceFile(PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('complete original native grammar differs');
 const absolute=resolve(PATH),host={getSourceFile:name=>name===absolute?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>resolve('/'),getDirectories:()=>[],fileExists:name=>name===absolute,readFile:name=>name===absolute?source:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 const checker=ts.createProgram([absolute],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker();
 const owner=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='rustTokens'),'Rust token function');
 const sourceParameter=one(owner.parameters.filter(node=>ts.isIdentifier(node.name)&&node.name.text==='source'),'source parameter');
 const sourceSymbol=checker.getSymbolAtLocation(sourceParameter.name);if(!sourceSymbol)fail('genuine source binding required');
 const copies=[];function visit(node){if(ts.isArrowFunction(node)&&node.getText(file)===COPY)copies.push(node);ts.forEachChild(node,visit);}visit(owner);
 const copy=one(copies,'original token mapper'),call=copy.parent;
 if(!ts.isCallExpression(call)||!ts.isPropertyAccessExpression(call.expression)||call.expression.name.text!=='map'||call.arguments.length!==1)fail('original token map differs');
 const lexer=call.expression.expression;
 if(!ts.isCallExpression(lexer)||!ts.isIdentifier(lexer.expression)||lexer.expression.text!=='lex'||lexer.arguments.length!==2||lexer.arguments[0].getText(file)!=='masked'||lexer.arguments[1].getText(file)!=="'Rust'")fail('original private lexer call differs');
 const lexerImport=one(file.statements.filter(ts.isImportDeclaration).filter(node=>node.moduleSpecifier.text==='./vendor/formal-ai/lexer.mjs'),'original lexer import');
 const declaration=one(lexerImport.importClause.namedBindings.elements.filter(node=>node.name.text==='lex'),'lexer binding');
 if(checker.getSymbolAtLocation(lexer.expression)!==checker.getSymbolAtLocation(declaration.name))fail('original imported lexer binding differs');
 const tokenSymbol=checker.getSymbolAtLocation(copy.parameters[0].name);if(!tokenSymbol)fail('genuine token binding required');
 const identifiers=[];function uses(node){if(ts.isIdentifier(node)&&['token','source'].includes(node.text))identifiers.push(node);ts.forEachChild(node,uses);}uses(copy.body);
 for(const node of identifiers)if(checker.getSymbolAtLocation(node)!==(node.text==='source'?sourceSymbol:tokenSymbol))fail('original token/source binding differs');
 const statement=one(owner.body.statements.filter(node=>ts.isReturnStatement(node)&&node.pos<=copy.pos&&node.end>=copy.end),'complete lexer return');
 const start=statement.getStart(file)-2;if(source.slice(start,start+2)!=='  ')fail('original return indentation differs');
 const edits=[{span:[copy.getStart(file),copy.end],expected:COPY,replacement:'ordinaryTokens ? '+LITERAL+' : '+COPY},{span:[start,start],expected:'',replacement:GUARD}];
 const language=apply(source,edits);let delta=0;
 const inverseEdits=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{const at=row.span[0]+delta;delta+=row.replacement.length-row.expected.length;return {span:[at,at+row.replacement.length],expected:row.replacement,replacement:row.expected};});
 if(apply(language,inverseEdits)!==source)fail('complete independent native inverse differs');
 const lastImport=one(file.statements.filter(ts.isImportDeclaration).filter(node=>node.moduleSpecifier.text==='./rust-item-boundaries.mjs'),'item-boundary import');
 return {language,edits,inverseEdits,importAt:lastImport.end+1};
}
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
export function prepareRustTokenLayout({root=ROOT}={}){
 const original=readFileSync(resolve(root,ORIGINAL),'utf8');if(hash(original)!==PIN)fail('complete original source pin differs');
 const before=readFileSync(resolve(root,PATH),'utf8'),native=select(original),language=native.language;
 const after=language.slice(0,native.importAt)+IMPORT+language.slice(native.importAt);
 if(before!==original&&before!==after)fail('unrelated complete physical source differs');
 const ts=ownershipCompiler();for(const source of [language,after])if(ts.createSourceFile(PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)fail('complete proposed native grammar differs');
 let document=transportConcreteSyntaxSource(original,{language:'JavaScript'}).document;
 const stages=[];
 for(const [phase,source,target,id] of [['language',original,language,'javascript:copy-private-rust-token-fields'],['repository',language,after,'router:bind-shared-native-syntax-qualification']]){
  const beforeMeta=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(beforeMeta);
  const sequence={languageRules:phase==='language'?[rule(source,target,id)]:[],repositoryRules:phase==='repository'?[rule(source,target,id)]:[]};
  const run=applyConcreteSyntaxSubstitutions(fresh.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),parsed=transportConcreteSyntaxMeta(afterMeta);
  const inverseSequence={languageRules:phase==='language'?[rule(target,source,'javascript:restore-original-rust-token-copy')]:[],repositoryRules:phase==='repository'?[rule(target,source,'router:restore-original-imports')]:[]};
  const inverse=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(parsed.document,inverseSequence).value));
  if(fresh.source!==source||parsed.source!==target||inverse.source!==source)fail('complete serialized/reparsed CST inverse differs');
  stages.push({phase,source,target,beforeMeta,afterMeta,sequence,inverseSequence,inverse:source,trace:run.trace});document=parsed.document;
 }
 if(readFileSync(resolve(root,PATH),'utf8')!==before)fail('complete physical source changed during preparation');
 return {schema:'rust-token-layout-source-v1',path:PATH,originalCommit:'e29a8dd23e4a52f2892122276693d9b026ab7191',original,originalSha256:PIN,before,language,after,afterSha256:hash(after),inverse:original,native,stages,newAcrossInvocationCaches:false,originalLexerUnchanged:true,originalBoundsUnchanged:true,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-rust-token-layout.mjs --emit|--check');
 const row=prepareRustTokenLayout();if(args[0]==='--check'){if(row.before!==row.after)fail('complete current source is stale');console.log('Rust token layout producer is current; no compiler authority.');}else console.log(JSON.stringify(row));
}
