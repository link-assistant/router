// Trusted source-tool storage only. Runtime decoding remains in its own
// guarded source leaf; neither representation grants compiler authority.
const ALPHABET="!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvw";
const MAX=262144;
export function encodeRegisteredJsonProgram(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>MAX||JSON.stringify(JSON.parse(text))!==text)throw new TypeError('Canonical bounded complete JSON program required');
 const input=Buffer.from(text),table=new Map(),block=[];let at=0,literal=0;
 const key=at=>((input[at]*256+input[at+1])*256+input[at+2])*256+input[at+3];
 function remember(at){if(at+4>input.length)return;const name=key(at),prior=table.get(name)??[];prior.push(at);if(prior.length>64)prior.shift();table.set(name,prior);}
 function extra(value){while(value>=255){block.push(255);value-=255;}block.push(value);}
 function emit(end,count=0,distance=0){const length=end-literal;block.push(Math.min(length,15)*16+(count?Math.min(count-4,15):0));if(length>=15)extra(length-15);for(let i=literal;i<end;i++)block.push(input[i]);if(count){block.push(distance&255,distance>>>8);if(count>=19)extra(count-19);}}
 function match(position){
  let count=0,distance=0;const candidates=position+4<=input.length?table.get(key(position))??[]:[];
  for(let index=candidates.length-1;index>=0;index--){const before=candidates[index];if(position-before>65535)continue;let size=0;while(position+size<input.length&&input[before+size]===input[position+size])size++;if(size>count){count=size;distance=position-before;}}
  return {count,distance};
 }
 while(at<input.length){
  const {count,distance}=match(at);let recorded=false;
  if(count>=4&&count<128){remember(at);recorded=true;if(match(at+1).count>count+0){at++;continue;}}
  if(count>=4){emit(at,count,distance);for(let i=recorded?1:0;i<count;i++)remember(at+i);at+=count;literal=at;}else{if(!recorded)remember(at);at++;}
 }
 emit(at);
 const frequencies=Array(256).fill(0);for(const byte of block)frequencies[byte]++;
 let rank=256;const queue=frequencies.flatMap((frequency,symbol)=>frequency?[{frequency,rank:symbol,symbol}]:[]);
 while(queue.length>1){queue.sort((a,b)=>a.frequency-b.frequency||a.rank-b.rank);const left=queue.shift(),right=queue.shift();queue.push({frequency:left.frequency+right.frequency,rank:rank++,left,right});}
 const lengths=Array(256).fill(0);function measure(node,depth=0){if(node.symbol!==undefined)lengths[node.symbol]=Math.max(depth,1);else{measure(node.left,depth+1);measure(node.right,depth+1);}}measure(queue[0]);
 if(Math.max(...lengths)>15)throw new TypeError('Registered JSON prefix-code length bound');
 const counts=Array(16).fill(0),first=Array(16).fill(0),next=Array(16).fill(0),codes=Array(256).fill(0);for(const length of lengths)if(length)counts[length]++;
 for(let i=1;i<16;i++)first[i]=(first[i-1]+counts[i-1])*2;
 for(let i=0;i<16;i++)next[i]=first[i];for(let symbol=0;symbol<256;symbol++)if(lengths[symbol])codes[symbol]=next[lengths[symbol]]++;
 const storage=[];for(let symbol=0;symbol<256;symbol+=2)storage.push(lengths[symbol]*16+lengths[symbol+1]);let pending=0,bits=0,bitCount=0;
 for(const symbol of block)for(let bit=lengths[symbol]-1;bit>=0;bit--){pending=pending*2+((codes[symbol]>>>bit)&1);bits++;bitCount++;if(bits===8){storage.push(pending);pending=0;bits=0;}}
 if(bits)storage.push(pending*2**(8-bits));let encoded='';
 if(ALPHABET.length!==85||new Set(ALPHABET).size!==85)throw new TypeError('Exact complete storage alphabet required');
 for(let i=0;i<storage.length;i+=4){let value=0;for(let j=0;j<4;j++)value=value*256+(storage[i+j]??0);let piece='';for(let j=0;j<5;j++){piece=ALPHABET[value%85]+piece;value=Math.floor(value/85);}encoded+=piece;}
 return {schema:'registered-json-literal-block-prefix-v1',encoded,expandedBytes:input.length,blockBytes:block.length,storageBytes:storage.length,encodedBits:bitCount};
}

