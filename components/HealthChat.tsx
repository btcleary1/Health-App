'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, X, Plus, ArrowUp, Loader2 } from 'lucide-react';
import { usePersonContext } from '@/lib/PersonContext';

// The Cleary Health chat, on every signed-in page. It can log events, visits and notes, read this
// person's records and explain the latest Deep Medical Analysis. Chats live only in this tab's memory.
// Other screens open it with: window.dispatchEvent(new CustomEvent('health-chat:open', { detail: { prompt } }))

type LoggedItem = { kind: 'event' | 'visit' | 'note'; id: string; date: string; title: string; detail: string };
type Action = { type: 'logged'; items: LoggedItem[] } | { type: 'removed'; items: LoggedItem[] } | { type: 'navigate'; path: string; title: string };
type Msg = { id: string; role: 'user' | 'assistant'; content: string; actions?: Action[]; undone?: boolean; error?: boolean };

const HIDDEN = ['/login', '/register', '/forgot-password', '/reset-password', '/agree', '/terms', '/privacy', '/setup'];
const DISCLAIMER = 'AI, not a person. Not medical advice. In an emergency, call 911.';
const EXAMPLES = ['Log: chest pain yesterday at 3 PM, mild, about 10 minutes', 'Explain the Deep Medical Analysis', 'What should I ask at the next visit?', 'Add a note: tired after soccer today'];
const rid = () => Math.random().toString(36).slice(2);
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const KIND: Record<LoggedItem['kind'], string> = { event: 'Event', visit: 'Visit', note: 'Note' };

export function openHealthChat(prompt?: string) {
  window.dispatchEvent(new CustomEvent('health-chat:open', { detail: { prompt } }));
}

