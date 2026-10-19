// Test transport only. The in-memory report codec and all proof children stay
// independent of this reader. No compiler or source authority is issued here.
import {openSync,closeSync,readSync,fstatSync,lstatSync,constants} from 'node:fs';

const BYTES=64*1024*1024,WINDOW=64*1024,STRINGS=500000,NODES=1000000,FIELDS=4000000;
let workspace=null,busy=false;
const fail=message=>{throw Error('Indexed reference report: '+message);};
const identity=stat=>({dev:stat.dev,ino:stat.ino,size:stat.size,mtimeMs:stat.mtimeMs,ctimeMs:stat.ctimeMs});
const same=(left,right)=>left.dev===right.dev&&left.ino===right.ino&&left.size===right.size&&left.mtimeMs===right.mtimeMs&&left.ctimeMs===right.ctimeMs;

// Fixed numeric storage, reused only between closed synchronous cursor scopes.
// The UTF16 arena is <=128 MiB; all other typed indexes total <20 MiB. No node,
// tuple, field or complete source string becomes a retained JavaScript object.
function storage(){
 if(!workspace)workspace={units:new Uint16Array(BYTES),starts:new Uint32Array(STRINGS),lengths:new Uint32Array(STRINGS),canonical:new Uint32Array(STRINGS),chains:new Uint32Array(STRINGS),buckets:new Uint32Array(1048576),seen:new Uint32Array(STRINGS),nodes:new Uint32Array(NODES),kinds:new Uint8Array(NODES)};
 return workspace;
}
const digit=value=>value>=48&&value<=57;
const hex=value=>value>=48&&value<=57?value-48:value>=65&&value<=70?value-55:value>=97&&value<=102?value-87:-1;

class Reader{
 constructor(fd,size){this.fd=fd;this.size=size;this.at=0;this.base=-1;this.end=-1;this.buffer=Buffer.allocUnsafe(WINDOW);this.tag=0;this.payload=undefined;}
 seek(at){if(at<0||at>this.size)fail('invalid file offset');this.at=at;}
 byte(){
  if(this.at>=this.size)return -1;
  if(this.at<this.base||this.at>=this.end){this.base=this.at-this.at%WINDOW;const wanted=Math.min(WINDOW,this.size-this.base);let count=0;while(count<wanted){const read=readSync(this.fd,this.buffer,count,wanted-count,this.base+count);if(read===0)fail('truncated window');count+=read;}this.end=this.base+count;}
  return this.buffer[this.at-this.base];
 }
 take(){const value=this.byte();if(value<0)fail('unexpected EOF');this.at++;return value;}
 space(){let value;while((value=this.byte())===32||value===9||value===10||value===13)this.at++;}
 expect(value){this.space();if(this.take()!==value)fail('unexpected JSON token');}
 literal(text,value){this.space();for(let at=0;at<text.length;at++)if(this.take()!==text.charCodeAt(at))fail('invalid JSON literal');return value;}
 string(emit=null){
  this.expect(34);let count=0;
  const unit=value=>{count++;if(emit)emit(value);};
  for(;;){let value=this.take();if(value===34)return count;if(value<32)fail('control byte in JSON string');
   if(value===92){value=this.take();if(value===117){let code=0;for(let at=0;at<4;at++){const part=hex(this.take());if(part<0)fail('invalid Unicode escape');code=code*16+part;}unit(code);continue;}
    if(value===34||value===92||value===47){unit(value);continue;}
    const code=value===98?8:value===102?12:value===110?10:value===114?13:value===116?9:-1;if(code<0)fail('invalid JSON escape');unit(code);continue;
   }
   if(value<128){unit(value);continue;}
   const length=value>=194&&value<=223?2:value>=224&&value<=239?3:value>=240&&value<=244?4:0;if(!length)fail('malformed UTF8');
   let code=value&(length===2?31:length===3?15:7);for(let at=1;at<length;at++){const next=this.take();if(next<128||next>191)fail('malformed UTF8');code=code*64+(next&63);}
   if(code<(length===2?128:length===3?2048:65536)||code>1114111||code>=55296&&code<=57343)fail('malformed UTF8');
   if(code<65536)unit(code);else{code-=65536;unit(55296+(code>>>10));unit(56320+(code&1023));}
  }
 }
 text(maximum=256){let text='';this.string(code=>{if(text.length>=maximum)fail('unsupported transport object name/string');text+=String.fromCharCode(code);});return text;}
 number(){
  this.space();let text='';const add=()=>{if(text.length>=4096)fail('unsupported numeric token longer than 4096 bytes');text+=String.fromCharCode(this.take());};
  if(this.byte()===45)add();if(this.byte()===48)add();else{if(this.byte()<49||this.byte()>57)fail('invalid JSON number');do{add();}while(digit(this.byte()));}
  if(this.byte()===46){add();if(!digit(this.byte()))fail('invalid JSON fraction');do{add();}while(digit(this.byte()));}
  if(this.byte()===101||this.byte()===69){add();if(this.byte()===43||this.byte()===45)add();if(!digit(this.byte()))fail('invalid JSON exponent');do{add();}while(digit(this.byte()));}
  return Number(text);
 }
 boolean(){this.space();return this.byte()===116?this.literal('true',true):this.byte()===102?this.literal('false',false):fail('boolean required');}
 array(each,maximum){
  this.expect(91);this.space();let count=0;if(this.byte()===93){this.at++;return count;}
  for(;;){if(count>=maximum)fail('array count bound');this.space();each(count++);this.space();const next=this.take();if(next===93)return count;if(next!==44)fail('JSON array separator');}
 }
 object(each){
  this.expect(123);this.space();const names=new Set();if(this.byte()===125){this.at++;return names;}
  for(;;){const name=this.text();if(names.has(name))fail('duplicate JSON object name');if(names.size>=64)fail('unsupported transport object shape');names.add(name);this.expect(58);this.space();each(name);this.space();const next=this.take();if(next===125)return names;if(next!==44)fail('JSON object separator');}
 }
 skip(depth=0){
  if(depth>32)fail('unsupported transport nesting');this.space();const value=this.byte();
  if(value===34){this.string();return;}if(value===91){this.array(()=>this.skip(depth+1),FIELDS);return;}
  if(value===123){this.object(()=>this.skip(depth+1));return;}if(value===116){this.literal('true',true);return;}if(value===102){this.literal('false',false);return;}if(value===110){this.literal('null',null);return;}this.number();
 }
 scalar(){
  let tag,payload;const count=this.array(at=>{if(at===0)tag=this.number();else{this.space();payload=this.byte()===34?this.text(32):this.byte()===116||this.byte()===102?this.boolean():this.number();}},2);
  if(!Number.isSafeInteger(tag)||tag<0||tag>6||count!==(tag<2?1:2))fail('report scalar tag');this.tag=tag;this.payload=payload;
 }
}

