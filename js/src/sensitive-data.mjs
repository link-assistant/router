import {createHash,randomUUID} from 'node:crypto';
import {request as httpRequest} from 'node:http';
import * as zlib from 'node:zlib';
import {boundedBytes} from './native-service.mjs';
import {ProtocolError} from './protocols.mjs';
import {joinSensitiveDataDeltas} from './sensitive-data-sse.mjs';

const scannerKey = 'ROUTER_SENSITIVE_DATA_SCANNER_URL';
const sessionHeader = 'x-router-privacy-session';
const metadata = new Set([
  'accept', 'accept-encoding', 'authorization', 'connection', 'content-encoding',
  'content-length', 'content-type', 'host', 'transfer-encoding', 'upgrade',
  'x-api-key', 'x-goog-api-key', 'anthropic-version', 'anthropic-beta',
  'x-router-share-geolocation', 'x-router-repository',
  'sec-websocket-extensions', 'sec-websocket-key', 'sec-websocket-version',
]);
const sessionHeaders = [sessionHeader, 'x-claude-code-session-id', 'x-codex-session-id', 'x-session-id', 'session-id'];
const wireToken = /^\[\[Router_[a-f0-9]{32}_[A-Za-z][A-Za-z0-9]{0,63}_[1-9][0-9]{0,5}\]\]$/;
const wireStart = '[[Router_';
const maxTokenBytes = 116;
const maxScannerBytes = 4 * 1024 * 1024;
const maxRestoredBytes = 8 * 1024 * 1024;
const blockedFields = new Set([
  'audio', 'b64_json', 'file_data', 'file_id', 'file_uri', 'fileData', 'fileUri',
  'file_url', 'fileUrl', 'image_url', 'inlineData', 'inline_data', 'input_audio',
]);
const attachmentTypes = new Set(['audio','base64','document','image','image_url','input_audio','input_file','input_image']);

export function protectsSensitiveData(path) {
  return /^\/api\/services\/(?:anthropic|bedrock|codex|gemini|openai|qwen|vertex)\//.test(path) ||
    /^\/v1\/(?:chat|conversations|messages|models|responses)(?:\/|$)/.test(path);
}

export function opaqueSensitiveDataRoute(path) {
  return /^\/api\/services\/codex\/v1\/live(?:\/|$)/.test(path) || /\/realtime\/calls(?:\/|$)/.test(path);
}

function scannerURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname) ||
    !url.port || url.username || url.password || url.search || url.hash || url.pathname !== '/scan') {
    throw new Error('Sensitive data scanner must be a literal loopback HTTP URL ending in /scan');
  }
  return url;
}

function checkAttachments(value, depth = 0) {
  if (depth >= 128) throw new ProtocolError('Sensitive data protection requires JSON nested fewer than 128 levels',400);
  if (Array.isArray(value)) {
    for (const item of value) checkAttachments(item,depth + 1);
  } else if (value && typeof value === 'object') {
    if (attachmentTypes.has(value.type)) throw new ProtocolError('Sensitive data protection cannot inspect attachments or referenced files', 415);
    for (const [key, item] of Object.entries(value)) {
      if (item !== null && blockedFields.has(key)) throw new ProtocolError('Sensitive data protection cannot inspect attachments or referenced files', 415);
      checkAttachments(item,depth + 1);
    }
  } else if (typeof value === 'string' && /^data:/i.test(value)) {
    throw new ProtocolError('Sensitive data protection cannot inspect data URLs', 415);
  }
}

function sessionId(headers) {
  const session = sessionHeaders.map(name => headers.get(name)).find(value => value !== null);
  if (session && /^[A-Za-z0-9._:-]{1,128}$/.test(session)) return session;
  if (headers.has(sessionHeader)) throw new ProtocolError('Invalid sensitive data session identifier', 400);
  return null;
}

function checkedReplacements(entries) {
  if (!Array.isArray(entries) || entries.length > 256) throw new Error('Invalid replacements');
  const replacements = new Map();
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length !== 2 || !wireToken.test(entry[0]) ||
      typeof entry[1] !== 'string' || !entry[1] || replacements.has(entry[0])) {
      throw new Error('Invalid replacement entry');
    }
    replacements.set(entry[0], Buffer.from(JSON.stringify(entry[1]).slice(1, -1)));
  }
  return replacements;
}

