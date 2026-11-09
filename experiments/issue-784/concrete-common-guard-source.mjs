// Withdrawn performance candidate. Source DATA only; not installed in production.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-source-origin-equations.mjs';
const path='tools/translation/concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Concrete common guard source: '+message);};
export function proposeConcreteCommonGuard(ts,before){
 if(ts.version!=='5.9.3'||typeof before!=='string')fail('actual compiler and complete source required');
 if(hash(before)!=='895b356a8501aaf948ef7051f6f0cab2542e80da4175169195762da5ac5f429b')fail('complete original source differs');
 const parse=source=>{const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;};
 const file=parse(before),imports=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./original-json-intrinsics.mjs');
 if(imports.length!==1||!imports[0].importClause?.namedBindings||!ts.isNamedImports(imports[0].importClause.namedBindings))fail('complete original intrinsic import differs');
 const names=imports[0].importClause.namedBindings,elements=names.elements;
 if(elements.at(-1)?.name.text!=='originalPrivateParserIngressUnchanged'||elements.some(node=>node.name.text==='originalPrivateParserExpectedCommonIntrinsicsUnchanged'))fail('original import selection differs');
 const guards=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='guard');
 if(guards.length!==1||!ts.isIfStatement(guards[0].body?.statements[0]))fail('one original guard required');
 const condition=guards[0].body.statements[0].expression;
 const expected='!originalPrivateParserIngressUnchanged()||!pins||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged()';
 if(condition.getText(file)!==expected)fail('complete original guard condition differs');
 const edits=[{span:[names.end-1,names.end-1],expected:'',replacement:',originalPrivateParserExpectedCommonIntrinsicsUnchanged'},
  {span:[condition.getStart(file),condition.end],expected,replacement:'!originalPrivateParserIngressUnchanged()||!pins||!originalPrivateParserExpectedCommonIntrinsicsUnchanged()'}];
 let after=before;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(after.slice(...edit.span)!==edit.expected)fail('native edit source differs');after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);}
 if(hash(after)!=='41e905baafb152bde5e7de76febab2ed917bd41aead99e1b1635e4ed5ba3375e')fail('reviewed complete output differs');
 parse(after);let inverse=after;
 for(const edit of [...edits].sort((a,b)=>a.span[0]-b.span[0])){const start=edit.span[0];if(inverse.slice(start,start+edit.replacement.length)!==edit.replacement)fail('complete native inverse selection differs');inverse=inverse.slice(0,start)+edit.expected+inverse.slice(start+edit.replacement.length);}
 if(inverse!==before)fail('complete native inverse differs');
 const [equation]=transportConcreteSourcePhases([{before,middle:after,after,language:'JavaScript'}]);
 if(equation.inverse!==before)fail('complete concrete inverse differs');
 return {schema:'concrete-common-guard-source-v1',path,before,after,inverse,equation,nativeEdits:edits,
  beforeSha256:hash(before),afterSha256:hash(after),freshGuard:true,retainedVerdicts:false,semanticAuthority:false,runtimeParity:false};
}
export function prepareConcreteCommonGuard(){
 const before=gunzipSync(readFileSync(new URL('concrete-common-guard-original.mjs.gz',import.meta.url)),{maxOutputLength:65536}).toString('utf8');
 const plan=proposeConcreteCommonGuard(ownershipCompiler(),before),current=readFileSync(new URL(path,new URL('../../',import.meta.url)),'utf8');
 if(current!==before&&current!==plan.after)fail('unknown complete physical source');return {...plan,current};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(mode!=='--emit')fail('withdrawn candidate supports --emit only');
 const plan=prepareConcreteCommonGuard();if(mode==='--emit')console.log(JSON.stringify(plan));
}
