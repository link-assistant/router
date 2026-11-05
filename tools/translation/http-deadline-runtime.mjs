// Fixed HTTP operations only. The private callback cannot be supplied by users.
import {deferFilesystemFlow as defer} from './extensions/filesystem-effects-runtime.mjs';
import {router_async_with_deadline as deadline} from './async-control-runtime.mjs';
import {router_http_transport_open as opened,router_http_transport_read as read,router_http_transport_send as send,router_http_transport_close as close} from './http-transport-runtime.mjs';
function settled(milliseconds,cancellation,operation,cleanup){
 return defer(async()=>{
  let pending=null;
  const result=await deadline(milliseconds,cancellation,child=>{pending=Promise.resolve(operation(child));return pending;});
  // A known HTTP child always settles after its real abort/finally cleanup.
  // Wait for that settlement before ending an exclusive caller loan. A result
  // produced just before the timeout can still own a stream and must be closed.
  if(result.$==='Err'&&pending!==null){let outcome;try{outcome=await pending;}catch{/* The native deadline dropped this unfinished branch. */}cleanup(outcome);}
  return result;
 });
}
export function router_http_deadline_open(milliseconds,client,request,cancellation){return settled(milliseconds,cancellation,child=>opened(client,request,child),outcome=>{if(outcome?.$==='Ok')close(outcome.field0);});}
export function router_http_deadline_read(milliseconds,stream,cancellation){return settled(milliseconds,cancellation,child=>read(stream,child),()=>close(stream));}
export function router_http_deadline_send(milliseconds,client,request,cancellation){return settled(milliseconds,cancellation,child=>send(client,request,child),()=>{});}
