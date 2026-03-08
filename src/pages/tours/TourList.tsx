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
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm shadow-indigo-900/5">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">{t('tourPackages')}</h2>
                    <p className="text-slate-500 font-medium">{t('tourPackagesDesc')}</p>
                </div>
                <Button className="bg-[#33A894] hover:bg-[#2c9180] text-white h-11 px-6 rounded-xl shadow-md shadow-[#33A894]/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 font-bold" onClick={handleAddTour}>
                    <Plus className="h-4 w-4" /> {t('createPackage')}
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white/80 shadow-sm shadow-indigo-900/5 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder={t('searchTour')}
                        className="pl-10 h-11 bg-white/80 border-slate-200/60 rounded-xl focus:ring-indigo-500/20"
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-full sm:w-[200px] h-11 bg-white/80 border-slate-200/60 rounded-xl font-bold text-slate-700">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <SelectValue placeholder="Sort by" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                            <SelectItem value="price-asc" className="rounded-lg">{t('priceLowHigh')}</SelectItem>
                            <SelectItem value="price-desc" className="rounded-lg">{t('priceHighLow')}</SelectItem>
                            <SelectItem value="duration-asc" className="rounded-lg">{t('durationShortest')}</SelectItem>
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
