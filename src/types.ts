import { IntegrationInstanceConfig } from '@jupiterone/integration-sdk-core';

/**
 * Properties provided by the `IntegrationInstance.config`. This reflects the
 * same properties defined by `instanceConfigFields`.
 */
export interface IntegrationConfig extends IntegrationInstanceConfig {
  /**
   * The provider API key used to authenticate requests.
   */
  apiKey: string;
  /**
   * The number of recent requests to ingest.
   *
   * Requests are Record entities. The collection size will grow indefinitely. This allows for limiting the number
   * of recently created/changed requests to ingest whenever the integration executes. This should be set to
   * a value that correlates to the execution interval of the integration and the expected number of requests
   * that would have been created/changed between executions.
   */
  numRequests: string;
}
