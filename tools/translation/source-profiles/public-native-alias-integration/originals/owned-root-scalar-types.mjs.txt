// Closed root interface observations only. Callers must freshly reproduce both
// the complete checked inner functions and the entire authoritative Rust root.
const fail=message=>{throw new TypeError('Owned root scalar type: '+message);};
const native=new Map([['::std::string::String','string'],['::core::primitive::f64','number'],['::core::primitive::bool','boolean']]);
const reserved=new Set('as async await break const continue crate dyn else enum extern false fn for gen if impl in let loop match mod move mut pub ref return self Self static struct super trait true try type unsafe use where while abstract become box do final macro override priv typeof unsized virtual yield'.split(' '));
export function readOwnedRootScalarType(item){
 const words=item.tokens.filter(row=>row.type!=='comment').map(row=>row.text);if(item.term!=='type'||words[0]!=='pub'||words[1]!=='type'||typeof words[2]!=='string'||! /^[A-Za-z_][A-Za-z0-9_]*$/u.test(words[2])||words[2]==='_'||reserved.has(words[2])||words[3]!=='='||words.at(-1)!==';')fail('one ordinary complete public scalar type declaration required');const target=words.slice(4,-1).join(''),domain=native.get(target);if(!domain)fail('canonical qualified String f64 or bool type target required');return {name:words[2],domain,target,span:[item.start,item.end],sourceAuthority:false,semanticAuthority:false};
}
export function ownedRootScalarTypeSource(envelope,javascript){
 if(typeof javascript!=='string'||!Array.isArray(envelope.scalarTypes)||envelope.scalarTypes.length>4096)fail('complete bounded scalar interface and JavaScript proposal required');const source=envelope.scalarTypes.map(row=>'type '+row.name+' = '+row.domain+';').join('\n')+'\n'+javascript;if(source.length>2097152)fail('complete typed interface source exceeds its original bound');return source;
}
