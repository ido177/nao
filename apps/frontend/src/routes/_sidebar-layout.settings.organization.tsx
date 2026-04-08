import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Building2, Mail, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsCard, SettingsPageWrapper } from '@/components/ui/settings-card';
import { useActiveProject } from '@/contexts/active-project';
import { trpc, trpcClient } from '@/main';

export const Route = createFileRoute('/_sidebar-layout/settings/organization')({
	component: OrganizationSettingsPage,
});

function OrganizationSettingsPage() {
	const { activeOrgId } = useActiveProject();

	if (!activeOrgId) {
		return (
			<SettingsPageWrapper>
				<p className='text-muted-foreground text-sm'>No organization selected.</p>
			</SettingsPageWrapper>
		);
	}

	return (
		<SettingsPageWrapper>
			<OrgMembers orgId={activeOrgId} />
			<OrgInvitations orgId={activeOrgId} />
		</SettingsPageWrapper>
	);
}

function OrgMembers({ orgId }: { orgId: string }) {
	const membersQuery = useQuery(trpc.organization.listMembers.queryOptions({ orgId }));
	const queryClient = useQueryClient();

	const removeMember = useMutation({
		mutationFn: (userId: string) => trpcClient.organization.removeMember.mutate({ orgId, userId }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: trpc.organization.listMembers.queryOptions({ orgId }).queryKey,
			}),
	});

	return (
		<SettingsCard
			icon={<Building2 className='size-4' />}
			title='Organization Members'
			description='Manage who has access to this organization.'
		>
			<div className='flex flex-col gap-2'>
				{membersQuery.data?.map((member) => (
					<div key={member.userId} className='flex items-center justify-between py-2'>
						<div className='flex flex-col'>
							<span className='text-sm font-medium'>{member.name}</span>
							<span className='text-xs text-muted-foreground'>{member.email}</span>
						</div>
						<div className='flex items-center gap-2'>
							<span className='text-xs bg-muted px-2 py-0.5 rounded-full capitalize'>{member.role}</span>
							<Button
								variant='ghost'
								size='icon-sm'
								onClick={() => removeMember.mutate(member.userId)}
								disabled={removeMember.isPending}
							>
								<Trash2 className='size-3.5 text-destructive' />
							</Button>
						</div>
					</div>
				))}
			</div>
		</SettingsCard>
	);
}

function OrgInvitations({ orgId }: { orgId: string }) {
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<'admin' | 'user'>('user');
	const queryClient = useQueryClient();

	const invitationsQuery = useQuery(trpc.invitation.listForOrg.queryOptions({ orgId }));

	const sendInvite = useMutation({
		mutationFn: () => trpcClient.invitation.send.mutate({ orgId, email, role }),
		onSuccess: () => {
			setEmail('');
			queryClient.invalidateQueries({
				queryKey: trpc.invitation.listForOrg.queryOptions({ orgId }).queryKey,
			});
		},
	});

	const revokeInvite = useMutation({
		mutationFn: (invitationId: string) => trpcClient.invitation.revoke.mutate({ orgId, invitationId }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: trpc.invitation.listForOrg.queryOptions({ orgId }).queryKey,
			}),
	});

	return (
		<SettingsCard
			icon={<UserPlus className='size-4' />}
			title='Invitations'
			description='Invite users to your organization.'
		>
			<div className='flex gap-2'>
				<Input
					placeholder='Email address'
					type='email'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className='flex-1'
				/>
				<select
					value={role}
					onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
					className='border border-border rounded-md px-2 text-sm bg-background'
				>
					<option value='user'>User</option>
					<option value='admin'>Admin</option>
				</select>
				<Button onClick={() => sendInvite.mutate()} disabled={!email || sendInvite.isPending} size='sm'>
					<Mail className='size-4 mr-1' />
					Invite
				</Button>
			</div>

			{invitationsQuery.data && invitationsQuery.data.length > 0 && (
				<div className='flex flex-col gap-2 mt-4'>
					<h4 className='text-xs font-medium text-muted-foreground uppercase'>Pending Invitations</h4>
					{invitationsQuery.data.map((inv) => (
						<div key={inv.id} className='flex items-center justify-between py-1'>
							<div className='flex flex-col'>
								<span className='text-sm'>{inv.email}</span>
								<span className='text-xs text-muted-foreground capitalize'>
									{inv.role} &middot; {inv.scope}
								</span>
							</div>
							<Button
								variant='ghost'
								size='icon-sm'
								onClick={() => revokeInvite.mutate(inv.id)}
								disabled={revokeInvite.isPending}
							>
								<Trash2 className='size-3.5 text-destructive' />
							</Button>
						</div>
					))}
				</div>
			)}
		</SettingsCard>
	);
}
