"use client";

import { useEffect, useRef, useState } from "react";

/** PROTOTYPE BEHAVIOUR — ported as-is from the original single-file mockup.
 *  This is a keyword matcher, not a chatbot: it scans the question for a few
 *  substrings and returns canned text, and the Dzongkha branch always returns
 *  the same sentence regardless of what was asked.
 *
 *  Phase 4 replaces this with a real endpoint. Until then the answers below
 *  are the ONLY thing it can say, and some of them state facts (fee amounts,
 *  event dates) that the committee has not confirmed. */

type Msg = { text: string; from: "user" | "bot"; dz?: boolean };

const DZ_RANGE = /[ༀ-࿿]/;

const DZ_REPLY =
  "འཐུས་མི་འབད་ནི་ལུ་ Join ཤོག་ལེབ་ནང་ཐོ་བཀོད་འབད་གནང་། ཁ་གསལ་དགོ་པ་ཅིན་ Contact ནང་འབྲེལ་བ་འཐབ་གནང་།";

const FALLBACK =
  "For anything else, send us a message on the Contact page — we reply within 2–3 working days.";

const RULES: { match: string[]; answer: string }[] = [
  {
    match: ["fee", "cost", "much", "price"],
    answer:
      "Membership is $20 per year for each adult (18 and over). Children under 18 join free. The total is shown at checkout and paid by card when you register.",
  },
  {
    match: ["join", "register", "member"],
    answer:
      "Head to the Join page — registration and payment are one step, and your membership number is emailed to you straight away.",
  },
  {
    match: ["event"],
    answer: "See the Events page for what's coming up, plus photos from past gatherings.",
  },
  {
    match: ["status", "check", "expir"],
    answer:
      'Tap "Check my status" on the Join page — enter your email or membership number plus your date of birth. No login needed.',
  },
  {
    match: ["donat"],
    answer:
      "Donations are separate from membership — see the Donate page. Every gift supports welfare and cultural programs.",
  },
];

function answerFor(question: string): string {
  const q = question.toLowerCase();
  return RULES.find((r) => r.match.some((m) => q.includes(m)))?.answer ?? FALLBACK;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [dzMode, setDzMode] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: "bot",
      text: "Hi! Ask me about joining, fees, events, or checking your membership.",
    },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages]);

  function toggleLang() {
    const next = !dzMode;
    setDzMode(next);
    setMessages((m) => [
      ...m,
      next
        ? { from: "bot", dz: true, text: "རྫོང་ཁ་ལུ་བསྒྱུར་ཡི། ག་ཅི་གི་གྲོགས་རམ་དགོ?" }
        : { from: "bot", text: "Switched to English. How can I help?" },
    ]);
  }

  function send() {
    const q = input.trim();
    if (!q) return;
    const isDz = DZ_RANGE.test(q);
    setMessages((m) => [...m, { from: "user", text: q, dz: isDz }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        isDz || dzMode
          ? { from: "bot", dz: true, text: DZ_REPLY }
          : { from: "bot", text: answerFor(q) },
      ]);
    }, 400);
  }

  return (
    <>
      <button
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        aria-expanded={open}
      >
        💬
      </button>

      <div className={open ? "chat-panel open" : "chat-panel"}>
        <div className="chat-head">
          <span className="t">Ask ABAC</span>
          <button className="chat-lang" onClick={toggleLang}>
            {dzMode ? "རྫོང་ཁ | EN" : "EN | རྫོང་ཁ"}
          </button>
        </div>

        <div className="chat-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`msg ${m.from}${m.dz ? " dzt" : ""}`}
            >
              {m.text}
              {i === 0 && (
                <span style={{ fontFamily: "var(--dz)" }}> རྫོང་ཁ་ནང་ཡང་དྲི་ཚུགས།</span>
              )}
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a question…"
            aria-label="Your question"
          />
          <button onClick={send} aria-label="Send">
            ➤
          </button>
        </div>

        <div className="chat-note">
          Please don&apos;t share personal details in chat. For your status, use Check my
          status.
        </div>
      </div>
    </>
  );
}
