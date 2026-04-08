import { Link } from '@tanstack/react-router';
import { cn, hideIf } from '@/lib/utils';
import { useIsCloud } from '@/hooks/use-deployment-mode';

type NavItemVisibility = 'always' | 'admin' | 'cloud' | 'cloud-admin';

interface NavItem {
	label: string;
	to: string;
	visibility: NavItemVisibility;
}

const settingsNavItems: NavItem[] = [
	{ label: 'General', to: '/settings/general', visibility: 'always' },
	{ label: 'Memory', to: '/settings/memory', visibility: 'always' },
	{ label: 'Organization', to: '/settings/organization', visibility: 'cloud' },
	{ label: 'Project', to: '/settings/project', visibility: 'always' },
	{ label: 'Usage & costs', to: '/settings/usage', visibility: 'admin' },
	{ label: 'Chats Replay', to: '/settings/chats-replay', visibility: 'admin' },
	{ label: 'Logs', to: '/settings/logs', visibility: 'admin' },
	{ label: 'File Explorer', to: '/settings/context-explorer', visibility: 'admin' },
];

function isItemVisible(item: NavItem, isAdmin: boolean, isCloudMode: boolean): boolean {
	switch (item.visibility) {
		case 'always':
			return true;
		case 'admin':
			return isAdmin;
		case 'cloud':
			return isCloudMode;
		case 'cloud-admin':
			return isCloudMode && isAdmin;
	}
}

interface SidebarSettingsNavProps {
	isCollapsed: boolean;
	isAdmin: boolean;
}

export function SidebarSettingsNav({ isCollapsed, isAdmin }: SidebarSettingsNavProps) {
	const isCloudMode = useIsCloud();
	const navItems = settingsNavItems.filter((item) => isItemVisible(item, isAdmin, isCloudMode));

	return (
		<nav className={cn('flex flex-col gap-1 px-2', hideIf(isCollapsed))}>
			{navItems.map((item) => (
				<Link
					key={item.to}
					to={item.to}
					className={cn(
						'flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap',
					)}
					activeProps={{
						className: cn('bg-sidebar-accent text-foreground font-medium'),
					}}
					inactiveProps={{
						className: cn('hover:bg-sidebar-accent hover:text-foreground'),
					}}
				>
					{item.label}
				</Link>
			))}
		</nav>
	);
}
