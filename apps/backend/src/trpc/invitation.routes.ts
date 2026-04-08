import { TRPCError } from '@trpc/server';
import { z } from 'zod/v4';

import * as invitationQueries from '../queries/invitation.queries';
import * as orgQueries from '../queries/organization.queries';
import * as projectQueries from '../queries/project.queries';
import { emailService } from '../services/email';
import type { OrgRole } from '../types/organization';
import { buildInvitationEmail } from '../utils/email-builders';
import { orgAdminProcedure, protectedProcedure } from './trpc';

function toOrgRole(role: string): OrgRole {
	return role === 'viewer' ? 'user' : (role as OrgRole);
}

export const invitationRoutes = {
	send: orgAdminProcedure
		.input(
			z.object({
				orgId: z.string(),
				email: z.string().email(),
				role: z.enum(['admin', 'user', 'viewer']),
				projectId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const scope = input.projectId ? 'project' : 'org';

			if (input.projectId) {
				const project = await projectQueries.getProjectById(input.projectId);
				if (!project || project.orgId !== ctx.org.id) {
					throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found in this organization' });
				}
			}

			const invitation = await invitationQueries.createInvitation({
				orgId: ctx.org.id,
				projectId: input.projectId ?? null,
				email: input.email.toLowerCase(),
				role: input.role,
				scope,
				invitedBy: ctx.user.id,
				status: 'pending',
			});

			if (emailService.isEnabled()) {
				await emailService.sendEmail(
					invitation.email,
					buildInvitationEmail({
						orgName: ctx.org.name,
						inviterName: ctx.user.name,
						token: invitation.token,
					}),
				);
			}

			return invitation;
		}),

	listForOrg: orgAdminProcedure.input(z.object({ orgId: z.string() })).query(async ({ ctx }) => {
		return invitationQueries.listPendingInvitationsForOrg(ctx.org.id);
	}),

	revoke: orgAdminProcedure
		.input(z.object({ orgId: z.string(), invitationId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const invitation = await invitationQueries.getInvitationById(input.invitationId);
			if (!invitation || invitation.orgId !== ctx.org.id) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
			}
			await invitationQueries.revokeInvitation(input.invitationId);
		}),

	accept: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ ctx, input }) => {
		const invitation = await invitationQueries.getInvitationByToken(input.token);
		if (!invitation) {
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
		}
		if (invitation.status !== 'pending') {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation is no longer valid' });
		}
		if (invitation.expiresAt < new Date()) {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation has expired' });
		}

		const existingOrgMember = await orgQueries.getOrgMember(invitation.orgId, ctx.user.id);
		if (!existingOrgMember) {
			await orgQueries.addOrgMember({
				orgId: invitation.orgId,
				userId: ctx.user.id,
				role: toOrgRole(invitation.role),
			});
		}

		if (invitation.projectId) {
			const existingProjectMember = await projectQueries.getProjectMember(invitation.projectId, ctx.user.id);
			if (!existingProjectMember) {
				await projectQueries.addProjectMember({
					projectId: invitation.projectId,
					userId: ctx.user.id,
					role: invitation.role,
				});
			}
		}

		await invitationQueries.markAccepted(invitation.id);
		return { orgId: invitation.orgId, projectId: invitation.projectId };
	}),

	getByToken: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
		const invitation = await invitationQueries.getInvitationByToken(input.token);
		if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
			return null;
		}
		const org = await orgQueries.getOrganizationById(invitation.orgId);
		return {
			id: invitation.id,
			orgName: org?.name ?? 'Unknown',
			email: invitation.email,
			role: invitation.role,
			scope: invitation.scope,
		};
	}),
};
