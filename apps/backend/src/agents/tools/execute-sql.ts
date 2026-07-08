import readline from 'node:readline';
import { Readable } from 'node:stream';

import type { executeSql } from '@nao/shared/tools';
import { executeSql as schemas } from '@nao/shared/tools';

import { ExecuteSqlOutput, renderToModelOutput } from '../../components/tool-outputs';
import { env } from '../../env';
import * as queryResultStore from '../../services/query-result-store';
import { ToolContext } from '../../types/tools';
import { isReadOnlySqlQuery } from '../../utils/sql-filter';
import { createTool } from '../../utils/tools';

/** Number of rows embedded in the tool output for a quick UI preview; the full result lives on disk. */
export const PREVIEW_ROWS = 100;

interface StreamMeta {
	columns?: string[];
	dialect?: string;
}

export async function executeQuery(
	{ sql_query, database_id }: executeSql.Input,
	context: ToolContext,
): Promise<executeSql.Output> {
	const naoProjectFolder = context.projectFolder;

	const writePermEnabled = context.agentSettings?.sql?.dangerouslyWritePermEnabled ?? false;
	if (!writePermEnabled && !(await isReadOnlySqlQuery(sql_query))) {
		throw new Error(
			'Write SQL operations are disabled. Only SELECT queries are allowed. ' +
				'Enable "Dangerous write permissions" in the admin panel to allow INSERT, UPDATE, DELETE and DDL queries.',
		);
	}

	const envVars = context.envVars;
	const response = await fetch(`http://localhost:${env.FASTAPI_PORT}/execute_sql_stream`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			sql: sql_query,
			nao_project_folder: naoProjectFolder,
			...(database_id && { database_id }),
			...(Object.keys(envVars).length > 0 && { env_vars: envVars }),
			...(context.azureAccessToken && { azure_access_token: context.azureAccessToken }),
		}),
	});

	if (!response.ok || !response.body) {
		const errorData = await response.json().catch(() => ({ detail: response.statusText }));
		throw new Error(`Error executing SQL query: ${JSON.stringify(errorData.detail)}`);
	}

	const id = `query_${crypto.randomUUID().slice(0, 8)}` as const;

	// Stream NDJSON rows straight to disk. Only a bounded preview and counters
	// stay in memory, so peak memory is independent of the result size.
	const bodyStream = Readable.fromWeb(response.body as unknown as Parameters<typeof Readable.fromWeb>[0]);
	const rl = readline.createInterface({ input: bodyStream, crlfDelay: Infinity });
	let columns: string[] = [];
	let dialect: string | undefined;
	let rowCount = 0;
	const preview: Record<string, unknown>[] = [];
	let writer: queryResultStore.QueryResultWriter | null = null;

	try {
		for await (const line of rl) {
			if (!line) {
				continue;
			}
			if (!writer) {
				const meta = JSON.parse(line) as StreamMeta;
				columns = meta.columns ?? [];
				dialect = meta.dialect;
				writer = await queryResultStore.createWriter(context.chatId, id);
				continue;
			}
			if (preview.length < PREVIEW_ROWS) {
				preview.push(JSON.parse(line) as Record<string, unknown>);
			}
			rowCount += 1;
			await writer.writeRow(line);
		}
	} finally {
		rl.close();
	}

	// Empty stream (no meta line) should never happen, but guard against it.
	if (!writer) {
		writer = await queryResultStore.createWriter(context.chatId, id);
	}
	await writer.close(columns, rowCount);

	return {
		_version: '1',
		id,
		columns,
		row_count: rowCount,
		dialect,
		data: preview,
		truncated: rowCount > preview.length,
	};
}

export default createTool<executeSql.Input, executeSql.Output>({
	description:
		'Execute a SQL query against the connected database and return the results. If multiple databases are configured, specify the database_id.',
	inputSchema: schemas.InputSchema,
	outputSchema: schemas.OutputSchema,
	execute: executeQuery,
	toModelOutput: ({ output }) => renderToModelOutput(ExecuteSqlOutput({ output }), output),
});
