import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import type { Lead } from "@/types";
import { useAppStore } from "@/store";

interface WhatsAppModalProps {
    lead: Lead | null;
    isOpen: boolean;
    onClose: () => void;
}

export function WhatsAppModal({ lead, isOpen, onClose }: WhatsAppModalProps) {
    const [message, setMessage] = useState('');
    const [useTemplate, setUseTemplate] = useState(false);
    const [templateSid, setTemplateSid] = useState('HX2ada749a93d94f4a77cf706c63173358');
    const [templateVars, setTemplateVars] = useState('');
    const [isSending, setIsSending] = useState(false);
    const sendWhatsApp = useAppStore(state => state.sendWhatsApp);

    if (!lead) return null;

    const handleSend = async () => {
        if (!useTemplate && !message.trim()) return;
        if (useTemplate && !templateSid.trim()) return;

        setIsSending(true);
        try {
            let parsedVars: Record<string, string> | undefined = undefined;
            if (useTemplate && templateVars.trim()) {
                parsedVars = {};
                templateVars.split(',').forEach((val, idx) => {
                    parsedVars![(idx + 1).toString()] = val.trim();
                });
            }

            const finalMessage = useTemplate
                ? (message.trim() || `[Template Sent: ${templateSid}]${templateVars ? ` with variables: ${templateVars}` : ''}`)
                : message;

            await sendWhatsApp(
                lead.id, 
                lead.phone, 
                finalMessage, 
                useTemplate ? templateSid.trim() : undefined, 
                parsedVars
            );

            setMessage('');
            setTemplateSid('HX2ada749a93d94f4a77cf706c63173358');
            setTemplateVars('');
            setUseTemplate(false);
            onClose();
        } catch (error) {
            // Error is handled in the store with a toast
        } finally {
            setIsSending(false);
        }
    };

    const approvedTemplates = [
        {
            name: 'Welcome Template (errances_welcome)',
            sid: 'HX2ada749a93d94f4a77cf706c63173358',
            body: 'Hello {{1}}, thank you for contacting Errances Voyages! We have received your inquiry. A travel specialist will get back to you shortly. How can we help you today?'
        }
    ];

    const sandboxTemplates = [
        `Your appointment is coming up on May 27 at 10:00 AM`,
        `Your Errances Voyages order of Bali package has shipped and should be delivered on June 1. Details: http://localhost:5173`,
        `Your Errances Voyages code is 849310`
    ];

    const suggestedMessages = [
        `Hello ${lead.name}, thank you for your interest in Errances Voyages! How can we help you today?`,
        `Hi ${lead.name}, I'm following up on your inquiry about ${lead.tour_interest || 'our tours'}. Do you have any questions?`,
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-xl border-white/60 shadow-2xl rounded-3xl">
                <DialogHeader>
                    <div className="h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                        <MessageSquare className="h-6 w-6 text-emerald-600" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                        Send WhatsApp
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium">
                        Send to <span className="font-bold text-slate-700">{lead.name}</span> ({lead.phone})
                    </DialogDescription>
                </DialogHeader>

                {/* Tabs Selector */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mt-4">
                    <button
                        type="button"
                        onClick={() => setUseTemplate(false)}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                            !useTemplate 
                                ? 'bg-white text-slate-800 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Chat Message
                    </button>
                    <button
                        type="button"
                        onClick={() => setUseTemplate(true)}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                            useTemplate 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Meta/Twilio Template
                    </button>
                </div>

                <div className="space-y-6 py-4 max-h-[380px] overflow-y-auto pr-1">
                    {!useTemplate ? (
                        <>
                            <div className="space-y-2">
                                <div className="flex flex-col gap-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-amber-600">Sandbox Pre-approved Templates</Label>
                                    <span className="text-[9px] font-medium text-amber-500/80 leading-none">Use these to contact new numbers that haven't messaged you first</span>
                                </div>
                                <div className="grid gap-2">
                                    {sandboxTemplates.map((msg, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setMessage(msg)}
                                            className="text-left p-2.5 rounded-xl border border-amber-100 bg-amber-50/20 hover:bg-amber-50 hover:border-amber-300 transition-all text-xs font-bold text-slate-600 hover:text-amber-800"
                                        >
                                            {msg}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex flex-col gap-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom CRM Templates</Label>
                                    <span className="text-[9px] font-medium text-slate-400 leading-none">Only works if the lead messaged you in the last 24 hours</span>
                                </div>
                                <div className="grid gap-2">
                                    {suggestedMessages.map((msg, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setMessage(msg)}
                                            className="text-left p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-emerald-50 hover:border-emerald-200 transition-all text-xs font-bold text-slate-600 hover:text-emerald-700"
                                        >
                                            {msg}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Type your message here..."
                                    className="min-h-[120px] rounded-2xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 font-bold text-slate-700"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Approved Template</Label>
                                <div className="grid gap-2">
                                    {approvedTemplates.map((t, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                setTemplateSid(t.sid);
                                                setMessage(t.body);
                                            }}
                                            className={`text-left p-2.5 rounded-xl border transition-all text-xs font-bold ${
                                                templateSid === t.sid
                                                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800'
                                                    : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="font-extrabold">{t.name}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">{t.sid}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="templateSid" className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Template SID (Content SID)</Label>
                                <input
                                    id="templateSid"
                                    type="text"
                                    placeholder="e.g. HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="w-full p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700 text-sm"
                                    value={templateSid}
                                    onChange={(e) => setTemplateSid(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="templateVars" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Template Variables (Optional)</Label>
                                    <span className="text-[9px] font-medium text-slate-400 leading-none">Comma-separated values in order (e.g. John, Bali Package, June 1)</span>
                                </div>
                                <input
                                    id="templateVars"
                                    type="text"
                                    placeholder="e.g. John, Bali, June 1"
                                    className="w-full p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700 text-sm"
                                    value={templateVars}
                                    onChange={(e) => setTemplateVars(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="message" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message Preview / Database Log (Optional)</Label>
                                    <span className="text-[9px] font-medium text-slate-400 leading-none">Write the template text for your records</span>
                                </div>
                                <Textarea
                                    id="message"
                                    placeholder="e.g. Hello John, your booking is confirmed..."
                                    className="min-h-[100px] rounded-2xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 font-bold text-slate-700"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="rounded-xl font-bold text-slate-500 hover:text-slate-700"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={(!useTemplate && !message.trim()) || (useTemplate && !templateSid.trim()) || isSending}
                        className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold px-6 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Send Message
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
