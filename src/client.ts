import axios, { AxiosInstance } from 'axios';

import { IntegrationProviderAuthenticationError } from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from './types';

export type ResourceIteratee<T> = (each: T) => Promise<void> | void;

export type AtSpokeUser = {
  id: string;
  displayName: string;
  email: string;
  isEmailVerified?: boolean;
  isProfileCompleted?: boolean;
  status?: string;
  profile?: object;
  memberships?: string[];
  startDate?: string;
};

type AtSpokeTeam = {
  id: string;
  name: string;
  slug: string;
  description: string;
  keywords: string[];
  icon: string;
  color: string;
  status: string;
  goals: object;
  agentList?: AtSpokeAgentListItem[];
  createdAt: string;
  updatedAt: string;
  owner: string;
  org: string;
  email: string;
  permalink: string;
  settings?: object;
};

type AtSpokeAgentListItem = {
  timestamps?: object;
  status: string;
  teamRole: string;
  user: AtSpokeUser;
};

type AtSpokeWebhook = {
  enabled: boolean;
  topics: string[];
  url: string;
  client: string;
  description: string;
  id: string;
};

export type AtSpokeRequest = {
  subject: string;
  requester: string;
  owner: string;
  status: string;
  privacyLevel: string;
  team: string;
  org: string;
  permalink: string;
  id: string;
  requestType?: string;
  requestTypeInfo?: string;
  isAutoResolve: boolean;
  isFiled: boolean;
  email: string;
  createdAt: string;
  updatedAt: string;
};

type AtSpokeRequestType = {
  id: string;
  status: string;
  icon: string;
  title: string;
  description: string;
};

/**
 * An APIClient maintains authentication state and provides an interface to
 * third party data APIs.
 *
 * It is recommended that integrations wrap provider data APIs to provide a
 * place to handle error responses and implement common patterns for iterating
 * resources.
 */
export class APIClient {
  constructor(readonly config: IntegrationConfig) {}

  getClient(): AxiosInstance {
    const client = axios.create({
      headers: {
        get: {
          client: 'JupiterOne-atSpoke Integration client',
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey,
        },
      },
    });
    return client;
  }

  public async verifyAuthentication(): Promise<void> {
    // the most light-weight request possible to validate
    // authentication works with the provided credentials, throw an err if
    // authentication fails
    return await this.contactAPI('https://api.askspoke.com/api/v1/whoami');
  }

  public async getAccountInfo() {
    return await this.contactAPI('https://api.askspoke.com/api/v1/whoami');
  }

