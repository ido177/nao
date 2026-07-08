import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

import { env } from '../env';
import { QueryResult } from '../types/tools';

/**
 * Disk-backed store for SQL query results.
 *
 * Each result is two files: `<queryId>.jsonl` holds one JSON row per line, and a
 * sidecar `<queryId>.meta.json` holds `{ columns, row_count }`. The sidecar is
 * written last, so it also marks the write as complete — a partially written
 * result (process died mid-stream) has no sidecar and reads as absent.
 *
 * Writes stream row by row and reads page/stream without materializing the full
 * dataset, keeping backend memory flat regardless of result size.
 */

interface QueryResultMeta {
	columns: string[];
	row_count: number;
}

export interface QueryResultWriter {
	/** Appends one already-serialized JSON row (without a trailing newline). */
	writeRow(jsonLine: string): Promise<void>;
	/** Flushes remaining rows and writes the sidecar meta (marks the result complete). */
	close(columns: string[], rowCount: number): Promise<void>;
}

const baseDir = (): string => env.NAO_QUERY_RESULT_DIR || path.join(os.tmpdir(), 'nao-query-results');

const safeSegment = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '_');

const chatDir = (chatId: string): string => path.join(baseDir(), safeSegment(chatId));

const dataPath = (chatId: string, queryId: string): string =>
	path.join(chatDir(chatId), `${safeSegment(queryId)}.jsonl`);

const metaPath = (chatId: string, queryId: string): string =>
	path.join(chatDir(chatId), `${safeSegment(queryId)}.meta.json`);

/** Opens a streaming writer that appends rows to disk without buffering the full result. */
export async function createWriter(chatId: string, queryId: string): Promise<QueryResultWriter> {
	await fs.mkdir(chatDir(chatId), { recursive: true });
	const stream = createWriteStream(dataPath(chatId, queryId), { encoding: 'utf-8' });

	return {
		writeRow: (jsonLine) => writeLine(stream, jsonLine),
		close: async (columns, rowCount) => {
			await new Promise<void>((resolve, reject) => {
				stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
			});
			const meta: QueryResultMeta = { columns, row_count: rowCount };
			await fs.writeFile(metaPath(chatId, queryId), JSON.stringify(meta), 'utf-8');
		},
	};
}

/** Convenience writer for callers that already hold the full result in memory. */
export async function write(chatId: string, queryId: string, result: QueryResult): Promise<void> {
	const writer = await createWriter(chatId, queryId);
	for (const row of result.data) {
		await writer.writeRow(JSON.stringify(row));
	}
	await writer.close(result.columns, result.data.length);
}

export async function exists(chatId: string, queryId: string): Promise<boolean> {
	try {
		await fs.access(metaPath(chatId, queryId));
		return true;
	} catch {
		return false;
	}
}

export async function getMeta(chatId: string, queryId: string): Promise<QueryResultMeta | null> {
	try {
		const raw = await fs.readFile(metaPath(chatId, queryId), 'utf-8');
		return JSON.parse(raw) as QueryResultMeta;
	} catch {
		return null;
	}
}

/** Reads a page of rows. `limit` undefined reads to the end. */
export async function readPage(
	chatId: string,
	queryId: string,
	offset = 0,
	limit?: number,
): Promise<QueryResult | null> {
	const meta = await getMeta(chatId, queryId);
	if (!meta) {
		return null;
	}

	const rows: Record<string, unknown>[] = [];
	let index = 0;
	const end = limit === undefined ? Infinity : offset + limit;

	const rl = readline.createInterface({
		input: createReadStream(dataPath(chatId, queryId), { encoding: 'utf-8' }),
		crlfDelay: Infinity,
	});
	try {
		for await (const line of rl) {
			if (!line) {
				continue;
			}
			if (index >= offset && index < end) {
				rows.push(JSON.parse(line) as Record<string, unknown>);
			}
			index += 1;
			if (index >= end) {
				break;
			}
		}
	} finally {
		rl.close();
	}

	return { columns: meta.columns, data: rows };
}

/** Streams the full result as CSV lines (header first), one yielded chunk per row. */
export async function* csvLines(chatId: string, queryId: string): AsyncGenerator<string> {
	const meta = await getMeta(chatId, queryId);
	if (!meta) {
		return;
	}
	const { columns } = meta;
	yield `${columns.map(escapeCsvCell).join(',')}\r\n`;

	const rl = readline.createInterface({
		input: createReadStream(dataPath(chatId, queryId), { encoding: 'utf-8' }),
		crlfDelay: Infinity,
	});
	try {
		for await (const line of rl) {
			if (!line) {
				continue;
			}
			const row = JSON.parse(line) as Record<string, unknown>;
			yield `${columns.map((column) => escapeCsvCell(row[column])).join(',')}\r\n`;
		}
	} finally {
		rl.close();
	}
}

export async function remove(chatId: string): Promise<void> {
	await fs.rm(chatDir(chatId), { recursive: true, force: true });
}

/**
 * Removes result files older than `maxAgeMs` (safety net for orphaned files;
 * files are normally deleted when their chat is deleted). Empty chat
 * directories are pruned afterwards. Returns the number of files removed.
 */
export async function cleanupExpired(maxAgeMs: number): Promise<number> {
	const dir = baseDir();
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return 0;
	}

	const now = Date.now();
	let removed = 0;

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}
		const dirPath = path.join(dir, entry.name);
		let files: string[];
		try {
			files = await fs.readdir(dirPath);
		} catch {
			continue;
		}

		for (const file of files) {
			const target = path.join(dirPath, file);
			try {
				const stat = await fs.stat(target);
				if (now - stat.mtimeMs > maxAgeMs) {
					await fs.rm(target, { force: true });
					removed += 1;
				}
			} catch {
				// ignore files that vanish or can't be stat'd
			}
		}

		try {
			if ((await fs.readdir(dirPath)).length === 0) {
				await fs.rmdir(dirPath);
			}
		} catch {
			// ignore
		}
	}

	return removed;
}

export function escapeCsvCell(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}
	const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
	return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function writeLine(stream: ReturnType<typeof createWriteStream>, line: string): Promise<void> {
	return new Promise((resolve, reject) => {
		stream.write(`${line}\n`, (err) => {
			if (err) {
				reject(err);
				return;
			}
			resolve();
		});
	});
}
