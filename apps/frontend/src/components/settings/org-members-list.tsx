import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { EllipsisVertical } from 'lucide-react';

import { trpc } from '@/main';
import { useSession } from '@/lib/auth-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface OrgMembersListProps {
	isAdmin: boolean;
}

export function OrgMembersList({ isAdmin }: OrgMembersListProps) {
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const members = useQuery(trpc.organization.getMembers.queryOptions());
	const invites = useQuery(trpc.organization.getInvites.queryOptions());

	const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string } | null>(null);
	const [error, setError] = useState('');

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: trpc.organization.getMembers.queryKey() });
		queryClient.invalidateQueries({ queryKey: trpc.organization.getInvites.queryKey() });
	};

	const updateRole = useMutation(
		trpc.organization.updateMemberRole.mutationOptions({
			onSuccess: invalidateAll,
			onError: (err) => setError(err.message),
		}),
	);

	const removeMember = useMutation(
		trpc.organization.removeMember.mutationOptions({
			onSuccess: () => {
				invalidateAll();
				setConfirmRemove(null);
			},
			onError: (err) => setError(err.message),
		}),
	);

	const cancelInvite = useMutation(
		trpc.organization.cancelInvite.mutationOptions({
			onSuccess: invalidateAll,
			onError: (err) => setError(err.message),
		}),
	);

	if (members.isLoading) {
		return <div className='text-sm text-muted-foreground'>Loading members...</div>;
	}

	const hasMembers = members.data && members.data.length > 0;
	const hasInvites = invites.data && invites.data.length > 0;

	if (!hasMembers && !hasInvites) {
		return <div className='text-sm text-muted-foreground'>No members found.</div>;
	}

	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Role</TableHead>
						{isAdmin && <TableHead className='w-0' />}
					</TableRow>
				</TableHeader>
				<TableBody>
					{members.data?.map((member) => {
						const isCurrentUser = member.userId === session?.user?.id;
						return (
							<TableRow key={member.userId}>
								<TableCell className='font-medium'>
									{member.name}
									{isCurrentUser && <span className='text-muted-foreground ml-1'>(you)</span>}
								</TableCell>
								<TableCell className='font-mono text-muted-foreground'>{member.email}</TableCell>
								<TableCell>
									<Badge variant={member.role}>{member.role}</Badge>
								</TableCell>
								{isAdmin && (
									<TableCell className='w-0'>
										{!isCurrentUser && (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant='ghost' size='icon-sm'>
														<EllipsisVertical className='size-4' />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent onClick={(e) => e.stopPropagation()}>
													<DropdownMenuGroup>
														{member.role !== 'admin' && (
															<DropdownMenuItem
																onSelect={() => {
																	setError('');
																	updateRole.mutate({
																		userId: member.userId,
																		role: 'admin',
																	});
																}}
															>
																Make admin
															</DropdownMenuItem>
														)}
														{member.role !== 'user' && (
															<DropdownMenuItem
																onSelect={() => {
																	setError('');
																	updateRole.mutate({
																		userId: member.userId,
																		role: 'user',
																	});
																}}
															>
																Make user
															</DropdownMenuItem>
														)}
														<DropdownMenuItem
															className='text-destructive'
															onSelect={() => {
																setError('');
																setConfirmRemove({
																	userId: member.userId,
																	name: member.name,
																});
															}}
														>
															Remove from organization
														</DropdownMenuItem>
													</DropdownMenuGroup>
												</DropdownMenuContent>
											</DropdownMenu>
										)}
									</TableCell>
								)}
							</TableRow>
						);
					})}

					{hasInvites &&
						invites.data.map((invite) => (
							<TableRow key={invite.id} className='opacity-60'>
								<TableCell className='font-medium italic text-muted-foreground'>
									Pending invite
								</TableCell>
								<TableCell className='font-mono text-muted-foreground'>{invite.email}</TableCell>
								<TableCell>
									<Badge variant='outline'>invited</Badge>
								</TableCell>
								{isAdmin && (
									<TableCell className='w-0'>
										<Button
											variant='ghost'
											size='sm'
											className='text-destructive text-xs'
											onClick={() => {
												setError('');
												cancelInvite.mutate({ inviteId: invite.id });
											}}
										>
											Revoke
										</Button>
									</TableCell>
								)}
							</TableRow>
						))}
				</TableBody>
			</Table>

			{error && <p className='text-red-500 text-center text-sm'>{error}</p>}

			<Dialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove {confirmRemove?.name} from organization?</DialogTitle>
					</DialogHeader>
					<p className='text-sm text-muted-foreground'>
						This will remove the user from the organization. They will lose access to all projects within
						it.
					</p>
					{error && <p className='text-red-500 text-center text-sm'>{error}</p>}
					<div className='flex justify-end gap-2'>
						<Button variant='outline' onClick={() => setConfirmRemove(null)}>
							Cancel
						</Button>
						<Button
							variant='destructive'
							onClick={() => {
								if (confirmRemove) {
									removeMember.mutate({ userId: confirmRemove.userId });
								}
							}}
						>
							Remove
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