export default function HealthChat() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { activeId, activePerson } = usePersonContext();
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hidden = HIDDEN.some((p) => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    if (hidden) return;
    fetch('/api/auth/me').then((r) => setSignedIn(r.ok)).catch(() => setSignedIn(false));
  }, [hidden, pathname]);

  // A new conversation for each person: records never mix.
  useEffect(() => setMsgs([]), [activeId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      const mine: Msg = { id: rid(), role: 'user', content: t };
      const convo = [...msgs.filter((m) => !m.error), mine];
      setMsgs((m) => [...m, mine]);
      setInput('');
      setBusy(true);
      try {
        const res = await fetch('/api/health-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: activeId, today: localToday(), messages: convo.map(({ role, content }) => ({ role, content })) }),
        });
        const d = (await res.json().catch(() => ({}))) as { reply?: string; actions?: Action[]; error?: string };
        if (!res.ok || !d.reply) throw new Error(d.error || "The chat didn't answer.");
        setMsgs((m) => [...m, { id: rid(), role: 'assistant', content: d.reply!, actions: d.actions }]);
        if (d.actions?.some((a) => a.type === 'logged' || a.type === 'removed')) window.dispatchEvent(new Event('health-data:changed'));
        const nav = d.actions?.find((a): a is Extract<Action, { type: 'navigate' }> => a.type === 'navigate');
        if (nav) {
          if (window.matchMedia('(max-width: 640px)').matches) setOpen(false);
          router.push(nav.path);
        }
      } catch (e) {
        const net = e instanceof TypeError || /failed to fetch|load failed|network/i.test((e as Error).message);
        setMsgs((m) => [...m, { id: rid(), role: 'assistant', content: net ? "Couldn't connect. Check your connection and try again." : (e as Error).message, error: true }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, msgs, activeId, router]
  );

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const prompt = (e as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (prompt) setTimeout(() => send(prompt), 0);
    };
    window.addEventListener('health-chat:open', onOpen);
    return () => window.removeEventListener('health-chat:open', onOpen);
  }, [send]);

  async function undo(msgId: string, items: LoggedItem[]) {
    const res = await fetch('/api/health-chat/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: activeId, items: items.map(({ kind, id }) => ({ kind, id })) }),
    }).catch(() => null);
    if (res?.ok) {
      setMsgs((m) => m.map((x) => (x.id === msgId ? { ...x, undone: true } : x)));
      window.dispatchEvent(new Event('health-data:changed'));
    }
  }

  if (hidden || !signedIn) return null;
  const who = activePerson?.name;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed right-4 z-[60] flex items-center gap-2 rounded-full pl-4 pr-5 text-white font-semibold shadow-lg"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)', minHeight: 52, background: '#2563EB' }}
        >
          <MessageCircle className="w-5 h-5" aria-hidden />
          Chat
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-label="Health chat">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="relative w-full sm:w-[420px] flex flex-col text-gray-100 rounded-t-2xl sm:rounded-none"
            style={{ height: 'min(92dvh, 100%)', background: '#16181B', borderLeft: '1px solid #2A2D32', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #2A2D32' }}>
              <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: '#1E2024', border: '1px solid #2A2D32' }}>
                <MessageCircle className="w-5 h-5 text-blue-400" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold leading-tight">Health chat</div>
                <div className="text-xs text-gray-400 truncate">AI, not a person{who ? ` · About ${who}` : ''}</div>
              </div>
              <button type="button" className="w-11 h-11 grid place-items-center rounded-lg text-gray-300 hover:bg-white/5" onClick={() => setMsgs([])} aria-label="New chat" title="New chat">
                <Plus className="w-5 h-5" />
              </button>
              <button type="button" className="w-11 h-11 grid place-items-center rounded-lg text-gray-300 hover:bg-white/5" onClick={() => setOpen(false)} aria-label="Close chat" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
              {msgs.length === 0 && (
                <div className="space-y-3 text-sm">
                  <p className="text-gray-300">
                    Tell me what happened and I&apos;ll log it as an event, a doctor visit or a note{who ? ` for ${who}` : ''}. You can also ask about the records or the latest Deep Medical Analysis.
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
                    <li>I&apos;m an AI, not a doctor, nurse or any healthcare professional. I can be wrong.</li>
                    <li>Nothing here is medical advice, a diagnosis or treatment. Bring questions to the doctor.</li>
                    <li>I won&apos;t answer questions about medicines or doses. Ask the doctor or pharmacist.</li>
                    <li>In an emergency, call 911.</li>
                    <li>Chats aren&apos;t saved. What I log is saved to the records, with an Undo button.</li>
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {EXAMPLES.map((ex) => (
                      <button key={ex} type="button" onClick={() => send(ex)} className="text-left text-xs rounded-lg px-3 py-2 text-gray-200 hover:bg-white/5" style={{ border: '1px solid #3A3E45', minHeight: 44 }}>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m) => (m.role === 'user' ? <div key={m.id} className="ml-10 rounded-2xl px-4 py-2.5 text-sm" style={{ background: '#1D2A44', border: '1px solid #2B4170' }}>{m.content}</div> : <Bubble key={m.id} m={m} onUndo={undo} />))}
              {busy && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
                </div>
              )}
            </div>

            <form
              className="px-3 pt-3 pb-2"
              style={{ borderTop: '1px solid #2A2D32' }}
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  maxLength={2000}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="e.g. Log a visit with Dr. Sarah today"
                  aria-label="Message"
                  className="flex-1 resize-none rounded-xl px-3 py-3 text-base text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
                  style={{ background: '#1E2024', border: '1px solid #3A3E45', minHeight: 48, maxHeight: 140 }}
                />
                <button type="submit" disabled={!input.trim() || busy} aria-label="Send" className="w-12 h-12 rounded-xl grid place-items-center text-white disabled:opacity-40" style={{ background: '#2563EB' }}>
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] text-gray-500 text-center mt-2">{DISCLAIMER}</p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ m, onUndo }: { m: Msg; onUndo: (msgId: string, items: LoggedItem[]) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className={`mr-6 rounded-2xl px-4 py-3 text-sm space-y-2 ${m.error ? 'text-red-200' : 'text-gray-100'}`} style={{ background: '#1E2024', border: `1px solid ${m.error ? 'rgba(255,107,107,0.4)' : '#2A2D32'}` }}>
      <Rich text={m.content} />
      {m.actions?.map((a, i) => {
        if (a.type === 'navigate') return null;
        const logged = a.type === 'logged';
        return (
          <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: '#16181B', border: '1px solid #2A2D32' }} role="status">
            <div className="flex items-center justify-between gap-2">
              <b>{logged ? `${a.items.length === 1 ? KIND[a.items[0].kind] : `${a.items.length} entries`} saved` : 'Removed'}</b>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${m.undone || !logged ? 'text-gray-400 bg-white/5' : 'text-green-300 bg-green-500/10'}`}>{m.undone ? 'UNDONE' : logged ? 'SAVED' : 'DELETED'}</span>
            </div>
            <ul className="space-y-1">
              {a.items.map((it) => (
                <li key={it.id} className="text-xs">
                  <span className="text-gray-400">{it.date} · </span>
                  <span className="capitalize">{it.title}</span>
                  {it.detail && <span className="block text-gray-400">{it.detail}</span>}
                </li>
              ))}
            </ul>
            {logged && !m.undone && (
              <button
                type="button"
                disabled={busy}
                className="rounded-lg px-4 text-sm font-semibold text-gray-100 disabled:opacity-50"
                style={{ border: '1px solid #3A3E45', background: '#1E2024', minHeight: 44 }}
                onClick={async () => {
                  setBusy(true);
                  await onUndo(m.id, a.items);
                  setBusy(false);
                }}
              >
                {busy ? 'Undoing…' : 'Undo'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Light markdown: paragraphs, "-" lists and **bold**.
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l)))
          return (
            <ul key={i} className="list-disc pl-5 space-y-0.5">
              {lines.map((l, j) => (
                <li key={j}>{bold(l.replace(/^\s*([-*•]|\d+\.)\s+/, ''))}</li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="whitespace-pre-wrap">
            {bold(b)}
          </p>
        );
      })}
    </>
  );
}
function bold(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>));
}
