import { TRPCError } from '@trpc/server';
import { z } from 'zod/v4';

import * as orgQueries from '../queries/organization.queries';
import * as userQueries from '../queries/user.queries';
import { ORG_ROLES } from '../types/organization';
import { protectedProcedure } from './trpc';

const orgAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
	const membership = await orgQueries.getUserOrgMembership(ctx.user.id);
	if (!membership) {
		throw new TRPCError({ code: 'NOT_FOUND', message: 'You are not a member of any organization' });
	}

	return next({ ctx: { org: membership.organization, orgRole: membership.role } });
});

const orgAdminOnlyProcedure = orgAdminProcedure.use(async ({ ctx, next }) => {
	if (ctx.orgRole !== 'admin') {
		throw new TRPCError({ code: 'FORBIDDEN', message: 'Only organization admins can perform this action' });
	}
	return next({ ctx });
});

export const organizationRoutes = {
	get: orgAdminProcedure.query(async ({ ctx }) => ({
		id: ctx.org.id,
		name: ctx.org.name,
		role: ctx.orgRole,
	})),

	getMembers: orgAdminProcedure.query(async ({ ctx }) => {
		return orgQueries.getOrgMembersWithUsers(ctx.org.id);
	}),

	updateMemberRole: orgAdminOnlyProcedure
		.input(z.object({ userId: z.string(), role: z.enum(ORG_ROLES) }))
		.mutation(async ({ input, ctx }) => {
			if (input.role !== 'admin') {
				const adminCount = await orgQueries.countOrgAdmins(ctx.org.id);
				const isTargetCurrentAdmin = await orgQueries.getUserRoleInOrg(ctx.org.id, input.userId);
				if (isTargetCurrentAdmin === 'admin' && adminCount <= 1) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'The organization must have at least one admin.',
					});
				}
			}
			await orgQueries.updateOrgMemberRole(ctx.org.id, input.userId, input.role);
		}),

	addMember: orgAdminOnlyProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input, ctx }) => {
		const email = input.email.toLowerCase();
		const user = await userQueries.get({ email });

		if (user) {
			const existing = await orgQueries.getOrgMember(ctx.org.id, user.id);
			if (existing) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'User is already a member of this organization.' });
			}
			await orgQueries.addOrgMember({ orgId: ctx.org.id, userId: user.id, role: 'user' });
			return { status: 'added' as const, email };
		}

		const existingInvites = await orgQueries.getOrgInvitesByOrg(ctx.org.id);
		if (existingInvites.some((inv) => inv.email === email)) {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'An invite for this email already exists.' });
		}

		await orgQueries.createOrgInvite(ctx.org.id, email, 'user', ctx.user.id);
		return { status: 'invited' as const, email };
	}),

	getInvites: orgAdminProcedure.query(async ({ ctx }) => {
		return orgQueries.getOrgInvitesByOrg(ctx.org.id);
	}),

	cancelInvite: orgAdminOnlyProcedure.input(z.object({ inviteId: z.string() })).mutation(async ({ input }) => {
		await orgQueries.deleteOrgInvite(input.inviteId);
	}),

	removeMember: orgAdminOnlyProcedure.input(z.object({ userId: z.string() })).mutation(async ({ input, ctx }) => {
		if (input.userId === ctx.user.id) {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot remove yourself from the organization.' });
		}

		const adminCount = await orgQueries.countOrgAdmins(ctx.org.id);
		const targetRole = await orgQueries.getUserRoleInOrg(ctx.org.id, input.userId);
		if (targetRole === 'admin' && adminCount <= 1) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Cannot remove the last admin from the organization.',
			});
		}

		await orgQueries.removeOrgMember(ctx.org.id, input.userId);
	}),
};
