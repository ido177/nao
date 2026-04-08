let activeProjectId: string | null = null;

export function getActiveProjectId(): string | null {
	return activeProjectId;
}

export function setActiveProjectId(id: string | null) {
	activeProjectId = id;
	if (id) {
		localStorage.setItem('nao-active-project-id', id);
	} else {
		localStorage.removeItem('nao-active-project-id');
	}
}

export function restoreActiveProjectId(): string | null {
	const stored = localStorage.getItem('nao-active-project-id');
	if (stored) {
		activeProjectId = stored;
	}
	return activeProjectId;
}

restoreActiveProjectId();
