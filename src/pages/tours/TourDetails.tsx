import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Clock, MapPin, Euro, Calendar, Check, X } from 'lucide-react';

export function TourDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { tours } = useAppStore();

    const tour = tours.find(t => t.id === id);

    if (!tour) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">Tour Package Not Found</h2>
                <Button onClick={() => navigate('/tours')}>Back to Tours</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/tours')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">{tour.title}</h2>
                        <Badge variant={tour.status === 'active' ? 'default' : 'secondary'} className={tour.status === 'active' ? 'bg-green-600' : ''}>
                            {tour.status}
                        </Badge>
                    </div>
                    <div className="flex items-center text-slate-500 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {tour.destination}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(`/tours/${tour.id}/edit`)}>Edit Package</Button>
                    <Button className="bg-red-600 hover:bg-red-700">Book Now</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Image Gallery */}
                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                        <img src={tour.images[0]} alt={tour.title} className="w-full h-full object-cover" />
                    </div>

                    {/* Description */}
                    <Card className="border-slate-100 shadow-sm">
                        <CardContent className="pt-6">
                            <h3 className="text-xl font-semibold mb-4 text-slate-900">About this Tour</h3>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{tour.description}</p>
                        </CardContent>
                    </Card>

                    {/* Itinerary */}
                    <Card className="border-slate-100 shadow-sm">
                        <CardContent className="pt-6">
                            <h3 className="text-xl font-semibold mb-4 text-slate-900">Itinerary</h3>
                            <div
                                className="prose prose-slate max-w-none text-slate-600"
                                dangerouslySetInnerHTML={{ __html: tour.itinerary }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                    <Card className="border-slate-100 shadow-md sticky top-8">
                        <CardContent className="pt-6 space-y-6">
                            <div className="pb-6 border-b border-slate-100">
                                <p className="text-sm text-slate-500 mb-1">Price per person</p>
                                <div className="flex items-baseline gap-1">
                                    <Euro className="w-5 h-5 text-slate-900 self-center" />
                                    <span className="text-3xl font-bold text-slate-900">{tour.price.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center text-slate-600">
                                        <Clock className="w-4 h-4 mr-2" />
                                        Duration
                                    </div>
                                    <span className="font-medium text-slate-900">{tour.duration} Days</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center text-slate-600">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Availability
                                    </div>
                                    <span className="font-medium text-slate-900">Daily Departures</span>
                                </div>
                            </div>

                            <div className="pt-4 space-y-3">
                                <h4 className="font-semibold text-sm text-slate-900">Includes</h4>
                                <ul className="space-y-2">
                                    <li className="flex items-start text-sm text-slate-600">
                                        <Check className="w-4 h-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                                        Accommodation as per itinerary
                                    </li>
                                    <li className="flex items-start text-sm text-slate-600">
                                        <Check className="w-4 h-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                                        Daily breakfast & select meals
                                    </li>
                                    <li className="flex items-start text-sm text-slate-600">
                                        <Check className="w-4 h-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                                        Professional tour guide
                                    </li>
                                </ul>
                            </div>

                            <div className="pt-2 space-y-3">
                                <h4 className="font-semibold text-sm text-slate-900">Excludes</h4>
                                <ul className="space-y-2">
                                    <li className="flex items-start text-sm text-slate-600">
                                        <X className="w-4 h-4 mr-2 text-red-500 shrink-0 mt-0.5" />
                                        International flights
                                    </li>
                                    <li className="flex items-start text-sm text-slate-600">
                                        <X className="w-4 h-4 mr-2 text-red-500 shrink-0 mt-0.5" />
                                        Personal expenses
                                    </li>
                                </ul>
                            </div>

                            <Button className="w-full bg-red-600 hover:bg-red-700 h-11 text-base">
                                Book This Tour
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
