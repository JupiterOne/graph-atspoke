import { accountSteps } from './account';
import { accessSteps } from './access';
import { webhookSteps } from './webhooks';
import { requestSteps } from './requests';

const integrationSteps = [
  ...accountSteps,
  ...accessSteps,
  ...webhookSteps,
  ...requestSteps,
];

export { integrationSteps };
