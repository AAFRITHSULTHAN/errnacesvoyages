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
import type { TourPackage } from '@/types';

const tourSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    destination: z.string().min(2, 'Destination must be at least 2 characters'),
    price: z.coerce.number().min(0, 'Price must be positive'),
    duration: z.coerce.number().min(1, 'Duration must be at least 1 day'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    status: z.enum(['active', 'inactive']),
});

type TourFormValues = z.infer<typeof tourSchema>;

interface TourFormProps {
    initialData?: TourPackage;
    onSubmit: (data: TourFormValues) => void;
    onCancel: () => void;
}

export function TourForm({ initialData, onSubmit, onCancel }: TourFormProps) {
    const form = useForm<TourFormValues>({
        resolver: zodResolver(tourSchema) as any,
        defaultValues: initialData ? {
            title: initialData.title,
            destination: initialData.destination,
            price: initialData.price,
            duration: initialData.duration,
            description: initialData.description,
            status: initialData.status,
        } : {
            title: '',
            destination: '',
            price: 0,
            duration: 1,
            description: '',
            status: 'active',
        },
    });

    const handleSubmit = (values: TourFormValues) => {
        onSubmit(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField<TourFormValues>
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Bali Paradise" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField<TourFormValues>
                        control={form.control}
                        name="destination"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Destination</FormLabel>
                                <FormControl>
                                    <Input placeholder="Indonesia" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<TourFormValues>
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price (€)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="1200"
                                        {...field}
                                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField<TourFormValues>
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Duration (Days)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="7"
                                        {...field}
                                        onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<TourFormValues>
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
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField<TourFormValues>
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="A beautiful journey..." className="h-24" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit">Save Package</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
