# PayAgent: Enterprise Procure-to-Pay Copilot Powered by PayPal & LLM Reasoning

> Autonomous B2B Procurement agent that turns unstructured natural language requests into compliant, auditable PayPal Sandbox orders with deterministic Human-in-the-Loop oversight.

[![PayPal AI Hackathon](https://img.shields.io/badge/PayPal-AI%20Hackathon%202026-blue)](https://devpost.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![PayPal Sandbox](https://img.shields.io/badge/PayPal%20API-Orders%20v2%20%7C%20Invoicing%20v2-003087)](https://developer.paypal.com)
[![AG Grid](https://img.shields.io/badge/UI-AG%20Grid%20Enterprise-orange)](https://www.ag-grid.com)
[![Persistence](https://img.shields.io/badge/Database-Firebase%20Firestore-yellow)](https://firebase.google.com)

---

## 📌 Overview

In modern enterprises, the traditional B2B procurement cycle (**Procure-to-Pay**) suffers from an average latency of **3 to 15 business days**. This delay stems from fragmented manual quote gathering, policy checks across departmental silos, repetitive purchase order generation, and reactive handling of payment exceptions.

**PayAgent** solves this by putting an autonomous agent behind the steering wheel of the **PayPal Developer Platform**:
1. **Understands Intent:** Parses complex natural language purchase requests into strictly typed JSON schemas.
2. **Deterministic Governance:** Automatically validates corporate budget caps and spending policies.
3. **Executes Financial Primitives:** Directly orchestrates the **PayPal Sandbox API** (`Orders v2` / `Invoicing v2`).
4. **Human-in-the-Loop (HITL):** Purchases exceeding internal spending thresholds are suspended for one-click executive approval via an interactive **AG Grid** financial dashboard.
5. **Self-Healing Transactions:** Evaluates PayPal Sandbox error simulation headers (`PayPal-Mock-Response`) to handle declines gracefully before transaction failure.

---

## 🏆 Target Prize Categories

- **Best Use of Agentic Commerce ($5,000):** Autonomous multi-step decision pipeline combining LLM reasoning, policy enforcement, and live PayPal Sandbox order execution.
- **Best Use of PayPal + AI ($5,000):** Deep server-side integration with PayPal REST APIs (`/v1/oauth2/token`, `/v2/checkout/orders`) paired with intelligent Negative Testing handling.
- **Best Use of AG Grid ($1,000 – $5,000):** Enterprise-grade financial table providing real-time transaction updates, status tracking, and inline approval triggers.
- **Best Use of Render:** Architected for zero-downtime deployment on Render Web Services.

