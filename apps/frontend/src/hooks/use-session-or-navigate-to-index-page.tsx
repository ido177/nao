import { useEffect, useMemo } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';

import { useSession } from '@/lib/auth-client';
import { useAuthRoute } from '@/hooks/use-auth-route';
import { useIsCloud } from '@/hooks/use-deployment-mode';

const AUTH_ROUTES = ['/login', '/forgot-password', '/reset-password'];
const CLOUD_AUTH_ROUTES = [...AUTH_ROUTES, '/signup'];

export const useSessionOrNavigateToIndexPage = () => {
	const navigate = useNavigate();
	const session = useSession();
	const navigation = useAuthRoute();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isCloud = useIsCloud();

	const isInvitePage = pathname.startsWith('/invite/');
	const allAuthRoutes = useMemo(() => (isCloud ? CLOUD_AUTH_ROUTES : AUTH_ROUTES), [isCloud]);

	useEffect(() => {
		if (session.isPending) {
			return;
		}

		if (!session.data && !allAuthRoutes.includes(pathname) && !isInvitePage) {
			navigate({ to: navigation });
		}

		if (session.data && (allAuthRoutes.includes(pathname) || (!isCloud && pathname === '/signup'))) {
			navigate({ to: '/' });
		}
	}, [session.isPending, session.data, navigate, navigation, pathname, allAuthRoutes, isCloud, isInvitePage]);

	return session;
};
