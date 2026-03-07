
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportsTab } from "@/components/analytics/ReportsTab";
import { LeadAnalyticsTab } from "@/components/analytics/LeadAnalyticsTab";
import { WhatsAppAnalyticsTab } from "@/components/analytics/WhatsAppAnalyticsTab";
import { useI18n } from '@/i18n';

export function Analytics() {
    const { t } = useI18n();
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('analytics')}</h2>
                <p className="text-slate-500 mt-1">{t('analyticsDesc')}</p>
            </div>

            <Tabs defaultValue="reports" className="space-y-6">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="reports" className="data-[state=active]:bg-[#33A894] data-[state=active]:text-white">{t('reports')}</TabsTrigger>
                    <TabsTrigger value="leads" className="data-[state=active]:bg-[#33A894] data-[state=active]:text-white">{t('leadAnalytics')}</TabsTrigger>
                    <TabsTrigger value="whatsapp" className="data-[state=active]:bg-[#33A894] data-[state=active]:text-white">{t('whatsappAnalytics')}</TabsTrigger>
                </TabsList>

                <TabsContent value="reports" className="space-y-6">
                    <ReportsTab />
                </TabsContent>

                <TabsContent value="leads" className="space-y-6">
                    <LeadAnalyticsTab />
                </TabsContent>

                <TabsContent value="whatsapp" className="space-y-6">
                    <WhatsAppAnalyticsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
