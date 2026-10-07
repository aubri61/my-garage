import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
const loadDependency = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '..');

// Use the project's TypeScript compiler so these domain tests need no extra runner.
function loadDemoModules() {
  const cache = new Map();
  const storage = new Map();
  const browser = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
  function load(relative) {
    const filename = path.resolve(root, `${relative}.ts`);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} };
    cache.set(filename, compiledModule);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const localRequire = specifier => specifier.startsWith('@/') ? load(specifier.slice(2)) : loadDependency(specifier);
    new Function('require', 'module', 'exports', 'window', output)(localRequire, compiledModule, compiledModule.exports, browser);
    return compiledModule.exports;
  }
  return { load, storage };
}

test('signup rejects missing names, invalid emails, short passwords and confirmation mismatch', () => {
  const { load } = loadDemoModules();
  const { validateSignup, validateLogin } = load('features/auth/validation');
  const invalid = validateSignup({ name: ' ', email: 'invalid', password: 'short', passwordConfirmation: 'different' });
  assert.deepEqual(Object.keys(invalid).sort(), ['email', 'name', 'password', 'passwordConfirmation']);
  assert.deepEqual(validateSignup({ name: '회원', email: 'user@example.com', password: 'DemoPass123!', passwordConfirmation: 'DemoPass123!' }), {});
  assert.ok(validateLogin({ email: 'a@b', password: '12345678' }).email);
});

test('mock persistence contains only mode and vehicle IDs, rejects duplicates and resets new signups', () => {
  const { load, storage } = loadDemoModules();
  const session = load('mocks/demo-session');
  session.startMemberSession('이름은 저장하지 않음', true);
  session.registerDemoVehicle('kia-ev6');
  const persisted = JSON.parse(storage.get(session.DEMO_STORAGE_KEY));
  assert.deepEqual(persisted, { mode: 'member', registeredVehicleIds: ['kia-ev6'] });
  assert.throws(() => session.registerDemoVehicle('kia-ev6'), /이미 등록/);
  session.endDemoSession();
  assert.throws(() => session.registerDemoVehicle('genesis-gv80'), /새 회원/);
  session.startMemberSession('다른 회원', true);
  assert.deepEqual(JSON.parse(storage.get(session.DEMO_STORAGE_KEY)).registeredVehicleIds, []);
});

test('corrupt or incompatible local storage falls back to a guest session', () => {
  const { load } = loadDemoModules();
  const { parseDemoState } = load('mocks/demo-session');
  for (const raw of ['broken', '{}', '{"mode":"admin","registeredVehicleIds":[]}', '{"mode":"member","registeredVehicleIds":[1]}']) {
    assert.deepEqual(parseDemoState(raw), { mode: 'guest', registeredVehicleIds: [] });
  }
  assert.deepEqual(parseDemoState('{"mode":"member","registeredVehicleIds":["a","a"]}'), { mode: 'member', registeredVehicleIds: ['a'] });
});

test('vehicle lookup supports VIN and code but rejects missing and already registered vehicles', async () => {
  const { load } = loadDemoModules();
  const api = load('mocks/vehicle-registration');
  const signal = new AbortController().signal;
  const code = await api.lookupMockVehicle(' ev6-2026 ', [], signal);
  const vin = await api.lookupMockVehicle(code.vin, [], signal);
  assert.equal(code.vehicle.id, vin.vehicle.id);
  await assert.rejects(api.lookupMockVehicle('unknown', [], signal), /일치하는 데모 차량/);
  await assert.rejects(api.lookupMockVehicle('EV6-2026', ['kia-ev6'], signal), /이미 차고지/);
});

test('ownership and certificate failures prevent completing the connection; successful results stay consistent', async () => {
  const { load } = loadDemoModules();
  const api = load('mocks/vehicle-registration');
  const signal = new AbortController().signal;
  const candidate = await api.lookupMockVehicle('IONIQ5-2026', [], signal);
  await assert.rejects(api.confirmMockOwnership(candidate, '000000', signal), /일치하지/);
  await api.confirmMockOwnership(candidate, '123456', signal);
  const identity = await api.createMockVehicleIdentity(candidate, signal);
  await assert.rejects(api.issueMockVehicleCertificate(identity, 'certificate-error', signal), /발급에 실패/);
  const certificate = await api.issueMockVehicleCertificate(identity, 'success', signal);
  const vehicle = await api.connectMockVehicle(candidate, identity, certificate, signal);
  assert.equal(vehicle.identity.vin, candidate.vin);
  assert.equal(vehicle.certificate, certificate);
  assert.equal(vehicle.connectionStatus, 'connected');
  assert.ok(new Date(certificate.expiresAt) > new Date(certificate.issuedAt));
  assert.equal(vehicle.registrationStatus, "registered");
  assert.equal("isDemo" in certificate, false);
});

