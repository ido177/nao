import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SettingsCard } from '@/components/ui/settings-card';
import { Empty } from '@/components/ui/empty';
import { trpc } from '@/main';

export function OrgApiKeys({ isAdmin }: { isAdmin: boolean }) {
	const [showCreate, setShowCreate] = useState(false);
	const [newKeyName, setNewKeyName] = useState('');
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [revokeId, setRevokeId] = useState<string | null>(null);

	const queryClient = useQueryClient();
	const keys = useQuery(trpc.apiKey.list.queryOptions());

	const createMutation = useMutation(
		trpc.apiKey.create.mutationOptions({
			onSuccess: (data) => {
				setCreatedKey(data.plaintext);
				setNewKeyName('');
				queryClient.invalidateQueries({ queryKey: trpc.apiKey.list.queryKey() });
			},
		}),
	);

	const revokeMutation = useMutation(
		trpc.apiKey.revoke.mutationOptions({
			onSuccess: () => {
				setRevokeId(null);
				queryClient.invalidateQueries({ queryKey: trpc.apiKey.list.queryKey() });
			},
		}),
	);

	const handleCreate = () => {
		if (!newKeyName.trim()) {
			return;
		}
		createMutation.mutate({ name: newKeyName.trim() });
	};

	const handleCopy = async (text: string) => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleCloseCreated = () => {
		setCreatedKey(null);
		setShowCreate(false);
	};

	return (
		<>
			<SettingsCard
				title='API Keys'
				description='API keys allow the nao CLI to deploy project context to this instance.'
				divide
				action={
					isAdmin ? (
						<Button variant='secondary' size='sm' onClick={() => setShowCreate(true)}>
							<Plus className='size-4' />
							Generate Key
						</Button>
					) : undefined
				}
			>
				{keys.data?.length ? (
					<div className='divide-y divide-border'>
						{keys.data.map((key) => (
							<div key={key.id} className='flex items-center justify-between py-3 px-1'>
								<div className='flex items-center gap-3 min-w-0'>
									<KeyRound className='size-4 text-muted-foreground shrink-0' />
									<div className='min-w-0'>
										<p className='text-sm font-medium truncate'>{key.name}</p>
										<p className='text-xs text-muted-foreground'>
											{key.keyPrefix}...
											{' · '}
											Created {new Date(key.createdAt).toLocaleDateString()}
											{key.lastUsedAt && (
												<>
													{' · '}
													Last used {new Date(key.lastUsedAt).toLocaleDateString()}
												</>
											)}
										</p>
									</div>
								</div>
								{isAdmin && (
									<Button
										variant='ghost'
										size='sm'
										className='text-destructive hover:text-destructive shrink-0'
										onClick={() => setRevokeId(key.id)}
									>
										<Trash2 className='size-4' />
									</Button>
								)}
							</div>
						))}
					</div>
				) : (
					<Empty>No API keys yet. Generate one to use with nao deploy.</Empty>
				)}
			</SettingsCard>

			<Dialog open={showCreate && !createdKey} onOpenChange={(open) => !open && setShowCreate(false)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Generate API Key</DialogTitle>
						<DialogDescription>Give this key a name to help you identify it later.</DialogDescription>
					</DialogHeader>
					<Input
						placeholder='e.g. CI/CD Pipeline'
						value={newKeyName}
						onChange={(e) => setNewKeyName(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
						autoFocus
					/>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant='outline'>Cancel</Button>
						</DialogClose>
						<Button onClick={handleCreate} disabled={!newKeyName.trim() || createMutation.isPending}>
							{createMutation.isPending ? 'Generating...' : 'Generate'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!createdKey} onOpenChange={(open) => !open && handleCloseCreated()}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>API Key Created</DialogTitle>
						<DialogDescription>Copy this key now. You won't be able to see it again.</DialogDescription>
					</DialogHeader>
					<div className='flex items-center gap-2'>
						<code className='flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all'>
							{createdKey}
						</code>
						<Button variant='outline' size='sm' onClick={() => createdKey && handleCopy(createdKey)}>
							<Copy className='size-4' />
							{copied ? 'Copied!' : 'Copy'}
						</Button>
					</div>
					<p className='text-xs text-muted-foreground'>
						Use this key with:{' '}
						<code className='text-xs'>
							nao deploy --url https://your-instance --api-key {createdKey?.slice(0, 12)}...
						</code>
					</p>
					<DialogFooter>
						<Button onClick={handleCloseCreated}>Done</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Revoke API Key</DialogTitle>
						<DialogDescription>
							This action cannot be undone. Any deployments using this key will stop working.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant='outline'>Cancel</Button>
						</DialogClose>
						<Button
							variant='destructive'
							onClick={() => revokeId && revokeMutation.mutate({ id: revokeId })}
							disabled={revokeMutation.isPending}
						>
							{revokeMutation.isPending ? 'Revoking...' : 'Revoke Key'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
