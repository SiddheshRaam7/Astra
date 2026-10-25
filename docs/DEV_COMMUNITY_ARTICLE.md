# Building financial confidence without asking AI to invent the numbers

Budgeting tools are good at showing history. Decisions need something more specific: what changes if I act now?

For FORK, the central design decision was a single financial state, validated with Zod and represented in integer cents. The dashboard, cash-flow graph, goals, recurring-payment analysis, and decision simulator all read the same model. That makes a salary edit understandable: monthly affordability increases, but checking cash does not magically arrive.

The safe-to-spend calculation is deliberately explainable. It caps remaining monthly discretionary room by actual checking liquidity after pending debits, scheduled bills through payday, and a cash buffer. Emergency savings are a separate protected reserve. The estimate depends on accurate inputs and is presented as an upper limit, not a daily spending target.

The assistant follows the same discipline. Gemini classifies intent into a validated tool. The deterministic engine computes the answer. A write produces a preview and a signed confirmation token bound to the user, financial-state version, and expiry. A person confirms it; the backend saves it; the UI refreshes from that authoritative response. Voice uses the same boundary.

Financial document extraction is another review boundary. Uploaded PDFs and images are untrusted data. Extracted merchants, dates, amounts, terms, evidence and uncertainties appear in a correctable draft. Only confirmed, schema-valid transactions enter the plan. CSV import provides a usable credential-free path without pretending it used AI.

React Flow gives the plan a shape. Recharts gives alternative futures a timeline. Neither substitutes for a reliable engine. The most valuable animation is a number changing for a reason the user understands.

The local demonstration uses synthetic, isolated sessions and file persistence. PostgreSQL, Auth0, Gemini, ElevenLabs and Plaid adapters are implemented with explicit credential gates. Live usage must be verified before making sponsor or production claims. Building the adapter is a milestone; connecting and testing the provider is a separate one.

FORK’s goal is modest and useful: make the next financial decision a little clearer.
