// Storage DATA only. This validates canonical JSON text without retaining a
// second complete object tree. No semantic, source or owner permit is issued.
// Invalid or unusually deep input uses the original native parse/stringify,
// preserving its exact error behavior and canonicalization rules.
function canonicalSyntax(source){
 let at=0;
 const stop=()=>{throw Error('Use complete native JSON validation');};
 function string(key=false){
  if(source.charCodeAt(at++)!==34)stop();
  const begin=at-1;let escaped=false;
  while(at<source.length){
   const code=source.charCodeAt(at++);
   if(code===34){
    if(escaped){const raw=source.slice(begin,at),value=JSON.parse(raw);if(JSON.stringify(value)!==raw)stop();return key?value:undefined;}
    return key?source.slice(begin+1,at-1):undefined;
   }
   if(code<32)stop();
   if(code===92){escaped=true;at++;continue;}
   if(code>=0xd800&&code<=0xdbff){const next=source.charCodeAt(at);if(!(next>=0xdc00&&next<=0xdfff))stop();at++;}
   else if(code>=0xdc00&&code<=0xdfff)stop();
  }
  stop();
 }
 function value(depth){
  // This is the optimization domain, not a new acceptance/depth limit.
  // Deeper documents receive the identical original native operation.
  if(depth>512)stop();
  const code=source.charCodeAt(at);
  if(code===34){string();return;}
  if(code===123){
   at++;if(source.charCodeAt(at)===125){at++;return;}
   const names=new Set();let lastIndex=-1,ordinary=false;
   while(at<source.length){
    const name=string(true);if(names.has(name))stop();names.add(name);
    const index=Number(name),numeric=Number.isInteger(index)&&index>=0&&index<4294967295&&String(index)===name;
    if(numeric){if(ordinary||index<=lastIndex)stop();lastIndex=index;}else ordinary=true;
    if(source.charCodeAt(at++)!==58)stop();value(depth+1);
    const separator=source.charCodeAt(at++);if(separator===125)return;if(separator!==44)stop();
   }
   stop();
  }
  if(code===91){
   at++;if(source.charCodeAt(at)===93){at++;return;}
   while(at<source.length){value(depth+1);const separator=source.charCodeAt(at++);if(separator===93)return;if(separator!==44)stop();}
   stop();
  }
  const literal=code===116?'true':code===102?'false':code===110?'null':null;
  if(literal&&source.startsWith(literal,at)){at+=literal.length;return;}
  if(code!==45&&!(code>=48&&code<=57))stop();
  const begin=at;
  while(at<source.length){const next=source.charCodeAt(at);if(next===44||next===93||next===125)break;at++;}
  const raw=source.slice(begin,at),parsed=JSON.parse(raw);if(typeof parsed!=='number'||JSON.stringify(parsed)!==raw)stop();
 }
 try{value(0);if(at!==source.length)stop();return true;}
 catch{return false;}
}
export function isCanonicalJsonText(source){
 if(typeof source!=='string')throw TypeError('Complete JSON text required');
 return canonicalSyntax(source)||JSON.stringify(JSON.parse(source))===source;
}
// Match a discarded native JSON.parse exactly, including acceptance of valid
// noncanonical and deep input. The canonical fast path needs no object tree.
export function assertJsonSyntax(source){
 if(typeof source!=='string')throw TypeError('Complete JSON text required');
 if(!canonicalSyntax(source))JSON.parse(source);
}
