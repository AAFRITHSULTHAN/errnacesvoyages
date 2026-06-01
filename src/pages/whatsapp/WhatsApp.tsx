import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/Toast';

import { Search, MoreVertical, Paperclip, Send, Smile, CheckCheck, Check, AlertTriangle, Users, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAppStore } from '@/store';
import { supabase, anonClient } from '@/lib/supabase';

type Message = {
    id: string;
    content: string;
    sender: 'user' | 'contact';
    timestamp: Date;
    status: 'sent' | 'delivered' | 'read';
};

type Contact = {
    id: string;
    name: string;
    avatar: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount?: number;
    status: 'online' | 'offline';
    phone: string;
};

export function WhatsApp() {
    const rawLeads = useAppStore(state => state.leads);
    const leads = useMemo(() => rawLeads.filter(l => l.source !== 'Staff'), [rawLeads]);
    const fetchLeads = useAppStore(state => state.fetchLeads);
    const sendWhatsApp = useAppStore(state => state.sendWhatsApp);
    const location = useLocation();

    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [lastMessages, setLastMessages] = useState<Record<string, { content: string, created_at: string }>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [dbError, setDbError] = useState(false);
    const [isLastMessagesLoaded, setIsLastMessagesLoaded] = useState(false);

    // Emoji Picker, Search and Attachment states
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [messageSearchQuery, setMessageSearchQuery] = useState('');
    const [isAttaching, setIsAttaching] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const emojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
    ];

    const handleEmojiClick = (emoji: string) => {
        setMessageInput(prev => prev + emoji);
    };

    const handleAttachmentClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedContact) return;

        setIsAttaching(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (event) => {
                const base64Data = event.target?.result as string;
                await sendWhatsApp(selectedContact.id, selectedContact.phone, base64Data);
                setIsAttaching(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
        } catch (err) {
            console.error('Failed to attach file:', err);
            toast.error('Failed to attach image');
            setIsAttaching(false);
        }
    };

    // Auto-enable broadcast if triggered from dashboard navigation state
    useEffect(() => {
        if (location.state?.startBroadcast) {
            setIsBroadcastMode(true);
            setSelectedContactsForBroadcast([]);
            setIsBroadcastConfirmOpen(false);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Broadcast Mode States
    const [isBroadcastMode, setIsBroadcastMode] = useState(false);
    const [selectedContactsForBroadcast, setSelectedContactsForBroadcast] = useState<string[]>([]);
    const [isBroadcastConfirmOpen, setIsBroadcastConfirmOpen] = useState(false);
    const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [useBroadcastTemplate, setUseBroadcastTemplate] = useState(false);
    const [broadcastTemplateSid, setBroadcastTemplateSid] = useState('HX2ada749a93d94f4a77cf706c63173358');
    const [broadcastTemplateVars, setBroadcastTemplateVars] = useState('');

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
        `Hello, thank you for your interest in Errances Voyages! How can we help you today?`,
        `Hi, I'm following up on your inquiry. Do you have any questions?`,
    ];

    const handleSendBroadcast = async () => {
        if (!useBroadcastTemplate && !broadcastMessage.trim()) return;
        if (useBroadcastTemplate && !broadcastTemplateSid.trim()) return;

        setIsSendingBroadcast(true);
        try {
            let parsedVars: Record<string, string> | undefined = undefined;
            if (useBroadcastTemplate && broadcastTemplateVars.trim()) {
                parsedVars = {};
                broadcastTemplateVars.split(',').forEach((val, idx) => {
                    parsedVars![(idx + 1).toString()] = val.trim();
                });
            }

            const finalMessage = useBroadcastTemplate
                ? (broadcastMessage.trim() || `[Template Sent: ${broadcastTemplateSid}]${broadcastTemplateVars ? ` with variables: ${broadcastTemplateVars}` : ''}`)
                : broadcastMessage;

            const selectedLeads = leads.filter(l => selectedContactsForBroadcast.includes(l.id));

            let successCount = 0;
            let failCount = 0;

            for (const lead of selectedLeads) {
                try {
                    await sendWhatsApp(
                        lead.id,
                        lead.phone,
                        finalMessage,
                        useBroadcastTemplate ? broadcastTemplateSid.trim() : undefined,
                        parsedVars
                    );
                    successCount++;
                } catch (err) {
                    console.error(`Failed to send broadcast to ${lead.name}:`, err);
                    failCount++;
                }
            }

            if (failCount === 0) {
                toast.success(`Broadcast finished: Sent to ${successCount} leads successfully.`);
            } else {
                toast.success(`Broadcast finished: Sent to ${successCount} leads. Failed for ${failCount} leads.`);
            }

            // Reset states
            setBroadcastMessage('');
            setBroadcastTemplateVars('');
            setUseBroadcastTemplate(false);
            setIsBroadcastMode(false);
            setSelectedContactsForBroadcast([]);
            setIsBroadcastConfirmOpen(false);
            
            // Refetch messages to update the lists
            fetchLastMessages();
        } catch (error) {
            console.error('Failed to run broadcast:', error);
        } finally {
            setIsSendingBroadcast(false);
        }
    };
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial fetch of leads
    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Fetch last messages to show in the sidebar list
    const fetchLastMessages = async () => {
        try {
            console.log('[WhatsApp Debug] fetchLastMessages initiating...');
            const { data: { session } } = await supabase.auth.getSession();
            const client = session ? supabase : anonClient;
            const { data, error } = await client
                .from('whatsapp_messages')
                .select('lead_id, content, created_at')
                .order('created_at', { ascending: false });
            console.log('[WhatsApp Debug] fetchLastMessages result:', { count: data?.length, error });
            if (!error && data) {
                setDbError(false);
                const mapping: Record<string, { content: string, created_at: string }> = {};
                data.forEach(m => {
                    if (!mapping[m.lead_id]) {
                        mapping[m.lead_id] = { content: m.content, created_at: m.created_at };
                    }
                });
                setLastMessages(mapping);
            } else if (error) {
                console.warn('Error querying whatsapp last messages:', error.message);
                if (error.code === 'PGRST205') {
                    setDbError(true);
                }
            }
        } catch (e) {
            console.error('Failed to fetch last messages:', e);
            setDbError(true);
        } finally {
            setIsLastMessagesLoaded(true);
        }
    };

    useEffect(() => {
        if (leads.length > 0) {
            fetchLastMessages();
        }
    }, [leads]);

    // Normalize phone helper
    const normalizePhone = (phone: string) => {
        return phone.replace(/\D/g, '');
    };

    // Group leads by normalized phone number
    const leadsByPhone = useMemo(() => {
        const groups: Record<string, typeof leads> = {};
        leads.forEach(lead => {
            if (lead.phone && lead.phone.trim() !== '') {
                const norm = normalizePhone(lead.phone);
                if (!groups[norm]) {
                    groups[norm] = [];
                }
                groups[norm].push(lead);
            }
        });
        return groups;
    }, [leads]);

    // Deriving contacts list grouped by phone number to combine duplicates and show all messages
    const contacts: Contact[] = useMemo(() => {
        const list: Contact[] = [];
        
        Object.entries(leadsByPhone).forEach(([_, phoneLeads]) => {
            // Find the most recent lead in this group to use as primary metadata
            const sortedLeads = [...phoneLeads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const primaryLead = sortedLeads[0];
            
            // Get all lead IDs for this phone number group
            const leadIds = phoneLeads.map(l => l.id);
            
            // Find the most recent message across all these lead IDs
            let lastMsg: { content: string; created_at: string } | null = null;
            for (const id of leadIds) {
                const msg = lastMessages[id];
                if (msg) {
                    if (!lastMsg || new Date(msg.created_at).getTime() > new Date(lastMsg.created_at).getTime()) {
                        lastMsg = msg;
                    }
                }
            }

            // Combine names if they are different
            const uniqueNames = Array.from(new Set(phoneLeads.map(l => l.name)));
            const combinedName = uniqueNames.join(' / ');

            list.push({
                id: primaryLead.id,
                name: combinedName,
                avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(primaryLead.name)}`,
                lastMessage: lastMsg ? (lastMsg.content.startsWith('data:image/') ? '📷 Photo' : lastMsg.content) : (primaryLead.notes || 'No messages yet'),
                lastMessageTime: lastMsg ? new Date(lastMsg.created_at) : new Date(primaryLead.created_at),
                status: 'online' as const,
                phone: primaryLead.phone,
                leadIds: leadIds // Include all linked lead IDs
            } as any);
        });

        // Sort by last message time descending
        return list.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
    }, [leadsByPhone, lastMessages]);

    // Set initial selected contact
    useEffect(() => {
        if (isLastMessagesLoaded && contacts.length > 0 && !selectedContact) {
            setSelectedContact(contacts[0]);
        }
    }, [contacts, selectedContact, isLastMessagesLoaded]);

    // Subscribe to leads database changes in real-time
    useEffect(() => {
        let activeClient = supabase;
        let leadsChannel: any = null;
        let isMounted = true;

        const setupLeadsSubscription = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!isMounted) return;
            activeClient = session ? supabase : anonClient;

            leadsChannel = activeClient
                .channel('global:leads_changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'leads'
                    },
                    () => {
                        if (isMounted) {
                            fetchLeads();
                        }
                    }
                )
                .subscribe();
        };

        setupLeadsSubscription();

        return () => {
            isMounted = false;
            if (leadsChannel) {
                activeClient.removeChannel(leadsChannel);
            }
        };
    }, [fetchLeads]);

    // Fetch messages and subscribe to realtime updates when selected contact changes
    useEffect(() => {
        if (!selectedContact) return;

        const targetIds = (selectedContact as any).leadIds || [selectedContact.id];
        let channel: any = null;
        let activeClient = supabase;
        let isMounted = true;

        const fetchMessagesAndSubscribe = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!isMounted) return;
                activeClient = session ? supabase : anonClient;

                console.log('[WhatsApp Debug] fetchMessages initiating for targetIds:', targetIds, 'selectedContact:', selectedContact);
                const { data, error } = await activeClient
                    .from('whatsapp_messages')
                    .select('*')
                    .in('lead_id', targetIds)
                    .order('created_at', { ascending: true });
                if (!isMounted) return;
                console.log('[WhatsApp Debug] fetchMessages result:', { count: data?.length, error });
                if (!error && data) {
                    setDbError(false);
                    setMessages(data.map(m => ({
                        id: m.id,
                        content: m.content,
                        sender: m.sender as 'user' | 'contact',
                        timestamp: new Date(m.created_at),
                        status: m.status as 'sent' | 'delivered' | 'read'
                    })));
                } else if (error) {
                    console.warn('Error querying whatsapp messages:', error.message);
                    if (error.code === 'PGRST205') {
                        setDbError(true);
                    }
                }

                // Subscribe to all incoming/outgoing messages in real-time to update the sidebar dynamically
                channel = activeClient
                    .channel('global:whatsapp_messages')
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'whatsapp_messages'
                        },
                        (payload) => {
                            if (!isMounted) return;
                            const newMessage = payload.new;
                            
                            // Update last message mapping dynamically for sidebar preview and sorting
                            setLastMessages(prev => ({
                                ...prev,
                                [newMessage.lead_id]: {
                                    content: newMessage.content,
                                    created_at: newMessage.created_at
                                }
                            }));

                            // If the new message is for the currently active phone number group, append it
                            if (targetIds.includes(newMessage.lead_id)) {
                                setMessages(prev => {
                                    if (prev.some(m => m.id === newMessage.id)) return prev;
                                    return [...prev, {
                                        id: newMessage.id,
                                        content: newMessage.content,
                                        sender: newMessage.sender as 'user' | 'contact',
                                        timestamp: new Date(newMessage.created_at),
                                        status: newMessage.status as 'sent' | 'delivered' | 'read'
                                    }];
                                });
                            }
                        }
                    )
                    .subscribe();

            } catch (e) {
                if (isMounted) {
                    console.error(e);
                    setDbError(true);
                }
            }
        };

        fetchMessagesAndSubscribe();

        return () => {
            isMounted = false;
            if (channel) {
                activeClient.removeChannel(channel);
            }
        };
    }, [selectedContact?.phone, (selectedContact as any)?.leadIds?.join(',')]);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedContact) return;

        const currentMsg = messageInput;
        setMessageInput('');

        try {
            await sendWhatsApp(selectedContact.id, selectedContact.phone, currentMsg);
            // The real-time subscription will insert the message into state automatically.
        } catch (error) {
            console.error("Failed to send WhatsApp message:", error);
        }
    };

    // Filter contacts based on search input
    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm)
    );

    return (
        <div className="flex h-[calc(100vh-8rem)] min-h-[500px] bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50 flex-shrink-0">
                <div className="p-4 border-b border-slate-200 bg-white flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="font-black text-xs uppercase tracking-widest text-slate-400">Chats</span>
                        {!isBroadcastMode ? (
                            <button
                                onClick={() => {
                                    setIsBroadcastMode(true);
                                    setSelectedContactsForBroadcast([]);
                                    setIsBroadcastConfirmOpen(false);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 transition-colors"
                            >
                                <Users className="h-3.5 w-3.5" />
                                Broadcast
                            </button>
                        ) : (
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => {
                                        if (selectedContactsForBroadcast.length === filteredContacts.length) {
                                            setSelectedContactsForBroadcast([]);
                                        } else {
                                            setSelectedContactsForBroadcast(filteredContacts.map(c => c.id));
                                        }
                                    }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors border border-indigo-100"
                                >
                                    {selectedContactsForBroadcast.length === filteredContacts.length ? 'None' : 'All'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsBroadcastMode(false);
                                        setSelectedContactsForBroadcast([]);
                                        setIsBroadcastConfirmOpen(false);
                                    }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={selectedContactsForBroadcast.length === 0}
                                    onClick={() => {
                                        setIsBroadcastConfirmOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next ({selectedContactsForBroadcast.length})
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search chats" 
                            className="pl-9 bg-slate-100 border-none font-medium h-9 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="flex flex-col">
                        {filteredContacts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                No active chats
                            </div>
                        ) : (
                            filteredContacts.map((contact) => (
                                <button
                                    key={contact.id}
                                    className={cn(
                                        "flex items-center gap-3 p-4 hover:bg-slate-100 transition-colors text-left border-b border-slate-100/50 w-full",
                                        selectedContact?.id === contact.id && !isBroadcastMode ? "bg-slate-100" : "",
                                        isBroadcastMode && selectedContactsForBroadcast.includes(contact.id) ? "bg-indigo-50/30" : ""
                                    )}
                                    onClick={() => {
                                        if (isBroadcastMode) {
                                            setSelectedContactsForBroadcast(prev => 
                                                prev.includes(contact.id)
                                                    ? prev.filter(id => id !== contact.id)
                                                    : [...prev, contact.id]
                                            );
                                        } else {
                                            setSelectedContact(contact);
                                        }
                                    }}
                                >
                                    {isBroadcastMode && (
                                        <input
                                            type="checkbox"
                                            checked={selectedContactsForBroadcast.includes(contact.id)}
                                            onChange={() => {}} // handled by onClick
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                                        />
                                    )}
                                    <div className="relative flex-shrink-0">
                                        <Avatar className="h-12 w-12 border border-slate-200 shadow-sm">
                                            <AvatarImage src={contact.avatar} />
                                            <AvatarFallback>{contact.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-semibold text-slate-900 truncate block">{contact.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-1">
                                                {format(contact.lastMessageTime, 'h:mm a')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs text-slate-500 truncate flex-1 mr-2 font-medium">
                                                {contact.lastMessage}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-[#efeae2]/15 relative min-w-0">
                {/* Chat Background Pattern Opacity Overlay */}
                <div className="absolute inset-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-[0.03] pointer-events-none" />

                {/* Database Error Banner */}
                {dbError && (
                    <div className="bg-amber-50 border-b border-amber-200/60 p-3 text-amber-800 text-xs font-semibold flex items-center gap-3 px-6 z-20">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span>Database table `whatsapp_messages` is missing. Please run `supabase_schema.sql` in your Supabase SQL Editor.</span>
                    </div>
                )}

                {isBroadcastConfirmOpen ? (
                    <div className="flex-1 flex flex-col bg-white z-10 overflow-y-auto relative">
                        {/* Chat Header */}
                        <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                    <Users className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Compose Broadcast Message</h3>
                                    <p className="text-xs text-slate-500 font-semibold">
                                        Sending to {selectedContactsForBroadcast.length} selected contacts
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBroadcastConfirmOpen(false)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200"
                            >
                                Back to Selection
                            </button>
                        </div>

                        {/* Composer Form */}
                        <div className="flex-1 p-6 space-y-6 max-w-2xl mx-auto w-full">
                            {/* Selected Contacts Pills */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recipients</Label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200/50">
                                    {leads
                                        .filter(l => selectedContactsForBroadcast.includes(l.id))
                                        .map(l => (
                                            <span key={l.id} className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {l.name}
                                            </span>
                                        ))
                                    }
                                </div>
                            </div>

                            {/* Tabs Selector */}
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => setUseBroadcastTemplate(false)}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                        !useBroadcastTemplate 
                                            ? 'bg-white text-slate-800 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Chat Message
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUseBroadcastTemplate(true)}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                        useBroadcastTemplate 
                                            ? 'bg-indigo-600 text-white shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Meta/Twilio Template
                                </button>
                            </div>

                            <div className="space-y-6">
                                {!useBroadcastTemplate ? (
                                    <>
                                        <div className="space-y-2">
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-amber-600">Sandbox Pre-approved Templates</Label>
                                                <span className="text-[9px] font-medium text-amber-500/80 leading-none">Use these to contact new numbers that haven't messaged you first</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {sandboxTemplates.map((msg, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => setBroadcastMessage(msg)}
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
                                                <span className="text-[9px] font-medium text-slate-400 leading-none">Only works if the leads messaged you in the last 24 hours</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {suggestedMessages.map((msg, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => setBroadcastMessage(msg)}
                                                        className="text-left p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-xs font-bold text-slate-600 hover:text-indigo-700"
                                                    >
                                                        {msg}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="broadcast-message" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</Label>
                                            <Textarea
                                                id="broadcast-message"
                                                placeholder="Type your message here..."
                                                className="min-h-[120px] rounded-2xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-slate-700"
                                                value={broadcastMessage}
                                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Approved Template</Label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {approvedTemplates.map((t, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => {
                                                            setBroadcastTemplateSid(t.sid);
                                                            setBroadcastMessage(t.body);
                                                        }}
                                                        className={`text-left p-2.5 rounded-xl border transition-all text-xs font-bold ${
                                                            broadcastTemplateSid === t.sid
                                                                ? 'border-indigo-500 bg-indigo-50/50 text-indigo-800'
                                                                : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div className="font-black text-slate-800 text-[11px] mb-1">{t.name}</div>
                                                        <div className="text-[10px] text-slate-500 font-medium leading-relaxed">{t.body}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex flex-col gap-1">
                                                <Label htmlFor="broadcast-template-vars" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Template Variables</Label>
                                                <span className="text-[9px] font-medium text-slate-400 leading-none">Comma-separated values for variables, e.g. "John" for welcome name</span>
                                            </div>
                                            <Input
                                                id="broadcast-template-vars"
                                                placeholder="e.g. John"
                                                className="rounded-xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-slate-700"
                                                value={broadcastTemplateVars}
                                                onChange={(e) => setBroadcastTemplateVars(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsBroadcastMode(false);
                                        setSelectedContactsForBroadcast([]);
                                        setIsBroadcastConfirmOpen(false);
                                    }}
                                    className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200 rounded-2xl font-bold"
                                >
                                    Cancel Broadcast
                                </button>
                                <button
                                    type="button"
                                    disabled={isSendingBroadcast || (useBroadcastTemplate ? !broadcastTemplateSid.trim() : !broadcastMessage.trim())}
                                    onClick={handleSendBroadcast}
                                    className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-2xl flex items-center justify-center gap-2 font-bold"
                                >
                                    {isSendingBroadcast ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        `Send to ${selectedContactsForBroadcast.length} Leads`
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : selectedContact ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-10">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-slate-200 shadow-sm">
                                    <AvatarImage src={selectedContact.avatar} />
                                    <AvatarFallback>{selectedContact.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold text-slate-900 leading-snug">{selectedContact.name}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold leading-none mt-0.5">
                                        WhatsApp • {selectedContact.phone}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isSearchActive ? (
                                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-2.5 py-1 border border-slate-200/50">
                                        <input
                                            type="text"
                                            placeholder="Search messages..."
                                            className="bg-transparent text-xs font-semibold focus:outline-none w-32 md:w-48 text-slate-700 placeholder-slate-400"
                                            value={messageSearchQuery}
                                            onChange={(e) => setMessageSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                        <button onClick={() => { setIsSearchActive(false); setMessageSearchQuery(''); }} className="text-slate-400 hover:text-slate-600">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-slate-50 rounded-xl" onClick={() => setIsSearchActive(true)}>
                                        <Search className="h-5 w-5" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-slate-50 rounded-xl">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages List */}
                        <ScrollArea className="flex-1 p-6 z-10">
                            <div className="space-y-4">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 text-center px-4">
                                        <div className="h-12 w-12 bg-emerald-100/50 rounded-2xl flex items-center justify-center mb-3">
                                            <Send className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">No Messages Yet</p>
                                        <p className="text-xs text-slate-400 mt-1 max-w-[280px]">Start the chat with this lead using the message input below.</p>
                                    </div>
                                ) : (
                                    messages.map((message) => {
                                        const isUser = message.sender === 'user';
                                        const matchesSearch = messageSearchQuery && message.content.toLowerCase().includes(messageSearchQuery.toLowerCase());
                                        const isImage = message.content.startsWith('data:image/');

                                        return (
                                            <div
                                                key={message.id}
                                                className={cn(
                                                    "flex",
                                                    isUser ? "justify-end" : "justify-start"
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        "max-w-[70%] rounded-lg px-4 py-2 shadow-sm relative group transition-all duration-300",
                                                        isUser
                                                            ? "bg-[#d9fdd3] text-slate-900 rounded-tr-none"
                                                            : "bg-white text-slate-900 rounded-tl-none",
                                                        matchesSearch ? "ring-2 ring-indigo-500/80 bg-indigo-50/20" : ""
                                                    )}
                                                >
                                                    {isImage ? (
                                                        <div className="my-1">
                                                            <img
                                                                src={message.content}
                                                                alt="Attachment"
                                                                className="max-h-64 max-w-full rounded-lg object-contain border border-slate-200 bg-slate-50 cursor-pointer hover:opacity-95 transition-opacity"
                                                                onClick={() => {
                                                                    const w = window.open();
                                                                    w?.document.write(`<img src="${message.content}" style="max-width:100%; max-height:100%; display:block; margin:auto;" />`);
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                                    )}
                                                    <div className={cn("text-[9px] text-slate-400 mt-1 flex items-center gap-1 font-semibold", isUser ? "justify-end" : "justify-start")}>
                                                        {format(message.timestamp, 'h:mm a')}
                                                        {isUser && (
                                                            <span className={cn(
                                                                message.status === 'read' ? "text-[#53bdeb]" : "text-slate-400"
                                                            )}>
                                                                {message.status === 'sent' ? (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <CheckCheck className="h-3.5 w-3.5" />
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-200 z-10 relative">
                            {/* Emoji Picker Popover */}
                            {isEmojiOpen && (
                                <div className="absolute bottom-16 left-4 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 w-72 max-h-60 overflow-y-auto animate-in slide-in-from-bottom duration-200">
                                    <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Select Emoji</span>
                                        <button onClick={() => setIsEmojiOpen(false)} className="text-slate-400 hover:text-slate-600">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-8 gap-1.5 justify-items-center">
                                        {emojis.map((emoji, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleEmojiClick(emoji)}
                                                className="text-xl hover:scale-125 transition-transform p-0.5 active:scale-90"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Hidden file input for attachments */}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />

                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn("text-slate-500 rounded-xl hover:bg-slate-50", isEmojiOpen && "bg-slate-100 text-slate-800")}
                                    onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                                >
                                    <Smile className="h-6 w-6" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn("text-slate-500 rounded-xl hover:bg-slate-50", isAttaching && "animate-pulse text-indigo-600")}
                                    onClick={handleAttachmentClick}
                                    disabled={isAttaching}
                                >
                                    {isAttaching ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Paperclip className="h-5 w-5" />
                                    )}
                                </Button>
                                <Input
                                    placeholder="Type a message"
                                    className="flex-1 bg-white border-slate-200 focus-visible:ring-0 focus-visible:border-slate-300 font-medium rounded-xl h-11"
                                    value={messageInput}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageInput(e.target.value)}
                                />
                                <Button 
                                    type="submit" 
                                    size="icon" 
                                    className={cn(
                                        "transition-all h-11 w-11 rounded-xl shrink-0", 
                                        messageInput.trim() ? "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/10" : "bg-slate-100 text-slate-400"
                                    )}
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="h-16 w-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
                            <AlertTriangle className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No Chats Available</h3>
                        <p className="text-sm mt-1 max-w-[280px] text-center">Add a lead with a valid phone number to start chatting via WhatsApp.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
