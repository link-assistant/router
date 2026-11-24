// Diagnostic DATA only. Retry a nonblocking inherited pipe without buffering a
// queue, dropping records, or extending the caller's existing absolute deadline.
import {writeSync} from 'node:fs';
const pause=new Int32Array(new SharedArrayBuffer(4));
export function writeMatrixTrace(text,deadline){
 if(typeof text!=='string'||!Number.isFinite(deadline))throw TypeError('Matrix trace text and finite deadline required');
 const bytes=Buffer.from(text,'utf8');let offset=0;
 while(offset<bytes.length){
  if(performance.now()>=deadline){
   const error=new Error('Matrix trace exceeded the original complete matrix deadline');
   error.code='ETIMEDOUT';throw error;
  }
  try{
   const written=writeSync(3,bytes,offset,bytes.length-offset);
   if(written>0){offset+=written;continue;}
  }catch(error){
   if(!['EAGAIN','EWOULDBLOCK','EINTR'].includes(error?.code))throw error;
  }
  // The reader is a separate process. A finite native wait avoids a busy loop;
  // the parent's original wall clock and cancellation remain active throughout.
  Atomics.wait(pause,0,0,Math.min(1,Math.max(0,deadline-performance.now())));
 }
 if(performance.now()>=deadline){
  const error=new Error('Matrix trace exceeded the original complete matrix deadline');
  error.code='ETIMEDOUT';throw error;
 }
 return offset;
}
