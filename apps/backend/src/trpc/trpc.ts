import type { UserRole } from '@nao/shared/types';
import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import superjson from 'superjson';

import { getAuth } from '../auth';
import * as orgQueries from '../queries/organization.queries';
import * as projectQueries from '../queries/project.queries';
import type { OrgRole } from '../types/organization';
import { isCloud } from '../utils/deployment-mode';
import { HandlerError } from '../utils/error';
import { convertHeaders } from '../utils/utils';

export type Context = Awaited<ReturnType<typeof createContext>>;
export type MiddlewareFunction = Parameters<typeof t.procedure.use>[0];

export const createContext = async (opts: CreateFastifyContextOptions) => {
	const headers = convertHeaders(opts.req.headers);
	const auth = await getAuth();
	const session = await auth?.api.getSession({ headers });
	const projectId = opts.req.headers['x-project-id'] as string | undefined;
	return {
		session,
		projectId,
	};
};

const t = initTRPC.context<Context>().create({
	transformer: superjson,
});

export const router = t.router;

const withHandlerErrors = t.middleware(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		if (error instanceof HandlerError) {
			throw new TRPCError({ code: error.codeMessage, message: error.message });
		}
		throw error;
	}
});

export const publicProcedure = t.procedure.use(withHandlerErrors);

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
	if (!ctx.session?.user) {
		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}

	return next({ ctx: { user: ctx.session.user } });
});

async function resolveProject(userId: string, headerProjectId?: string) {
	if (isCloud() && headerProjectId) {
		return projectQueries.getProjectForUser(headerProjectId, userId);
	}
	return projectQueries.getDefaultProjectForUser(userId);
}

export const projectProtectedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
	const project = await resolveProject(ctx.user.id, ctx.projectId);
	if (!project) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'No project configured' });
	}
	const userRole: UserRole | null = await projectQueries.getUserRoleInProject(project.id, ctx.user.id);

	return next({ ctx: { project, userRole } });
});

export const adminProtectedProcedure = projectProtectedProcedure.use(async ({ ctx, next }) => {
	if (ctx.userRole !== 'admin') {
		throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can perform this action' });
	}

	return next({ ctx: { project: ctx.project, userRole: ctx.userRole } });
});

export const orgProtectedProcedure = protectedProcedure
	.input((raw: unknown) => {
		const parsed = raw as Record<string, unknown>;
		if (typeof parsed?.orgId !== 'string') {
			throw new TRPCError({ code: 'BAD_REQUEST', message: 'orgId is required' });
		}
		return parsed as { orgId: string; [key: string]: unknown };
	})
	.use(async ({ ctx, input, next }) => {
		const orgId = (input as { orgId: string }).orgId;
		const membership = await orgQueries.getOrgMember(orgId, ctx.user.id);
		if (!membership) {
			throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a member of this organization' });
		}
		const org = await orgQueries.getOrganizationById(orgId);
		if (!org) {
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
		}
		return next({ ctx: { org, orgRole: membership.role as OrgRole } });
	});

export const orgAdminProcedure = orgProtectedProcedure.use(async ({ ctx, next }) => {
	if (ctx.orgRole !== 'admin') {
		throw new TRPCError({ code: 'FORBIDDEN', message: 'Only org admins can perform this action' });
	}
	return next({ ctx });
});

export function ownedResourceProcedure(
	getOwnerId: (resourceId: string) => Promise<string | undefined>,
	resourceName: string,
) {
	return protectedProcedure.use(async ({ ctx, getRawInput, next }) => {
		const rawInput = (await getRawInput()) as Record<string, unknown>;
		const resourceId = rawInput[`${resourceName}Id`];
		if (typeof resourceId !== 'string') {
			throw new TRPCError({ code: 'BAD_REQUEST', message: `${resourceName}Id is required.` });
		}

		const ownerId = await getOwnerId(resourceId);
		if (!ownerId) {
			throw new TRPCError({ code: 'NOT_FOUND', message: `${resourceName} not found.` });
		}
		if (ownerId !== ctx.user.id) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: `You are not authorized to modify this ${resourceName}.`,
			});
		}

		return next({ ctx });
	});
}
