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
    name: z.string().optional(),
    email: z.string().optional().refine(val => !val || val.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: 'Invalid email address',
    }),
    phone: z.string().optional(),
    status: z.enum(['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost']),
    source: z.string().min(1, 'Source is required'),
    tour_interest: z.string().optional(),
    budget: z.number().optional(),
    assigned_staff_id: z.string().optional(),
    notes: z.string().optional(),
    passport_details: z.string().optional(),
    dob: z.string().optional(),
    tour_departure: z.string().optional(),
    tour_arrival: z.string().optional(),
}).superRefine((data, ctx) => {
    const hasName = Boolean(data.name && data.name.trim().length > 0);
    const hasEmail = Boolean(data.email && data.email.trim().length > 0);
    const hasPhone = Boolean(data.phone && data.phone.trim().length > 0);

    if (!hasName && !hasEmail && !hasPhone) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please enter at least a Name, Email, or Phone number',
            path: ['name'],
        });
    }
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
            ...(() => {
                let parsed = {
                    notes: '',
                    passport_details: '',
                    dob: '',
                    tour_departure: '',
                    tour_arrival: ''
                };
                try {
                    if (initialData.notes) {
                        const obj = JSON.parse(initialData.notes);
                        if (obj && typeof obj === 'object') {
                            parsed = {
                                notes: obj.notes || '',
                                passport_details: obj.passport_details || '',
                                dob: obj.dob || '',
                                tour_departure: obj.tour_departure || '',
                                tour_arrival: obj.tour_arrival || '',
                            };
                        }
                    }
                } catch (_) {
                    parsed.notes = initialData.notes || '';
                }
                return parsed;
            })()
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
            passport_details: '',
            dob: '',
            tour_departure: '',
            tour_arrival: '',
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
        let existingNotesObj = {};
        try {
            if (initialData?.notes) {
                existingNotesObj = JSON.parse(initialData.notes);
            }
        } catch (_) {}

        let finalName = (values.name || '').trim();
        const finalPhone = (values.phone || '').trim();
        const finalEmail = (values.email || '').trim();

        if (!finalName) {
            if (finalPhone) {
                finalName = finalPhone;
            } else if (finalEmail) {
                finalName = finalEmail.split('@')[0];
            } else {
                finalName = 'Unnamed Contact';
            }
        }

        const payload = {
            ...values,
            name: finalName,
            email: finalEmail,
            phone: finalPhone,
            notes: JSON.stringify({
                ...existingNotesObj,
                notes: values.notes || '',
                passport_details: values.passport_details || '',
                dob: values.dob || '',
                tour_departure: values.tour_departure || '',
                tour_arrival: values.tour_arrival || '',
            })
        };
        if (!payload.assigned_staff_id || payload.assigned_staff_id === 'unassigned' || payload.assigned_staff_id === '') {
            (payload as any).assigned_staff_id = null;
        }
        
        // Remove individual virtual fields so they don't go to Supabase as columns
        delete (payload as any).passport_details;
        delete (payload as any).dob;
        delete (payload as any).tour_departure;
        delete (payload as any).tour_arrival;

        onSubmit(payload as any);
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
                                    <Input placeholder="e.g. John Doe (Optional if Email/Phone given)" {...field} value={field.value || ''} />
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
                                    <Input placeholder="john@example.com (Optional)" type="email" {...field} value={field.value || ''} />
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
                                    <Input placeholder="+1 234 567 890 (Optional)" {...field} value={field.value || ''} />
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
                                <Select onValueChange={field.onChange} value={(field.value as string) || 'unassigned'}>
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

                <div className="border-t border-slate-100 my-4 pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Client & Travel Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField<LeadFormValues>
                            control={form.control}
                            name="passport_details"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Passport Details</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Passport number & expiry" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField<LeadFormValues>
                            control={form.control}
                            name="dob"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date of Birth</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                        <FormField<LeadFormValues>
                            control={form.control}
                            name="tour_departure"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Departure Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField<LeadFormValues>
                            control={form.control}
                            name="tour_arrival"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Arrival Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
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
