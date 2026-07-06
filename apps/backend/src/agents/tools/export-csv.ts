import type { exportCsv } from '@nao/shared/tools';
import { exportCsv as schemas } from '@nao/shared/tools';

import { getQueryResult } from '../../services/query-result.service';
import { createTool } from '../../utils/tools';

export default createTool<exportCsv.Input, exportCsv.Output>({
	description:
		'Provide the full result of a previous `execute_sql` query as a single downloadable CSV file in the chat. Use this whenever a query returns more than 10 rows, or when the user asks to export, download, or save the data as CSV or Excel. Reference the query by its `query_id`; this does not re-run the SQL and works for any query executed earlier in this chat.',
	inputSchema: schemas.InputSchema,
	outputSchema: schemas.OutputSchema,
	execute: async ({ query_id, filename }, context) => {
		const stored = await getQueryResult(context, query_id);
		if (!stored) {
			return {
				_version: '1' as const,
				success: false,
				error: `Query result not found for id "${query_id}". The id must come from an execute_sql tool call earlier in this chat.`,
			};
		}

		return {
			_version: '1' as const,
			success: true,
			row_count: stored.data.length,
			filename: filename ?? query_id,
		};
	},
	toModelOutput: ({ output }) => ({
		type: 'text',
		value: output.success
			? `CSV export ready. The user can download the full result (${output.row_count ?? 0} rows) as a CSV file directly from the chat. Do not paste the rows into your reply.`
			: `CSV export failed: ${output.error ?? 'unknown error'}`,
	}),
});
