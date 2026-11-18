// Local adapter for @link-foundation/sensitive-data-sanitizer.
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {localDetectorFactory} from './sensitive-data-detectors.mjs';

const maximumBytes = 4 * 1024 * 1024;
const maximumMapBytes = 128 * 1024;
const maximumSessions = 128;
const maximumMatches = 256;
const sessionLifetimeMs = 30 * 60 * 1000;
const format = '[[Router_{Type}_{n}]]';
const wireToken = /\[\[Router_[a-f0-9]{32}_[A-Za-z][A-Za-z0-9]{0,63}_[1-9][0-9]{0,5}\]\]/;
const internalToken = /\[\[Router_([A-Za-z][A-Za-z0-9]{0,63})_([1-9][0-9]{0,5})\]\]/g;
const internalEntry = new RegExp(`^${internalToken.source}$`);

function json(res,status,value) {
  res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});
  res.end(JSON.stringify(value));
}

function statusError(status) {
  return Object.assign(new Error('Sensitive data scan rejected'),{status});
}

async function readRequest(req) {
  const chunks = [];
  let total = 0;
  for await (const bytes of req) {
    total += bytes.length;
    if (total > maximumBytes) throw statusError(413);
    chunks.push(bytes);
  }
  try { return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,total))); }
  catch { throw statusError(400); }
}

function validateDocument(document) {
  if (!document || !Object.hasOwn(document,'body') ||
    (document.body !== null && (typeof document.body !== 'object' || Array.isArray(document.body)))) throw statusError(400);
  for (const key of ['headers','query']) {
    if (!Array.isArray(document[key]) ||
      document[key].some(pair => !Array.isArray(pair) || pair.length !== 2 || pair.some(value => typeof value !== 'string'))) {
      throw statusError(400);
    }
  }
}

function objectsFromPairs(pairs) {
  return pairs.map(([key,value]) => ({[key]: value}));
}

function pairsFromObjects(pairs,objects) {
  if (!Array.isArray(objects) || pairs.length !== objects.length) throw statusError(503);
  return pairs.map(([key],index) => {
    const object = objects[index];
    if (!object || !Object.hasOwn(object,key) || Object.keys(object).length !== 1 ||
      typeof object[key] !== 'string') throw statusError(415);
    return [key,object[key]];
  });
}