  /**
   * Iterates each atSpoke user.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateUsers(
    iteratee: ResourceIteratee<AtSpokeUser>,
  ): Promise<void> {
    const pageSize = 25; //do not increase, b/c it will break when ai=true for atSpoke
    let recordsPulled = 0;
    let lastRecord = false;
    while (!lastRecord) {
      const paramsToPass = {
        params: {
          start: recordsPulled, //starting index. 0 is most recent.
          limit: pageSize,
        },
      };
      const reply = await this.contactAPI(
        'https://api.askspoke.com/api/v1/users',
        paramsToPass,
      );

      const users: AtSpokeUser[] = reply.results;

      for (const user of users) {
        await iteratee(user);
      }

      if (users.length < pageSize) {
        lastRecord = true;
      }
      recordsPulled = recordsPulled + pageSize;
    }
  }

  /**
   * Iterates each atSpoke team.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateTeams(
    iteratee: ResourceIteratee<AtSpokeTeam>,
  ): Promise<void> {
    const pageSize = 25; //do not increase, b/c it will break when ai=true for atSpoke
    let recordsPulled = 0;
    let lastRecord = false;
    while (!lastRecord) {
      const paramsToPass = {
        params: {
          start: recordsPulled, //starting index. 0 is most recent.
          limit: pageSize,
        },
      };
      const reply = await this.contactAPI(
        'https://api.askspoke.com/api/v1/teams',
        paramsToPass,
      );

      const teams: AtSpokeTeam[] = reply.results;

      for (const team of teams) {
        await iteratee(team);
      }

      if (teams.length < pageSize) {
        lastRecord = true;
      }
      recordsPulled = recordsPulled + pageSize;
    }
  }

  /**
   * Iterates each atSpoke webhook.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateWebhooks(
    iteratee: ResourceIteratee<AtSpokeWebhook>,
  ): Promise<void> {
    const reply = await this.contactAPI(
      'https://api.askspoke.com/api/v1/webhooks',
    );

    const webhooks: AtSpokeWebhook[] = reply.results;

    for (const webhook of webhooks) {
      await iteratee(webhook);
    }
  }

  /**
   * Iterates each atSpoke request.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateRequests(
    lastExecutionTime: number,
    iteratee: ResourceIteratee<AtSpokeRequest>,
  ): Promise<void> {
    const pageSize = 100; //the max of the atSpoke v1 API
    let requestsPulled = 0;
    let lastRequest = false;
    while (!lastRequest) {
      const paramsToPass = {
        params: {
          start: requestsPulled, //starting index of requests. 0 is most recent.
          limit: pageSize,
          status: 'OPEN,RESOLVED,PENDING,LOCKED,AUTO_RESOLVED', //pulls only OPEN by default
        },
      };

      const reply = await this.contactAPI(
        'https://api.askspoke.com/api/v1/requests',
        paramsToPass,
      );

      const requests: AtSpokeRequest[] = reply.results;

      for (const request of requests) {
        await iteratee(request);
      }

      if (requests.length < pageSize) {
        lastRequest = true;
      } //we got all the requests in the system
      if (stopFetchingRequests(requests, lastExecutionTime)) {
        lastRequest = true;
      } //we got enough requests to cover to the last integration execution time
      requestsPulled = requestsPulled + pageSize;
    }
  }

  /**
   * Iterates each atSpoke request type.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateRequestTypes(
    iteratee: ResourceIteratee<AtSpokeRequestType>,
  ): Promise<void> {
    const pageSize = 25;
    let recordsPulled = 0;
    let lastRecord = false;
    while (!lastRecord) {
      const paramsToPass = {
        params: {
          start: recordsPulled, //starting index. 0 is most recent.
          limit: pageSize,
        },
      };
      const reply = await this.contactAPI(
        'https://api.askspoke.com/api/v1/request_types',
        paramsToPass,
      );

      const requestTypes: AtSpokeRequestType[] = reply.results;

      for (const requestType of requestTypes) {
        await iteratee(requestType);
      }
      if (requestTypes.length < pageSize) {
        lastRecord = true;
      }
      recordsPulled = recordsPulled + pageSize;
    }
  }

  public async contactAPI(url, params?) {
    let reply;
    try {
      reply = await this.getClient().get(url, params);
      if (reply.status != 200) {
        throw new IntegrationProviderAuthenticationError({
          endpoint: url,
          status: reply.status,
          statusText: `Received HTTP status ${reply.status}`,
        });
      }
      return reply.data;
    } catch (err) {
      throw new IntegrationProviderAuthenticationError({
        cause: err,
        endpoint: url,
        status: err.status,
        statusText: err.statusText,
      });
    }
  }
}

export function stopFetchingRequests(
  requests: AtSpokeRequest[],
  lastExecutionTime: number,
): boolean {
  if (requests.length == 0) {
    return true; //no requests, so we are done
  }
  if (!requests[requests.length - 1].updatedAt) {
    return true; //this shouldn't happen, but in case API screws up and gives undef or 0, we'll keep going
  }
  const lastRequestUpdatedAt: Date = new Date(
    requests[requests.length - 1].updatedAt,
  );
  if (!(lastRequestUpdatedAt.getTime() > lastExecutionTime)) {
    return true;
  } //last request pulled is not younger than the last execution time, so don't fetch any more pages of requests
  // also covers invalid strings for updatedAt, which return NaN on .getTime()
  if (
    lastRequestUpdatedAt.getTime() <
    new Date().getTime() - 14 * 24 * 60 * 60 * 1000
  ) {
    return true;
  } //if we're back more than 14 days, you can stop fetching pages of requests no matter what
  return false;
}

export function createAPIClient(config: IntegrationConfig): APIClient {
  return new APIClient(config);
}
