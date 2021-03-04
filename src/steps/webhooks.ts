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
            _type: 'atspoke_webhook',
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
        resourceName: 'atSpoke Webhook',
        _type: 'atspoke_webhook',
        _class: 'ApplicationEndpoint',
      },
    ],
    relationships: [
      {
        _type: 'atspoke_account_has_webhook',
        _class: RelationshipClass.HAS,
        sourceType: 'atspoke_account',
        targetType: 'atspoke_webhook',
      },
    ],
    dependsOn: ['fetch-account'],
    executionHandler: fetchWebhooks,
  },
];
