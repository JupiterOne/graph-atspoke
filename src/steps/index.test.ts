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
  //because fetchRequests only goes back 14 days, you might expect this fetch
  //to fail on the old recording in the test suite, but fetchRequests always
  //pulls the first page of requests regardless, which is enough for the
  //half dozen requests in the test recording

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

  //webhooks and requests won't exist on all accts
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

describe('stopFetchingRequests', () => {
  const requests: AtSpokeRequest[] = [];
  let lastExecutionTime = 0; //beginning of epoch
  const templateRequest: AtSpokeRequest = {
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
    createdAt: new Date().toDateString(), //today, right now
    updatedAt: new Date().toDateString(), //today, right now
  };
  function getTimeDaysAgo(daysAgo: number): number {
    return new Date().getTime() - daysAgo * 24 * 60 * 60 * 1000;
  }
  function getDaysAgoDateString(daysAgo: number): string {
    return new Date(getTimeDaysAgo(daysAgo)).toDateString();
  }

  test('no requests in page', () => {
    expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(true);
  });

  test('lastExecutionTime 0 ingests max age', () => {
    templateRequest.updatedAt = getDaysAgoDateString(13);
    requests.push(templateRequest);
    lastExecutionTime = 0;
    //last request is not older than 14 days or exTime, so do not stop
    expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(false);
    templateRequest.updatedAt = getDaysAgoDateString(15);
    requests.push(templateRequest);
    //last request is older than 14 days, so stop
    expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(true);
  });

  test('lastRequest missing updateAt stops ingestion', () => {
    templateRequest.updatedAt = '';
    requests.push(templateRequest);
    lastExecutionTime = 0;
    expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(true);
  });

  test('lastExecutionTime 2 days, pagination stops on time', () => {
    templateRequest.updatedAt = getDaysAgoDateString(1);
    requests.push(templateRequest);
    lastExecutionTime = getTimeDaysAgo(2);
    //last request is not older than 14 days or lastExecutionTime, so do not stop
    expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(false);
    templateRequest.updatedAt = getDaysAgoDateString(3);
    requests.push(templateRequest);
    //last request is older than lastExecutionTime, so stop
    expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(true);
  });

  test('Date() unparsable string for lastRequest updatedAt stops ingestion', () => {
    templateRequest.updatedAt = 'JupiterOne is the best';
    requests.push(templateRequest);
    lastExecutionTime = 0;
    expect(stopFetchingRequests(requests, lastExecutionTime)).toBe(true);
  });
});
