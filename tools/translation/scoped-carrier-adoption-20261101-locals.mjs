// Source selection only. A whole changed native program must check afresh.
import {sourceItems} from './rust-structure.mjs';
import {withScopedCarrierSource} from './scoped-carrier-source-20261101.mjs';
import {scopedCarrierGroupEnd,scopedCarrierWrittenRole,scopedCarrierInitializerEnd} from './scoped-carrier-source-20261101-operands.mjs';
import {localAliasDeclaration} from './local-alias-binding-source.mjs';
import {readLocalAliasInitializer} from './local-alias-written-source.mjs';
import {coreCarrierCallbackSourceRegions} from './core-carrier-callback-source-regions.mjs';
import {opaqueSourceTokenEnds} from './opaque-source-token-regions.mjs';
import {decodeCarrierRole} from './primitive-carrier-local-source.mjs';
import {coreFormattingMacroSourceHeaders} from './core-formatting-macro-source.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
const fail=message=>{throw TypeError('Scoped carrier adoption source: '+message);};
const identifier=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text)&&!['_','mut','ref','self','Self'].includes(row.text);
const excludedWords=new Set(['for','while','loop','match','fn','mod','use','extern','macro_rules','macro','unsafe','async','await','yield','|','||']);
const reserved=new Set(['crate','std','core','self','Self','Option','Some','None','Result','Ok','Err','translation_core']);
const residual=(item,reason)=>({edits:[],languageEdits:[],selections:[],skipped:[{function:item?.name??null,reason}],sourceAuthority:false,semanticAuthority:false});

// This is a refusal-only lexical pass BEFORE the poisoning source operation.
// It duplicates its finite syntax domain, never catches its source failures.
export function inspectScopedAdoptionDomain(source,item){
 accountData({source,item});
 if(typeof source!=='string'||/\p{Surrogate}/u.test(source)||Buffer.byteLength(source)>2097152)return {reason:'whole source exceeds scoped lexical domain'};
 const actual=sourceItems(source).filter(row=>row.term==='fn'&&row.start===item?.start&&row.end===item?.end);
 if(actual.length!==1)return {reason:'one actual complete top-level source function required'};
 const tokens=actual[0].tokens.filter(row=>row.type!=='comment'),fn=tokens.findIndex(row=>row.text==='fn');
 if(tokens.length>200000||fn<0||tokens[fn+2]?.text!=='('||tokens.slice(0,fn).some(row=>['unsafe','async','const','extern'].includes(row.text)))return {reason:'ordinary nongeneric synchronous scoped function required'};
 const end=scopedCarrierGroupEnd(tokens,fn+2);if(end===null)return {reason:'complete parameter source required'};
 const parameters=new Map();let start=fn+3;
 for(let at=start;at<=end;at++){
  if(at===end||tokens[at].text===','){
   if(at>start){const row=tokens.slice(start,at);if(!identifier(row[0])||row[1]?.text!==':'||parameters.has(row[0].text))return {reason:'distinct immutable scoped header bindings required'};parameters.set(row[0].text,[row[0].start,row.at(-1).end]);}
   else if(at!==end)return {reason:'dense scoped parameter list required'};start=at+1;
  }else if(['(','[','{'].includes(tokens[at].text)){const last=scopedCarrierGroupEnd(tokens,at);if(last===null||last>=end)return {reason:'complete parameter delimiters required'};at=last;}
 }
 let open=end+1;while(open<tokens.length&&tokens[open].text!=='{')open++;
 if(scopedCarrierGroupEnd(tokens,open)!==tokens.length-1)return {reason:'complete ordinary scoped function body required'};
 const rows=tokens.slice(open+1,-1),regions=coreCarrierCallbackSourceRegions(rows),opaque=opaqueSourceTokenEnds(rows,regions),formatting=coreFormattingMacroSourceHeaders(rows),names=new Set();let work=0,depth=1,declarations=0;
 const tick=()=>{if(++work>200000)fail('complete preflight work bound');};
 for(let at=0;at<rows.length;at++){
  tick();const excluded=opaque.get(at);if(excluded!==undefined){at=excluded-1;continue;}const word=rows[at].text;
  if(excludedWords.has(word))return {reason:'callback, pattern, control or producer needs a separate scoped source rule'};
  if(word==='#'||['trait','impl','struct','enum','union','type','const','static'].includes(word)||word!=='!'&&word.endsWith('!')&&!formatting.has(rows[at].end-1)||word==='!'&&identifier(rows[at-1])&&['(','[','{'].includes(rows[at+1]?.text)&&!formatting.has(rows[at].start))return {reason:'unknown source producer or macro needs a separate scoped source rule'};
  if(word==='{'){if(++depth>256)return {reason:'complete scoped lexical depth bound'};}
  else if(word==='}'){if(--depth<1)return {reason:'original lexical delimiters differ'};}
  else if(word==='let'){
   const declaration=localAliasDeclaration(rows,at);if(!declaration||declaration.mutable||reserved.has(declaration.name))return {reason:'pattern, mutable or namespace local needs a separate source rule'};
   names.add(declaration.name);if(++declarations>4096)return {reason:'complete scoped local census bound'};
   const written=readLocalAliasInitializer(rows,at,scopedCarrierWrittenRole);let first=written?.start??null;
   if(first===null)for(let cursor=declaration.next+1;cursor<rows.length&&cursor-declaration.next<=65;cursor++){tick();if(rows[cursor].text==='='){first=cursor+1;break;}if([';','{','}'].includes(rows[cursor].text))break;}
   if(first===null||first<=at+2||first>=rows.length||scopedCarrierInitializerEnd(first,rows,tick,{opaqueTokenEnds:opaque})===null)return {reason:'complete bounded scoped initializer required'};
  }
 }
 if(depth!==1)return {reason:'whole scoped body delimiters differ'};
 return {reason:null,tokens,parameters,names};
}