// Root-controlled source-tool helpers; runtime copies bind the same decoder
// to the existing private leaf's checked/fail/UTF8 operations instead.
function checked(){}
function fail(message){throw new TypeError('Registered JSON storage: '+message);}
function decode(bytes,size){
 const raw=Buffer.from(bytes.buffer,bytes.byteOffset,size),text=raw.toString('utf8');
 if(!Buffer.from(text).equals(raw))fail('canonical complete UTF8 required');return text;
}

export function decodeRegisteredJsonProgram(encoded,size,blockSize,storageSize){
  checked();
  if(typeof size!=='number'||size%1!==0||typeof blockSize!=='number'||blockSize%1!==0||typeof storageSize!=='number'||storageSize%1!==0||typeof encoded!=='string'||encoded.length%5||encoded.length>1311000||size<1||size>262144||blockSize<1||blockSize>size*2+16||storageSize<128||storageSize>blockSize*2+128)fail('bounded complete registered JSON storage required');
  const alphabet="!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvw",storage=new Uint8Array(storageSize);let position=0;
  for(let at=0;at<encoded.length;at+=5){
    let value=0;for(let j=0;j<5;j++){const digit=alphabet.indexOf(encoded[at+j]);if(digit<0)fail('registered JSON storage alphabet');value=value*85+digit;}
    if(value>4294967295)fail('registered JSON storage word');
    let factor=16777216;for(let j=0;j<4;j++){const byte=(value/factor)>>>0;value-=byte*factor;factor/=256;if(position<storageSize)storage[position]=byte;else if(byte)fail('registered JSON nonzero storage padding');position++;}
  }
  if(position<storageSize||position-storageSize>3)fail('registered JSON complete storage length');
  const counts=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],first=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],base=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],symbols=new Uint8Array(256);
  for(let symbol=0;symbol<256;symbol++){const length=symbol%2?storage[symbol>>>1]&15:storage[symbol>>>1]>>>4;if(length)counts[length]++;}
  let total=0;for(let length=1;length<16;length++){first[length]=(first[length-1]+counts[length-1])*2;base[length]=total;if(first[length]+counts[length]>2**length)fail('registered JSON prefix code');for(let symbol=0;symbol<256;symbol++)if((symbol%2?storage[symbol>>>1]&15:storage[symbol>>>1]>>>4)===length)symbols[total++]=symbol;}
  const block=new Uint8Array(blockSize);let bit=1024;
  for(let at=0;at<blockSize;at++){
    let code=0,found=false;for(let length=1;length<16;length++){
      if(bit>=storageSize*8)fail('registered JSON complete prefix payload');code=code*2+((storage[bit>>>3]>>>(7-(bit%8)))&1);bit++;
      const offset=code-first[length];if(offset>=0&&offset<counts[length]){block[at]=symbols[base[length]+offset];found=true;break;}
    }if(!found)fail('registered JSON unproved prefix symbol');
  }
  if(storageSize*8-bit>7)fail('registered JSON extra prefix payload');for(;bit<storageSize*8;bit++)if((storage[bit>>>3]>>>(7-(bit%8)))&1)fail('registered JSON nonzero prefix padding');
  const plain=new Uint8Array(size);let cursor=0,written=0;
  function extended(value){if(value!==15)return value;let byte;do{if(cursor>=blockSize)fail('registered JSON complete length');byte=block[cursor++];value+=byte;if(value>size)fail('registered JSON length bound');}while(byte===255);return value;}
  while(cursor<blockSize){
    const token=block[cursor++],count=extended(token>>>4);if(cursor+count>blockSize||written+count>size)fail('registered JSON literal bound');for(let i=0;i<count;i++)plain[written++]=block[cursor++];if(cursor===blockSize)break;
    if(cursor+2>blockSize)fail('registered JSON complete distance');const distance=block[cursor++]+block[cursor++]*256,length=extended(token&15)+4;if(distance<1||distance>written||written+length>size)fail('registered JSON match bound');for(let i=0;i<length;i++){plain[written]=plain[written-distance];written++;}
  }
  if(written!==size)fail('registered JSON complete expanded length');
  const wire=decode(plain,size);checked();const result=JSON.parse(wire);checked();return result;
}
