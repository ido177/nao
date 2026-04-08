import { useCallback } from 'react';
import { Building2, ChevronsUpDown, Plus } from 'lucide-react';
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

interface OrgSwitcherProps {
	isCollapsed: boolean;
}

export function OrgSwitcher({ isCollapsed }: OrgSwitcherProps) {
	const { orgs, activeOrgId, setActiveOrg } = useActiveProject();
	const activeOrg = orgs.find((o) => o.id === activeOrgId);

	const handleSelect = useCallback(
		(orgId: string) => {
			setActiveOrg(orgId);
		},
		[setActiveOrg],
	);

	if (orgs.length === 0) {
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
					<Building2 className='size-4 shrink-0' />
					{!isCollapsed && (
						<>
							<span className='truncate text-sm font-medium'>{activeOrg?.name ?? 'Select org'}</span>
							<ChevronsUpDown className='ml-auto size-3.5 text-muted-foreground shrink-0' />
						</>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' className='w-56'>
				{orgs.map((org) => (
					<DropdownMenuItem
						key={org.id}
						onSelect={() => handleSelect(org.id)}
						className={cn(org.id === activeOrgId && 'bg-accent')}
					>
						<Building2 className='mr-2 size-4' />
						<span className='truncate'>{org.name}</span>
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<Plus className='mr-2 size-4' />
					Create organization
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
