// Authored source templates only. Materialization belongs to the native/CST producer.
export const nativeOutputImports=`import {Buffer as NativeOutputBuffer} from 'node:buffer';
import nativeOutputZlib from 'node:zlib';
`;
export const nativeOutputHost=`// Explicit trusted stock Buffer/zlib DATA infrastructure at module birth.
// This contract does not assert equivalence to legacy compression/observers.
const nativeOutputGet=Object.getOwnPropertyDescriptor,nativeOutputApply=Reflect.apply,nativeOutputConstructor=NativeOutputBuffer;
const nativeOutputFields=[
 [NativeOutputBuffer,'from'],[NativeOutputBuffer,'isBuffer'],
 [NativeOutputBuffer.prototype,'toString'],[NativeOutputBuffer.prototype,'utf16leSlice'],
 [NativeOutputBuffer.prototype,'base64Slice'],[NativeOutputBuffer.prototype,'utf16leWrite'],
 [NativeOutputBuffer.prototype,'base64Write'],
 [nativeOutputZlib,'deflateRawSync'],[nativeOutputZlib,'inflateRawSync'],
 [Object,'getOwnPropertyDescriptor'],[Reflect,'apply'],[NativeOutputBuffer,'prototype'],
 [Number,'isSafeInteger'],[Math,'ceil']
].map(([owner,key])=>({owner,key,field:nativeOutputGet(owner,key)}));
const nativeOutputFrom=nativeOutputFields[0].field?.value,nativeOutputToString=nativeOutputFields[2].field?.value;
const nativeOutputDeflate=nativeOutputFields[7].field?.value,nativeOutputInflate=nativeOutputFields[8].field?.value;
const nativeOutputSafeInteger=nativeOutputFields[12].field?.value,nativeOutputCeil=nativeOutputFields[13].field?.value;
function nativeOutputReady(){
 if(NativeOutputBuffer!==nativeOutputConstructor)throw new TypeError('Native retained output constructor changed');
 for(let at=0;at<nativeOutputFields.length;at++){
  const row=nativeOutputFields[at],before=row.field,after=nativeOutputGet(row.owner,row.key);
  if(!before&&!after)continue;
  if(!before||!after||before.value!==after.value||before.get!==after.get||before.set!==after.set||before.writable!==after.writable||before.enumerable!==after.enumerable||before.configurable!==after.configurable)throw new TypeError('Native retained output host changed');
 }
 if(typeof nativeOutputFrom!=='function'||typeof nativeOutputToString!=='function'||typeof nativeOutputDeflate!=='function'||typeof nativeOutputInflate!=='function')throw new TypeError('Native retained output host unavailable');
}
`;
export const nativeOutputEncode=`{
  nativeOutputReady();
  if(typeof source!=='string'||!nativeOutputApply(nativeOutputSafeInteger,undefined,[start])||!nativeOutputApply(nativeOutputSafeInteger,undefined,[end])||start<0||end<=start||end>source.length||end-start>CHUNK)throw new TypeError('Native retained output input bounds');
  const raw=nativeOutputApply(nativeOutputFrom,NativeOutputBuffer,[slice(source,start,end),'utf16le']);
  if(raw.length!==(end-start)*2)throw new TypeError('Native retained output UTF16 length');
  let packed=nativeOutputApply(nativeOutputDeflate,nativeOutputZlib,[raw,{level:1}]);
  // Bun's fast encoder may expand incompressible UTF16 beyond this fixed
  // packet bound. Stored DEFLATE blocks preserve the bound and exact bytes;
  // the unchanged caller then selects its original raw-storage fallback.
  if(packed.length>CHUNK*2+1024)packed=nativeOutputApply(nativeOutputDeflate,nativeOutputZlib,[raw,{level:0}]);
  if(packed.length>CHUNK*2+1024)throw new TypeError('Native retained output encoded bounds');
  const result=nativeOutputApply(nativeOutputToString,packed,['base64']);nativeOutputReady();return result;
}`;
export const nativeOutputDecode=`{
  nativeOutputReady();
  if(typeof packed!=='string'||packed.length>4*nativeOutputApply(nativeOutputCeil,undefined,[(CHUNK*2+1024)/3])||!nativeOutputApply(nativeOutputSafeInteger,undefined,[units])||units<1||units>CHUNK)throw new TypeError('Native retained output packed bounds');
  const compressed=nativeOutputApply(nativeOutputFrom,NativeOutputBuffer,[packed,'base64']);
  if(nativeOutputApply(nativeOutputToString,compressed,['base64'])!==packed)throw new TypeError('Native retained output canonical base64');
  const raw=nativeOutputApply(nativeOutputInflate,nativeOutputZlib,[compressed,{maxOutputLength:units*2}]);
  if(raw.length!==units*2)throw new TypeError('Native retained output complete byte length');
  const result=nativeOutputApply(nativeOutputToString,raw,['utf16le']);nativeOutputReady();
  if(result.length!==units)throw new TypeError('Native retained output complete unit length');return result;
}`;
