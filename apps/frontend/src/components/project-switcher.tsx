import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown, FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActiveProject } from '@/contexts/active-project';
import { cn } from '@/lib/utils';
import { trpc } from '@/main';

interface ProjectSwitcherProps {
	isCollapsed: boolean;
}

export function ProjectSwitcher({ isCollapsed }: ProjectSwitcherProps) {
	const { activeOrgId, activeProjectId, setActiveProject } = useActiveProject();

	const projectsQuery = useQuery({
		...trpc.organization.listProjects.queryOptions({ orgId: activeOrgId ?? '' }),
		enabled: !!activeOrgId,
	});

	const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
	const activeProject = projects.find((p) => p.id === activeProjectId);

	useEffect(() => {
		if (projects.length > 0 && !activeProject) {
			setActiveProject(projects[0].id);
		}
	}, [projects, activeProject, setActiveProject]);

	const handleSelect = useCallback(
		(projectId: string) => {
			setActiveProject(projectId);
		},
		[setActiveProject],
	);

	if (!activeOrgId) {
		return null;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					className={cn(
						'w-full justify-start gap-2 px-2 py-1.5 h-auto',
						isCollapsed && 'justify-center px-0',
					)}
				>
					<FolderOpen className='size-4 shrink-0' />
					{!isCollapsed && (
						<>
							<span className='truncate text-sm'>{activeProject?.name ?? 'Select project'}</span>
							<ChevronsUpDown className='ml-auto size-3.5 text-muted-foreground shrink-0' />
						</>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' className='w-56'>
				{projects.length === 0 ? (
					<DropdownMenuItem disabled>
						<span className='text-muted-foreground'>No projects yet</span>
					</DropdownMenuItem>
				) : (
					projects.map((project) => (
						<DropdownMenuItem
							key={project.id}
							onSelect={() => handleSelect(project.id)}
							className={cn(project.id === activeProjectId && 'bg-accent')}
						>
							<FolderOpen className='mr-2 size-4' />
							<span className='truncate'>{project.name}</span>
						</DropdownMenuItem>
					))
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<Plus className='mr-2 size-4' />
					Create project
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
