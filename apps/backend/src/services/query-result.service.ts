import * as chatQueries from '../queries/chat.queries';
import { QueryResult } from '../types/tools';
import * as queryResultStore from './query-result-store';

export interface QueryResultMeta {
	columns: string[];
	row_count: number;
}

/**
 * Resolves the full query result by id. Prefers the disk-backed store (current
 * architecture), falling back to the chat's persisted message history for
 * results produced before disk storage existed (old chats keep full `data` in
 * `toolOutput`).
 *
 * Prefer {@link readQueryResultPage} / {@link getQueryResultMeta} where the full
 * dataset is not required — those avoid materializing large results in memory.
 */
export async function getQueryResult(chatId: string, queryId: string): Promise<QueryResult | null> {
	const fromDisk = await queryResultStore.readPage(chatId, queryId);
	if (fromDisk) {
		return fromDisk;
	}

	return chatQueries.getQueryResultByQueryId(chatId, queryId);
}

/** Returns columns + total row count without loading the full dataset. */
export async function getQueryResultMeta(chatId: string, queryId: string): Promise<QueryResultMeta | null> {
	const meta = await queryResultStore.getMeta(chatId, queryId);
	if (meta) {
		return meta;
	}

	const fromDb = await chatQueries.getQueryResultByQueryId(chatId, queryId);
	if (!fromDb) {
		return null;
	}
	return { columns: fromDb.columns, row_count: fromDb.data.length };
}

/** Reads a bounded page of rows, streaming from disk when available. */
export async function readQueryResultPage(
	chatId: string,
	queryId: string,
	offset: number,
	limit: number,
): Promise<(QueryResult & { row_count: number }) | null> {
	const meta = await queryResultStore.getMeta(chatId, queryId);
	if (meta) {
		const page = await queryResultStore.readPage(chatId, queryId, offset, limit);
		return { columns: meta.columns, data: page?.data ?? [], row_count: meta.row_count };
	}

	const fromDb = await chatQueries.getQueryResultByQueryId(chatId, queryId);
	if (!fromDb) {
		return null;
	}
	return {
		columns: fromDb.columns,
		data: fromDb.data.slice(offset, offset + limit),
		row_count: fromDb.data.length,
	};
}

/** True if the query result is available either on disk or in an old chat's persisted output. */
export async function queryResultExists(chatId: string, queryId: string): Promise<boolean> {
	if (await queryResultStore.exists(chatId, queryId)) {
		return true;
	}
	const fromDb = await chatQueries.getQueryResultByQueryId(chatId, queryId);
	return fromDb !== null;
}

/**
 * Streams the full query result as CSV lines (header first). Reads from disk
 * row by row when available; only old chats without a disk file fall back to the
 * in-memory persisted output.
 */
export async function* streamQueryResultCsv(chatId: string, queryId: string): AsyncGenerator<string> {
	if (await queryResultStore.exists(chatId, queryId)) {
		yield* queryResultStore.csvLines(chatId, queryId);
		return;
	}

	const fromDb = await chatQueries.getQueryResultByQueryId(chatId, queryId);
	if (!fromDb) {
		return;
	}
	yield `${fromDb.columns.map(queryResultStore.escapeCsvCell).join(',')}\r\n`;
	for (const row of fromDb.data) {
		yield `${fromDb.columns.map((column) => queryResultStore.escapeCsvCell(row[column])).join(',')}\r\n`;
	}
}
