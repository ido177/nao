import type { DeploymentMode } from '@nao/shared/types';

import { env } from '../env';

export function getDeploymentMode(): DeploymentMode {
	if (env.NAO_DEFAULT_PROJECT_PATH) {
		return 'self-hosted';
	}
	return env.NAO_MODE ?? 'self-hosted';
}

export const isSelfHosted = () => getDeploymentMode() === 'self-hosted';
export const isCloud = () => getDeploymentMode() === 'cloud';
