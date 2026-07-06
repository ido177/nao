import z from 'zod/v3';

export const InputSchema = z.object({
	query_id: z
		.string()
		.describe(
			'The id of a previous `execute_sql` tool call (e.g. "query_a1b2c3d4") whose full result should be exported as a single downloadable CSV file. The query must be from this conversation.',
		),
	filename: z
		.string()
		.optional()
		.describe('Optional base name for the downloaded file, without extension. Defaults to the query id.'),
});

export const OutputSchema = z.object({
	_version: z.literal('1').optional(),
	success: z.boolean(),
	/** Total number of rows available for download. */
	row_count: z.number().optional(),
	/** Base name (without extension) used for the downloaded file. */
	filename: z.string().optional(),
	/** Relative URL the UI uses to stream the full CSV from the server. */
	download_url: z.string().optional(),
	error: z.string().optional(),
});

export type Input = z.infer<typeof InputSchema>;
export type Output = z.infer<typeof OutputSchema>;
