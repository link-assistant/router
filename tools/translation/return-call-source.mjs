// Invocation-local candidate associations from the actual checked compiler.
// Full modified-project checking and complete target reproduction remain required.
import {sourceItems} from './rust-structure.mjs';
const RESERVED=new Set('as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while async await dyn abstract become box do final macro override priv typeof unsized virtual yield try gen _'.split(' '));
const need=(value,message)=>{if(!value)throw new TypeError('Return call source: '+message);};
export function createReturnCallSource(bindings,sources){
 const selected=new Map();
 return {
  lower(name,argumentsSource){
   const binding=bindings.get(name);need(binding&&binding.declaration,'call needs an actual original checked scalar function');
   need(Array.isArray(argumentsSource)&&argumentsSource.length===binding.signature.params.length&&argumentsSource.every(value=>typeof value==='string'),'complete original scalar call arity required');
   let row=selected.get(name);
   if(!row){
    need(selected.size<4096,'complete original scalar callee count bound');
    const proof=binding.declaration.checkedSource();need(proof.schema==='original-checked-executable-source-v1'&&proof.source===binding.source&&proof.qualifiedName===binding.qualifiedName,'actual original callee source association required');
    const original=sources.get(proof.source);need(typeof original==='string','complete original callee file required');
    const source=original.slice(proof.span.start,proof.span.end),items=sourceItems(source).filter(item=>item.term==='fn'&&item.start===0&&item.end===source.length);need(items.length===1,'complete original ordinary callee function required');
    const tokens=items[0].tokens.filter(token=>token.type!=='comment'),fn=tokens.findIndex(token=>token.text==='fn');need(fn>=0&&!tokens.slice(0,fn).some(token=>['async','unsafe','extern'].includes(token.text)),'safe nonasync ordinary callee required');
    const raw=tokens[fn+1]?.text==='r'&&tokens[fn+2]?.text==='#',nameIndex=fn+(raw?3:1);need(tokens[nameIndex+1]?.text==='(','callee generics require separate original instantiation rules');
    const segments=binding.qualifiedName.split('.');need(segments.length>0&&segments.length<=128&&segments.every(part=>/^[A-Za-z_][A-Za-z0-9_]*$/u.test(part)&&!RESERVED.has(part))&&segments.at(-1)===tokens[nameIndex]?.text,'complete actual Rust callee path required');
    row={target:name,qualifiedName:binding.qualifiedName,path:proof.source,span:[proof.span.start,proof.span.end],source,rust:'crate::'+segments.join('::'),sourceAuthority:false,semanticAuthority:false};selected.set(name,row);
   }
   return row.rust+'('+argumentsSource.join(', ')+')';
  },
  evidence(){return [...selected.values()].map(row=>({...row,span:[...row.span]}));},
 };
}
