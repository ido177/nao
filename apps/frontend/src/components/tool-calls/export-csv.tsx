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

	// Only used as a fallback for old messages that predate server-side streaming.
	const previewData = useMemo(() => {
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

	const fileName = sanitizeCsvFileName(config.filename ?? config.query_id);
	const downloadUrl = output?.success ? output.download_url : undefined;
	const rowCount = output?.row_count ?? previewData?.row_count ?? previewData?.data?.length ?? 0;
	const columnCount = previewData?.columns?.length ?? 0;

	// Preferred path: the browser streams the full file directly from the server to disk.
	if (downloadUrl) {
		return (
			<ExportCard fileName={fileName} rowCount={rowCount} columnCount={columnCount}>
				<Button asChild size='sm' className='shrink-0 gap-1'>
					<a href={downloadUrl} download={`${fileName}.csv`}>
						<Download className='size-3.5' />
						Download CSV
					</a>
				</Button>
			</ExportCard>
		);
	}

	// Fallback for old messages: generate the CSV client-side from the persisted rows.
	if (!previewData?.data || previewData.data.length === 0) {
		return (
			<div className='my-2 text-foreground/50 text-sm'>
				Could not prepare the CSV export because the data is no longer available.
			</div>
		);
	}

	const handleDownload = () => {
		downloadCsv(fileName, toCsv(previewData.columns, previewData.data as Record<string, unknown>[]));
	};

	return (
		<ExportCard fileName={fileName} rowCount={rowCount} columnCount={columnCount}>
			<Button size='sm' onClick={handleDownload} className='shrink-0 gap-1'>
				<Download className='size-3.5' />
				Download CSV
			</Button>
		</ExportCard>
	);
};

interface ExportCardProps {
	fileName: string;
	rowCount: number;
	columnCount: number;
	children: React.ReactNode;
}

const ExportCard = ({ fileName, rowCount, columnCount, children }: ExportCardProps) => (
	<div className='my-3 flex items-center justify-between gap-3 rounded-lg border bg-card/50 px-4 py-3'>
		<div className='flex min-w-0 items-center gap-3'>
			<FileSpreadsheet className='size-5 shrink-0 text-muted-foreground' />
			<div className='flex min-w-0 flex-col'>
				<span className='truncate text-sm font-medium'>{fileName}.csv</span>
				<span className='text-xs text-muted-foreground'>
					{rowCount} rows{columnCount > 0 ? ` · ${columnCount} columns` : ''}
				</span>
			</div>
		</div>
		{children}
	</div>
);
