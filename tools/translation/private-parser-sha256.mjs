// Independent SHA-256 for executable-source authentication. Node crypto calls
// remain required separately; their observer-returned digest is not authority.
import {originalPrivateParserIngressUnchanged,originalStaticSourceIntrinsicsUnchanged,
  originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
const initial=originalPrivateParserIngressUnchanged()&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
let constants=null;
function checked(){
  if(!initial||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())throwOriginalCapturedTypeError('Independent parser SHA256 host operations changed');
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
  const bytes=[];
  for(let at=0;at<source.length;at++){
    let code=source.charCodeAt(at);
    if(code>=55296&&code<=56319){
      const low=at+1<source.length?source.charCodeAt(at+1):-1;
      if(low<56320||low>57343)throwOriginalCapturedTypeError('Independent parser SHA256 requires well-formed UTF16');
      code=65536+(code-55296)*1024+low-56320;at++;
    }else if(code>=56320&&code<=57343)throwOriginalCapturedTypeError('Independent parser SHA256 requires well-formed UTF16');
    if(code<128)bytes[bytes.length]=code;
    else if(code<2048){bytes[bytes.length]=192|(code>>>6);bytes[bytes.length]=128|(code&63);}
    else if(code<65536){bytes[bytes.length]=224|(code>>>12);bytes[bytes.length]=128|((code>>>6)&63);bytes[bytes.length]=128|(code&63);}
    else{bytes[bytes.length]=240|(code>>>18);bytes[bytes.length]=128|((code>>>12)&63);bytes[bytes.length]=128|((code>>>6)&63);bytes[bytes.length]=128|(code&63);}
  }
  if(bytes.length>1048576)throwOriginalCapturedTypeError('Independent parser SHA256 byte budget');
  const bits=bytes.length*8;bytes[bytes.length]=128;
  while(bytes.length%64!==56)bytes[bytes.length]=0;
  for(let at=0;at<4;at++)bytes[bytes.length]=0;
  for(let shift=24;shift>=0;shift-=8)bytes[bytes.length]=(bits>>>shift)&255;
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],words=[];
  for(let block=0;block<bytes.length;block+=64){
    for(let at=0;at<16;at++){const pos=block+at*4;words[at]=(bytes[pos]<<24)|(bytes[pos+1]<<16)|(bytes[pos+2]<<8)|bytes[pos+3];}
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
  let result='';const digits='0123456789abcdef';
  for(let at=0;at<8;at++)for(let shift=28;shift>=0;shift-=4)result+=digits[(h[at]>>>shift)&15];
  checked();return result;
}
