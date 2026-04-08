import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/main';
import { useIsCloud } from '@/hooks/use-deployment-mode';

export function useAuthRoute(): string {
	const userCount = useQuery(trpc.user.countAll.queryOptions());
	const isCloud = useIsCloud();

	if (isCloud) {
		return '/login';
	}

	return userCount.data ? '/login' : '/signup';
}
