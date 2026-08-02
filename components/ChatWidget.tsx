"use client";

import { useEffect, useRef, useState } from "react";

type ChatLink = { label: string; href: string };
type Msg = { text: string; from: "user" | "bot"; dz?: boolean; links?: ChatLink[] };
type Faq = {
  id: string;
  label: string;
  prompt: string;
  keywords: string[];
  answer: string;
  dzAnswer?: string;
  links?: ChatLink[];
};

type BotAnswer = {
  text: string;
  dz?: boolean;
  links?: ChatLink[];
};

/** Free, local FAQ assistant: no AI service, database, or API call.
 *  It scores the visitor's question against curated keywords and returns
 *  committee-approved canned answers with links to the right page. */

const DZ_RANGE = /[ༀ-࿿]/;

const FALLBACK: BotAnswer = {
  text:
    "I can help with joining, fees, events, membership status, donations, services, contact, or committee sign-in. For anything specific, send the committee a message on the Contact page.",
  links: [{ label: "Contact committee", href: "/contact" }],
};

const DZ_FALLBACK: BotAnswer = {
  dz: true,
  text:
    "འཐུས་མི་ དང་། གླ་ཡོན། ལས་རིམ། འབྲེལ་བ་ ཚུ་གི་སྐོར་ལས་དྲི་བ་འདྲི་གནང་། ཁ་གསལ་དགོ་པ་ཅིན་ Contact ཤོག་ལེབ་ནང་འབྲེལ་བ་འཐབ་གནང་།",
  links: [{ label: "Contact", href: "/contact" }],
};

const FAQS: Faq[] = [
  {
    id: "greeting",
    label: "Greeting",
    prompt: "Hello",
    keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"],
    answer: "Hello. How can I help you with ABAC today?",
    dzAnswer: "སྐུ་གཟུགས་བཟང་པོ་ལགས། ABAC གི་སྐོར་ལས་ག་ཅི་གི་གྲོགས་རམ་དགོ?",
  },
  {
    id: "fee",
    label: "Membership fee",
    prompt: "How much is membership?",
    keywords: ["fee", "fees", "cost", "much", "price", "payment", "pay", "$20", "adult", "child"],
    answer:
      "Membership is $20 per year for each adult (18 and over). Children under 18 join free. The total is shown at checkout and paid by card when you register.",
    dzAnswer:
      "འཐུས་མིའི་གླ་ཡོན་འདི་ ལོ་ ༡༨ ཡན་ཆད་ཀྱི་མི་རེ་ལུ་ ལོ་རེར་ $20 ཨིན། ལོ་ ༡༨ མན་ཆད་ཚུ་རིན་མེད་ཨིན།",
    links: [{ label: "Join ABAC", href: "/join" }],
  },
  {
    id: "join",
    label: "Join ABAC",
    prompt: "How do I join ABAC?",
    keywords: [
      "join",
      "register",
      "registration",
      "member",
      "membership",
      "sign up",
      "become",
      "new member",
    ],
    answer:
      "Head to the Join page — registration and payment are one step, and your membership number is emailed to you straight away.",
    dzAnswer:
      "ABAC འཐུས་མི་འབད་ནི་ལུ་ Join ཤོག་ལེབ་ནང་ཐོ་བཀོད་འབད་གནང་། ཐོ་བཀོད་ཚར་ཞིནམ་ལས་ འཐུས་མི་ཨང་གྲངས་གློག་འཕྲིན་ནང་འབྱོར་འོང་།",
    links: [{ label: "Open Join page", href: "/join" }],
  },
  {
    id: "events",
    label: "Upcoming events",
    prompt: "What events are coming up?",
    keywords: ["event", "events", "program", "programs", "calendar", "upcoming", "gathering"],
    answer: "See the Events page for what's coming up, plus photos from past gatherings.",
    dzAnswer:
      "ལས་རིམ་གསརཔ་ཚུ་དང་ ཧེ་མའི་འཛོམས་འདུའི་པར་ཚུ་ Events ཤོག་ལེབ་ནང་གཟིགས་གནང་།",
    links: [{ label: "View events", href: "/events" }],
  },
  {
    id: "status",
    label: "Check status",
    prompt: "How do I check my membership status?",
    keywords: [
      "status",
      "check",
      "expiry",
      "expire",
      "expired",
      "renew",
      "renewal",
      "number",
      "membership number",
      "lookup",
    ],
    answer:
      'Tap "Check my status" on the Join page. To renew, submit the Join form again with the same date of birth and CID — your original membership number stays with you.',
    dzAnswer:
      "འཐུས་མིའི་གནས་ཚད་བལྟ་ནི་ལུ་ Join ཤོག་ལེབ་ནང་ “Check my status” གདམ་ཁ་རྐྱབ་གནང་།",
    links: [{ label: "Check status", href: "/join" }],
  },
  {
    id: "donate",
    label: "Donate",
    prompt: "How can I donate?",
    keywords: ["donat", "gift", "support", "contribute", "fundraising", "fund"],
    answer:
      "Donations are separate from membership — see the Donate page. Every gift supports welfare and cultural programs.",
    dzAnswer:
      "ཞལ་འདེབས་འདི་ འཐུས་མིའི་གླ་ཡོན་ལས་སོ་སོ་ཨིན། Donate ཤོག་ལེབ་ནང་གཟིགས་གནང་།",
    links: [{ label: "Donate", href: "/donate" }],
  },
  {
    id: "contact",
    label: "Contact",
    prompt: "How do I contact the committee?",
    keywords: ["contact", "email", "message", "help", "committee", "reply", "question"],
    answer:
      "Use the Contact page to send the committee a message. The site also sends you a confirmation email after your message is submitted.",
    dzAnswer:
      "འཛིན་སྐྱོང་ལུ་འབྲེལ་བ་འཐབ་ནི་ལུ་ Contact ཤོག་ལེབ་ནང་འཕྲིན་ཡིག་བསྐུར་གནང་།",
    links: [{ label: "Contact committee", href: "/contact" }],
  },
  {
    id: "services",
    label: "Services",
    prompt: "What services can ABAC help with?",
    keywords: ["service", "services", "passport", "consular", "support", "welfare", "document"],
    answer:
      "The Services page lists the areas ABAC can help with. For personal documents or sensitive requests, contact the committee directly.",
    dzAnswer:
      "ABAC གི་གྲོགས་རམ་ཞབས་ཏོག་ཚུ་ Services ཤོག་ལེབ་ནང་གཟིགས་གནང་།",
    links: [
      { label: "View services", href: "/services" },
      { label: "Contact committee", href: "/contact" },
    ],
  },
  {
    id: "admin",
    label: "Admin sign-in",
    prompt: "Who can use committee sign-in?",
    keywords: ["admin", "sign in", "signin", "login", "magic link", "committee sign-in", "access"],
    answer:
      "Committee sign-in is for approved admins only. Each approved committee member signs in with their own email using a one-time magic link.",
    dzAnswer:
      "Committee sign-in འདི་ ཆ་འཇོག་ཡོད་པའི་འཛིན་སྐྱོང་མི་ངོ་ཚུ་གི་དོན་ལུ་རྐྱངམ་གཅིག་ཨིན།",
    links: [{ label: "Admin page", href: "/admin" }],
  },
];

