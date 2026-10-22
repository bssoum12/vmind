# 📋 Kanban Board: Commercial AI Supervisor Agent

> **Strategic Framework & Operational Roadmap**  
> Based on sales steering functional guidelines and tailored specifically to the VMIND multi-agent ecosystem (**Sourcing Agent** ➔ **Prospect Agent**).

---

## 🧭 1. Vision & Scope Summary

Sales steering in VMIND undergoes a paradigm shift: **it now supervises a 100% autonomous AI agent team**, with human sales reps positioned downstream to handle qualified meetings, quote delivery, and deal closing.

### The Supervised Funnel:
$$\text{Sourcing Agent (Leads)} \longrightarrow \text{Qualification Agent (ICP)} \longrightarrow \text{Mailing Agent (Outreach)} \longrightarrow \text{Replies / Meetings} \longrightarrow \text{Human Closer (Closing)}$$

---

## 📊 2. High-Level Kanban Board

| 🟢 DONE (In Production) | 🟡 READY (Existing VMIND Data) | 🔵 PENDING (Internal Specs) | 🔴 BLOCKED (External Dependencies Required) |
| :--- | :--- | :--- | :--- |
| • 2D Interactive Force Graph | • Global Pipeline Funnel | • LLM Scoring Drift Detection | • Revenue & Realized Margins (**ERP**) |
| • Diagnostic Side Drawers | • Sourcing / Qualif Mismatch | • Email Subject Line Fatigue | • Booked Meetings & Cost/Meeting (**Calendar**) |
| • Fleet Full Audit Modal | • Data Health & Completeness | • Human Quality Sampling | • Phone Call Tracking & Audio AI (**VoIP**) |
| • Company Context Modal | • Priority Alerts (>48h Idle Hot Leads) | • Weekly Manager Standup Summary | • Domain & Spam Reputation (**Postmaster API**) |
| • Marketplace Card & Routing | • Actionable Recommendation Engine | • ICP Score Threshold Calibration | • Automated A/B Split-Testing (**n8n Engine**) |
| | • Fleet Health & Activity Dashboard | | • Executive Conversational Chatbot (**SQL RAG**) |

---

## 🟢 3. Column 1: DONE / IN PRODUCTION

| ID | Module / Task | Description & Deliverable | Code Component |
| :--- | :--- | :--- | :--- |
| **KBN-01** | **2D Interactive Network Map** | Interactive force-directed graph (Obsidian-style physics engine) modeling Sourcing ➔ Prospect agent pipelines, real-time health badges, and lead routing links. | [`SupervisorGraphCanvas.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorGraphCanvas.tsx) |
| **KBN-02** | **Diagnostic Side Drawers** | Sliding drawers rendering detailed unit diagnostics for individual agents (Nodes) or pipelines (Edges), complete with a 0-100% health score and actionable findings. | [`NodeDiagnosticDrawer.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/NodeDiagnosticDrawer.tsx), [`EdgeDiagnosticDrawer.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/EdgeDiagnosticDrawer.tsx) |
| **KBN-03** | **Full Fleet Audit Modal** | One-click global audit simulation evaluating fleet-wide compliance across all active Sourcing and Prospect agents. | [`FullFleetAuditModal.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/FullFleetAuditModal.tsx) |
| **KBN-04** | **Company Strategic Context** | Input and storage of company value proposition, ideal customer profile (ICP), and key competitors serving as reference benchmarks for the supervisor. | [`CompanyContextModal.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/CompanyContextModal.tsx) |
| **KBN-05** | **Marketplace Card & Direct Routing** | Replaced the *Client Onboarding* card on the Marketplace with the *Superviseur Commercial* card, routing directly to the dedicated workspace upon deployment. | [`MarketplaceView.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/marketplace/MarketplaceView.tsx) |

---

## 🟡 4. Column 2: READY TO BUILD (Existing VMIND Data - Phase 1 MVP)

> These modules leverage data **already stored** in PostgreSQL `vmind_memory` (`prospect_agent_leads`, `prospect_agent_qualifications`, `prospect_agent_emails_envoyes`, `prospect_agent_logs_execution`). No third-party integrations are required.

