import type { UserRole } from '@nao/shared/types';
import { and, eq, isNull } from 'drizzle-orm';

import s, { DBOrganization, DBOrgMember, NewOrganization, NewOrgMember } from '../db/abstractSchema';
import { db } from '../db/db';
import { env } from '../env';
import type { OrgRole } from '../types/organization';
import { isCloud, isSelfHosted } from '../utils/deployment-mode';
import { generateSlug } from '../utils/utils';
import * as projectQueries from './project.queries';
import * as userQueries from './user.queries';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toOrgRole(role: UserRole): OrgRole {
	return role === 'viewer' ? 'user' : role;
}

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

export const getOrganizationById = async (id: string): Promise<DBOrganization | null> => {
	const [org] = await db.select().from(s.organization).where(eq(s.organization.id, id)).execute();
	return org ?? null;
};

export const getFirstOrganization = async (): Promise<DBOrganization | null> => {
	const [org] = await db.select().from(s.organization).limit(1).execute();
	return org ?? null;
};

export const createOrganization = async (org: NewOrganization): Promise<DBOrganization> => {
	const [created] = await db.insert(s.organization).values(org).returning().execute();
	return created;
};

export const updateOrganization = async (
	orgId: string,
	values: Partial<Pick<DBOrganization, 'name' | 'slug'>>,
): Promise<DBOrganization> => {
	const [updated] = await db
		.update(s.organization)
		.set(values)
		.where(eq(s.organization.id, orgId))
		.returning()
		.execute();
	return updated;
};

export const listUserOrganizations = async (
	userId: string,
): Promise<(DBOrgMember & { organization: DBOrganization })[]> => {
	return db
		.select({
			orgId: s.orgMember.orgId,
			userId: s.orgMember.userId,
			role: s.orgMember.role,
			createdAt: s.orgMember.createdAt,
			organization: s.organization,
		})
		.from(s.orgMember)
		.innerJoin(s.organization, eq(s.orgMember.orgId, s.organization.id))
		.where(eq(s.orgMember.userId, userId))
		.execute();
};

export const listOrgMembers = async (
	orgId: string,
): Promise<{ userId: string; role: OrgRole; name: string; email: string }[]> => {
	return db
		.select({
			userId: s.orgMember.userId,
			role: s.orgMember.role,
			name: s.user.name,
			email: s.user.email,
		})
		.from(s.orgMember)
		.innerJoin(s.user, eq(s.orgMember.userId, s.user.id))
		.where(eq(s.orgMember.orgId, orgId))
		.execute();
};

// ---------------------------------------------------------------------------
// Org members
// ---------------------------------------------------------------------------

export const getOrgMember = async (orgId: string, userId: string): Promise<DBOrgMember | null> => {
	const [member] = await db
		.select()
		.from(s.orgMember)
		.where(and(eq(s.orgMember.orgId, orgId), eq(s.orgMember.userId, userId)))
		.execute();
	return member ?? null;
};

export const addOrgMember = async (member: NewOrgMember): Promise<DBOrgMember> => {
	const [created] = await db.insert(s.orgMember).values(member).returning().execute();
	return created;
};

export const removeOrgMember = async (orgId: string, userId: string): Promise<void> => {
	await db
		.delete(s.orgMember)
		.where(and(eq(s.orgMember.orgId, orgId), eq(s.orgMember.userId, userId)))
		.execute();
};

export const updateOrgMemberRole = async (orgId: string, userId: string, role: OrgRole): Promise<void> => {
	await db
		.update(s.orgMember)
		.set({ role })
		.where(and(eq(s.orgMember.orgId, orgId), eq(s.orgMember.userId, userId)))
		.execute();
};

export const getUserOrgMembership = async (
	userId: string,
): Promise<(DBOrgMember & { organization: DBOrganization }) | null> => {
	const [result] = await listUserOrganizations(userId);
	return result ?? null;
};

