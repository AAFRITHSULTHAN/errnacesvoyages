import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User } from '@/types';
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
import { DialogFooter } from '@/components/ui/dialog';

const staffSchema = z.object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    role: z.enum(['admin', 'sales_manager', 'sales_executive', 'support']),
    phone: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffFormProps {
    initialData?: User; // Use User type directly if possible, or map
    onSubmit: (data: StaffFormValues) => void;
    onCancel: () => void;
}

export function StaffForm({ initialData, onSubmit, onCancel }: StaffFormProps) {
    const form = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema),
        defaultValues: {
            full_name: initialData?.full_name || '',
            email: initialData?.email || '',
            role: initialData?.role || 'sales_executive',
            phone: initialData?.phone || '',
        },
    });

    const handleSubmit = (values: StaffFormValues) => {
        onSubmit(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="full_name"
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
                <FormField
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
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="+1 234 567 890" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="sales_manager">Sales Manager</SelectItem>
                                    <SelectItem value="sales_executive">Sales Executive</SelectItem>
                                    <SelectItem value="support">Support</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit">Save Staff Member</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