### KBN-10: Visual Pipeline Funnel (Global Conversion Funnel)
- **Objective**: Measure and display conversion rates at each pipeline stage:
  1. **Sourced Leads**: Total volume gathered by Sourcing Agents (`origin_agent = 'sourcing_agent'`).
  2. **Qualified Leads**: Leads successfully passing the ICP filter (`est_qualifie = true`).
  3. **Contacted Leads**: Leads that received at least one outreach email (`emails_count > 0` and status `'SENT'`).
  4. **Engaged Leads**: Positive replies / hot prospects ready for human sales reps.
- **Key Metrics / Formulas**:
  - Qualification Rate: $\frac{\text{Qualified Leads}}{\text{Sourced Leads}} \times 100$
  - Contactability Rate: $\frac{\text{Delivered Emails}}{\text{Qualified Leads}} \times 100$
- **VMIND Data**: Tables `prospect_agent_leads`, `prospect_agent_qualifications`, `prospect_agent_emails_envoyes`.

### KBN-11: Sourcing ➔ Prospection Mismatch Detector
- **Objective**: Identify frictions between the targeting criteria set in the Sourcing Agent and the qualification rules of the Prospect Agent.
- **Key Metric**: Rejection rate by reason (e.g., 60% of leads rejected due to "Out of geographic territory" or "Company size mismatch").
- **Generated Suggestion**: *"Narrow the industry filter in the Sourcing Agent to save lead enrichment credits."*
- **VMIND Data**: `prospect_agent_qualifications.raison` and `statut_traitement`.

### KBN-12: Data Health & Completeness Dashboard
- **Objective**: Prevent CRM degradation from incomplete or invalid records.
- **Measured Indicators**:
  - **Phone Enrichment Rate**: % of leads with `telephone_revealed = true`.
  - **Email Deliverability Rate**: Ratio of sent emails without delivery failure.
  - **Duplicate Rate**: Number of duplicate leads identified on identical domains/emails and consolidated.
- **VMIND Data**: `prospect_agent_leads` (columns `email`, `telephone`, `telephone_revealed`, `entreprise`).

### KBN-13: Actionable Recommendation Engine (Document Standard)
- **Objective**: Deliver recommendations strictly formatted as requested in the executive specification:
  - **Quantified Observation**: *"Industry X yields 3x more positive replies."*
  - **Probable Cause**: *"Strong resonance between your value proposition and this vertical."*
  - **Proposed Action**: *"Reallocate 60% of sourcing quota towards Industry X."*
  - **Estimated Impact**: *"+25% qualified leads per week."*
  - **Priority**: *High / Medium / Low*
  - **Feedback Loop**: Action buttons `[ Apply ]`, `[ Edit ]`, `[ Dismiss ]`.

### KBN-14: Priority Operational Alerts (Hot Leads & Bounce Spikes)
- **Objective**: Prevent sales pipeline leakage and safeguard domain health:
  - **Unattended Hot Lead**: Triggers if a prospect with `potentiel = 'Eleve'` or `score >= 85` has seen no human sales interaction for over 48 hours.
  - **Delivery Failure Spike**: Triggers if email error rate exceeds 5% over a 24-hour window.
- **VMIND Data**: `prospect_agent_qualifications.timestamp`, `prospect_agent_emails_envoyes.statut`.

---

## 🔵 5. Column 3: PENDING INTERNAL SPECIFICATIONS (Phase 2)

> Features feasible in the medium term, requiring business alignment and minor schema adjustments.

### KBN-20: LLM Scoring Drift Detection Over Time
- **Objective**: Detect whether the qualification LLM becomes overly strict or excessively lenient without configuration changes.
- **Internal Prerequisite**: Define time-window sampling (14-day rolling average vs 30-day baseline).

### KBN-21: Sequence Repetition & Message Fatigue
- **Objective**: Detect diminishing open/reply rates for specific email subject lines after repeated use (>200 sends).
- **Internal Prerequisite**: Tag email subject variants in `prospect_agent_emails_envoyes`.

