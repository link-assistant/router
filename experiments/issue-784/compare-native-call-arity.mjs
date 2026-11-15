// Finite diagnostic: compare native call-arity facts, without emitting artifacts.
// Both queries share one fresh program; their timings are not a speed comparison.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {loadTypeScript,sourceModules} from '../../tools/translation/js-to-rust/native-typescript.mjs';
import {inferenceProgram} from '../../tools/translation/js-to-rust/native-inference.mjs';

const label=process.argv[2];
if(!/^[a-z0-9-]{1,70}$/u.test(label??''))throw Error('A unique finite label is required');
const root=resolve('.'),ts=loadTypeScript(root),paths=sourceModules(root);
if(ts.version!=='5.9.3'||paths.length>256)throw Error('Finite installed compiler/source scope differs');
const hash=value=>createHash('sha256').update(value).digest('hex');
const originals=paths.map(path=>({path,source:readFileSync(join(root,path),'utf8')}));
if(originals.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0)>8*1024*1024)throw Error('Finite source scope exceeded');
const inference=inferenceProgram(ts,root,paths),rows=[];
const facts=signature=>{
 const parameters=signature?.getParameters()??[],formal=signature?.declaration?.parameters;
 const rest=formal?formal.at(-1)?.dotDotDotToken:parameters.at(-1)?.declarations?.some(declaration=>declaration.dotDotDotToken);
 return {parameters:formal?.length??parameters.length,rest:!!rest};
};
for(const row of originals){
 const file=inference.program.getSourceFile(join(root,row.path));
 if(!file||file.text!==row.source||file.parseDiagnostics.length)throw Error('Complete inference source differs');
 const visit=node=>{
  if(ts.isCallExpression(node)&&!ts.isOptionalChain(node)&&node.arguments.length
    &&![ts.SyntaxKind.ImportKeyword,ts.SyntaxKind.SuperKeyword].includes(node.expression.kind)
    &&!(ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='bind')){
   if(rows.length>=65536)throw Error('Finite call count exceeded');
   const original=checkerFacts(node),signatures=inference.checker.getTypeAtLocation(node.expression).getCallSignatures();
   const candidate=signatures.length===1?facts(signatures[0]):original;
   rows.push({path:row.path,start:node.getStart(file),end:node.end,arguments:node.arguments.length,
    signatures:signatures.length,original,candidate,equal:JSON.stringify(original)===JSON.stringify(candidate),
    originalGap:node.arguments.length>original.parameters&&!original.rest,
    candidateGap:node.arguments.length>candidate.parameters&&!candidate.rest});
  }
  ts.forEachChild(node,visit);
 };
 const checkerFacts=node=>facts(inference.checker.getResolvedSignature(node));
 visit(file);
}
for(const row of originals)if(readFileSync(join(root,row.path),'utf8')!==row.source)throw Error('Complete source changed');
const report={schema:'native-call-arity-comparison-v1',compiler:ts.version,
 inputs:originals.map(({path,source})=>({path,bytes:Buffer.byteLength(source),sha256:hash(source)})),rows,
 totals:{calls:rows.length,singleSignature:rows.filter(row=>row.signatures===1).length,
  differentFacts:rows.filter(row=>!row.equal).length,differentGaps:rows.filter(row=>row.originalGap!==row.candidateGap).length},
 diagnosticOnly:true,performanceQualified:false,semanticAuthority:false,fullGatePassed:false};
const raw=Buffer.from(JSON.stringify(report));
if(raw.length>8*1024*1024)throw Error('Finite complete evidence bound exceeded');
const output='ci-logs/issue-784-restart-2/'+label+'.json.gz';
writeFileSync(output,gzipSync(raw),{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:8*1024*1024}).equals(raw))throw Error('Complete evidence readback differs');
console.log(JSON.stringify({output,totals:report.totals,performanceQualified:false}));
