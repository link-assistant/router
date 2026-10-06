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