// Work on bytes so a provider chunk boundary cannot corrupt UTF-8, JSON escaping,
// or a placeholder inside one JSON document or SSE data record.
function restoreStream(response, replacements) {
  if (!response.body || !replacements.size) return response;
  const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const encoding = response.headers.get('content-encoding') ?? 'identity';
  if (encoding.toLowerCase() !== 'identity' ||
    !(type === 'application/json' || type.endsWith('+json') || type === 'text/event-stream')) return response;
  const headers = new Headers(response.headers);
  for (const key of ['content-length','content-md5','digest','content-digest','etag']) headers.delete(key);
  const start = Buffer.from(wireStart);
  const end = Buffer.from(']]');
  let pending = Buffer.alloc(0);
  let restoredBytes = 0;
  function consume(chunk, flush, controller) {
    const input = pending.length ? Buffer.concat([pending,chunk]) : Buffer.from(chunk);
    let cursor = 0;
    while (cursor < input.length) {
      const begin = input.indexOf(start, cursor);
      if (begin === -1) {
        const safeEnd = flush ? input.length : Math.max(cursor,input.length - start.length + 1);
        if (safeEnd > cursor) controller.enqueue(input.subarray(cursor,safeEnd));
        cursor = safeEnd;
        break;
      }
      if (begin > cursor) controller.enqueue(input.subarray(cursor,begin));
      const window = input.subarray(begin,begin + maxTokenBytes);
      const finish = window.indexOf(end,start.length);
      if (finish === -1 && !flush && window.length < maxTokenBytes) {
        cursor = begin;
        break;
      }
      const last = finish === -1 ? begin + 1 : begin + finish + end.length;
      const candidate = input.subarray(begin,last);
      const replacement = replacements.get(candidate.toString('latin1'));
      if (replacement) {
        restoredBytes += replacement.length;
        if (restoredBytes > maxRestoredBytes) throw new Error('Sensitive data restoration exceeds limit');
        controller.enqueue(replacement);
        cursor = last;
      } else {
        // An unrecognized opener can overlap a valid token.
        controller.enqueue(input.subarray(begin,begin + 1));
        cursor = begin + 1;
      }
    }
    pending = Buffer.from(input.subarray(cursor));
  }
  const source = type === 'text/event-stream' ? joinSensitiveDataDeltas(response.body,replacements) : response.body;
  const body = source.pipeThrough(new TransformStream({
    transform(chunk, controller) { consume(chunk,false,controller); },
    flush(controller) { consume(Buffer.alloc(0),true,controller); },
  }));
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

function callScanner(endpoint,token,input,signal) {
  return new Promise((resolve,reject) => {
    const outgoing = httpRequest(endpoint,{method:'POST',agent:false,signal,headers:{
      'content-type':'application/json','content-length':Buffer.byteLength(input),authorization:`Bearer ${token}`,
    }}, async incoming => {
      try {
        if (incoming.statusCode !== 200) { incoming.destroy(); throw new Error('Scanner failed'); }
        let size = 0;
        const chunks = [];
        for await (const chunk of incoming) {
          size += chunk.length;
          if (size > maxScannerBytes) throw new Error('Scanner reply exceeds limit');
          chunks.push(chunk);
        }
        resolve(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,size))));
      } catch (error) { reject(error); }
    });
    outgoing.on('error',reject);
    outgoing.end(input);
  });
}

