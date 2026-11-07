// Full source preparation; an early size refusal grants no grammar authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourcePhases} from './concrete-phased-equations.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=fileURLToPath(new URL('../../',import.meta.url));
const path='tools/translation/builtin-clone-ast-route.mjs';
const originalSha256='897306343d7c6ff17ce60c5e966ba96d8bdf4769be61cb57af6569ebc1acd7df';
const archiveSha256='21b77b696c7675be6a00730af1338661edb7d156bffaac66d3edbb374273536e';
const fail=message=>{throw TypeError('Clone validation order source: '+message);};
function one(values){if(values.length!==1)fail('unique complete native selection required');return values[0];}
function edit(source,edits){
 let result=source,last=source.length;
 for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(row.span[1]>last||source.slice(...row.span)!==row.expected)fail('complete native span changed');
  result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);last=row.span[0];
 }
 let inverse=result,shift=0;
 const mapped=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{
  const position=row.span[0]+shift;shift+=row.replacement.length-row.expected.length;return {...row,position};
 });
 for(const row of mapped.reverse()){
  if(inverse.slice(row.position,row.position+row.replacement.length)!==row.replacement)fail('complete native inverse span changed');
  inverse=inverse.slice(0,row.position)+row.expected+inverse.slice(row.position+row.replacement.length);
 }
 if(inverse!==source)fail('complete native inverse differs');return result;
}
const preflight=`// This private tree was materialized by the original source route. Charge
// every logical occurrence before hashing/freezing its complete evidence.
// The independent positive grammar and private issuer checks still run below.
const CLONE_AST_NODES=32000,CLONE_AST_DEPTH=64;
function assertCloneAstSize(branches){
 let nodes=0;
 function visit(value,depth=0){
  if(++nodes>CLONE_AST_NODES||depth>CLONE_AST_DEPTH)throw new TypeError('Clone positive AST validation budget exceeded');
  if(value!==null&&typeof value==='object')for(const key of Object.keys(value))visit(value[key],depth+1);
 }
 visit(branches);
}
`;
export function prepareCloneValidationOrder(){
 const archive=readFileSync(resolve(root,'tools/translation/source-profiles/clone-validation-order/original.mjs.gz'));
 if(archive.length!==8067||hash(archive)!==archiveSha256)fail('complete original archive differs');
 const original=gunzipSync(archive,{maxOutputLength:32768}).toString('utf8');
 if(Buffer.byteLength(original)!==26091||hash(original)!==originalSha256)fail('complete original source differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 function parse(source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;}
 const file=parse(original),validator=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='validateBuiltinCloneAstOutput'));
 const validatorText=validator.getText(file),bound='++nodes>32000||depth>64';
 if(validatorText.split(bound).length!==2)fail('original positive grammar bound differs');
 const span=[validator.getStart(file),validator.end];
 const languageEdits=[{span,expected:original.slice(...span),replacement:preflight+validatorText.replace(bound,'++nodes>CLONE_AST_NODES||depth>CLONE_AST_DEPTH')}];
 const middle=edit(original,languageEdits),middleFile=parse(middle);
 const lift=one(middleFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='liftBuiltinCloneAstRoute'));
 const branches=one(lift.body.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(declaration=>declaration.name.getText(middleFile)==='branches')));
 if(branches.getText(middleFile)!=='const branches=materialize(state,leaves,payload);')fail('actual original materialization differs');
 const repositoryEdits=[{span:[branches.end,branches.end],expected:'',replacement:'\n assertCloneAstSize(branches);'}];
 const after=edit(middle,repositoryEdits);parse(after);
 const before=readFileSync(resolve(root,path),'utf8');
 if(before!==original&&before!==after)fail('unexpected current complete source');
 const [equation]=transportConcreteSourcePhases([{before:original,middle,after,language:'JavaScript'}]);
 if(readFileSync(resolve(root,path),'utf8')!==before)fail('complete physical source changed');
 return {schema:'complete-clone-validation-order-v1',file:{path,before,original,middle,after,originalSha256,afterSha256:hash(after),languageEdits,repositoryEdits,equation},
  originalNodeLimit:32000,originalDepthLimit:64,privateIssuersUnchanged:true,positiveGrammarUnchanged:true,semanticAuthority:false,runtimeParity:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-clone-validation-order.mjs --emit|--check');
 const result=prepareCloneValidationOrder();
 if(args[0]==='--check'){if(result.file.before!==result.file.after)fail('complete current source is stale');console.log('Complete early Clone size validation is current; no grammar or issuer authority.');}
 else console.log(JSON.stringify(result));
}
