import { Router, type TokenRecord, type Version, type Verification } from '../index.js';
import { temporaryHome, verifyContracts } from '../testing.js';
const router = new Router({ allowDownload: false });
const version: Version = (await router.version()).data;
const tokens: readonly TokenRecord[] = (await router.tokens.list()).data;
await router.providers.add({ name: 'fixture', baseUrl: 'http://localhost', apiKeyStdin: true }, { stdin: 'key' });
await router.with({ client: 'codex', clientArgs: ['--version'] });
await temporaryHome();
await verifyContracts({ router, areas: ['cli'] });
function refusalReason(result: Verification): string | undefined {
  return result.areas_not_run[0]?.reason;
}
void refusalReason;
void version; void tokens;
const doctor = (await router.doctor({ local: true })).data;
const check: string | undefined = doctor.checks[0]?.state;
const provider: string | undefined = doctor.providers[0]?.state;
const auth = (await router.auth.status({ local: true })).data;
const credential: string | undefined = auth.credentials[0]?.state;
const server = (await router.server.status()).data;
const url: string | null | undefined = server.selection.url;
const logs = (await router.logs.show({ correlationId: 'fixture' })).data;
const record = logs.records[0];
void check; void provider; void credential; void url; void record;
