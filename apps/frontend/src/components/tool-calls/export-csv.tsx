import { useMemo } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toCsv } from '@nao/shared/story-table-utils';
import { useOptionalAgentContext } from '../../contexts/agent.provider';
import { Button } from '../ui/button';
import type { ToolCallComponentProps } from '.';
import type { UIMessage } from '@nao/backend/chat';
import { downloadCsv, sanitizeCsvFileName } from '@/lib/download-csv';

const EMPTY_MESSAGES: UIMessage[] = [];

export const ExportCsvToolCall = ({ toolPart: { state, input, output } }: ToolCallComponentProps<'export_csv'>) => {
	const agent = useOptionalAgentContext();
	const messages = agent?.messages ?? EMPTY_MESSAGES;
	const config = state !== 'input-streaming' ? input : undefined;

	const sourceData = useMemo(() => {
		if (!config?.query_id) {
			return null;
		}
		for (const message of messages) {
			for (const part of message.parts) {
				if (part.type === 'tool-execute_sql' && part.output && part.output.id === config.query_id) {
					return part.output;
				}
			}
		}
		return null;
	}, [messages, config?.query_id]);

	if (output && output.error) {
		return <div className='my-2 text-foreground/50 text-sm'>{output.error}</div>;
	}

	if (!config) {
		return <div className='my-2 text-foreground/50 text-sm'>Preparing CSV export…</div>;
	}

	if (!sourceData?.data || sourceData.data.length === 0) {
		return (
			<div className='my-2 text-foreground/50 text-sm'>
				Could not prepare the CSV export because the data is missing.
			</div>
		);
	}

	const rowCount = sourceData.data.length;
	const columnCount = sourceData.columns.length;
	const fileName = sanitizeCsvFileName(config.filename ?? config.query_id);

	const handleDownload = () => {
		downloadCsv(fileName, toCsv(sourceData.columns, sourceData.data as Record<string, unknown>[]));
	};

	return (
		<div className='my-3 flex items-center justify-between gap-3 rounded-lg border bg-card/50 px-4 py-3'>
			<div className='flex min-w-0 items-center gap-3'>
				<FileSpreadsheet className='size-5 shrink-0 text-muted-foreground' />
				<div className='flex min-w-0 flex-col'>
					<span className='truncate text-sm font-medium'>{fileName}.csv</span>
					<span className='text-xs text-muted-foreground'>
						{rowCount} rows · {columnCount} columns
					</span>
				</div>
			</div>
			<Button size='sm' onClick={handleDownload} className='shrink-0 gap-1'>
				<Download className='size-3.5' />
				Download CSV
			</Button>
		</div>
	);
};
