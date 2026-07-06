import { env } from '../env';
import * as queryResultStore from '../services/query-result-store';
import type { JobHandler } from '../services/scheduler.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export const QUERY_RESULT_CLEANUP_JOB_NAME = 'query-result.cleanup';

export async function runQueryResultCleanup(): Promise<void> {
	await queryResultStore.cleanupExpired(env.NAO_QUERY_RESULT_TTL_DAYS * DAY_MS);
}

export const queryResultCleanupHandler: JobHandler = async () => {
	await runQueryResultCleanup();
};
