'use client';
import { useEffect, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, AudioLines, Check, LoaderCircle, Mic, MicOff, Sparkles, X } from 'lucide-react';
import { useFinance, request } from '@/lib/client-store';
import { currency } from '@/lib/model';
import { Button } from './ui/button';
type Message = {
  role: 'user' | 'assistant';
  text: string;
  provider?: string;
  tool?: string;
  proposal?: {
    token: string;
    preview: {
      before: number;
      after: number;
      beforeSafe: number;
      afterSafe: number;
      warning: string | null;
    };
  };
  done?: boolean;
};
export function AssistantHost() {
  const state = useFinance((s) => s.state),
    open = useFinance((s) => s.aiOpen);
  return state ? (
    <Assistant open={open} setOpen={(value) => useFinance.setState({ aiOpen: value })} />
  ) : null;
}
export function Assistant({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hey, I’m FORK. Let’s make your next money decision a little clearer. Ask what you can afford, explore a what-if, or adjust a goal.',
    },
  ]);
  const [input, setInput] = useState(''),
    [busy, setBusy] = useState(false),
    [voiceBusy, setVoiceBusy] = useState(false),
    [error, setError] = useState(''),
    [muted, setMuted] = useState(false);
  const accept = useFinance((s) => s.accept);
  async function ask(message: string) {
    if (!message.trim()) return;
    setBusy(true);
    setError('');
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: message }]);
    try {
      const data = await request('/api/assistant', { message });
      if (data.highlight) useFinance.setState({ highlightedNode: data.highlight });
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: data.reply,
          provider: data.provider,
          tool: data.tool,
          proposal: data.proposal,
        },
      ]);
      return data.reply as string;
    } catch (e) {
      setError((e as Error).message);
      return 'The request failed. Please review the on-screen error.';
    } finally {
      setBusy(false);
    }
  }
  const conversation = useConversation({
    micMuted: muted,
    onMessage: (message) => {
      const transcript = message.message.trim();
      // Voice activity detection can send punctuation-only transcripts for silence/noise.
      if (!/[\p{L}\p{N}]/u.test(transcript)) return;
      if (message.source === 'user')
        setMessages((m) => [...m, { role: 'user', text: transcript }]);
      else
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: transcript, provider: 'ElevenLabs voice' },
        ]);
    },
    onError: (error) => {
      setError(
        typeof error === 'string' ? error : 'Voice connection failed. Use typed text below.',
      );
    },
    clientTools: {
      askFork: async ({ message }: { message?: unknown }) => {
        if (typeof message !== 'string' || !message.trim())
          return 'Please ask a clear financial question.';
        return (await ask(message)) ?? 'No response. Please use typed text.';
      },
    },
  });
  useEffect(() => {
    if (conversation.status !== 'connected') return;
    const timeout = window.setTimeout(() => {
      void conversation.endSession();
      setError('Voice ended after five minutes to limit usage. Start another session if needed.');
    }, 5 * 60 * 1000);
    return () => window.clearTimeout(timeout);
  }, [conversation.status]);
  async function voice() {
    if (voiceBusy) return;
    setVoiceBusy(true);
    setOpen(true);
    setError('');
    try {
      if (conversation.status === 'connected') {
        await conversation.endSession();
        return;
      }
      const data = await request('/api/voice', {});
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await conversation.startSession({ signedUrl: data.signedUrl, connectionType: 'websocket' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVoiceBusy(false);
    }
  }
  async function confirm(index: number) {
    const m = messages[index];
    if (!m.proposal || m.done) return;
    setBusy(true);
    setError('');
    try {
      const data = await request('/api/assistant', { confirmation: m.proposal.token });
      accept(data.state);
      setMessages((all) =>
        all
          .map((item, i) => (i === index ? { ...item, done: true } : item))
          .concat({ role: 'assistant', text: data.reply }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="ai-dock" onClick={() => setOpen(!open)} aria-label="Open FORK AI">
        <span className="ai-orb">
          <AudioLines size={21} />
        </span>
        <span>
          <strong>A little clarity, whenever you need it.</strong>
          <small>Ask FORK anything about your money</small>
        </span>
        <span className="dock-shortcut">
          <Sparkles size={15} /> FORK AI
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.aside
            className="assistant-panel"
            initial={{ opacity: 0, x: 35 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 35 }}
          >
            <header>
              <span className="ai-orb">
                <AudioLines size={22} />
              </span>
              <div>
                <strong>Your money, understood.</strong>
                <small>
                  FORK AI ·{' '}
                  {conversation.status === 'connected'
                    ? conversation.isSpeaking
                      ? 'Speaking'
                      : 'Listening'
                    : busy
                      ? 'Thinking'
                      : 'Ready when you are'}
                </small>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setOpen(false);
                  void conversation.endSession();
                }}
                aria-label="Close assistant"
              >
                <X size={18} />
              </Button>
            </header>
            <div className="messages" aria-live="polite">
              {messages.map((m, i) => (
                <div key={i} className={`message ${m.role}`}>
                  <p>{m.text}</p>
                  {m.provider && (
                    <small className="message-provider">
                      {m.provider}
                      {m.tool ? ` · ${m.tool}` : ''}
                    </small>
                  )}
                  {m.proposal && (
                    <div className="proposal">
                      <span>Remaining monthly allowance</span>
                      <strong>
                        {currency(m.proposal.preview.before)} <span>→</span>{' '}
                        {currency(m.proposal.preview.after)}
                      </strong>
                      <span>
                        Safe today: {currency(m.proposal.preview.beforeSafe)} →{' '}
                        {currency(m.proposal.preview.afterSafe)}
                      </span>
                      {m.proposal.preview.warning && (
                        <p className="warning-text">{m.proposal.preview.warning}</p>
                      )}
                      <Button disabled={busy || m.done} onClick={() => confirm(i)}>
                        {m.done ? (
                          <>
                            <Check size={15} /> Saved
                          </>
                        ) : (
                          'Confirm change'
                        )}
                      </Button>
                      {!m.done && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setMessages((all) =>
                              all.map((item, index) =>
                                index === i
                                  ? {
                                      ...item,
                                      proposal: undefined,
                                      text: item.text + ' Proposal dismissed; nothing was changed.',
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {busy && (
                <div className="thinking">
                  <LoaderCircle className="spin" size={16} /> Checking your numbers…
                </div>
              )}
            </div>
            <div className="suggestions">
              {[
                'How much can I safely spend today?',
                'Can I afford a $900 laptop?',
                'Save another $200 for my NYC trip.',
              ].map((q) => (
                <button key={q} disabled={busy} onClick={() => ask(q)}>
                  {q}
                </button>
              ))}
            </div>
            {error && (
              <div role="alert" className="assistant-error">
                {error}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy) void ask(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Let’s talk money…"
                aria-label="Message FORK AI"
                maxLength={2000}
              />
              <Button disabled={busy || !input.trim()} size="icon" aria-label="Send message">
                <ArrowUp size={18} />
              </Button>
            </form>
            <footer>
              <button onClick={voice} disabled={voiceBusy}>
                <Mic size={16} />
                {voiceBusy
                  ? 'Connecting…'
                  : conversation.status === 'connected'
                    ? 'End voice'
                    : 'Start voice conversation'}
              </button>
              {conversation.status === 'connected' && (
                <button
                  onClick={() => setMuted(!muted)}
                  aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {muted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
              <small>Planning tools only. You confirm every change.</small>
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
