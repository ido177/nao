import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/main';
import { useIsCloud } from '@/hooks/use-deployment-mode';
import { getActiveProjectId, setActiveProjectId } from '@/lib/active-project';

interface OrgSummary {
	id: string;
	name: string;
	slug: string;
	role: string;
}

interface ActiveProjectContextValue {
	orgs: OrgSummary[];
	activeOrgId: string | null;
	activeProjectId: string | null;
	setActiveOrg: (orgId: string) => void;
	setActiveProject: (projectId: string) => void;
}

const ActiveProjectContext = createContext<ActiveProjectContextValue>({
	orgs: [],
	activeOrgId: null,
	activeProjectId: null,
	setActiveOrg: () => {},
	setActiveProject: () => {},
});

export function useActiveProject() {
	return useContext(ActiveProjectContext);
}

export function ActiveProjectProvider({ children }: { children: React.ReactNode }) {
	const isCloud = useIsCloud();
	const orgsQuery = useQuery({
		...trpc.organization.list.queryOptions(),
		enabled: isCloud,
	});

	const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() => localStorage.getItem('nao-active-org-id'));

	const [projectId, setProjectIdState] = useState<string | null>(() => getActiveProjectId());

	const orgs = useMemo(() => orgsQuery.data ?? [], [orgsQuery.data]);

	useEffect(() => {
		if (!isCloud || orgs.length === 0) {
			return;
		}
		if (activeOrgId && orgs.some((o) => o.id === activeOrgId)) {
			return;
		}
		setActiveOrgIdState(orgs[0].id);
		localStorage.setItem('nao-active-org-id', orgs[0].id);
	}, [isCloud, orgs, activeOrgId]);

	const setActiveOrg = useCallback((orgId: string) => {
		setActiveOrgIdState(orgId);
		localStorage.setItem('nao-active-org-id', orgId);
		setProjectIdState(null);
		setActiveProjectId(null);
	}, []);

	const setActiveProject = useCallback((id: string) => {
		setProjectIdState(id);
		setActiveProjectId(id);
	}, []);

	const value = useMemo(
		() => ({
			orgs,
			activeOrgId,
			activeProjectId: projectId,
			setActiveOrg,
			setActiveProject,
		}),
		[orgs, activeOrgId, projectId, setActiveOrg, setActiveProject],
	);

	return <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>;
}