function exact(names,wanted){if(names.size!==wanted.length||wanted.some(name=>!names.has(name)))fail('unsupported transport object shape');}
function referenceIndex(value,length){if(!Number.isSafeInteger(value)||value<0||value>=length)fail('report reference bound');return value;}
function readChecks(reader){
 const facts={};const names=reader.object(name=>{
  if(['envelopeByteEqual','dataEqual','canonicalJsonByteEqual','partialRoundtrip'].includes(name))facts[name]=reader.boolean();
  else if(name==='envelopeBytes'||name==='canonicalJsonBytes'){const value=reader.number();if(!Number.isSafeInteger(value)||value<0)fail('invalid check byte count');facts[name]=value;}
  else if(name==='roundtrip'){const values={};const keys=reader.object(key=>{if(key!=='representation'&&key!=='target')fail('unknown roundtrip check');values[key]=reader.text();});exact(keys,['representation','target']);facts.roundtrip=values;}
  else if(name==='error'){const keys=reader.object(key=>{if(!['name','message','stack'].includes(key))fail('unknown error check');reader.space();if(key==='stack'&&reader.byte()===110)reader.literal('null',null);else reader.string();});exact(keys,['name','message','stack']);facts.error=true;}
  else fail('unknown check shape');
 });
 if(names.has('error'))exact(names,['error','partialRoundtrip']);
 else{const wanted=['envelopeByteEqual','dataEqual','envelopeBytes','roundtrip'];if(names.has('canonicalJsonByteEqual')||names.has('canonicalJsonBytes'))wanted.push('canonicalJsonByteEqual','canonicalJsonBytes');exact(names,wanted);}
 return facts;
}
function census(reader){
 const state={};const names=reader.object(name=>{
  if(name==='schema'){if(reader.text()!=='validated-reference-proof-report-v1')fail('outer report schema');}
  else if(name==='checks')state.checks=readChecks(reader);
  else if(name==='alternative'){reader.space();state.alternative=reader.byte()!==110;if(state.alternative)reader.skip();else reader.literal('null',null);}
  else if(name==='report'){
   const inner=reader.object(key=>{
    if(key==='schema'){if(reader.text()!=='complete-report-reference-v1')fail('report schema');}
    else if(key==='strings'){state.stringAt=reader.at;state.units=0;state.strings=reader.array(()=>{state.units+=reader.string();if(state.units>BYTES)fail('string arena bound');},STRINGS);}
    else if(key==='nodes'){state.nodeAt=reader.at;state.nodes=reader.array(()=>reader.skip(),NODES);}
    else if(key==='root'){reader.scalar();state.rootTag=reader.tag;state.rootPayload=reader.payload;}
    else fail('unknown report shape');
   });exact(inner,['schema','strings','nodes','root']);
  }else fail('unknown outer report shape');
 });exact(names,['schema','report','checks','alternative']);reader.space();if(reader.at!==reader.size)fail('trailing JSON bytes');return state;
}
function equalUnits(store,left,right){
 if(store.lengths[left]!==store.lengths[right])return false;let a=store.starts[left],b=store.starts[right];const end=a+store.lengths[left];while(a<end)if(store.units[a++]!==store.units[b++])return false;return true;
}
function ascii(store,id,text){if(store.lengths[id]!==text.length)return false;const at=store.starts[id];for(let index=0;index<text.length;index++)if(store.units[at+index]!==text.charCodeAt(index))return false;return true;}
function equalsText(store,id,text){if(store.lengths[id]!==text.length)return false;let at=store.starts[id];for(let index=0;index<text.length;index++)if(store.units[at++]!==text.charCodeAt(index))return false;return true;}
function stringText(store,id){
 const end=store.starts[id]+store.lengths[id],parts=[];for(let at=store.starts[id];at<end;at+=4096)parts.push(String.fromCharCode(...store.units.subarray(at,Math.min(at+4096,end))));return parts.join('');
}
function strings(reader,state,store){
 reader.seek(state.stringAt);store.buckets.fill(0);let position=0;
 const count=reader.array(id=>{
  store.starts[id]=position;let hash=5381;const length=reader.string(unit=>{if(position>=state.units)fail('string census changed');store.units[position++]=unit;hash=(hash*33+unit)>>>0;});store.lengths[id]=length;
  const bucket=hash&1048575;let prior=store.buckets[bucket],canonical=id;while(prior){if(equalUnits(store,id,prior-1)){canonical=prior-1;break;}prior=store.chains[prior-1];}
  store.canonical[id]=canonical;if(canonical===id){store.chains[id]=store.buckets[bucket];store.buckets[bucket]=id+1;}
 },STRINGS);if(count!==state.strings||position!==state.units)fail('string census changed');
}
function bigintString(store,id){let at=store.starts[id],end=at+store.lengths[id];if(at===end)return false;if(store.units[at]===45)at++;if(at===end)return false;if(store.units[at]===48)return at+1===end;if(store.units[at]<49||store.units[at]>57)return false;for(at++;at<end;at++)if(!digit(store.units[at]))return false;return true;}
function arrayIndex(store,id){
 const length=store.lengths[id],start=store.starts[id];if(!length||length>10||length>1&&store.units[start]===48)return -1;let value=0;for(let at=0;at<length;at++){const code=store.units[start+at];if(!digit(code))return -1;value=value*10+code-48;}return value<4294967295?value:-1;
}
function scalarValid(tag,value,state,store){
 if(tag===2&&typeof value!=='boolean'||tag===3&&!(typeof value==='number'&&Number.isFinite(value)||['NaN','+Infinity','-Infinity','-0'].includes(value)))fail('report scalar payload');
 if(tag===4||tag===6)referenceIndex(value,state.strings);if(tag===5)referenceIndex(value,state.nodes);if(tag===6&&!bigintString(store,value))fail('report bigint payload');
}
function validateNodes(reader,state,store){
 scalarValid(state.rootTag,state.rootPayload,state,store);store.seen.fill(0);reader.seek(state.nodeAt);let cells=0;
 const count=reader.array(id=>{
  store.nodes[id]=reader.at;let kind,extensible,fields,arrayLength=null,maximumIndex=-1;
  const length=reader.array(at=>{
   if(at===0){kind=reader.number();if(![0,1,2].includes(kind))fail('report node shape');store.kinds[id]=kind;}
   else if(at===1)extensible=reader.boolean();
   else fields=reader.array(()=>{
    let key,flags,tag,value;const size=reader.array(part=>{
     if(part===0){key=referenceIndex(reader.number(),state.strings);const canonical=store.canonical[key];if(store.seen[canonical]===id+1)fail('duplicate report field key');store.seen[canonical]=id+1;}
     else if(part===1){flags=reader.number();if(!Number.isSafeInteger(flags)||flags<0||flags>7)fail('report descriptor shape');}
     else{reader.scalar();tag=reader.tag;value=reader.payload;scalarValid(tag,value,state,store);}
    },3);if(size!==3)fail('report descriptor shape');if(++cells>FIELDS)fail('report cell bound');
    if(kind===2){if(ascii(store,key,'length')){if(flags!==0&&flags!==4||tag!==3||!Number.isSafeInteger(value)||value<0||value>4294967295)fail('report array length');arrayLength=value;}else maximumIndex=Math.max(maximumIndex,arrayIndex(store,key));}
   },FIELDS);
  },3);if(length!==3||typeof extensible!=='boolean'||fields===undefined)fail('report node shape');if(kind===2&&(arrayLength===null||maximumIndex>=arrayLength))fail('report array length/index');
 },NODES);if(count!==state.nodes)fail('node census changed');
}

