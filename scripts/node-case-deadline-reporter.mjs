// Forward every event to Node's own public TAP reporter, even after audit errors.
import fs from 'node:fs';
import {createProtectedSourceDiagnosticCollector,withProtectedSourceDiagnostics,emitProtectedSourceDiagnostic,protectedSourceDiagnosticText,protectedSourceDiagnosticMessage,protectedSourceDiagnosticDisplay} from '../tools/translation/protected-source-diagnostics-20261103.mjs';

import {fileURLToPath} from 'node:url';
import {captureProtectedNodeReporterWriter,withProtectedNodeRunnerWriter} from '../tools/translation/protected-node-evidence-writers-20261103.mjs';
import {createHash} from 'node:crypto';
import {tap} from 'node:test/reporters';
import {createCaseDeadlineAudit,readCaseSource} from './node-case-deadlines.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export default async function* deadlineReporter(source){const diagnostics=createProtectedSourceDiagnosticCollector();try{yield* deadlineReporterWithDiagnostics(source,diagnostics);}finally{diagnostics.close();}}
export async function* deadlineReporterWithDiagnostics(source,diagnostics){
 withProtectedSourceDiagnostics(diagnostics,()=>undefined);
 const diagnostic=async(message,error)=>{try{await withProtectedSourceDiagnostics(diagnostics,()=>withProtectedNodeRunnerWriter(request?.root,async()=>emitProtectedSourceDiagnostic(message,{primary:error,additionalVeto:()=>{if(!writer)throw Error('Original reporter policy unavailable');writer.verify();}}),fileURLToPath(new URL('../',import.meta.url))));}catch(routeError){diagnostics.observe(message,error);diagnostics.observe('Reporter diagnostic route refusal',routeError);}};
 let request,audit,initialError,streamError,writer;
 try{
  const filename=process.env.ROUTER_NODE_DEADLINE_REQUEST,fact=withProtectedSourceDiagnostics(diagnostics,()=>readCaseSource(filename)),raw=Buffer.from(fact.source);
  if(raw.length>1024*1024||sha(raw)!==process.env.ROUTER_NODE_DEADLINE_REQUEST_SHA256)throw Error('Exact bounded deadline request changed');
  request=JSON.parse(raw);
  if(request.schema!=='complete-node-case-deadline-request-v1'||!Array.isArray(request.files)||!request.files.length||request.files.length>4096)throw Error('Invalid complete deadline request');
  writer=withProtectedSourceDiagnostics(diagnostics,()=>captureProtectedNodeReporterWriter(request.root,fileURLToPath(new URL('../',import.meta.url))));
  audit=withProtectedSourceDiagnostics(diagnostics,()=>createCaseDeadlineAudit(request));
 }catch(error){initialError=(error?.stack??error?.message??String(error));}
 async function* forwarded(){
  for await(const event of source){
   try{withProtectedSourceDiagnostics(diagnostics,()=>audit?.observe(event));}catch(error){initialError??=(error?.stack??error?.message??String(error));}
   yield event;
  }
 }
 try{yield* tap(forwarded());}catch(error){streamError=(error?.stack??error?.message??String(error));throw error;}
 finally{
  let result;
  try{result=withProtectedSourceDiagnostics(diagnostics,()=>audit?.finish())??{passed:false,errors:[initialError??'Deadline audit was not initialized']};}
  catch(error){result={passed:false,errors:[error?.stack??error?.message??String(error)]};}
  if(initialError||streamError){result.passed=false;result.errors.push(initialError??streamError);}
  result={...result,requestSha256:process.env.ROUTER_NODE_DEADLINE_REQUEST_SHA256,allEventsForwardedToBuiltinTap:!streamError,reporterNode:process.versions};
  try{
   if(!request?.receipt)throw Error('No fresh deadline receipt destination');
   const encoded=JSON.stringify(result,null,2)+'\n';if(Buffer.byteLength(encoded)>128*1024*1024)throw Error('Complete deadline receipt exceeds bounded128MiB');
   if(!writer)throw Error('Independent reporter source policy was not captured');
   withProtectedSourceDiagnostics(diagnostics,()=>writer.write(request.receipt,encoded));
  }catch(error){result.passed=false;await diagnostic('Deadline receipt failure: '+protectedSourceDiagnosticMessage(error)+'\n',error);}
  finally{if(writer)try{withProtectedSourceDiagnostics(diagnostics,()=>writer.close());}catch(error){result.passed=false;await diagnostic('Deadline source policy closing failure: '+protectedSourceDiagnosticDisplay(error)+'\n',error);}}
  if(!result.passed)process.exitCode=1;
 }
}
