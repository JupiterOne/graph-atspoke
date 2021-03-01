import {
  IntegrationProviderAuthenticationError,
  IntegrationValidationError,
} from '@jupiterone/integration-sdk-core';
import {
  createMockExecutionContext,
  setupRecording,
} from '@jupiterone/integration-sdk-testing';

import { IntegrationConfig } from './types';
import validateInvocation from './validateInvocation';
import { parseNumRequests } from './client';

it('requires valid config', async () => {
  const executionContext = createMockExecutionContext<IntegrationConfig>({
    instanceConfig: {} as IntegrationConfig,
  });

  await expect(validateInvocation(executionContext)).rejects.toThrow(
    IntegrationValidationError,
  );
});

it('auth error', async () => {
  const recording = setupRecording({
    directory: '__recordings__',
    name: 'client-auth-error',
  });

  recording.server.any().intercept((req, res) => {
    res.status(401);
  });

  const executionContext = createMockExecutionContext({
    instanceConfig: {
      apiKey: 'INVALID',
      numRequests: '0',
    },
  });

  /*
  expect(parseNumRequests("0")).toHaveReturnedWith(0);
  expect(parseNumRequests("some string")).toHaveReturnedWith(0);
  expect(parseNumRequests("-1000")).toHaveReturnedWith(0);
  expect(parseNumRequests("37")).toHaveReturnedWith(37);
  expect(parseNumRequests(" 37 ")).toHaveReturnedWith(37);
  expect(parseNumRequests("37 dogs")).toHaveReturnedWith(37);
  */

  await expect(validateInvocation(executionContext)).rejects.toThrow(
    IntegrationProviderAuthenticationError,
  );



});

//since parseNumRequests will test a user-configurable field, it's best to be thorough
//expected return is 0 for all cases except where a valid number can be derived
test('parser test 1', () => {
  expect(parseNumRequests("0")).toBe(0);
});
test('parser test 2', () => {
  expect(parseNumRequests("some string")).toBe(0);
});
test('parser test 3', () => {
  expect(parseNumRequests("-1000")).toBe(0);
});
test('parser test 4', () => {
  expect(parseNumRequests("37")).toBe(37);
});
test('parser test 5', () => {
  expect(parseNumRequests("037")).toBe(37);
});
test('parser test 6', () => {
  expect(parseNumRequests("37.1")).toBe(37);
});
test('parser test 7', () => {
  expect(parseNumRequests(" 37 ")).toBe(37);
});
test('parser test 8', () => {
  expect(parseNumRequests("037 dogs")).toBe(37);
});
test('parser test 9', () => {
  expect(parseNumRequests("10000000000000000000000000")).toBe(1000*1000*1000);
});
test('parser test 10', () => {
  expect(parseNumRequests("867 5309")).toBe(867);
});
