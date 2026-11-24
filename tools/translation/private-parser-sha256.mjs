// Independent SHA-256 for executable-source authentication. Node crypto calls
// remain required separately; their observer-returned digest is not authority.
import {originalPrivateParserNumericCommonIntrinsicsUnchanged,originalPrivateParserUint32WorkStorageUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
const initial=originalPrivateParserNumericCommonIntrinsicsUnchanged();
const uint32AtBirth=initial&&originalPrivateParserUint32WorkStorageUnchanged();
const privateUint32Constructor=uint32AtBirth?Object.getOwnPropertyDescriptor(globalThis,'Uint32Array').value:null;
let constants=null;
function checked(){
  if(!initial||!originalPrivateParserNumericCommonIntrinsicsUnchanged())throwOriginalCapturedTypeError('Independent parser SHA256 host operations changed');
}
const rotate=(value,count)=>(value>>>count)|(value<<(32-count));
export function independentParserSha256(source){
  checked();if(typeof source!=='string'||source.length>262144)throwOriginalCapturedTypeError('Independent parser SHA256 requires bounded primitive text');
  // No round array exists until the genuine initial/live guard has succeeded.
  // Constants and work arrays never reach crypto, callbacks or returned data.
  if(!constants)constants=[
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ];
  // No callback occurs after checked(): only primitive bounds, literal constants
  // and captured-native Uint32 eligibility precede the two private allocations.
  const typed=privateUint32Constructor!==null&&originalPrivateParserUint32WorkStorageUnchanged();
  const h=typed?new privateUint32Constructor(8):[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],words=typed?new privateUint32Constructor(64):[];
  if(typed){h[0]=0x6a09e667;h[1]=0xbb67ae85;h[2]=0x3c6ef372;h[3]=0xa54ff53a;h[4]=0x510e527f;h[5]=0x9b05688c;h[6]=0x1f83d9ab;h[7]=0x5be0cd19;}
  let pendingWord=0,pendingBytes=0,wordIndex=0,payloadBytes=0;
  function compress(){
    for(let at=16;at<64;at++){
      const x=words[at-15],y=words[at-2];
      const a=rotate(x,7)^rotate(x,18)^(x>>>3),b=rotate(y,17)^rotate(y,19)^(y>>>10);
      words[at]=(words[at-16]+a+words[at-7]+b)>>>0;
    }
    let a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],v=h[7];
    for(let at=0;at<64;at++){
      const sum=rotate(e,6)^rotate(e,11)^rotate(e,25),choice=(e&f)^(~e&g);
      const t1=(v+sum+choice+constants[at]+words[at])>>>0;
      const t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))>>>0;
      v=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    h[0]=(h[0]+a)>>>0;h[1]=(h[1]+b)>>>0;h[2]=(h[2]+c)>>>0;h[3]=(h[3]+d)>>>0;
    h[4]=(h[4]+e)>>>0;h[5]=(h[5]+f)>>>0;h[6]=(h[6]+g)>>>0;h[7]=(h[7]+v)>>>0;
  }
  function emit(byte){
    pendingWord=(pendingWord<<8)|byte;pendingBytes++;
    if(pendingBytes===4){
      words[wordIndex++]=pendingWord;pendingWord=0;pendingBytes=0;
      if(wordIndex===16){compress();wordIndex=0;}
    }
  }
  // Pack each complete UTF8 byte directly into the current 64-byte block.
  // All16 input words are overwritten before each schedule/compression pass.
  for(let at=0;at<source.length;at++){
    let code=source.charCodeAt(at);
    // Four ASCII code units are exactly four UTF8 bytes and one big-endian
    // input word. Non-ASCII, unaligned input and tails retain the scalar path.
    if(pendingBytes===0&&code<128&&at+3<source.length){
      const b=source.charCodeAt(at+1),c=source.charCodeAt(at+2),d=source.charCodeAt(at+3);
      if((b|c|d)<128){
        words[wordIndex++]=(code<<24)|(b<<16)|(c<<8)|d;payloadBytes+=4;at+=3;
        if(wordIndex===16){compress();wordIndex=0;}continue;
      }
    }
    if(code>=55296&&code<=56319){
      const low=at+1<source.length?source.charCodeAt(at+1):-1;
      if(low<56320||low>57343)throwOriginalCapturedTypeError('Independent parser SHA256 requires well-formed UTF16');
      code=65536+(code-55296)*1024+low-56320;at++;
    }else if(code>=56320&&code<=57343)throwOriginalCapturedTypeError('Independent parser SHA256 requires well-formed UTF16');
    if(code<128){emit(code);payloadBytes++;}
    else if(code<2048){emit(192|(code>>>6));emit(128|(code&63));payloadBytes+=2;}
    else if(code<65536){emit(224|(code>>>12));emit(128|((code>>>6)&63));emit(128|(code&63));payloadBytes+=3;}
    else{emit(240|(code>>>18));emit(128|((code>>>12)&63));emit(128|((code>>>6)&63));emit(128|(code&63));payloadBytes+=4;}
  }
  if(payloadBytes>1048576)throwOriginalCapturedTypeError('Independent parser SHA256 byte budget');
  const bits=payloadBytes*8;emit(128);
  while(wordIndex*4+pendingBytes!==56)emit(0);
  for(let at=0;at<4;at++)emit(0);
  for(let shift=24;shift>=0;shift-=8)emit((bits>>>shift)&255);
  let result='';const digits='0123456789abcdef';
  for(let at=0;at<8;at++)for(let shift=28;shift>=0;shift-=4)result+=digits[(h[at]>>>shift)&15];
  checked();return result;
}
