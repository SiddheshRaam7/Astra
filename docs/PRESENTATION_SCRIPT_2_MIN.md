# FORK presentation script — 2 to 3 minutes

## Opening — 0:00–0:25

“Hi, I’m Tarun, and I built **FORK** for the FNB Financial Confidence Challenge.

The challenge asks: *How can technology help people make smarter financial decisions at the moments that matter most?*

FORK is not another generic budgeting chatbot. It is an interactive financial decision-making platform that turns financial information into three things: **understanding, confidence, and action**.”

## Technology and architecture — 0:25–0:55

“FORK is a production-deployed full-stack application built with **Next.js, React, TypeScript, Tailwind CSS, React Flow, Recharts, Motion, and Zustand**.

Behind the interface, **Tiger Data PostgreSQL** securely persists each user’s financial model, **Auth0** provides authentication and user isolation, **Plaid Sandbox** connects synthetic banking data, **Google Gemini** handles natural-language intent and document understanding, and **ElevenLabs** provides a real-time voice experience. It is deployed on **Vercel**, with API credentials kept server-side.

Most importantly, the AI never invents the math. Every financial answer comes from deterministic backend calculations, and any proposed change requires explicit user confirmation.”

## Understanding — 0:55–1:25

“First, FORK creates **understanding**. This command center shows income, expenses, goals, investments, emergency savings, upcoming obligations, and a dynamic spending speedometer—all from one shared financial model.

In Cash Flow, React Flow turns those numbers into an animated, interactive map. Users can drag and inspect nodes, edit an income source or allocation, and immediately see every dependent value recalculate across the application.

Money Leaks detects recurring charges, subscription price increases, and possible overlap, while Financial X-Ray uses Gemini to extract structured information from statements and financial documents for review before anything is imported.”

## Confidence — 1:25–1:55

“Second, FORK builds **confidence** by separating two questions that most budgeting apps confuse: *Can I afford this during the month?* and *Do I safely have the cash today?*

The safe-to-spend engine checks the remaining guilt-free budget, current checking balance, pending transactions, bills through payday, and a protected cash buffer. Emergency savings remain untouched. The result is explainable—not just a green or red answer.”

## Action — 1:55–2:30

“Third, FORK enables **action**. In the Decision Simulator, I can ask what happens if I buy a laptop today, wait until payday, increase my savings, change my income, or compare loan offers. FORK projects two possible futures, highlights shortfalls and tradeoffs, and does not alter real records.

FORK AI is available through text or ElevenLabs voice. I can ask, ‘Can I afford a 900-dollar laptop?’ or say, ‘Move 100 dollars toward my emergency fund.’ Gemini understands the intent, deterministic tools calculate the impact, and FORK previews the change. Nothing is saved until I confirm it.”

## Close — 2:30–2:50

“FORK turns fragmented financial data into a clear next move: **understand where your money is going, feel confident about what is safe, and take informed action at the moment it matters most**.

That is FORK: **a little clarity, a better next move.**”

## Recommended live-demo actions

1. Begin on Overview and point to **Safe to spend today** and the speedometer.
2. Open Cash Flow and move or inspect one animated node.
3. Open Decision Simulator and compare a $900 laptop today versus after payday.
4. Ask FORK AI, by voice if the room is quiet: “Can I afford a $900 laptop?”
5. End on the two projected futures or return to Overview for the closing line.

## Accuracy note

Describe Plaid as **Plaid Sandbox**, not live banking. Describe FORK as a planning and decision-support product, not a bank, lender, broker, fiduciary, or system that initiates transfers.
