// Lossless storage only; this library grants no source or compiler authority.
import {gzipSync,gunzipSync} from 'node:zlib';
import zopfli from './vendor/zopfli/dist/index.js';
const SOURCE_ASSET_BYTES=4*1024*1024,OPTIONAL_INPUT_BYTES=32*1024*1024;
const options=Object.freeze({verbose:false,verbose_more:false,numiterations:1,blocksplitting:true,blocksplittingmax:15});
// The upstream asynchronous initialization completes before exposing the fixed
// synchronous storage API. Its work buffers/results are not source caches.
await zopfli.gzipAsync(new Uint8Array(0),{...options,blocksplitting:false});
export function gzipStaticSourceStorage(input){
 const ordinary=gzipSync(input,{level:9,mtime:0});
 if(ordinary.length<=SOURCE_ASSET_BYTES||!Buffer.isBuffer(input)||input.length>OPTIONAL_INPUT_BYTES)return ordinary;
 let called=false,failure,result;
 zopfli.gzip(input,options,(error,bytes)=>{called=true;failure=error;result=bytes;});
 if(!called)throw new TypeError('Static source gzip: original compiled compressor is not ready');
 if(failure)throw failure;
 const packed=Buffer.from(result);
 if(!gunzipSync(packed,{maxOutputLength:input.length}).equals(input))throw new TypeError('Static source gzip: complete byte inverse differs');
 return packed.length<ordinary.length?packed:ordinary;
}
