'use client';
import { useEffect, useRef, useState } from 'react';
import { cn, formatDate, formatRelative, getInitials, TAG_COLORS } from '@/lib/utils';
import api from '@/lib/api';
import { Conversation, Message } from '@/types';
import { toast } from 'sonner';
import {
  Search, Send, Mail, MessageSquare, Bot, User, Pause,
  ChevronLeft, Filter, RefreshCw, Loader2
} from 'lucide-react';

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showList, setShowList] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { if (selected) loadMessages(selected.id); }, [selected]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadConversations() {
    setLoading(true);
    try {
      const r = await api.get('/api/conversations');
      setConversations(r.data.data || []);
      if (r.data.data?.length) setSelected(r.data.data[0]);
    } catch { toast.error('Failed to load inbox'); }
    finally { setLoading(false); }
  }

  async function loadMessages(id: string) {
    setMsgLoading(true);
    try {
      const r = await api.get(`/api/conversations/${id}/messages`);
      setMessages(r.data.data || []);
    } catch { toast.error('Failed to load messages'); }
    finally { setMsgLoading(false); }
  }

  async function sendMessage() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    const optimistic: Message = {
      id: 'temp-' + Date.now(),
      conversationId: selected.id,
      direction: 'OUTBOUND', senderType: 'STAFF',
      content: reply, isAutomated: false,
      createdAt: new Date().toISOString(),
    };
    setMessages(m => [...m, optimistic]);
    setReply('');
    try {
      const r = await api.post(`/api/conversations/${selected.id}/messages`, { content: reply });
      setMessages(m => m.map(msg => msg.id === optimistic.id ? r.data.data : msg));
      setSelected(s => s ? { ...s, automationPaused: true } : s);
      setConversations(cs => cs.map(c => c.id === selected.id
        ? { ...c, automationPaused: true, lastMessageAt: new Date().toISOString(), lastMessage: reply } : c
      ));
    } catch {
      setMessages(m => m.filter(msg => msg.id !== optimistic.id));
      toast.error('Failed to send');
    } finally { setSending(false); }
  }

  const filtered = conversations.filter(c =>
    c.contact.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className={cn(
        'flex flex-col w-full lg:w-80 xl:w-96 border-r border-slate-100 bg-white flex-shrink-0',
        !showList && 'hidden lg:flex'
      )}>
        {/* List header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold font-display text-slate-900">Inbox</h2>
            <button onClick={loadConversations} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex gap-3 p-3">
                  <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-3 w-48 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 px-4 text-center">
              <MessageSquare className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1 text-slate-300">They'll appear when customers fill contact forms or book</p>
            </div>
          ) : filtered.map((c) => {
            const isActive = c.id === selected?.id;
            return (
              <button key={c.id} onClick={() => { setSelected(c); setShowList(false); }}
                className={cn(
                  'w-full text-left p-4 border-b border-slate-50 transition-colors hover:bg-slate-50',
                  isActive && 'bg-blue-50 border-l-2 border-l-blue-600 hover:bg-blue-50'
                )}>
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                    isActive ? 'bg-blue-600' : 'bg-gradient-to-br from-blue-400 to-violet-500'
                  )}>
                    {getInitials(c.contact.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-slate-800 truncate">{c.contact.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {c.lastMessageAt ? formatRelative(c.lastMessageAt) : '—'}
                      </span>
                    </div>
                    {c.lastMessage && (
                      <p className="text-xs text-slate-500 truncate mb-1.5">{c.lastMessage}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', TAG_COLORS[tag] || 'badge-gray')}>
                          {tag}
                        </span>
                      ))}
                      {c.automationPaused && (
                        <span className="badge-gray text-xs px-2 py-0.5 rounded-full font-medium border flex items-center gap-1">
                          <Pause className="w-2.5 h-2.5" />Paused
                        </span>
                      )}
                      {(c.unreadCount ?? 0) > 0 && (
                        <span className="ml-auto bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message thread */}
      <div className={cn(
        'flex-1 flex flex-col bg-slate-50 min-w-0',
        showList && 'hidden lg:flex'
      )}>
        {selected ? (
          <>
            {/* Thread header */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-3 flex-shrink-0">
              <button className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 mr-1"
                onClick={() => setShowList(true)}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {getInitials(selected.contact.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900">{selected.contact.name}</div>
                <div className="text-xs text-slate-400">{selected.contact.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {selected.automationPaused && (
                  <span className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
                    <Pause className="w-3 h-3" /> Automation paused
                  </span>
                )}
                <span className={cn(
                  'text-xs px-2.5 py-1 rounded-full font-medium border',
                  selected.channel === 'EMAIL' ? 'badge-blue' : 'badge-purple'
                )}>
                  {selected.channel === 'EMAIL' ? <><Mail className="w-3 h-3 inline mr-1" />Email</> : <><MessageSquare className="w-3 h-3 inline mr-1" />SMS</>}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {msgLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-400 py-12">
                  <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOut = msg.direction === 'OUTBOUND';
                  const isSystem = msg.senderType === 'SYSTEM';
                  return (
                    <div key={msg.id} className={cn('flex', isOut ? 'justify-end' : 'justify-start')}>
                      {!isOut && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mr-2 flex-shrink-0 self-end">
                          {isSystem ? <Bot className="w-4 h-4 text-slate-500" /> : <User className="w-4 h-4 text-slate-500" />}
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[70%] space-y-1',
                        isOut ? 'items-end' : 'items-start',
                        'flex flex-col'
                      )}>
                        <div className={cn(
                          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                          isOut
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : isSystem
                              ? 'bg-slate-100 text-slate-700 border border-slate-200 rounded-bl-sm'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                        )}>
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-2">
                          {msg.isAutomated && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Bot className="w-3 h-3" /> Automated
                            </span>
                          )}
                          <span className="text-xs text-slate-400">{formatDate(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            <div className="bg-white border-t border-slate-100 p-4 flex-shrink-0">
              {!selected.automationPaused && (
                <div className="flex items-center gap-2 mb-3 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <Pause className="w-3.5 h-3.5 flex-shrink-0" />
                  Sending a message will pause automation for this contact
                </div>
              )}
              <div className="flex gap-3">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type your message... (Enter to send)"
                  rows={2}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={sendMessage}
                  disabled={!reply.trim() || sending}
                  className="w-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-3" />
              <p className="text-lg font-medium text-slate-500">Select a conversation</p>
              <p className="text-sm mt-1">Choose from the list on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