export const getUserRoleInOrg = async (orgId: string, userId: string): Promise<OrgRole | null> => {
	const member = await getOrgMember(orgId, userId);
	return member?.role ?? null;
};

// ---------------------------------------------------------------------------
// Google SSO config
// ---------------------------------------------------------------------------

export const updateGoogleSettings = async (
	orgId: string,
	settings: {
		googleClientId: string | null;
		googleClientSecret: string | null;
		googleAuthDomains: string | null;
	},
): Promise<DBOrganization> => {
	const [updated] = await db
		.update(s.organization)
		.set(settings)
		.where(eq(s.organization.id, orgId))
		.returning()
		.execute();
	return updated;
};

export const getGoogleConfig = async () => {
	const org = await getFirstOrganization();
	return {
		clientId: org?.googleClientId || env.GOOGLE_CLIENT_ID || '',
		clientSecret: org?.googleClientSecret || env.GOOGLE_CLIENT_SECRET || '',
		authDomains: org?.googleAuthDomains || env.GOOGLE_AUTH_DOMAINS || '',
		usingDbOverride: !!(org?.googleClientId && org?.googleClientSecret),
	};
};

export const getGoogleConfigForOrg = async (orgId: string) => {
	const org = await getOrganizationById(orgId);
	return {
		clientId: org?.googleClientId || env.GOOGLE_CLIENT_ID || '',
		clientSecret: org?.googleClientSecret || env.GOOGLE_CLIENT_SECRET || '',
		authDomains: org?.googleAuthDomains || env.GOOGLE_AUTH_DOMAINS || '',
		usingDbOverride: !!(org?.googleClientId && org?.googleClientSecret),
	};
};

// ---------------------------------------------------------------------------
// Default / personal org helpers
// ---------------------------------------------------------------------------

export const getOrCreateDefaultOrganization = async (): Promise<DBOrganization> => {
	const existing = await getFirstOrganization();
	if (existing) {
		return existing;
	}

	return createOrganization({
		name: 'Default Organization',
		slug: 'default',
	});
};

export const createPersonalOrganization = async (userId: string, userName: string): Promise<DBOrganization> => {
	const org = await createOrganization({
		name: `${userName}'s Organization`,
		slug: generateSlug(userName),
	});
	await addOrgMember({ orgId: org.id, userId, role: 'admin' });
	return org;
};

// ---------------------------------------------------------------------------
// Self-hosted bootstrap (first user + startup)
// ---------------------------------------------------------------------------

export const initializeDefaultOrganizationForFirstUser = async (userId: string): Promise<void> => {
	if (isCloud()) {
		return;
	}

	const userCount = await userQueries.countAll();
	if (userCount !== 1) {
		return;
	}

	const existingOrg = await getFirstOrganization();
	if (existingOrg) {
		return;
	}

	await db.transaction(async (tx) => {
		const [org] = await tx
			.insert(s.organization)
			.values({ name: 'Default Organization', slug: 'default' })
			.returning()
			.execute();

		await tx.insert(s.orgMember).values({ orgId: org.id, userId, role: 'admin' }).execute();

		const projectPath = process.env.NAO_DEFAULT_PROJECT_PATH;
		if (projectPath) {
			const [existingProject] = await tx
				.select()
				.from(s.project)
				.where(eq(s.project.path, projectPath))
				.execute();

			if (!existingProject) {
				const projectName = projectPath.split('/').pop() || 'Default Project';
				const [project] = await tx
					.insert(s.project)
					.values({ name: projectName, type: 'local', path: projectPath, orgId: org.id })
					.returning()
					.execute();

				await tx.insert(s.projectMember).values({ projectId: project.id, userId, role: 'admin' }).execute();
			}
		}
	});
};

