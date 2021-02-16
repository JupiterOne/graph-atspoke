import {
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from '../types';
import { createAPIClient } from '../client';

export const ACCOUNT_ENTITY_KEY = 'at_spoke_account';

export async function fetchAccountDetails({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);
  const acctInfo = await apiClient.getAccountInfo();
  const name = `atSpoke ${acctInfo.org} - ${instance.name}`;
  const accountEntity = await jobState.addEntity(
    createIntegrationEntity({
      entityData: {
        source: {
          id: 'atSpoke',
          name: 'atSpoke Account',
        },
        assign: {
          _key: `at-spoke-account:${instance.id}`,
          _type: ACCOUNT_ENTITY_KEY,
          _class: 'Account',
          name,
          displayName: name,
          org: acctInfo.org,
        },
      },
    }),
  );

  await jobState.setData(ACCOUNT_ENTITY_KEY, accountEntity);
}

export const accountSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-account',
    name: 'Fetch Account Details',
    entities: [
      {
        resourceName: 'atSpoke Account',
        _type: ACCOUNT_ENTITY_KEY,
        _class: 'Account',
      },
    ],
    relationships: [],
    dependsOn: [],
    executionHandler: fetchAccountDetails,
  },
];