// Supports complete generic valid codec values. The private FILE encoding also
// refuses malformed UTF8, duplicate JSON object names, unknown outer/check
// shapes, >4096-byte numeric tokens, reentry and use after the callback closes.
// Escapes, whitespace, object member order, finite JSON number spellings, lone
// surrogate escapes and duplicate string-table VALUES remain supported.
export function withIndexedReferenceProof(record,callback,{canonicalJson=false}={}){
 if(busy)fail('cursor reentry');busy=true;let fd,active=false;
 try{
  fd=openSync(record.envelopePath,constants.O_RDONLY|(constants.O_NOFOLLOW??0));const before=fstatSync(fd);
  if(!before.isFile()||before.size>BYTES||before.size!==record.envelopeBytes||record.envelopeIdentity&&!same(before,record.envelopeIdentity))fail('file bound/type/identity');
  const stable=()=>{const now=fstatSync(fd),path=lstatSync(record.envelopePath);if(!now.isFile()||!path.isFile()||!same(before,now)||!same(before,path))fail('file identity changed');};stable();
  const reader=new Reader(fd,before.size),state=census(reader);stable();const store=storage();strings(reader,state,store);stable();validateNodes(reader,state,store);stable();
  const checks=state.checks;if(checks.error||checks.envelopeByteEqual!==true||checks.dataEqual!==true||checks.roundtrip?.representation!=='exact-byte-reference'||checks.roundtrip?.target!=='report'||state.alternative||canonicalJson&&checks.canonicalJsonByteEqual!==true)fail('complete child roundtrip/checks failed');
  active=true;const live=()=>{if(!active)fail('cursor used after close');stable();};
  const findField=(id,key)=>{
   reader.seek(store.nodes[id]);let selected=null;reader.array(at=>{if(at===0)reader.number();else if(at===1)reader.boolean();else reader.array(()=>{let match=false,tag,value;reader.array(part=>{if(part===0)match=equalsText(store,reader.number(),key);else if(part===1)reader.number();else{reader.scalar();tag=reader.tag;value=reader.payload;}},3);if(match)selected=[tag,value];},FIELDS);},3);return selected??[1,undefined];
  };
  const find=path=>{live();let tag=state.rootTag,value=state.rootPayload;for(const key of path){if(tag!==5){stable();return [1,undefined];}[tag,value]=findField(value,String(key));}stable();return [tag,value];};
  const scalar=([tag,value])=>{switch(tag){case 0:return null;case 1:return undefined;case 2:return value;case 3:return value==='NaN'?NaN:value==='+Infinity'?Infinity:value==='-Infinity'?-Infinity:value==='-0'?-0:value;case 4:return stringText(store,value);case 6:return BigInt(stringText(store,value));default:fail('reference cursor expected a scalar');}};
  const cursor={read:(...path)=>{const value=scalar(find(path));stable();return value;},has:(...path)=>{const ref=find(path),value=ref[0]===5||!!scalar(ref);stable();return value;},arrayLength:(...path)=>{const ref=find(path);if(ref[0]!==5||store.kinds[ref[1]]!==2)fail('reference cursor expected an array');const value=scalar(find([...path,'length']));stable();return value;}};
  try{callback(cursor);}finally{active=false;stable();}
 }finally{active=false;if(fd!==undefined)closeSync(fd);busy=false;}
}
