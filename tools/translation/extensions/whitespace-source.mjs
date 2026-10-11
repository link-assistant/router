// Reproducible bounded Rust property-table lift; supplies no crate authority.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../source-profiles/whitespace-iterators/',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=()=>{throw new TypeError('Original Rust whitespace property is outside the registered source lift');};
function scalarProperty(node,scalar,table){
  switch(node.op){
    case 'scalar':return scalar;
    case 'literal':return node.value;
    case 'eq':return scalarProperty(node.left,scalar,table)===scalarProperty(node.right,scalar,table);
    case 'gt':return scalarProperty(node.left,scalar,table)>scalarProperty(node.right,scalar,table);
    case 'or':return node.items.some(item=>scalarProperty(item,scalar,table));
    case 'and':return node.items.every(item=>scalarProperty(item,scalar,table));
    case 'range':return scalar>=node.start&&scalar<=node.end;
    case 'pageMatch':return scalarProperty(node.cases[scalar>>>node.shift]??node.otherwise,scalar,table);
    case 'bitset':return (table[scalar&node.indexMask]&node.bit)!==0;
    default:return fail();
  }
}
export function whitespaceSourceArtifacts(){
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8')),sources=new Map();
  for(const input of manifest.sources){
    const packed=readFileSync(new URL(input.archive,root));if(hash(packed)!==input.archiveSha256)fail();
    const bytes=gunzipSync(packed,{maxOutputLength:300_000});if(bytes.length!==input.bytes||hash(bytes)!==input.sha256)fail();
    sources.set(input.archive,bytes.toString('utf8'));
  }
  const data=sources.get('unicode-data.rs.gz'),start=data.indexOf('pub mod white_space {'),end=data.indexOf('\npub mod conversions {',start);
  if(start<0||end<start)fail();const original=data.slice(start,end);
  const match=original.match(/static WHITESPACE_MAP: \[u8; 256\] = \[([\s\S]*?)\];/);if(!match)fail();
  const written=match[1].split(',').map(value=>value.trim()).filter(Boolean);
  if(written.length!==256||written.some(value=>!/^\d+$/.test(value)))fail();const table=written.map(Number);
  if(table.some(value=>!Number.isInteger(value)||value<0||value>255))fail();
  const lookup=/match c as u32 >> 8 \{\s*0 => WHITESPACE_MAP\[c as usize & 0xff\] & 1 != 0,\s*22 => c as u32 == 0x1680,\s*32 => WHITESPACE_MAP\[c as usize & 0xff\] & 2 != 0,\s*48 => c as u32 == 0x3000,\s*_ => false,\s*\}/;
  if(!lookup.test(original))fail();
  const char=sources.get('../utf16-fixed-f64/core-char-methods.rs.gz');
  if(!/pub const fn is_whitespace\(self\) -> bool \{\s*match self \{\s*' ' \| '\\x09'\.\.='\\x0d' => true,\s*c => c > '\\x7f' && unicode::White_Space\(c\),\s*\}\s*\}/.test(char))fail();
  if(!/unicode_data::white_space::lookup as White_Space/.test(sources.get('unicode-mod.rs.gz')))fail();
  const literal=value=>({op:'literal',value}),scalar={op:'scalar'},eq=value=>({op:'eq',left:scalar,right:literal(value)});
  const property={op:'or',items:[eq(32),{op:'range',start:9,end:13},{op:'and',items:[{op:'gt',left:scalar,right:literal(127)},{op:'pageMatch',shift:8,cases:{0:{op:'bitset',indexMask:255,bit:1},22:eq(0x1680),32:{op:'bitset',indexMask:255,bit:2},48:eq(0x3000)},otherwise:literal(false)}]}]};
  const meta=freeze({schema:'source-derived-whitespace-property-meta-v1',profile:manifest.id,rust:manifest.rust,unicodeVersion:manifest.unicodeVersion,sourceInputs:manifest.sources,originalTableSpan:{start:start+match.index,end:start+match.index+match[0].length},table,property,domain:'Unicode scalar values',namespaceAuthority:false,runtimeAuthority:false});
  // Reparse the data representation before emission, as the forward pipeline
  // does. Only this source-verified lift creates an executable property here.
  const reparsed=JSON.parse(JSON.stringify(meta)),codes=[];
  for(let value=0;value<=0x10ffff;value++)if((value<0xd800||value>0xdfff)&&scalarProperty(reparsed.property,value,reparsed.table))codes.push(value);
  if(JSON.stringify(codes)!==JSON.stringify(manifest.whitespaceScalarCodes))fail();
  const javascript='// Generated from pinned Rust 1.89 Unicode property meta; see generate-whitespace-data.mjs.\nexport const RUST_WHITESPACE_CODE_UNITS=Object.freeze('+JSON.stringify(codes)+');\nexport function isRustWhitespaceCodeUnit(unit){\n  for(let at=0;at<RUST_WHITESPACE_CODE_UNITS.length;at++)if(unit===RUST_WHITESPACE_CODE_UNITS[at])return true;\n  return false;\n}\n';
  return freeze({meta,codes,javascript,metaJson:JSON.stringify(meta,null,2)+'\n'});
}
