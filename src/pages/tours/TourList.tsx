import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { TourCard } from '@/components/tours/TourCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import type { TourPackage } from '@/types';
import { useI18n } from '@/i18n';

export function TourList() {
    const { tours, fetchTours, deleteTour } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('price-asc');
    const navigate = useNavigate();
    const { t } = useI18n();

    useEffect(() => {
        fetchTours();
    }, [fetchTours]);

    const handleAddTour = () => {
        navigate('/tours/new');
    };

    const handleEditTour = (tour: TourPackage) => {
        navigate(`/tours/${tour.id}/edit`);
    };

    const handleDeleteTour = (id: string) => {
        if (confirm('Are you sure you want to delete this tour package?')) {
            deleteTour(id);
        }
    };

    const filteredTours = tours
        .filter(tour =>
            tour.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tour.destination.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortOrder === 'price-asc') return a.price - b.price;
            if (sortOrder === 'price-desc') return b.price - a.price;
            if (sortOrder === 'duration-asc') return a.duration - b.duration;
            return 0;
        });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('tourPackages')}</h2>
                    <p className="text-slate-500 mt-1">{t('tourPackagesDesc')}</p>
                </div>
                <Button className="bg-[#33A894] hover:bg-[#2c9180] text-white" onClick={handleAddTour}>
                    <Plus className="mr-2 h-4 w-4" /> {t('createPackage')}
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder={t('searchTour')}
                        className="pl-9 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-[180px] bg-white border-slate-200">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="price-asc">{t('priceLowHigh')}</SelectItem>
                            <SelectItem value="price-desc">{t('priceHighLow')}</SelectItem>
                            <SelectItem value="duration-asc">{t('durationShortest')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTours.map((tour) => (
                    <TourCard
                        key={tour.id}
                        tour={tour}
                        isAdmin={true}
                        onEdit={handleEditTour}
                        onDelete={handleDeleteTour}
                    />
                ))}
            </div>

            {filteredTours.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-500">{t('noToursFound')}</p>
                </div>
            )}
        </div>
    );
}