export const addUserToDefaultProjectIfExists = async (userId: string): Promise<void> => {
	if (isCloud()) {
		return;
	}

	const org = await getFirstOrganization();
	if (!org) {
		return;
	}

	const project = await projectQueries.getDefaultProject();
	if (!project) {
		return;
	}

	const role = env.DEFAULT_USER_ROLE;

	await db.transaction(async (tx) => {
		const existingOrgMember = await tx.query.orgMember.findFirst({
			where: and(eq(s.orgMember.orgId, org.id), eq(s.orgMember.userId, userId)),
		});
		if (!existingOrgMember) {
			await tx.insert(s.orgMember).values({ orgId: org.id, userId, role }).execute();
		}

		const existingProjectMember = await tx.query.projectMember.findFirst({
			where: and(eq(s.projectMember.projectId, project.id), eq(s.projectMember.userId, userId)),
		});
		if (!existingProjectMember) {
			await tx.insert(s.projectMember).values({ projectId: project.id, userId, role }).execute();
		}
	});
};

// ---------------------------------------------------------------------------
// Cloud-mode: accept pending invitations on signup
// ---------------------------------------------------------------------------

export const acceptPendingInvitationsForUser = async (userId: string, email: string): Promise<void> => {
	const pendingInvitations = await db
		.select()
		.from(s.invitation)
		.where(and(eq(s.invitation.email, email.toLowerCase()), eq(s.invitation.status, 'pending')))
		.execute();

	for (const inv of pendingInvitations) {
		await db.transaction(async (tx) => {
			const existingOrgMember = await tx.query.orgMember.findFirst({
				where: and(eq(s.orgMember.orgId, inv.orgId), eq(s.orgMember.userId, userId)),
			});
			if (!existingOrgMember) {
				await tx
					.insert(s.orgMember)
					.values({ orgId: inv.orgId, userId, role: toOrgRole(inv.role) })
					.execute();
			}

			if (inv.projectId) {
				const existingProjectMember = await tx.query.projectMember.findFirst({
					where: and(eq(s.projectMember.projectId, inv.projectId), eq(s.projectMember.userId, userId)),
				});
				if (!existingProjectMember) {
					await tx
						.insert(s.projectMember)
						.values({ projectId: inv.projectId, userId, role: inv.role })
						.execute();
				}
			}

			await tx.update(s.invitation).set({ status: 'accepted' }).where(eq(s.invitation.id, inv.id)).execute();
		});
	}
};

// ---------------------------------------------------------------------------
// Startup setup
// ---------------------------------------------------------------------------

export const ensureOrganizationSetup = async (): Promise<void> => {
	if (isCloud()) {
		return;
	}

	const firstUser = await userQueries.getFirst();
	if (!firstUser) {
		return;
	}

	let org = await getFirstOrganization();

	if (!org) {
		org = await createOrganization({ name: 'Default Organization', slug: 'default' });
		await addOrgMember({ orgId: org.id, userId: firstUser.id, role: 'admin' });
	}

	const membership = await getOrgMember(org.id, firstUser.id);
	if (!membership) {
		await addOrgMember({ orgId: org.id, userId: firstUser.id, role: 'admin' });
	}

	await db.update(s.project).set({ orgId: org.id }).where(isNull(s.project.orgId)).execute();
	await ensureDefaultProject(org);
};

const ensureDefaultProject = async (org: DBOrganization): Promise<void> => {
	if (!isSelfHosted()) {
		return;
	}

	const projectPath = env.NAO_DEFAULT_PROJECT_PATH;
	if (!projectPath) {
		return;
	}

	const existing = await projectQueries.getProjectByPath(projectPath);
	if (existing) {
		return;
	}

	const projectName = projectPath.split('/').pop() || 'Default Project';
	const project = await projectQueries.createProject({
		name: projectName,
		type: 'local',
		path: projectPath,
		orgId: org.id,
	});

	const orgMembers = await db.select().from(s.orgMember).where(eq(s.orgMember.orgId, org.id)).execute();
	for (const member of orgMembers) {
		await projectQueries.addProjectMember({
			projectId: project.id,
			userId: member.userId,
			role: member.role,
		});
	}
};