const QUICK_PROMPTS = ["join", "fee", "status", "events", "contact"];

function scoreFaq(question: string, faq: Faq) {
  const q = question.toLowerCase();
  return faq.keywords.reduce((score, keyword) => {
    if (q.includes(keyword)) return score + keyword.length;
    const words = keyword.split(" ");
    if (words.length > 1 && words.every((word) => q.includes(word))) return score + 4;
    return score;
  }, 0);
}

function answerFor(question: string, useDz: boolean): BotAnswer {
  const ranked = FAQS.map((faq) => ({ faq, score: scoreFaq(question, faq) })).sort(
    (a, b) => b.score - a.score,
  );
  const best = ranked[0];

  if (!best || best.score === 0) return useDz ? DZ_FALLBACK : FALLBACK;

  return {
    dz: useDz,
    text: useDz && best.faq.dzAnswer ? best.faq.dzAnswer : best.faq.answer,
    links: best.faq.links,
  };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [dzMode, setDzMode] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: "bot",
      text: "Hello. Ask me about joining, fees, events, or checking your membership.",
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
        ? {
            from: "bot",
            dz: true,
            text: "སྐུ་གཟུགས་བཟང་པོ་ལགས། རྫོང་ཁ་ལུ་བསྒྱུར་ཡི། ག་ཅི་གི་གྲོགས་རམ་དགོ?",
          }
        : { from: "bot", text: "Switched to English. How can I help?" },
    ]);
  }

  function send() {
    const q = input.trim();
    if (!q) return;
    sendQuestion(q);
  }

  function sendQuestion(q: string) {
    const isDz = DZ_RANGE.test(q);
    setMessages((m) => [...m, { from: "user", text: q, dz: isDz }]);
    setInput("");
    setTimeout(() => {
      const answer = answerFor(q, isDz || dzMode);
      setMessages((m) => [
        ...m,
        { from: "bot", dz: answer.dz, text: answer.text, links: answer.links },
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
        ?
      </button>

      <div className={open ? "chat-panel open" : "chat-panel"}>
        <div className="chat-head">
          <span className="t">Ask ABAC</span>
          <button className="chat-lang" onClick={toggleLang}>
            {dzMode ? "རྫོང་ཁ | EN" : "EN | རྫོང་ཁ"}
          </button>
        </div>

        <div className="chat-body" ref={bodyRef}>
          <div className="chat-suggestions" aria-label="Suggested questions">
            {QUICK_PROMPTS.map((id) => {
              const faq = FAQS.find((item) => item.id === id);
              if (!faq) return null;
              return (
                <button key={faq.id} type="button" onClick={() => sendQuestion(faq.prompt)}>
                  {faq.label}
                </button>
              );
            })}
          </div>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`msg ${m.from}${m.dz ? " dzt" : ""}`}
            >
              {m.text}
              {i === 0 && (
                <span style={{ fontFamily: "var(--dz)" }}> རྫོང་ཁ་ནང་ཡང་དྲི་ཚུགས།</span>
              )}
              {m.links && m.links.length > 0 && (
                <span className="chat-links">
                  {m.links.map((link) => (
                    <a key={link.href} href={link.href}>
                      {link.label}
                    </a>
                  ))}
                </span>
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
