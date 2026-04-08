import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { trpc, trpcClient } from '@/main';

export const Route = createFileRoute('/invite/$token')({
	component: InviteAcceptPage,
});

function InviteAcceptPage() {
	const { token } = Route.useParams();
	const navigate = useNavigate();
	const session = useSession();

	const inviteQuery = useQuery(trpc.invitation.getByToken.queryOptions({ token }));

	const acceptMutation = useMutation({
		mutationFn: () => trpcClient.invitation.accept.mutate({ token }),
		onSuccess: () => navigate({ to: '/' }),
	});

	if (!session.data) {
		return (
			<div className='flex flex-col items-center justify-center h-screen gap-4'>
				<Building2 className='size-8 text-muted-foreground' />
				<p className='text-muted-foreground'>Please log in or sign up to accept this invitation.</p>
				<div className='flex gap-2'>
					<Button variant='outline' onClick={() => navigate({ to: '/login', search: { error: undefined } })}>
						Log In
					</Button>
					<Button onClick={() => navigate({ to: '/signup', search: { error: undefined } })}>Sign Up</Button>
				</div>
			</div>
		);
	}

	if (inviteQuery.isLoading) {
		return (
			<div className='flex items-center justify-center h-screen'>
				<p className='text-muted-foreground'>Loading invitation...</p>
			</div>
		);
	}

	if (!inviteQuery.data) {
		return (
			<div className='flex flex-col items-center justify-center h-screen gap-4'>
				<p className='text-muted-foreground'>This invitation is invalid or has expired.</p>
				<Button onClick={() => navigate({ to: '/' })}>Go to app</Button>
			</div>
		);
	}

	const invite = inviteQuery.data;

	return (
		<div className='flex flex-col items-center justify-center h-screen gap-6'>
			<Building2 className='size-10 text-primary' />
			<div className='text-center space-y-2'>
				<h1 className='text-xl font-semibold'>You&apos;re invited to join</h1>
				<p className='text-2xl font-bold'>{invite.orgName}</p>
				<p className='text-sm text-muted-foreground'>
					as <span className='capitalize font-medium'>{invite.role}</span>
					{invite.scope === 'project' && ' (project-level access)'}
				</p>
			</div>
			<Button size='lg' onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
				{acceptMutation.isPending ? 'Accepting...' : 'Accept Invitation'}
			</Button>
			{acceptMutation.isError && (
				<p className='text-sm text-destructive'>Failed to accept invitation. Please try again.</p>
			)}
		</div>
	);
}