export function createSensitiveDataProtection(env) {
  if (!(scannerKey in env)) return null;
  const endpoint = scannerURL(env[scannerKey]);
  const token = env.ROUTER_SENSITIVE_DATA_SCANNER_TOKEN;
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token ?? '')) throw new Error('Invalid sensitive data scanner token');
  const scope = env.ROUTER_SENSITIVE_DATA_SCOPE ?? 'full';
  if (!['body','full'].includes(scope)) throw new Error('Invalid sensitive data scanner scope');
  const salt = randomUUID();
  async function scan(document,session,signal) {
    const input = JSON.stringify({session,document});
    if (Buffer.byteLength(input) > maxScannerBytes) throw new ProtocolError('Sensitive data scanner input exceeds limit',413);
    try {
      const result = await callScanner(endpoint,token,input,AbortSignal.any([signal,AbortSignal.timeout(10000)]));
      const cleaned = result.document;
      const replacements = checkedReplacements(result.replacements);
      if (document.body === null ? cleaned.body !== null : !cleaned.body || Array.isArray(cleaned.body) || typeof cleaned.body !== 'object') throw new Error('Invalid document');
      for (const key of ['headers','query']) {
        const pairs = cleaned[key], original = document[key];
        if (!Array.isArray(pairs) || pairs.length !== original.length ||
          pairs.some((pair,index) => !Array.isArray(pair) || pair.length !== 2 || pair[0] !== original[index][0] || typeof pair[1] !== 'string')) throw new Error('Invalid metadata');
      }
      return {cleaned,replacements};
    } catch { throw new ProtocolError('Sensitive data scanner is unavailable or returned invalid output',503); }
  }
  return {
    async protect(request, credential, maxBodyBytes, webSocket = false) {
      const headers = new Headers(request.headers);
      const session = sessionId(headers);
      const identity = session && credential ? [salt,credential,session] : webSocket ? [salt,randomUUID()] : null;
      const key = identity ? createHash('sha256').update(JSON.stringify(identity)).digest('hex') : null;
      headers.delete(sessionHeader);
      const url = new URL(request.url);
      const hasBody = request.body !== null;
      let body = null;
      if (hasBody) {
        const type = (headers.get('content-type') ?? 'application/json').split(';')[0].trim().toLowerCase();
        if (!(type === 'application/json' || type.endsWith('+json'))) throw new ProtocolError('Sensitive data protection requires a JSON request body',415);
        let bytes = Buffer.from(await boundedBytes(request,Math.min(maxBodyBytes,maxScannerBytes)));
        const format = (headers.get('content-encoding') ?? 'identity').toLowerCase();
        const decoder = format === 'gzip' ? zlib.gunzipSync : format === 'zstd' ? zlib.zstdDecompressSync : undefined;
        if (format !== 'identity') {
          if (!decoder) throw new ProtocolError('Sensitive data protection cannot decode this content encoding',415);
          try { bytes = decoder(bytes,{maxOutputLength:Math.min(maxBodyBytes,maxScannerBytes)}); }
          catch { throw new ProtocolError('Could not decode protected JSON request',400); }
        }
        if (bytes.length) {
          try { body = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); }
          catch { throw new ProtocolError('Sensitive data protection requires valid UTF-8 JSON',400); }
          if (!body || Array.isArray(body) || typeof body !== 'object') throw new ProtocolError('Sensitive data protection requires a JSON object',400);
          checkAttachments(body);
        }
      }
      const originalHeaders = scope === 'full' ? [...headers].filter(([key]) => !metadata.has(key)) : [];
      const originalQuery = scope === 'full' ? [...url.searchParams] : [];
      const document = {body, headers: originalHeaders, query: originalQuery};
      const {cleaned,replacements} = await scan(document,key,request.signal);
      try {
        for (const [key,value] of cleaned.headers) headers.set(key,value);
      } catch { throw new ProtocolError('Sensitive data scanner is unavailable or returned invalid output',503); }
      if (scope === 'full' && originalQuery.some((pair,index) => pair[1] !== cleaned.query[index][1])) url.search = new URLSearchParams(cleaned.query).toString();
      if (hasBody) {
        headers.delete('content-length');
        headers.delete('content-encoding');
        headers.delete('content-md5');
        headers.delete('content-digest');
        headers.delete('digest');
      }
      let events = replacements;
      return {
        request: new Request(url,{method:request.method,headers,signal:request.signal,
          ...(hasBody ? {body:cleaned.body === null ? '' : JSON.stringify(cleaned.body)} : {})}),
        restore: response => restoreStream(response,replacements),
        async protectEvent(value) {
          if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProtocolError('Sensitive data protection requires JSON events',415);
          checkAttachments(value);
          const result = await scan({body:value,headers:[],query:[]},key,request.signal);
          events = result.replacements;
          return Buffer.from(JSON.stringify(result.cleaned.body));
        },
        restoreEvent(payload) {
          let restoredBytes = 0;
          return Buffer.from(payload.toString('utf8').replace(new RegExp(wireToken.source.slice(1,-1),'g'),
            match => {
              const replacement = events.get(match);
              if (!replacement) return match;
              restoredBytes += replacement.length;
              if (restoredBytes > maxRestoredBytes) throw new Error('Sensitive data restoration exceeds limit');
              return replacement.toString('utf8');
            }));
        },
      };
    },
  };
}
