import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import type { Lead } from '@/types';
import { useAppStore } from '@/store';

const leadSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    status: z.enum(['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost']),
    source: z.string().min(2, 'Source is required'),
    tour_interest: z.string().optional(),
    budget: z.number().optional(),
    assigned_staff_id: z.string().optional(),
    notes: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface LeadFormProps {
    initialData?: Lead;
    onSubmit: (data: LeadFormValues) => void;
    onCancel: () => void;
}

export function LeadForm({ initialData, onSubmit, onCancel }: LeadFormProps) {
    const { tours, staff, fetchStaff } = useAppStore();

    useEffect(() => {
        if (staff.length === 0) {
            fetchStaff();
        }
    }, [staff.length, fetchStaff]);

    const form = useForm<LeadFormValues>({
        resolver: zodResolver(leadSchema) as any,
        defaultValues: initialData ? {
            name: initialData.name,
            email: initialData.email,
            phone: initialData.phone,
            status: initialData.status,
            source: initialData.source,
            tour_interest: initialData.tour_interest || '',
            budget: initialData.budget,
            assigned_staff_id: initialData.assigned_staff_id || '',
            notes: initialData.notes || '',
        } : {
            name: '',
            email: '',
            phone: '',
            status: 'new',
            source: 'Website',
            tour_interest: '',
            budget: undefined,
            assigned_staff_id: '',
            notes: '',
        },
    });

    // Auto-update budget when tour interest changes
    const tourInterest = form.watch('tour_interest');

    useEffect(() => {
        if (tourInterest && tourInterest !== 'custom') {
            const selectedTour = tours.find(t => t.title === tourInterest);
            if (selectedTour) {
                form.setValue('budget', selectedTour.price);
            }
        } else if (tourInterest === 'custom') {
            form.setValue('budget', 0);
        }
    }, [tourInterest, tours, form]);

    const handleSubmit = (values: LeadFormValues) => {
        const payload = { ...values };
        if (payload.assigned_staff_id === 'unassigned') {
            payload.assigned_staff_id = undefined;
        }
        onSubmit(payload);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField<LeadFormValues>
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<LeadFormValues>
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="john@example.com" type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField<LeadFormValues>
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                    <Input placeholder="+1 234 567 890" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<LeadFormValues>
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="new">New</SelectItem>
                                        <SelectItem value="contacted">Contacted</SelectItem>
                                        <SelectItem value="qualified">Qualified</SelectItem>
                                        <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                                        <SelectItem value="converted">Converted</SelectItem>
                                        <SelectItem value="lost">Lost</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField<LeadFormValues>
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                                <FormLabel>Source</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select source" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Website">Website</SelectItem>
                                        <SelectItem value="Referral">Referral</SelectItem>
                                        <SelectItem value="Walk-in">Walk-in</SelectItem>
                                        <SelectItem value="Social Media">Social Media</SelectItem>
                                        <SelectItem value="Exhibition">Exhibition</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField<LeadFormValues>
                        control={form.control}
                        name="tour_interest"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Interested Tour</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a tour (optional)" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="custom">Custom / Other</SelectItem>
                                        {tours.map((tour) => (
                                            <SelectItem key={tour.id} value={tour.title}>
                                                {tour.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<LeadFormValues>
                        control={form.control}
                        name="assigned_staff_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assign Staff</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select staff (optional)" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {staff.map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField<LeadFormValues>
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Additional details..." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit">Save Lead</Button>
                </DialogFooter>
            </form>
        </Form >
    );
}
