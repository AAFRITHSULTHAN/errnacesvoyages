import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Search, MoreVertical, Paperclip, Send, Smile, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
};

const MOCK_CONTACTS: Contact[] = [
    {
        id: '1',
        name: 'Sarah Wilson',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        lastMessage: 'Is the Bali tour still available?',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 5),
        unreadCount: 2,
        status: 'online',
    },
    {
        id: '2',
        name: 'Michael Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        lastMessage: 'Great, thanks for the info!',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
        status: 'offline',
    },
    {
        id: '3',
        name: 'Emma Davis',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
        lastMessage: 'When is the payment due?',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
        status: 'online',
    }
];

const MOCK_MESSAGES: Message[] = [
    {
        id: '1',
        content: 'Hi! I saw your Bali tour package on the website.',
        sender: 'contact',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: 'read'
    },
    {
        id: '2',
        content: 'Hello Sarah! Yes, it is one of our most popular packages. Are you looking to travel soon?',
        sender: 'user',
        timestamp: new Date(Date.now() - 1000 * 60 * 28),
        status: 'read'
    },
    {
        id: '3',
        content: 'I was thinking about next month. Is there availability for the 15th?',
        sender: 'contact',
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
        status: 'read'
    },
    {
        id: '4',
        content: 'Let me check that for you right away.',
        sender: 'user',
        timestamp: new Date(Date.now() - 1000 * 60 * 24),
        status: 'read'
    },
    {
        id: '5',
        content: 'Yes, we have 4 spots left for the 15th departure!',
        sender: 'user',
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
        status: 'read'
    },
    {
        id: '6',
        content: 'Is the Bali tour still available?',
        sender: 'contact',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        status: 'delivered'
    }
];

export function WhatsApp() {
    const [selectedContact, setSelectedContact] = useState<Contact>(MOCK_CONTACTS[0]);
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        const newMessage: Message = {
            id: crypto.randomUUID(),
            content: messageInput,
            sender: 'user',
            timestamp: new Date(),
            status: 'sent',
        };

        setMessages([...messages, newMessage]);
        setMessageInput('');
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] min-h-[500px] bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm animate-in fade-in duration-500">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50">
                <div className="p-4 border-b border-slate-200 bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search or start new chat" className="pl-9 bg-slate-100 border-none" />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="flex flex-col">
                        {MOCK_CONTACTS.map((contact) => (
                            <button
                                key={contact.id}
                                className={cn(
                                    "flex items-center gap-3 p-4 hover:bg-slate-100 transition-colors text-left",
                                    selectedContact.id === contact.id ? "bg-slate-100" : ""
                                )}
                                onClick={() => setSelectedContact(contact)}
                            >
                                <div className="relative">
                                    <Avatar className="h-12 w-12 border border-slate-200">
                                        <AvatarImage src={contact.avatar} />
                                        <AvatarFallback>{contact.name[0]}</AvatarFallback>
                                    </Avatar>
                                    {contact.status === 'online' && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-semibold text-slate-900 truncate">{contact.name}</span>
                                        <span className="text-xs text-slate-500 whitespace-nowrap">
                                            {format(contact.lastMessageTime, 'h:mm a')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-slate-600 truncate flex-1 mr-2">
                                            {contact.lastMessage}
                                        </p>
                                        {contact.unreadCount && (
                                            <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                                {contact.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-[#efeae2]/10 relative">
                {/* Chat Background Pattern Opacity Overlay */}
                <div className="absolute inset-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-[0.03] pointer-events-none" />

                {/* Chat Header */}
                <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-10">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-200">
                            <AvatarImage src={selectedContact.avatar} />
                            <AvatarFallback>{selectedContact.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-semibold text-slate-900">{selectedContact.name}</h3>
                            <p className="text-xs text-slate-500">
                                {selectedContact.status === 'online' ? 'Online' : 'Last seen recently'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-slate-500">
                            <Search className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-slate-500">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Messages List */}
                <ScrollArea className="flex-1 p-6 z-10">
                    <div className="space-y-4">
                        {messages.map((message) => {
                            const isUser = message.sender === 'user';
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
                                            "max-w-[70%] rounded-lg px-4 py-2 shadow-sm relative group",
                                            isUser
                                                ? "bg-[#d9fdd3] text-slate-900 rounded-tr-none"
                                                : "bg-white text-slate-900 rounded-tl-none"
                                        )}
                                    >
                                        <p className="text-sm leading-relaxed">{message.content}</p>
                                        <div className={cn("text-[10px] text-slate-500 mt-1 flex items-center gap-1", isUser ? "justify-end" : "justify-start")}>
                                            {format(message.timestamp, 'h:mm a')}
                                            {isUser && (
                                                <span className={cn(
                                                    message.status === 'read' ? "text-red-500" : "text-slate-400"
                                                )}>
                                                    <CheckCheck className="h-3 w-3" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div id="messages-end" />
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-200 z-10">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="icon" className="text-slate-500">
                            <Smile className="h-6 w-6" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="text-slate-500">
                            <Paperclip className="h-5 w-5" />
                        </Button>
                        <Input
                            placeholder="Type a message"
                            className="flex-1 bg-white border-slate-200 focus-visible:ring-0 focus-visible:border-slate-300"
                            value={messageInput}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageInput(e.target.value)}
                        />
                        <Button type="submit" size="icon" className={cn("transition-all", messageInput.trim() ? "bg-green-600 hover:bg-green-700 text-white" : "bg-slate-100 text-slate-400")}>
                            <Send className="h-5 w-5" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
