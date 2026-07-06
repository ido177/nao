import { TRPCError } from '@trpc/server';
import { z } from 'zod/v4';

import * as chatQueries from '../queries/chat.queries';
import * as projectQueries from '../queries/project.queries';
import { readQueryResultPage } from '../services/query-result.service';
import { protectedProcedure } from './trpc';

/** Hard cap on rows returned to the browser to protect memory on both ends. */
const MAX_ROWS = 50_000;

export const queryResultRoutes = {
	getData: protectedProcedure
		.input(
			z.object({
				chatId: z.string(),
				queryId: z.string(),
				limit: z.number().int().positive().max(MAX_ROWS).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const projectId = await chatQueries.getChatProjectId(input.chatId);
			if (!projectId) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat not found' });
			}

			const role = await projectQueries.getUserRoleInProject(projectId, ctx.user.id);
			if (!role) {
				throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this chat' });
			}

			const page = await readQueryResultPage(input.chatId, input.queryId, 0, input.limit ?? MAX_ROWS);
			if (!page) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Query result not found or no longer available' });
			}

			return {
				columns: page.columns,
				data: page.data,
				row_count: page.row_count,
				truncated: page.row_count > page.data.length,
			};
		}),
};
