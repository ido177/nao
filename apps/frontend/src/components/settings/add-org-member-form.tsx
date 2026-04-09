import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { trpc } from '@/main';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AddOrgMemberDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AddOrgMemberDialog({ open, onOpenChange }: AddOrgMemberDialogProps) {
	const queryClient = useQueryClient();
	const [error, setError] = useState('');

	const addMember = useMutation(
		trpc.organization.addMember.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: trpc.organization.getMembers.queryKey() });
				queryClient.invalidateQueries({ queryKey: trpc.organization.getInvites.queryKey() });
				handleClose();
			},
			onError: (err) => setError(err.message),
		}),
	);

	const form = useForm({
		defaultValues: { email: '' },
		onSubmit: ({ value }) => {
			setError('');
			addMember.mutate({ email: value.email });
		},
	});

	const handleClose = () => {
		onOpenChange(false);
		setError('');
		form.reset();
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Member to Organization</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className='flex flex-col gap-4'
				>
					<form.Field name='email'>
						{(field) => (
							<div className='flex flex-col gap-2'>
								<label htmlFor='org-member-email' className='text-sm font-medium'>
									Email
								</label>
								<Input
									id='org-member-email'
									type='email'
									placeholder="Enter the user's email"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</div>
						)}
					</form.Field>
					{error && <p className='text-red-500 text-center text-sm'>{error}</p>}
					<div className='flex justify-end'>
						<Button type='submit'>Add member</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