export function createScannerHandler({
  token, createSanitizer, createRestoreMap, detectorOptions = {}, createDetectors, restore = true, restoreTypes, clock = Date.now,
}) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token ?? '')) throw new Error('Invalid sensitive data scanner token');
  if (typeof restore !== 'boolean' || (restoreTypes !== undefined &&
    (!Array.isArray(restoreTypes) || !restoreTypes.length || restoreTypes.some(type =>
      typeof type !== 'string' || !/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(type))))) {
    throw new Error('Invalid sensitive data scanner restoration policy');
  }
  const restoredTypes = restoreTypes && new Set(restoreTypes.map(type => type.toLowerCase()));
  const authorization = Buffer.from(`Bearer ${token}`);
  const sessions = new Map();
  const active = new Set();
  let concurrent = 0;

  function expire(id, expires) {
    const previous = sessions.get(id);
    if (previous?.expires === expires) sessions.delete(id);
  }

  async function scan(session,document) {
    if (session !== null && (typeof session !== 'string' || !/^[a-f0-9]{64}$/.test(session))) throw statusError(400);
    validateDocument(document);
    for (const [id,record] of sessions) {
      if (record.expires <= clock() && !active.has(id)) {
        clearTimeout(record.timer);
        sessions.delete(id);
      }
    }
    if (concurrent >= 4 || active.has(session)) throw statusError(429);
    const previous = sessions.get(session);
    if (session && !previous && sessions.size + concurrent >= maximumSessions) throw statusError(429);
    concurrent++;
    if (session) active.add(session);
    try {
      const namespace = previous?.namespace ?? randomBytes(16).toString('hex');
      const map = previous ? structuredClone(previous.map) : createRestoreMap({format});
      const input = JSON.stringify({
        body: document.body, headers: objectsFromPairs(document.headers), query: objectsFromPairs(document.query),
      });
      if (wireToken.test(input) || input.search(internalToken) !== -1) throw statusError(400);
      // The library verifies the post-transform text with its enabled detector
      // union. Occurrence records are unnecessary for derived model text.
      const detectors = createDetectors?.();
      const sanitizer = createSanitizer({
        profile: 'documents', publicKnowledge: false, maxBytes: maximumBytes, maxFindings: 4096,
        ...detectorOptions, structured: 'json',
        ...(detectors?.length ? {detectors} : {}),
        transformation: {mode:'placeholder',format,map},
      });
      const sanitized = await sanitizer.sanitize(input);
      map.documents.length = 0;
      if (map.entries.length > maximumMatches || Buffer.byteLength(JSON.stringify(map)) > maximumMapBytes) throw statusError(413);
      const wireLabel = label => label === 'Organization' ? 'Company' : label;
      const toWire = (_token,label,number) => `[[Router_${namespace}_${wireLabel(label)}_${number}]]`;
      const masked = JSON.parse(sanitized.text.replace(internalToken,toWire));
      const replacements = [];
      if (restore) {
        for (const entry of map.entries) {
          const match = internalEntry.exec(entry.token);
          if (!match) throw statusError(503);
          if (!restoredTypes || restoredTypes.has(wireLabel(match[1]).toLowerCase())) {
            replacements.push([toWire(...match),entry.values[0]]);
          }
        }
      }
      const output = {
        document: {body: masked.body,
          headers: pairsFromObjects(document.headers,masked.headers),
          query: pairsFromObjects(document.query,masked.query)},
        replacements,
      };
      if (Buffer.byteLength(JSON.stringify(output)) > maximumBytes) throw statusError(413);
      if (session) {
        clearTimeout(previous?.timer);
        const expires = clock() + sessionLifetimeMs;
        const timer = setTimeout(expire,sessionLifetimeMs,session,expires).unref();
        sessions.set(session,{namespace,map,expires,timer});
      }
      return output;
    } finally {
      concurrent--;
      if (session) active.delete(session);
    }
  }

  return async (req,res) => {
    if (req.method !== 'POST' || req.url !== '/scan') { json(res,404,{error:'Not found'}); return; }
    const supplied = Buffer.from(req.headers.authorization ?? '');
    if (supplied.length !== authorization.length || !timingSafeEqual(supplied,authorization)) {
      json(res,401,{error:'Authentication required'});
      return;
    }
    try {
      const {session,document} = await readRequest(req);
      json(res,200,await scan(session,document));
    } catch (error) {
      // Detector errors can contain source fragments.
      json(res,error.status ?? 503,{error:'Sensitive data scan rejected'});
    }
  };
}

async function main() {
  const {createSanitizer,createRestoreMap,fromOffsetReport} = await import('@link-foundation/sensitive-data-sanitizer');
  const port = Number(process.env.ROUTER_SENSITIVE_DATA_SCANNER_PORT ?? '18082');
  const host = process.env.ROUTER_SENSITIVE_DATA_SCANNER_HOST ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || !['127.0.0.1','::1'].includes(host)) {
    throw new Error('Invalid loopback scanner listener');
  }
  const policy = process.env.ROUTER_SENSITIVE_DATA_SCANNER_POLICY;
  const {localDetectors = [],...detectorOptions} = policy ? JSON.parse(await readFile(policy,'utf8')) : {};
  const restore = process.env.ROUTER_SENSITIVE_DATA_RESTORE ?? 'true';
  if (!['true','false'].includes(restore)) throw new Error('Invalid sensitive data restoration setting');
  const server = createServer({requestTimeout:10000,headersTimeout:5000},createScannerHandler({
    token:process.env.ROUTER_SENSITIVE_DATA_SCANNER_TOKEN,createSanitizer,createRestoreMap,detectorOptions,
    createDetectors:localDetectorFactory(localDetectors,fromOffsetReport),
    restore:restore === 'true',restoreTypes:process.env.ROUTER_SENSITIVE_DATA_RESTORE_TYPES?.split(',').map(type => type.trim()),
  }));
  server.maxConnections = 16;
  server.listen(port,host);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(() => {
    process.stderr.write('Could not start sensitive data scanner\n');
    process.exitCode = 1;
  });
}
