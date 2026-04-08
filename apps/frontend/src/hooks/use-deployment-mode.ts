import { useQuery } from '@tanstack/react-query';
import type { DeploymentMode } from '@nao/shared/types';
import { trpc } from '@/main';

export function useDeploymentMode(): DeploymentMode | undefined {
	const query = useQuery(trpc.organization.getDeploymentMode.queryOptions());
	return query.data?.mode;
}

export function useIsCloud(): boolean {
	return useDeploymentMode() === 'cloud';
}

export function useIsSelfHosted(): boolean {
	const mode = useDeploymentMode();
	return mode === undefined || mode === 'self-hosted';
}
