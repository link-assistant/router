// The original compiler makes a while condition an if/break inside the loop.
// Only existing checked immutable pattern ownership is admitted here.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const root=new URL('../source-profiles/while-let/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
for(const source of manifest.sources) {
  const encoded=readFileSync(new URL(source.file,root)),raw=gunzipSync(encoded,{maxOutputLength:128_000});
  if(hash(encoded)!==source.compressedSha256||raw.length!==source.bytes||hash(raw)!==source.sha256||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==source.gitBlobSha)throw new Error('while-let lowering source differs from its full pinned original');
}
export const WHILE_LET_PROFILE=Object.freeze({id:manifest.profile,constEligible:false,namespaceComplete:false,dropSemanticsComplete:false,limits:Object.freeze({...manifest.limits})});
const inputs=()=>manifest.sources.map(({url,sha256})=>({url,sha256}));
export function sourceWhileLetCondition(tokens,pattern,subject,conditionSpan) {
  if(tokens.length>manifest.limits.conditionTokens||conditionSpan.end-conditionSpan.start>manifest.limits.conditionCharacters)throw unsupported('while-let condition budget','requires a bounded actual source condition',conditionSpan);
  return {profile:manifest.profile,condition:{span:{...conditionSpan}},pattern:{span:{...pattern.span}},subject:{span:{...subject.span}},tokens:tokens.map(token=>({kind:token.kind,value:token.value,raw:token.raw??token.value,span:{start:token.start,end:token.end}})),sourceInputs:inputs(),evaluationOrder:[...manifest.evaluationOrder],constEligible:false,namespaceComplete:false,dropSemanticsComplete:false};
}
export function requireSourceWhileLet(node) {
  const proof=node.patternControl?.sourceCondition;
  const span=proof?.condition?.span,pattern=proof?.pattern?.span,subject=proof?.subject?.span;
  const validSpan=value=>value&&Number.isSafeInteger(value.start)&&Number.isSafeInteger(value.end)&&value.start>=0&&value.end>=value.start;
  if(node.patternControl?.kind!=='while-let'||proof?.profile!==manifest.profile||proof.constEligible!==false||proof.namespaceComplete!==false||proof.dropSemanticsComplete!==false||!validSpan(span)||!validSpan(pattern)||!validSpan(subject)||span.end-span.start>manifest.limits.conditionCharacters||pattern.start<span.start||pattern.end>subject.start||subject.end>span.end||!isDeepStrictEqual(subject,node.value.span)||!isDeepStrictEqual(proof.sourceInputs,inputs())||!isDeepStrictEqual(proof.evaluationOrder,manifest.evaluationOrder)||!Array.isArray(proof.tokens)||proof.tokens.length<4||proof.tokens.length>manifest.limits.conditionTokens||proof.tokens[0].value!=='while'||proof.tokens[1].value!=='let')throw new Error('missing actual checked while-let source condition');
  let previous=span.start;
  for(const token of proof.tokens) {
    if(!['identifier','punct','number','string','rustChar','rustFloat','macro'].includes(token.kind)||typeof token.value!=='string'||typeof token.raw!=='string'||!validSpan(token.span)||token.span.start<previous||token.span.end>span.end)throw new Error('missing actual checked while-let source tokens');
    previous=token.span.end;
  }
}
