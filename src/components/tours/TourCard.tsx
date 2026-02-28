import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, DollarSign, Calendar } from 'lucide-react';
import type { TourPackage } from '@/types';

interface TourCardProps {
    tour: TourPackage;
    isAdmin?: boolean;
    onEdit?: (tour: TourPackage) => void;
    onDelete?: (id: string) => void;
}

export function TourCard({ tour, isAdmin = false, onEdit, onDelete }: TourCardProps) {
    return (
        <Card className="overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col h-full">
            <div className="relative h-48 overflow-hidden bg-slate-100">
                <img
                    src={tour.images[0]}
                    alt={tour.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-2 right-2">
                    <Badge variant={tour.status === 'active' ? 'default' : 'secondary'} className={tour.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}>
                        {tour.status}
                    </Badge>
                </div>
            </div>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="line-clamp-1 text-lg mb-1">{tour.title}</CardTitle>
                        <div className="flex items-center text-xs text-slate-500">
                            <MapPin className="w-3 h-3 mr-1" />
                            {tour.destination}
                        </div>
                    </div>
                    <div className="flex items-center font-bold text-slate-900">
                        <DollarSign className="w-4 h-4" />
                        {tour.price.toLocaleString()}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <CardDescription className="line-clamp-2 text-xs mb-4">
                    {tour.description}
                </CardDescription>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {tour.duration} Days
                    </div>
                    <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Daily dept.
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-50 mt-auto">
                <div className="flex gap-2 w-full">
                    {isAdmin && (
                        <>
                            <Button
                                className="flex-1 h-8 text-xs bg-[#33A894] hover:bg-[#2c9180] text-white"
                                onClick={() => onEdit?.(tour)}
                            >
                                Edit
                            </Button>
                            <Button
                                className="h-8 text-xs px-2 bg-[#33A894] hover:bg-[#2c9180] text-white"
                                onClick={() => onDelete?.(tour.id)}
                            >
                                Delete
                            </Button>
                        </>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}
