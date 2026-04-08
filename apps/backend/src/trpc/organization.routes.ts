import { TRPCError } from '@trpc/server';
import { z } from 'zod/v4';

import * as orgQueries from '../queries/organization.queries';
import * as projectQueries from '../queries/project.queries';
import { getDeploymentMode } from '../utils/deployment-mode';
import { generateSlug } from '../utils/utils';
import { orgAdminProcedure, orgProtectedProcedure, protectedProcedure } from './trpc';

export const organizationRoutes = {
	getDeploymentMode: protectedProcedure.query(() => {
		return { mode: getDeploymentMode() };
	}),

	list: protectedProcedure.query(async ({ ctx }) => {
		const memberships = await orgQueries.listUserOrganizations(ctx.user.id);
		return memberships.map((m) => ({
			id: m.organization.id,
			name: m.organization.name,
			slug: m.organization.slug,
			role: m.role,
		}));
	}),

	create: protectedProcedure.input(z.object({ name: z.string().min(1) })).mutation(async ({ ctx, input }) => {
		const org = await orgQueries.createOrganization({
			name: input.name,
			slug: generateSlug(input.name),
		});
		await orgQueries.addOrgMember({ orgId: org.id, userId: ctx.user.id, role: 'admin' });
		return org;
	}),

	update: orgAdminProcedure
		.input(z.object({ orgId: z.string(), name: z.string().min(1).optional() }))
		.mutation(async ({ ctx, input }) => {
			const values: Parameters<typeof orgQueries.updateOrganization>[1] = {};
			if (input.name) {
				values.name = input.name;
			}
			return orgQueries.updateOrganization(ctx.org.id, values);
		}),

	listMembers: orgProtectedProcedure.input(z.object({ orgId: z.string() })).query(async ({ ctx }) => {
		return orgQueries.listOrgMembers(ctx.org.id);
	}),

	removeMember: orgAdminProcedure
		.input(z.object({ orgId: z.string(), userId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (input.userId === ctx.user.id) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove yourself from the organization' });
			}
			await orgQueries.removeOrgMember(ctx.org.id, input.userId);
		}),

	updateMemberRole: orgAdminProcedure
		.input(z.object({ orgId: z.string(), userId: z.string(), role: z.enum(['admin', 'user']) }))
		.mutation(async ({ ctx, input }) => {
			if (input.userId === ctx.user.id) {
				throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot change your own role' });
			}
			await orgQueries.updateOrgMemberRole(ctx.org.id, input.userId, input.role);
		}),

	listProjects: orgProtectedProcedure.input(z.object({ orgId: z.string() })).query(async ({ ctx }) => {
		return projectQueries.listProjectsByOrgId(ctx.org.id);
	}),

	createProject: orgAdminProcedure
		.input(z.object({ orgId: z.string(), name: z.string().min(1), path: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const project = await projectQueries.createProject({
				name: input.name,
				type: 'local',
				path: input.path,
				orgId: ctx.org.id,
			});
			await projectQueries.addProjectMember({ projectId: project.id, userId: ctx.user.id, role: 'admin' });
			return project;
		}),
};
