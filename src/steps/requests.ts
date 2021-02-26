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
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateRequests(async (request) => {
    if (request.requestTypeInfo) {
      delete request.requestTypeInfo;
    }
    const requestEntity = await jobState.addEntity(
      createIntegrationEntity({
        entityData: {
          source: request,
          assign: {
            _type: 'at_spoke_request',
            _class: 'Record',
            _key: request.id,
            partial: true,
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
            _type: 'at_spoke_requesttype',
            _class: 'Configuration',
            _key: requestType.id,
            partial: true,
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
        _type: 'at_spoke_request',
        _class: 'Record',
      },
    ],
    relationships: [
      {
        _type: 'at_spoke_account_has_request',
        _class: RelationshipClass.HAS,
        sourceType: 'at_spoke_account',
        targetType: 'at_spoke_request',
      },
      {
        _type: 'at_spoke_request_has_requesttype',
        _class: RelationshipClass.HAS,
        sourceType: 'at_spoke_request',
        targetType: 'at_spoke_requesttype',
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
        _type: 'at_spoke_requesttype',
        _class: 'Configuration',
      },
    ],
    relationships: [
      {
        _type: 'at_spoke_account_has_requesttype',
        _class: RelationshipClass.HAS,
        sourceType: 'at_spoke_account',
        targetType: 'at_spoke_requesttype',
      },
    ],
    dependsOn: ['fetch-account'],
    executionHandler: fetchRequestTypes,
  },
];
