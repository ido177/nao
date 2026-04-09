import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';

import { trpc } from '@/main';
import { SettingsCard, SettingsPageWrapper } from '@/components/ui/settings-card';
import { OrgMembersList } from '@/components/settings/org-members-list';
import { OrgApiKeys } from '@/components/settings/org-api-keys';
import { AddOrgMemberDialog } from '@/components/settings/add-org-member-form';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_sidebar-layout/settings/organization')({
	component: OrganizationPage,
});

function OrganizationPage() {
	const org = useQuery(trpc.organization.get.queryOptions());
	const [isAddOpen, setIsAddOpen] = useState(false);

	const isAdmin = org.data?.role === 'admin';

	return (
		<SettingsPageWrapper>
			<div className='flex flex-col gap-5'>
				<h1 className='text-lg font-semibold text-foreground'>{org.data?.name ?? 'Organization'}</h1>
				<SettingsCard
					title='Members'
					description='Manage the members of your organization.'
					divide
					action={
						isAdmin ? (
							<Button variant='secondary' size='sm' onClick={() => setIsAddOpen(true)}>
								<Plus />
								Add Member
							</Button>
						) : undefined
					}
				>
					<OrgMembersList isAdmin={isAdmin} />
				</SettingsCard>
				<OrgApiKeys isAdmin={isAdmin} />
			</div>
			<AddOrgMemberDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
		</SettingsPageWrapper>
	);
}
