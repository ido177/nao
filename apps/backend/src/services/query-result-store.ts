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
 * Results are written as JSONL: the first line holds metadata
 * (`{ columns, row_count }`), each subsequent line is one row. This keeps the
 * backend from holding whole result sets in memory — writes stream row by row
 * and reads page/stream without materializing the full dataset.
 */

interface QueryResultMeta {
	columns: string[];
	row_count: number;
}

const baseDir = (): string => env.NAO_QUERY_RESULT_DIR || path.join(os.tmpdir(), 'nao-query-results');

const safeSegment = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '_');

const chatDir = (chatId: string): string => path.join(baseDir(), safeSegment(chatId));

const filePath = (chatId: string, queryId: string): string =>
	path.join(chatDir(chatId), `${safeSegment(queryId)}.jsonl`);

export async function write(chatId: string, queryId: string, result: QueryResult): Promise<void> {
	const dir = chatDir(chatId);
	await fs.mkdir(dir, { recursive: true });

	const meta: QueryResultMeta = { columns: result.columns, row_count: result.data.length };
	const stream = createWriteStream(filePath(chatId, queryId), { encoding: 'utf-8' });

	try {
		await writeLine(stream, JSON.stringify(meta));
		for (const row of result.data) {
			await writeLine(stream, JSON.stringify(row));
		}
	} finally {
		await new Promise<void>((resolve, reject) => {
			stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
		});
	}
}

export async function exists(chatId: string, queryId: string): Promise<boolean> {
	try {
		await fs.access(filePath(chatId, queryId));
		return true;
	} catch {
		return false;
	}
}

export async function getMeta(chatId: string, queryId: string): Promise<QueryResultMeta | null> {
	const firstLine = await readFirstLine(filePath(chatId, queryId));
	if (!firstLine) {
		return null;
	}
	return JSON.parse(firstLine) as QueryResultMeta;
}

/** Reads a page of rows. `limit` undefined reads to the end (optionally capped by `limit`). */
export async function readPage(
	chatId: string,
	queryId: string,
	offset = 0,
	limit?: number,
): Promise<QueryResult | null> {
	const file = filePath(chatId, queryId);
	if (!(await exists(chatId, queryId))) {
		return null;
	}

	const rows: Record<string, unknown>[] = [];
	let columns: string[] = [];
	let index = -1; // -1 = meta line
	const end = limit === undefined ? Infinity : offset + limit;

	const rl = readline.createInterface({ input: createReadStream(file, { encoding: 'utf-8' }), crlfDelay: Infinity });
	try {
		for await (const line of rl) {
			if (!line) {
				continue;
			}
			if (index === -1) {
				columns = (JSON.parse(line) as QueryResultMeta).columns;
				index = 0;
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

	return { columns, data: rows };
}

/** Streams the full result as CSV lines (header first), one yielded chunk per row. */
export async function* csvLines(chatId: string, queryId: string): AsyncGenerator<string> {
	const file = filePath(chatId, queryId);
	let columns: string[] = [];
	let isMeta = true;

	const rl = readline.createInterface({ input: createReadStream(file, { encoding: 'utf-8' }), crlfDelay: Infinity });
	try {
		for await (const line of rl) {
			if (!line) {
				continue;
			}
			if (isMeta) {
				columns = (JSON.parse(line) as QueryResultMeta).columns;
				isMeta = false;
				yield `${columns.map(escapeCsvCell).join(',')}\r\n`;
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

async function readFirstLine(file: string): Promise<string | null> {
	let stream: ReturnType<typeof createReadStream> | null = null;
	try {
		stream = createReadStream(file, { encoding: 'utf-8' });
	} catch {
		return null;
	}

	const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
	try {
		for await (const line of rl) {
			return line;
		}
		return null;
	} catch {
		return null;
	} finally {
		rl.close();
	}
}
