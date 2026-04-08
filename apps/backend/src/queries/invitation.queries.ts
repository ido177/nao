import { and, eq, gt } from 'drizzle-orm';

import s, { DBInvitation, NewInvitation } from '../db/abstractSchema';
import { db } from '../db/db';

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const createInvitation = async (
	invitation: Omit<NewInvitation, 'token' | 'expiresAt'>,
): Promise<DBInvitation> => {
	const token = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);
	const [created] = await db
		.insert(s.invitation)
		.values({ ...invitation, token, expiresAt })
		.returning()
		.execute();
	return created;
};

export const getInvitationByToken = async (token: string): Promise<DBInvitation | null> => {
	const [inv] = await db.select().from(s.invitation).where(eq(s.invitation.token, token)).execute();
	return inv ?? null;
};

export const getInvitationById = async (id: string): Promise<DBInvitation | null> => {
	const [inv] = await db.select().from(s.invitation).where(eq(s.invitation.id, id)).execute();
	return inv ?? null;
};

export const listPendingInvitationsForOrg = async (orgId: string): Promise<DBInvitation[]> => {
	return db
		.select()
		.from(s.invitation)
		.where(
			and(
				eq(s.invitation.orgId, orgId),
				eq(s.invitation.status, 'pending'),
				gt(s.invitation.expiresAt, new Date()),
			),
		)
		.execute();
};

export const markAccepted = async (invitationId: string): Promise<void> => {
	await db.update(s.invitation).set({ status: 'accepted' }).where(eq(s.invitation.id, invitationId)).execute();
};

export const revokeInvitation = async (invitationId: string): Promise<void> => {
	await db.delete(s.invitation).where(eq(s.invitation.id, invitationId)).execute();
};
