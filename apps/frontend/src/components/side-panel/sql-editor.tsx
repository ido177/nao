import { Editor } from '@monaco-editor/react';
import { useQuery } from '@tanstack/react-query';
import { ResizableSeparator, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import type { executeSql } from '@nao/shared/tools';
import { TableDisplay } from '@/components/tool-calls/display-table';
import { useChatId } from '@/hooks/use-chat-id';
import { formatSQL } from '@/lib/sql-formatter';
import { trpc } from '@/main';

export const SidePanelContent = ({ input, output }: { input: executeSql.Input; output: executeSql.Output }) => {
	const chatId = useChatId();

	// Load the full result on demand; the message only carries a bounded preview.
	const { data: serverData } = useQuery({
		...trpc.queryResult.getData.queryOptions({ chatId: chatId ?? '', queryId: output.id }),
		enabled: !!chatId && !!output.id && !!output.truncated,
		staleTime: Infinity,
	});

	const rows = (serverData?.data ?? output.data) as Record<string, unknown>[];
	const columns = serverData?.columns ?? output.columns;

	return (
		<ResizablePanelGroup orientation='vertical' defaultLayout={{ sql: 1 / 4, results: 1 }}>
			<ResizablePanel id='sql' minSize={100} className='relative w-full group'>
				<div className='w-full h-full overflow-auto [&_span]:font-mono pl-2'>
					<Editor
						value={formatSQL(input.sql_query, output.dialect)}
						language='sql'
						theme='light'
						options={{
							minimap: {
								enabled: false,
							},
							folding: false,
							lineNumbers: 'off',
							scrollbar: {
								horizontal: 'hidden',
								vertical: 'hidden',
							},
							scrollBeyondLastLine: false,
							padding: {
								top: 16,
								bottom: 16,
							},
							wordWrap: 'on',
						}}
					/>
				</div>
			</ResizablePanel>

			<ResizableSeparator withHandle />

			<ResizablePanel id='results' minSize={100}>
				<TableDisplay
					data={rows}
					columns={columns}
					className='h-full'
					tableContainerClassName='flex-1 rounded-none border-0'
					emptyLabel='No rows returned'
					maxRowsBeforePagination={100}
				/>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
};