function jsonDomain(encoded){const value=decodeCarrierRole(encoded);if(!value)return null;if(value.kind==='json')return 'json-reference';if(value.kind==='payload')return value.domain;return null;}
function textDomain(encoded){const value=decodeCarrierRole(encoded);if(!value)return null;if(value.kind==='json')return 'json-reference';if(value.kind==='payload')return value.domain;if(value.kind==='option')return value.domain==='str'?'str-option-ref':value.domain+'-option';return null;}

export function withScopedAdoptionLocals(source,item,run){
 requireSynchronousSourceCallback(run);const domain=inspectScopedAdoptionDomain(source,item);if(domain.reason)return residual(item,domain.reason);
 return withScopedCarrierSource({source,functionSpan:[item.start,item.end]},reader=>{
  let active=true,lastSnapshot=null;
  // Existing selectors split combined macro/try tokens. Only a position in an
  // actual original token may map back to its original lexical start; trivia
  // and arbitrary offsets cannot acquire a role.
  function originalPosition(position){if(!active)fail('local adapter expired');let low=0,high=domain.tokens.length-1;while(low<=high){const mid=(low+high)>>1,row=domain.tokens[mid];if(position<row.start)high=mid-1;else if(position>=row.end)low=mid+1;else return row.start;}fail('actual original source token position required');}
  function snapshot(position){lastSnapshot=reader.at(originalPosition(position));return lastSnapshot;}
  function family(kind,parameterDomains,parameters){
   if(!active||!(parameterDomains instanceof Map)||!(parameters instanceof Set)||parameters.size!==domain.parameters.size||[...parameters].some(name=>!domain.parameters.has(name)))fail('actual complete header binding census required');
   return Object.freeze({
    names:new Set(domain.names),
    at(position){const current=snapshot(position),result=new Map();for(const [name,origin]of Object.entries(current.provenance)){
     const encoded=Object.hasOwn(current.bindings,name)?current.bindings[name]:null;let value=kind==='carrier'?decodeCarrierRole(encoded):kind==='json'?jsonDomain(encoded):textDomain(encoded);
     if(value===null&&origin.kind==='parameter'){
      const span=domain.parameters.get(name);if(!span||origin.declarationSpan?.[0]!==span[0]||origin.declarationSpan?.[1]!==span[1])fail('original parameter declaration interval differs');
      value=parameterDomains.get(name)??null;
     }
     if(value!==null)result.set(name,value);
    }return result;},
    evidence(name){if(!active)fail('local adapter expired');return lastSnapshot?.evidence[name]??null;},
    // No registration: close a whole source stage and rebuild its real next
    // source version before a newly proposed result can become lexical DATA.
    selectedCall(){if(!active)fail('local adapter expired');},
   });
  }
  const api=Object.freeze({
   json:(domains,parameters)=>family('json',domains,parameters),
   carrier:(domains,parameters)=>family('carrier',domains,parameters),
   text:(domains,parameters)=>family('text',domains,parameters),
   operand(position,span){if(!active)fail('local adapter expired');return reader.operand(position,span);},
   sourceAuthority:false,semanticAuthority:false,
  });
  try{return run(api);}finally{active=false;lastSnapshot=null;domain.parameters.clear();domain.names.clear();domain.tokens.length=0;}
 });
}
