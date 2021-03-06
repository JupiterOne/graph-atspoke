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

export async function fetchRequests({
  instance,
  jobState,
  executionHistory,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;
  const lastExecutionTime: number =
    executionHistory.lastSuccessful?.startedOn ||
    new Date().getTime() - 14 * 24 * 60 * 60 * 1000;

  await apiClient.iterateRequests(lastExecutionTime, async (request) => {
    if (request.requestTypeInfo) {
      delete request.requestTypeInfo;
    }
    const requestEntity = await jobState.addEntity(
      createIntegrationEntity({
        entityData: {
          source: request,
          assign: {
            _type: 'atspoke_request',
            _class: 'Record',
            _key: request.id,
            name: request.subject,
            displayName: request.subject,
            webLink: request.permalink,
            email: request.email,
            status: request.status,
            requester: request.requester,
            owner: request.owner,
            requestType: request.requestType,
          },
        },
      }),
    );

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: requestEntity,
      }),
    );

    if (request.requestType) {
      const requestTypeEntity = await jobState.findEntity(request.requestType);
      if (requestTypeEntity) {
        await jobState.addRelationship(
          createDirectRelationship({
            _class: RelationshipClass.HAS,
            from: requestEntity,
            to: requestTypeEntity,
          }),
        );
      }
    }
  });
}

export async function fetchRequestTypes({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateRequestTypes(async (requestType) => {
    const requestTypeEntity = await jobState.addEntity(
      createIntegrationEntity({
        entityData: {
          source: requestType,
          assign: {
            _type: 'atspoke_requesttype',
            _class: 'Configuration',
            _key: requestType.id,
            name: requestType.title,
            displayName: requestType.title,
            description: requestType.description,
            status: requestType.status,
          },
        },
      }),
    );

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: requestTypeEntity,
      }),
    );
  });
}

export const requestSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-requests',
    name: 'Fetch Requests',
    entities: [
      {
        resourceName: 'atSpoke Request',
        _type: 'atspoke_request',
        _class: 'Record',
        partial: true,
      },
    ],
    relationships: [
      {
        _type: 'atspoke_account_has_request',
        _class: RelationshipClass.HAS,
        sourceType: 'atspoke_account',
        targetType: 'atspoke_request',
      },
      {
        _type: 'atspoke_request_has_requesttype',
        _class: RelationshipClass.HAS,
        sourceType: 'atspoke_request',
        targetType: 'atspoke_requesttype',
      },
    ],
    dependsOn: ['fetch-request-types'],
    executionHandler: fetchRequests,
  },
  {
    id: 'fetch-request-types',
    name: 'Fetch Request Types',
    entities: [
      {
        resourceName: 'atSpoke Request Type',
        _type: 'atspoke_requesttype',
        _class: 'Configuration',
        partial: true,
      },
    ],
    relationships: [
      {
        _type: 'atspoke_account_has_requesttype',
        _class: RelationshipClass.HAS,
        sourceType: 'atspoke_account',
        targetType: 'atspoke_requesttype',
      },
    ],
    dependsOn: ['fetch-account'],
    executionHandler: fetchRequestTypes,
  },
];
