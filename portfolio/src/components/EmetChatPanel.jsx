import { useEffect, useRef, useState } from "react";
import { askEmet, createEmetId, EMET_SUGGESTIONS } from "../emet/emetChat";

const MAX_QUESTION_LENGTH = 280;

export default function EmetChatPanel({ panelSide = "right", onClose, onDestination }) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { id: "welcome", role: "assistant", text: "Ask me about Ansar’s work, projects, or experience." },
  ]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll("button:not([disabled]), input:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const submit = async (value) => {
    const cleanQuestion = value.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!cleanQuestion || loading) return;
    setQuestion("");
    setNotice("");
    setMessages((current) => [...current, { id: createEmetId(), role: "user", text: cleanQuestion }]);
    setLoading(true);
    try {
      const reply = await askEmet(cleanQuestion);
      setMessages((current) => [...current, {
        id: createEmetId(),
        role: "assistant",
        text: reply.answer,
        destination: reply.destination,
      }]);
      if (reply.source === "fallback") setNotice("AI link offline — showing Emet’s built-in guide.");
    } catch (error) {
      setNotice(error?.status === 429
        ? "Emet needs a quick recharge. Try again in a minute."
        : "Emet’s AI link is unavailable right now.");
    } finally {
      setLoading(false);
      window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  };

  return (
    <section
      ref={dialogRef}
      id="emet-ai-chat"
      className={`bb8-edge-chat bb8-edge-panel--${panelSide}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emet-chat-title"
    >
      <header className="bb8-edge-chat-heading">
        <div><span>Emet online</span><strong id="emet-chat-title">Ask about Ansar</strong></div>
        <button type="button" onClick={onClose} aria-label="Close Emet chat">×</button>
      </header>

      <div ref={messagesRef} className="bb8-edge-chat-messages" aria-live="polite" aria-busy={loading}>
        {messages.map((message) => (
          <div key={message.id} className={`bb8-edge-chat-message bb8-edge-chat-message--${message.role}`}>
            <p>{message.text}</p>
            {message.destination && message.role === "assistant" && (
              <button type="button" onClick={() => onDestination(message.destination)}>Show me</button>
            )}
          </div>
        ))}
        {loading && <div className="bb8-edge-chat-thinking" role="status">Emet is thinking<span>…</span></div>}
      </div>

      {messages.length === 1 && (
        <div className="bb8-edge-chat-suggestions" aria-label="Suggested questions">
          {EMET_SUGGESTIONS.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => submit(suggestion)}>{suggestion}</button>
          ))}
        </div>
      )}

      <form
        className="bb8-edge-chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(question);
        }}
      >
        <label htmlFor="emet-chat-question">Ask Emet a question</label>
        <div>
          <input
            ref={inputRef}
            id="emet-chat-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value.slice(0, MAX_QUESTION_LENGTH))}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="What does Ansar build?"
            autoComplete="off"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !question.trim()}>Send</button>
        </div>
      </form>
      <p className="bb8-edge-chat-note">{notice || "AI-generated answers may make mistakes. Portfolio topics only."}</p>
    </section>
  );
}
