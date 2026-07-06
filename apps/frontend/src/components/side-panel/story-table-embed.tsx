import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UIMessage } from '@nao/backend/chat';
import type { ParsedTableBlock } from '@nao/shared/story-segments';

import { TableDisplay } from '@/components/tool-calls/display-table';
import { useOptionalAgentContext } from '@/contexts/agent.provider';
import { useChatId } from '@/hooks/use-chat-id';
import { trpc } from '@/main';

export const StoryTableEmbed = memo(function StoryTableEmbed({ table }: { table: ParsedTableBlock }) {
	const agent = useOptionalAgentContext();
	const chatId = useChatId();

	const previewData = useMemo(() => {
		const findInMessages = (messages: UIMessage[]) => {
			for (const message of messages) {
				for (const part of message.parts) {
					if (part.type === 'tool-execute_sql' && part.output?.id === table.queryId) {
						return part.output;
					}
				}
			}
			return null;
		};

		return findInMessages(agent?.messages ?? []);
	}, [agent?.messages, table.queryId]);

	const { data: serverData } = useQuery({
		...trpc.queryResult.getData.queryOptions({ chatId: chatId ?? '', queryId: table.queryId }),
		enabled: !!chatId && !!table.queryId,
		staleTime: Infinity,
	});

	const sourceData = serverData ?? previewData;

	if (!sourceData?.data || !Array.isArray(sourceData.data)) {
		return (
			<div className='my-2 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>
				Table data unavailable (query: {table.queryId})
			</div>
		);
	}

	return (
		<TableDisplay
			data={sourceData.data as Record<string, unknown>[]}
			columns={sourceData.columns}
			title={table.title}
			tableContainerClassName='max-h-[28rem]'
		/>
	);
});
