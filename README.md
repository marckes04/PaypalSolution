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


# PayAgent ⚡ B2B Procure-to-Pay Autonomous Copilot

PayAgent automates corporate B2B procurement by combining natural language processing, budget policy governance, and direct integration with the PayPal Developer Platform.

[![Live Demo](https://img.shields.io/badge/Demo-Vercel-black?style=for-the-badge&logo=vercel)](YOUR_VERCEL_APP_URL)
[![Video Demo](https://img.shields.io/badge/Video-YouTube-red?style=for-the-badge&logo=youtube)](YOUR_YOUTUBE_VIDEO_URL)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

## 📌 Key Features

1. **AI Requisition Copilot:** Parses natural language purchase requests into structured entities (item, quantity, unit price, department).
2. **Deterministic Governance:** Automatically checks spend against departmental policies and workspace boundaries.
3. **Straight-Through Processing (STP):** Purchases under **$500.00** are verified and approved automatically.
4. **Human-in-the-Loop (HITL) with PayPal:** Purchases $\ge \$500.00$ automatically generate a PayPal Sandbox order and an executive approval link.
5. **Real-Time AG Grid Ledger:** Displays purchase orders and live transaction statuses backed by Google Cloud Firestore (REST API).

---

## 🏆 Target Prize Categories

- **Best Use of Agentic Commerce ($5,000)**
- **Best Use of PayPal + AI ($5,000)**
- **Best Use of AG Grid ($1,000 – $5,000)**

---

## 🛠️ Tech Stack

- **Frontend & Backend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Payments:** PayPal Orders v2 REST API (Sandbox)
- **Data Table:** AG Grid (`ag-grid-react`, `ag-grid-community`)
- **Database:** Google Cloud Firestore (REST API)
- **Hosting:** Vercel

---

## 🚀 Getting Started

### 1. Environment Setup
Create a `.env.local` file in the root directory:

```env
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret
PAYPAL_API_BASE=[https://api-m.sandbox.paypal.com](https://api-m.sandbox.paypal.com)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id

Run the Application

Bash
# Install dependencies
npm install

# Start development server
npm run dev

Access the app at http://localhost:3000.

In order to check the official document of architecture. See in the following Link. https://docs.google.com/document/d/1eSSgQ76nTmlYjSK0ltXCBDu-zSlkBOWZ6CzBXYZF_2w/edit?tab=t.0#heading=h.2xfzo13iavtj

📄 License
This project is licensed under the MIT License


