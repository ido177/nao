import type { App } from '../app';
import { getAuth } from '../auth';
import * as userQueries from '../queries/user.queries';
import * as githubService from '../services/github';
import { convertHeaders } from '../utils/utils';

export const githubRoutes = async (app: App) => {
	app.get('/connect', async (request, reply) => {
		if (!githubService.isGithubIntegrationAvailable()) {
			return reply.status(400).send({ error: 'GitHub integration is not configured' });
		}

		const auth = await getAuth();
		const session = await auth.api.getSession({ headers: convertHeaders(request.headers) });
		if (!session?.user) {
			return reply.status(401).send({ error: 'Unauthorized' });
		}

		const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString('base64url');
		const url = githubService.buildAuthorizationUrl(state);
		return reply.redirect(url);
	});

	app.get('/callback', async (request, reply) => {
		const { code, state } = request.query as { code?: string; state?: string };
		if (!code || !state) {
			return reply.redirect('/settings/organization?github=error&reason=missing_params');
		}

		let userId: string;
		try {
			const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
			userId = decoded.userId;
		} catch {
			return reply.redirect('/settings/organization?github=error&reason=invalid_state');
		}

		try {
			const token = await githubService.exchangeCodeForToken(code);
			await userQueries.updateGithubToken(userId, token);
			return reply.redirect('/settings/organization?github=connected');
		} catch {
			return reply.redirect('/settings/organization?github=error&reason=exchange_failed');
		}
	});
};
