// A bounded lift of the pinned Rust Cc table. This supplies property DATA,
// never source ownership or permission to translate an arbitrary char method.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {transportConcreteSyntaxSource} from './concrete-syntax-meta.mjs';
const root=new URL('./source-profiles/whitespace-iterators/',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=()=>{throw new TypeError('Owned Unicode predicates require the complete pinned Rust property sources');};
export function unicodePredicateSourceArtifacts(){
 const wire=readFileSync(new URL('manifest.json',root));
 if(hash(wire)!=='c37d1a1936e0d4a64a2da35586d35d3391ebf60637d97686f7ee2ff631e86846')fail();
 const manifest=JSON.parse(wire.toString('utf8')),sources=[];
 for(const name of ['unicode-data.rs.gz','unicode-mod.rs.gz','../utf16-fixed-f64/core-char-methods.rs.gz']){
  const input=manifest.sources.find(row=>row.archive===name);if(!input)fail();
  const archive=readFileSync(new URL(name,root));if(hash(archive)!==input.archiveSha256)fail();
  const bytes=gunzipSync(archive,{maxOutputLength:300000});if(bytes.length!==input.bytes||hash(bytes)!==input.sha256)fail();
  const source=bytes.toString('utf8'),syntax=transportConcreteSyntaxSource(source,{language:'Rust'});if(syntax.source!==source)fail();
  sources.push({...input,source,meta:syntax.meta});
 }
 const data=sources[0].source,items=sourceItems(data),cc=items.filter(row=>row.term==='mod'&&row.name==='cc'),skip=items.filter(row=>row.term==='fn'&&row.name==='skip_search');
 if(cc.length!==1||skip.length!==1)fail();
 const property=data.slice(cc[0].start,cc[0].end),algorithm=data.slice(skip[0].start,skip[0].end);
 // The single run's prefix bound exceeds char::MAX. For every scalar the
 // actual binary search therefore selects run zero, start_index=0, prev=0.
 // The original loop consumes all but the terminal offset, and returns odd
 // offset parity. Preserve all original callbacks and the full algorithm.
 if(!/SHORT_OFFSET_RUNS: \[ShortOffsetRunHeader; 1\] = \[\s*ShortOffsetRunHeader::new\(0, 1114272\),\s*\]/u.test(property)||
    !/OFFSETS: \[u8; 5\] = \[\s*0, 32, 95, 33, 0,\s*\]/u.test(property)||
    !/super::skip_search\(c, &SHORT_OFFSET_RUNS, &OFFSETS\)/u.test(property)||
    !/offset_idx % 2 == 1/u.test(algorithm)||
    !/pub fn is_control\(self\) -> bool \{\s*unicode::Cc\(self\)\s*\}/u.test(sources[2].source)||
    !/unicode_data::cc::lookup as Cc/u.test(sources[1].source))fail();
 const whitespaceRuntime=readFileSync(new URL('./extensions/whitespace-data.mjs',import.meta.url),'utf8');
 const whitespaceExpected='// Generated from pinned Rust 1.89 Unicode property meta; see generate-whitespace-data.mjs.\nexport const RUST_WHITESPACE_CODE_UNITS=Object.freeze('+JSON.stringify(manifest.whitespaceScalarCodes)+');\nexport function isRustWhitespaceCodeUnit(unit){\n  for(let at=0;at<RUST_WHITESPACE_CODE_UNITS.length;at++)if(unit===RUST_WHITESPACE_CODE_UNITS[at])return true;\n  return false;\n}\n';
 if(whitespaceRuntime!==whitespaceExpected)fail();
 const offsets=[0,32,95,33,0],ranges=[];let position=0;
 for(let index=0;index<offsets.length-1;index++){
  const next=position+offsets[index];if(index%2===1&&position<next)ranges.push([position,next-1]);position=next;
 }
 if(JSON.stringify(ranges)!=='[[0,31],[127,159]]')fail();
 return {schema:'router-unicode-predicate-properties-v1',manifest,manifestSource:wire.toString('utf8'),sources,
  whitespace:{codes:manifest.whitespaceScalarCodes,source:whitespaceRuntime,sha256:hash(whitespaceRuntime),meta:transportConcreteSyntaxSource(whitespaceRuntime,{language:'JavaScript'}).meta},
  control:{ranges,offsets,runPrefixBound:1114272,propertySpan:[cc[0].start,cc[0].end],algorithmSpan:[skip[0].start,skip[0].end],property,algorithm},
  semanticAuthority:false,runtimeExecuted:false,rustExecuted:false};
}
