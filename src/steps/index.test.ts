import {
  createMockStepExecutionContext,
  Recording,
} from '@jupiterone/integration-sdk-testing';

import { IntegrationConfig } from '../types';
import { setupSpokeRecording } from '../../test/recording';
import { fetchTeams, fetchUsers } from './access';
import { fetchAccountDetails } from './account';
import { fetchRequests } from './requests';
import { fetchWebhooks } from './webhooks';
import { stopFetchingRequests } from '../client';
import { AtSpokeRequest } from '../client';

const DEFAULT_API_KEY = 'fake_api_key'; // works because we have a recording now

const integrationConfig: IntegrationConfig = {
  apiKey: process.env.API_KEY || DEFAULT_API_KEY,
};

jest.setTimeout(1000 * 60 * 1);

let recording: Recording;

afterEach(async () => {
  await recording.stop();
});

test('should collect data', async () => {
  recording = setupSpokeRecording({
    directory: __dirname,
    name: 'steps',
    redactedRequestHeaders: ['api-key'],
  });

  const context = createMockStepExecutionContext<IntegrationConfig>({
    instanceConfig: integrationConfig,
  });

  // Simulates dependency graph execution.
  // See https://github.com/JupiterOne/sdk/issues/262.
  await fetchAccountDetails(context);
  await fetchUsers(context);
  await fetchTeams(context);
  await fetchWebhooks(context);
  await fetchRequests(context);

  // Review snapshot, failure is a regression
  expect({
    numCollectedEntities: context.jobState.collectedEntities.length,
    numCollectedRelationships: context.jobState.collectedRelationships.length,
    collectedEntities: context.jobState.collectedEntities,
    collectedRelationships: context.jobState.collectedRelationships,
    encounteredTypes: context.jobState.encounteredTypes,
  }).toMatchSnapshot();

  const accounts = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('Account'),
  );
  expect(accounts.length).toBeGreaterThan(0);
  expect(accounts).toMatchGraphObjectSchema({
    _class: ['Account'],
    schema: {
      additionalProperties: true,
      properties: {
        _type: { const: 'atspoke_account' },
        manager: { type: 'string' },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['org'], //we use this to make webLinks to users
    },
  });

  const users = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('User'),
  );
  expect(users.length).toBeGreaterThan(0);
  expect(users).toMatchGraphObjectSchema({
    _class: ['User'],
    schema: {
      additionalProperties: true,
      properties: {
        _type: { const: 'atspoke_user' },
        firstName: { type: 'string' },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['email'], //we use this to make webLinks and even names if name is blank
    },
  });

  const userGroups = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('UserGroup'),
  );
  expect(userGroups.length).toBeGreaterThan(0);
  expect(userGroups).toMatchGraphObjectSchema({
    _class: ['UserGroup'],
    schema: {
      additionalProperties: true,
      properties: {
        _type: { const: 'atspoke_team' },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: [],
    },
  });

  //webhooks and requests are optional and won't exist on all accts
  const webhooks = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('ApplicationEndpoint'),
  );
  expect(webhooks.length).toBeGreaterThan(0);
  expect(webhooks).toMatchGraphObjectSchema({
    _class: ['ApplicationEndpoint'],
    schema: {
      additionalProperties: true,
      properties: {
        _type: { const: 'atspoke_webhook' },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: [],
    },
  });
});

test('stopFetchingRequests', () => {
  const requests: AtSpokeRequest[] = [];
  let lastExecutionTime = 0;
  expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(true);

  const fakeRequest: AtSpokeRequest = {
    subject: 'Tough stuff',
    requester: 'Somebody',
    owner: 'Nobody',
    status: 'OPEN',
    privacyLevel: 'high',
    team: 'winners',
    org: 'Team Co.',
    permalink: 'not applicable',
    id: '333333333333',
    isAutoResolve: false,
    isFiled: true,
    email: 'help@help.com',
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString(),
  };
  requests.push(fakeRequest);
  //last request is not older than 14 days or exTime
  expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(false);

  const fakeRequest2: AtSpokeRequest = {
    subject: 'Tough stuff',
    requester: 'Somebody',
    owner: 'Nobody',
    status: 'OPEN',
    privacyLevel: 'high',
    team: 'winners',
    org: 'Team Co.',
    permalink: 'not applicable',
    id: '333333333333',
    isAutoResolve: false,
    isFiled: true,
    email: 'help@help.com',
    createdAt: new Date().toDateString(),
    updatedAt: '',
  };
  requests.push(fakeRequest2);
  //last request has a falsy updated time, we should keep going
  expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(false);

  const fakeRequest3: AtSpokeRequest = {
    subject: 'Tough stuff',
    requester: 'Somebody',
    owner: 'Nobody',
    status: 'OPEN',
    privacyLevel: 'high',
    team: 'winners',
    org: 'Team Co.',
    permalink: 'not applicable',
    id: '333333333333',
    isAutoResolve: false,
    isFiled: true,
    email: 'help@help.com',
    createdAt: new Date().toDateString(),
    updatedAt: new Date(1999, 12, 31).toDateString(),
  };
  requests.push(fakeRequest3);
  //last request has a very old updated time, we should quit
  expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(true);

  const fakeRequest4: AtSpokeRequest = {
    subject: 'Tough stuff',
    requester: 'Somebody',
    owner: 'Nobody',
    status: 'OPEN',
    privacyLevel: 'high',
    team: 'winners',
    org: 'Team Co.',
    permalink: 'not applicable',
    id: '333333333333',
    isAutoResolve: false,
    isFiled: true,
    email: 'help@help.com',
    createdAt: new Date().toDateString(),
    updatedAt: new Date(
      new Date().getTime() - 2 * 24 * 60 * 60 * 1000,
    ).toDateString(),
  };
  requests.push(fakeRequest4);
  lastExecutionTime = new Date(
    new Date().getTime() - 1 * 24 * 60 * 60 * 1000,
  ).getTime();
  //last request has a recent time from 2 days ago, but execution is just 1 day ago, we should quit
  expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(true);

  const fakeRequest5: AtSpokeRequest = {
    subject: 'Tough stuff',
    requester: 'Somebody',
    owner: 'Nobody',
    status: 'OPEN',
    privacyLevel: 'high',
    team: 'winners',
    org: 'Team Co.',
    permalink: 'not applicable',
    id: '333333333333',
    isAutoResolve: false,
    isFiled: true,
    email: 'help@help.com',
    createdAt: new Date().toDateString(),
    updatedAt: new Date(
      new Date().getTime() - 13 * 24 * 60 * 60 * 1000,
    ).toDateString(),
  };
  requests.push(fakeRequest5);
  lastExecutionTime = 0;
  //last request has a recent time from 13 days ago, no Extime, since default is 14 day cutoff, keep going
  expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(false);

  const fakeRequest6: AtSpokeRequest = {
    subject: 'Tough stuff',
    requester: 'Somebody',
    owner: 'Nobody',
    status: 'OPEN',
    privacyLevel: 'high',
    team: 'winners',
    org: 'Team Co.',
    permalink: 'not applicable',
    id: '333333333333',
    isAutoResolve: false,
    isFiled: true,
    email: 'help@help.com',
    createdAt: new Date().toDateString(),
    updatedAt: new Date(
      new Date().getTime() - 15 * 24 * 60 * 60 * 1000,
    ).toDateString(),
  };
  requests.push(fakeRequest6);
  lastExecutionTime = 0;
  //last request has a recent time from 15 days ago, no Extime, since default is 14 day cutoff, quit
  expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(true);
});
