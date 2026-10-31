// Complete occurrence accounting for returned inert DATA, never authority.
// String UTF16 units and UTF8 bytes are distinct; aliases count on every path.
import {types} from 'node:util';
const fail=message=>{throw new TypeError('Primitive vector iterator bulk accounting: '+message);};
const MAX_TEXT=16777216,MAX_CELLS=2000000,MAX_DEPTH=160;
export function accountPrimitiveVectorIteratorBulkData(input){
 const active=new Set();let cells=0,utf16Units=0,utf8Bytes=0;
 const cell=()=>{if(++cells>MAX_CELLS)fail('complete DATA occurrence cell budget');};
 const text=value=>{
  // Refuse UTF16 overflow before scanning the string to determine UTF8 cost.
  utf16Units+=value.length;if(utf16Units>MAX_TEXT)fail('complete DATA UTF16 unit budget');
  utf8Bytes+=Buffer.byteLength(value,'utf8');if(utf8Bytes>MAX_TEXT)fail('complete DATA UTF8 byte budget');
 };
 function visit(value,depth){
  cell();if(depth>MAX_DEPTH)fail('complete DATA depth budget');
  if(typeof value==='string'){text(value);return;}
  if(value===null){text('null');return;}
  if(value===undefined){text('undefined');return;}
  if(typeof value==='boolean'){text(value?'true':'false');return;}
  if(typeof value==='number'){if(!Number.isFinite(value))fail('finite DATA number required');text(Object.is(value,-0)?'-0':String(value));return;}
  if(typeof value==='bigint'){
   // Checked primitive domains are at most 128 bits. Bound before conversion.
   if(value<-(1n<<127n)||value>(1n<<128n)-1n)fail('bounded primitive DATA integer required');
   text(value.toString());return;
  }
  if(typeof value!=='object'||types.isProxy(value))fail('ordinary DATA required');
  const array=Array.isArray(value),parent=Object.getPrototypeOf(value);
  if(array?parent!==Array.prototype:parent!==Object.prototype&&parent!==null)fail('ordinary DATA prototype required');
  if(active.has(value))fail('cyclic DATA forbidden');
  const keys=Reflect.ownKeys(value);
  if(keys.length>MAX_CELLS-cells)fail('complete own-field occurrence budget');
  if(array){
   const size=Object.getOwnPropertyDescriptor(value,'length');
   if(!size||!Object.hasOwn(size,'value')||!Number.isSafeInteger(size.value)||size.value<0||keys.length!==size.value+1)fail('complete dense DATA array required');
   for(let index=0;index<size.value;index++)if(!Object.hasOwn(value,String(index)))fail('DATA array hole');
  }
  active.add(value);
  try{
   for(const key of keys){
    if(typeof key!=='string')fail('string DATA field required');
    cell();text(key);
    const field=Object.getOwnPropertyDescriptor(value,key);
    if(!field||!Object.hasOwn(field,'value'))fail('own DATA fields without accessors required');
    // Deliberately traverse shared children again; a global seen set would
    // undercount repeated retained paths, including migration/program aliases.
    visit(field.value,depth+1);
   }
  }finally{active.delete(value);}
 }
 visit(input,0);
 return {cells,utf16Units,utf8Bytes,maxCells:MAX_CELLS,maxUtf16Units:MAX_TEXT,maxUtf8Bytes:MAX_TEXT,maxDepth:MAX_DEPTH};
}