test('leaving a workflow cancels pending mock work', async () => {
  const { load } = loadDemoModules();
  const { mockLatency } = load('mocks/latency');
  const controller = new AbortController();
  const pending = mockLatency(controller.signal, 500);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(mockLatency(controller.signal), { name: 'AbortError' });
});

test('cancelled registration preserves drafts, releases pending and ignores stale completion', () => {
  const { load } = loadDemoModules();
  const { registrationReducer: reduce, initialRegistrationState, isRegistrationPending, connectionProgressFor } = load('features/vehicle-registration/reducer');
  const { mockVehicles } = load('mocks/vehicles');
  const { mockRegistrationFixtures, getMockVehicleWithCertificate } = load('mocks/vehicle-registration');
  const candidate = { vehicle: mockVehicles[0], vin: mockRegistrationFixtures[0].vin };
  let state = reduce(initialRegistrationState, { type: 'queryChanged', query: 'EV6-2026' });
  state = reduce(state, { type: 'lookupStarted' });
  state = reduce(state, { type: 'cancelled' });
  assert.equal(isRegistrationPending(state), false);
  assert.equal(state.query, 'EV6-2026');
  assert.equal(reduce(state, { type: 'vehicleFound', candidate }), state);
  state = reduce(state, { type: 'lookupStarted' });
  state = reduce(state, { type: 'vehicleFound', candidate });
  state = reduce(state, { type: 'vehicleConfirmed' });
  state = reduce(state, { type: 'codeChanged', code: '123456' });
  state = reduce(state, { type: 'ownershipStarted' });
  state = reduce(state, { type: 'ownershipConfirmed' });
  state = reduce(state, { type: 'identityCreated', identity: mockRegistrationFixtures[0].identity });
  assert.deepEqual(connectionProgressFor(state), { identity: 'complete', certificate: 'running', connection: 'waiting' });
  state = reduce(state, { type: 'cancelled' });
  assert.equal(state.phase, 'ownership');
  assert.equal(state.ownershipCode, '123456');
  assert.equal(isRegistrationPending(state), false);
  assert.equal(reduce(state, { type: 'connected', vehicle: getMockVehicleWithCertificate(candidate.vehicle) }), state);
  state = reduce(state, { type: 'ownershipStarted' });
  assert.equal(isRegistrationPending(state), true);
});

test('certificate failure cannot become complete and retry restores ownership with the same candidate', () => {
  const { load } = loadDemoModules();
  const { registrationReducer: reduce, initialRegistrationState, connectionProgressFor } = load('features/vehicle-registration/reducer');
  const { mockVehicles } = load('mocks/vehicles');
  const { mockRegistrationFixtures, getMockVehicleWithCertificate } = load('mocks/vehicle-registration');
  const candidate = { vehicle: mockVehicles[0], vin: mockRegistrationFixtures[0].vin };
  let state = reduce(initialRegistrationState, { type: 'lookupStarted' });
  state = reduce(state, { type: 'vehicleFound', candidate });
  state = reduce(state, { type: 'vehicleConfirmed' });
  state = reduce(state, { type: 'ownershipStarted' });
  state = reduce(state, { type: 'ownershipConfirmed' });
  state = reduce(state, { type: 'identityCreated', identity: mockRegistrationFixtures[0].identity });
  state = reduce(state, { type: 'failed', error: '발급 실패' });
  assert.deepEqual(connectionProgressFor(state), { identity: 'complete', certificate: 'failed', connection: 'waiting' });
  assert.equal(reduce(state, { type: 'connected', vehicle: getMockVehicleWithCertificate(candidate.vehicle) }), state);
  state = reduce(state, { type: 'retryRequested' });
  assert.equal(state.phase, 'ownership');
  assert.equal(state.candidate, candidate);
  assert.equal(state.status, 'idle');
});
