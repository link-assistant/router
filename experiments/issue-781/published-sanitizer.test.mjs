import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { createScannerHandler } from '../../examples/sensitive-data-scanner.mjs';
import { createSensitiveDataProtection } from '../../js/src/sensitive-data.mjs';

const sanitizerPrefix = process.env.ROUTER_SANITIZER_TEST_PREFIX;
const person = 'Mariana Vexley';
const company = 'Copperfoil Studio';
const credential = 'sensitive-fixture-credential-81714';
const scannerToken = 'router-test-scanner-token-fixture-781';
const personToken = /^\[\[Router_[a-f0-9]{32}_Person_1\]\]$/;
const companyToken = /^\[\[Router_[a-f0-9]{32}_Company_1\]\]$/;

test('the published sanitizer masks person and company data across the local Router boundary', { timeout: 30_000 }, async () => {
  assert.ok(sanitizerPrefix, 'set ROUTER_SANITIZER_TEST_PREFIX to the pinned package installation');
  const require = createRequire(resolve(sanitizerPrefix, 'package.json'));
  const entry = pathToFileURL(require.resolve('@link-foundation/sensitive-data-sanitizer'));
  const { createSanitizer, createRestoreMap } = await import(entry.href);
  const scanner = createServer(createScannerHandler({
    token: scannerToken,
    createSanitizer,
    createRestoreMap,
    detectorOptions: {
      knownPersonal: [
        { type: 'PERSON', value: person },
        { type: 'ORGANIZATION', value: company },
      ],
      knownSecrets: [credential],
    },
  }));
  scanner.listen(0, '127.0.0.1');
  try {
    await once(scanner, 'listening');
    const { port } = scanner.address();
    const protection = createSensitiveDataProtection({
      ROUTER_SENSITIVE_DATA_SCANNER_URL: `http://127.0.0.1:${port}/scan`,
      ROUTER_SENSITIVE_DATA_SCANNER_TOKEN: scannerToken,
    });
    const url = new URL('http://router.invalid/api/services/openai/v1/responses');
    url.searchParams.set('fixture_company', company);
    const protect = (session, caller) => protection.protect(new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-router-privacy-session': session,
        'x-fixture-person': person,
      },
      body: JSON.stringify({ input: `${person} met ${company}. Fixture secret ${credential}.` }),
    }), caller, 4096);

    const first = await protect('primary', 'caller-a');
    const masked = (await first.request.json()).input;
    const maskedPerson = first.request.headers.get('x-fixture-person');
    const maskedCompany = new URL(first.request.url).searchParams.get('fixture_company');
    assert.match(maskedPerson, personToken);
    assert.match(maskedCompany, companyToken);
    assert.equal(masked, `${maskedPerson} met ${maskedCompany}. Fixture secret [REDACTED].`);
    assert.equal(first.request.headers.get('x-router-privacy-session'), null);

    const echo = () => Response.json({ output: masked });
    const original = `${person} met ${company}. Fixture secret [REDACTED].`;
    assert.equal((await first.restore(echo()).json()).output, original);
    const next = await protect('primary', 'caller-a');
    assert.equal((await next.request.json()).input, masked);
    assert.equal((await next.restore(echo()).json()).output, original);
    const otherCaller = await protect('primary', 'caller-b');
    assert.equal((await otherCaller.restore(echo()).json()).output, masked);
    const otherSession = await protect('secondary', 'caller-a');
    assert.equal((await otherSession.restore(echo()).json()).output, masked);
  } finally {
    scanner.closeAllConnections();
    await new Promise((resolveClose, rejectClose) => {
      scanner.close(error => error ? rejectClose(error) : resolveClose());
    });
  }
});
