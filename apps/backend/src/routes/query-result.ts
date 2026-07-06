import { Readable } from 'node:stream';

import { z } from 'zod/v4';

import type { App } from '../app';
import { authMiddleware } from '../middleware/auth';
import * as chatQueries from '../queries/chat.queries';
import * as projectQueries from '../queries/project.queries';
import { queryResultExists, streamQueryResultCsv } from '../services/query-result.service';
import { HandlerError } from '../utils/error';

const paramsSchema = z.object({
	chatId: z.string(),
	queryId: z.string(),
});

const querystringSchema = z.object({
	filename: z.string().optional(),
});

const UTF8_BOM = '\uFEFF';

export const queryResultRoutes = async (app: App) => {
	app.addHook('preHandler', authMiddleware);

	app.get(
		'/:chatId/:queryId.csv',
		{ schema: { params: paramsSchema, querystring: querystringSchema } },
		async (request, reply) => {
			const { chatId, queryId } = request.params;
			const { filename } = request.query;

			const projectId = await chatQueries.getChatProjectId(chatId);
			if (!projectId) {
				throw new HandlerError('NOT_FOUND', 'Chat not found');
			}

			const role = await projectQueries.getUserRoleInProject(projectId, request.user.id);
			if (!role) {
				throw new HandlerError('FORBIDDEN', 'You do not have access to this chat');
			}

			if (!(await queryResultExists(chatId, queryId))) {
				throw new HandlerError('NOT_FOUND', 'Query result not found or no longer available');
			}

			const downloadName = `${sanitizeFileName(filename ?? queryId)}.csv`;

			reply
				.header('Content-Type', 'text/csv; charset=utf-8')
				.header('Content-Disposition', `attachment; filename="${downloadName}"`)
				.header('Cache-Control', 'no-store');

			return reply.send(Readable.from(csvWithBom(chatId, queryId)));
		},
	);
};

async function* csvWithBom(chatId: string, queryId: string): AsyncGenerator<string> {
	yield UTF8_BOM;
	yield* streamQueryResultCsv(chatId, queryId);
}

function sanitizeFileName(name: string): string {
	const cleaned = name
		.replace(/\.csv$/i, '')
		.replace(/[^a-zA-Z0-9-_. ]/g, '_')
		.trim();
	return cleaned || 'export';
}