### KBN-22: Human Quality Control Sampling
- **Objective**: Provide a weekly sample of 5 randomly selected leads and 5 generated emails for managerial spot-checking and binary rating (Relevant / Irrelevant).
- **Internal Prerequisite**: Dedicated calibration table storing manager feedback.

### KBN-23: Automated Weekly Manager Standup Summary
- **Objective**: Automatically draft the Monday sales meeting agenda (W-1 performance breakdown, W priorities).

---

## 🔴 6. Column 4: BLOCKED / AWAITING EXTERNAL DEPENDENCIES (To-Do Suggestions)

> [!IMPORTANT]
> **These features are explicitly requested in the manager's functional document**, but depend on external APIs or third-party platforms not yet integrated into VMIND. In the UI, they should be presented as **Roadmap Suggestions** with clear badges indicating the required connector.

### KBN-30: Closed Revenue, Realized Margins & Signed Quotes
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **Sales ERP Connector (TraLIS / Odoo / Sage)**
- **Why It Is Blocked**: VMIND orchestrates top and middle-of-funnel operations (Lead Sourcing ➔ Qualification ➔ Outreach). Once a prospect becomes a customer, sales quotes, purchase orders, invoices, and gross margins reside in the corporate ERP. Without inbound ERP financial feeds, revenue attribution per agent cannot be calculated.
- **Recommended UI Display**: Grayed KPI card badged `[ 🔌 Required: TraLIS/Sage ERP Connector ]`.

### KBN-31: Booked Meetings & Cost per Meeting
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **Meeting Scheduling Webhooks (Calendly, Google Calendar, HubSpot Meetings)**
- **Why It Is Blocked**: Outreach emails include meeting booking links, but actual calendar confirmations, no-show rates, and meeting outcomes require an active calendar integration.
- **Recommended UI Display**: Dotted funnel stage badged `[ 📅 Awaiting Calendar Integration ]`.

### KBN-32: Domain DNS Health & Spam Reputation Monitoring
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **DNS & Postmaster API (Google Postmaster Tools / SendGrid Webhooks / MxToolbox API)**
- **Why It Is Blocked**: VMIND logs local SMTP errors, but lacks external visibility into domain-level sender reputation, Gmail/Outlook inbox placement, or real-time DMARC alignment.
- **Recommended UI Display**: Health indicator with suggestion badge `[ 🛡️ Connect Google Postmaster API ]`.

### KBN-33: Sales Call Tracking & Audio Intelligence
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **Cloud Telephony VoIP Connector (Aircall / Twilio / Ringover)**
- **Why It Is Blocked**: VMIND unveils verified direct phone numbers, but has no integrated softphone to log call attempts, duration, or speech-to-text sentiment analysis.
- **Recommended UI Display**: Suggested metric block `[ 📞 Required: Cloud Telephony Integration ]`.

### KBN-34: Automated A/B Split-Testing Engine
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **n8n Dynamic Split-Routing & Statistical Significance Calculator**
- **Why It Is Blocked**: Current n8n workflows execute static outreach sequences. An algorithmic split-router capable of 50/50 attribution and automated deprecation of losing variants is needed.
- **Recommended UI Display**: Roadmap badge `[ 🔬 Phase 3 Roadmap ]`.

### KBN-35: Executive Conversational AI Assistant
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **Dedicated SQL RAG Pipeline on Supervisor Views**
- **Why It Is Blocked**: VMIND's main AI chat connects to TraLIS ERP tools, but lacks introspection tools specialized in querying and explaining cross-agent supervisor analytics.
- **Recommended UI Display**: Preview chat prompt box with pre-populated suggested queries.

---

## 🎯 7. Recommended Next Steps

1. **Share this document with your manager** to validate the scope split between immediately deliverable features (Column 2) and dependency-gated features (Column 4).
2. **Implement the "Funnel & Performance" tab** in the Supervisor Workspace to surface real value from existing PostgreSQL data immediately.
3. **Embed the "Roadmap & Dependencies" view** into the UI to present the complete strategic vision and guide upcoming corporate integration decisions.
