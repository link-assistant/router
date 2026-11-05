// Forward every event to Node's own public TAP reporter, even after audit errors.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {tap} from 'node:test/reporters';
import {createCaseDeadlineAudit,readCaseSource} from './node-case-deadlines.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export default async function* deadlineReporter(source){
 let request,audit,initialError,streamError;
 try{
  const filename=process.env.ROUTER_NODE_DEADLINE_REQUEST,fact=readCaseSource(filename),raw=Buffer.from(fact.source);
  if(raw.length>1024*1024||sha(raw)!==process.env.ROUTER_NODE_DEADLINE_REQUEST_SHA256)throw Error('Exact bounded deadline request changed');
  request=JSON.parse(raw);
  if(request.schema!=='complete-node-case-deadline-request-v1'||!Array.isArray(request.files)||!request.files.length||request.files.length>4096)throw Error('Invalid complete deadline request');
  audit=createCaseDeadlineAudit(request);
 }catch(error){initialError=error.stack??error.message;}
 async function* forwarded(){
  for await(const event of source){
   try{audit?.observe(event);}catch(error){initialError??=error.stack??error.message;}
   yield event;
  }
 }
 try{yield* tap(forwarded());}catch(error){streamError=error.stack??error.message;throw error;}
 finally{
  let result;
  try{result=audit?.finish()??{passed:false,errors:[initialError??'Deadline audit was not initialized']};}
  catch(error){result={passed:false,errors:[error.stack??error.message]};}
  if(initialError||streamError){result.passed=false;result.errors.push(initialError??streamError);}
  result={...result,requestSha256:process.env.ROUTER_NODE_DEADLINE_REQUEST_SHA256,allEventsForwardedToBuiltinTap:!streamError,reporterNode:process.versions};
  try{
   if(!request?.receipt)throw Error('No fresh deadline receipt destination');
   const encoded=JSON.stringify(result,null,2)+'\n';if(Buffer.byteLength(encoded)>128*1024*1024)throw Error('Complete deadline receipt exceeds bounded128MiB');
   fs.writeFileSync(request.receipt,encoded,{flag:'wx',mode:0o600});
  }catch(error){result.passed=false;process.stderr.write('Deadline receipt failure: '+error.message+'\n');}
  if(!result.passed)process.exitCode=1;
 }
}
