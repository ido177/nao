import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { OrgApiKeys } from '@/components/settings/org-api-keys';
import { SettingsProjectNav } from '@/components/settings/project-nav';
import { trpc } from '@/main';
import { SettingsCard, SettingsPageWrapper } from '@/components/ui/settings-card';
import { Empty } from '@/components/ui/empty';

export const Route = createFileRoute('/_sidebar-layout/settings/project')({
	component: ProjectPage,
});

function ProjectPage() {
	const project = useQuery(trpc.project.getCurrent.queryOptions());
	const config = useQuery(trpc.system.getPublicConfig.queryOptions());
	const org = useQuery({
		...trpc.organization.get.queryOptions(),
		enabled: !project.data,
	});
	const isCloud = config.data?.naoMode === 'cloud';
	const isProjectlessOrgAdmin = !project.data && isCloud && org.data?.role === 'admin';

	const emptyMessage = isCloud
		? 'No project found. Create a project or ask your organization admin to add you to one.'
		: 'No project configured. Set NAO_DEFAULT_PROJECT_PATH environment variable.';

	return (
		<SettingsPageWrapper>
			<div className='flex flex-col gap-5'>
				<h1 className='text-lg font-semibold text-foreground'>Project Settings</h1>
				<div className='flex flex-row gap-6'>
					<div className='flex flex-col items-start gap-2'>{project.data && <SettingsProjectNav />}</div>

					<div className='flex flex-col gap-12 flex-1 min-w-0 mb-4'>
						{project.data ? (
							<Outlet />
						) : isProjectlessOrgAdmin ? (
							<ProjectlessOrgAdminState />
						) : (
							<SettingsCard>
								<Empty>{emptyMessage}</Empty>
							</SettingsCard>
						)}
					</div>
				</div>
			</div>
		</SettingsPageWrapper>
	);
}

function ProjectlessOrgAdminState() {
	const deployUrl = typeof window === 'undefined' ? '' : window.location.origin;

	return (
		<div className='flex flex-col gap-6'>
			<SettingsCard
				title='Deploy your first project'
				description='This organization does not have a project yet.'
			>
				<div className='space-y-3 text-sm text-muted-foreground'>
					<p>
						Use <code>nao deploy</code> to send a local project context to this nao instance. The command
						packages your project, uploads it, and creates the first cloud project for your organization.
					</p>
					<p>
						Run it from the directory that contains <code>nao_config.yaml</code>, or add{' '}
						<code>--path /path/to/project</code> if you want to deploy from somewhere else.
					</p>
				</div>
			</SettingsCard>

			<OrgApiKeys
				isAdmin
				deployUrl={deployUrl}
				title='Generate a deploy key'
				description='Create an organization API key and copy the exact command you can run to deploy your first project.'
			/>
		</div>
	);
}
