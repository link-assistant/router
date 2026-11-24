// Original Clap default-feature document preprocessing. This input-to-output
// helper grants no attribute, derive, trait or runtime namespace authority.
import {createHash} from 'node:crypto';
import {deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const ascii=value=>/^[\t\n\r\x20-\x7e]*$/u.test(value);
const trim=value=>value.replace(/^[\t\n\r ]+|[\t\n\r ]+$/gu,'');
const plans=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

function featureTable(dependencies,name) {
  const original=deriveDependencySource(dependencies,name,'Cargo.toml'),start=original.source.indexOf('[features]\n'),end=original.source.indexOf('\n[',start+1);
  if(start<0||end<0)throw new TypeError('Clap document features lack their original Cargo table');
  const body=original.source.slice(start+11,end),entries=new Map();let at=0;
  const pattern=/\s*([A-Za-z0-9_-]+)\s*=\s*\[([^\]]*)\]/y;
  while(at<body.length) {
    if(!body.slice(at).trim())break;pattern.lastIndex=at;const match=pattern.exec(body);
    if(!match||entries.has(match[1]))throw new TypeError('Clap original feature table exceeds its literal-array grammar');
    const values=[...match[2].matchAll(/"([A-Za-z0-9_?/:.-]+)"/gu)].map(row=>row[1]);
    if(match[2].replaceAll(/"[A-Za-z0-9_?/:.-]+"/gu,'').replaceAll(/[\s,]/gu,''))throw new TypeError('Clap original feature entry has unsupported syntax');
    const span={start:start+11+match.index,end:start+11+pattern.lastIndex};
    entries.set(match[1],{name:match[1],values,package:name,source:'Cargo.toml',sourceSha256:original.sha256,span,sha256:hash(original.source.slice(span.start,span.end))});at=pattern.lastIndex;
  }
  return entries;
}

export function originalClapDocumentFeaturePlan(dependencies) {
  if(!isDeriveDependencyProof(dependencies))throw new TypeError('Clap documents require sealed original source dependencies');
  if(plans.has(dependencies))return plans.get(dependencies);
  const tables=new Map(['clap','clap_derive','clap_builder'].map(name=>[name,featureTable(dependencies,name)])),roots=[...dependencies.features.clap.features,...(dependencies.features.clap.defaultFeatures?['default']:[])],queue=roots.map(feature=>['clap',feature]),seen=new Set(),selected=[];
  // Cargo's original optional derive dependency has its default features on.
  const cargo=deriveDependencySource(dependencies,'clap','Cargo.toml'),written='[dependencies.clap_derive]\nversion = "=4.6.7"\noptional = true\n',begin=cargo.source.indexOf(written);
  if(begin<0||cargo.source.indexOf(written,begin+1)>=0)throw new TypeError('Clap original optional derive dependency changed');
  const dependency={package:'clap',source:'Cargo.toml',sourceSha256:cargo.sha256,span:{start:begin,end:begin+written.length},sha256:hash(written)};
  while(queue.length) {
    const [name,feature]=queue.shift(),id=name+'::'+feature;if(seen.has(id))continue;seen.add(id);
    const row=tables.get(name).get(feature);if(!row)throw new TypeError('Clap original feature reference is unresolved: '+id);selected.push(row);
    for(const value of row.values) {
      if(value==='dep:clap_derive'){queue.push(['clap_derive','default']);continue;}
      if(value.includes('/')) {const [target,requested]=value.split('/'),owner=target.replace(/\?$/u,'');if(tables.has(owner))queue.push([owner,requested]);}
      else if(!value.startsWith('dep:'))queue.push([name,value]);
    }
  }
  if(seen.has('clap_derive::unstable-markdown')||seen.has('clap_derive::unstable-v5'))throw new TypeError('Clap unstable document routes require independent source output');
  const result=freeze({schema:'original-clap-default-document-features-v1',rootFeatures:roots,selected,dependency,markdown:false,unstableV5:false,wholeCargoFeatureUnification:false});plans.set(dependencies,result);return result;
}

export function originalClapDocumentLiteral(node) {
  if(node?.kind!=='token'||node.type!=='string'||!node.text.startsWith('"'))throw new TypeError('Clap documentation requires an original bounded string literal');
  for(let at=1;at<node.text.length-1;at++)if(node.text[at]==='\\'&&!['"','\\','n','r','t'].includes(node.text[++at]))throw new TypeError('Clap document literal escape requires an independent Rust literal route');
  let value;try{value=JSON.parse(node.text);}catch{throw new TypeError('Clap documentation requires an original bounded string literal');}
  if(typeof value!=='string'||!ascii(value)||Buffer.byteLength(value)>4096)throw new TypeError('Clap document text exceeds its original ASCII input route');return value;
}

export function originalClapValueDocuments(attributes) {
  if(!Array.isArray(attributes)||attributes.length>128)throw new TypeError('Clap document attributes exceed their input budget');
  const inputs=[];
  for(const attribute of attributes) {
    const nodes=attribute.children;if(nodes[0]?.text!=='doc')continue;
    // extract_doc_comment ignores non-NameValue doc metadata. The enclosing
    // input certificate independently decides whether that syntax is inert.
    if(nodes.length!==3||nodes[1]?.text!=='=')continue;
    inputs.push({value:originalClapDocumentLiteral(nodes[2]),span:attribute.span,originalLineComment:nodes[0].sourceFeature==='original-line-doc-comment'});
  }
  let start=0;while(start<inputs.length&&!trim(inputs[start].value))start++;
  const lines=inputs.slice(start).flatMap(input=>input.value.split('\n').map(line=>line.startsWith(' ')?line.slice(1):line));
  while(lines.length&&!trim(lines.at(-1)))lines.pop();
  if(!lines.length)return {inputs,lines,short:null,long:null,generatedHelperBehavior:false};
  const paragraphs=[];let paragraph=[];
  for(const line of lines) {
    if(!trim(line)){if(paragraph.length){paragraphs.push(paragraph.map(trim).join(' '));paragraph=[];}}
    else paragraph.push(line);
  }
  if(paragraph.length)paragraphs.push(paragraph.map(trim).join(' '));
  const short=paragraphs[0],long=lines.some(line=>!trim(line))?paragraphs.join('\n\n'):null;
  return {inputs,lines,short:short.endsWith('.')&&!short.endsWith('..')?short.slice(0,-1):short,long,generatedHelperBehavior:false};
}
