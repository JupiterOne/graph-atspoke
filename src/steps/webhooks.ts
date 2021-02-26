import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../types';
import { DATA_ACCOUNT_ENTITY } from './account';

export async function fetchWebhooks({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateWebhooks(async (webhook) => {
    const webhookEntity = await jobState.addEntity(
      createIntegrationEntity({
        entityData: {
          source: webhook,
          assign: {
            _type: 'at_spoke_webhook',
            _class: 'ApplicationEndpoint',
            _key: webhook.id,
            name: webhook.client,
            displayName: webhook.client,
            enabled: webhook.enabled,
            topics: webhook.topics,
            address: webhook.url,
            targetUrl: webhook.url,
            targetServiceName: webhook.client,
            description: webhook.description,
            id: webhook.id,
          },
        },
      }),
    );

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: webhookEntity,
      }),
    );
  });
}

export const webhookSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-webhooks',
    name: 'Fetch Webhooks',
    entities: [
      {
        resourceName: 'atSpoke Account',
        _type: 'at_spoke_account',
        _class: 'Account',
      },
      {
        resourceName: 'atSpoke Webhook',
        _type: 'at_spoke_webhook',
        _class: 'ApplicationEndpoint',
      },
    ],
    relationships: [
      {
        _type: 'at_spoke_account_has_webhook',
        _class: RelationshipClass.HAS,
        sourceType: 'at_spoke_account',
        targetType: 'at_spoke_webhook',
      },
    ],
    dependsOn: ['fetch-account'],
    executionHandler: fetchWebhooks,
  },
];
