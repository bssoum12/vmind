# 📋 Kanban Board: Commercial AI Supervisor Agent

> **Strategic Framework, Technical Specification & Operational Roadmap**  
> Tailored specifically for the VMIND multi-agent ecosystem (**Sourcing Agent** ➔ **Prospect Agent** ➔ **Commercial AI Supervisor**).

---

## 🧭 1. Vision & Architecture Scope

The **Commercial AI Supervisor Agent** (*Superviseur Commercial IA*) serves as the autonomous governance, coordination, and alignment plane across the VMIND multi-agent sales fleet. While Sourcing Agents extract leads and Prospect Agents qualify and conduct email outreach, the Supervisor Agent continuously analyzes the entire pipeline, diagnosing bottlenecks, evaluating inter-agent handoff friction, and recommending actionable optimizations.

### The Supervised Autonomous Funnel:
$$\text{Sourcing Agent (Leads)} \xrightarrow[\text{Handoff Alignment}]{\text{Edge Diagnostic}} \text{Prospect Agent (Qualification \& Outreach)} \xrightarrow[\text{Hot Leads}]{\text{Meeting / Reply}} \text{Human Closer (Deal Closing)}$$

```
                            ┌────────────────────────────────────────┐
                            │    Commercial AI Supervisor Agent      │
                            │  (Obsidian Force Canvas & Autopilot)   │
                            └───────────────────┬────────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
      ┌──────────────────────────────┐                      ┌──────────────────────────────┐
      │     Sourcing Agent (A)       │                      │     Prospect Agent (B)       │
      │  (Lead Discovery & Scrape)   │                      │  (ICP Evaluation & Outreach) │
      └──────────────┬───────────────┘                      └──────────────┬───────────────┘
                     │                                                     │
                     └────────────────► [ 1-to-1 Link Handoff ] ───────────┘
                                         • Acceptance Rate
                                         • Semantic Alignment
                                         • Rejection Root-Cause
                                         • Concrete Adjustments
```

---

## 📊 2. High-Level Kanban Board

| 🟢 DONE (In Production) | 🟡 NEXT UP (Phase 1.5 - Complete) | 🔵 PENDING (Phase 2 - Internal Specs) | 🔴 BLOCKED (Phase 3 - External APIs) |
| :--- | :--- | :--- | :--- |
| • 2D Elastic Force Graph Canvas | *(Phase 1.5 terminée à 100%)* | • LLM Scoring Drift Detection Over Time | • Closed Revenue & Margins (**ERP TraLIS/Sage**) |
| • Unit Node Diagnostic Drawers | | • Email Subject Line & Sequence Fatigue | • Booked Meetings & Show-up Rates (**Calendar**) |
| • 1-to-1 Link Handoff Engine | | • Human Quality Control & Sampling Loop | • Call Tracking & Audio AI (**VoIP Aircall/Twilio**) |
| • Actionable Recommendation Engine | | • Automated Weekly Standup Summary | • Domain Reputation & DNS (**Postmaster API**) |
| • Dedicated Global Funnel Tab | | • Dynamic ICP Threshold Auto-Tuning | • Automated A/B Split-Testing (**n8n Engine**) |
| • CRM Data Health & Completeness | | | • Executive Conversational Chatbot (**SQL RAG**) |
| • Fleet Audit History & Diff Log | | | |
| • Hot Leads & Fleet Alerts Engine | | | |
| • Flash Fleet Audit ("▶ Run Now") | | | |
| • Autopilot Lifecycle ("▶ Start") | | | |
| • Anti-Waste Token Protection | | | |
| • Executive HTML Email Digest | | | |
| • Company Context & AI Web Research | | | |
| • 3-Step Deployment Wizard | | | |
| • Scoped Multi-Agent Fleet Filter | | | |
| • Identity-Aware Corporate NAT Support | | | |

---

## 🟢 3. Column 1: DONE / IN PRODUCTION

| ID | Module / Capability | Deliverable & Architectural Description | Code Components & Endpoints |
| :--- | :--- | :--- | :--- |
| **KBN-01** | **2D Elastic Force Graph Canvas** | Obsidian-style interactive force-directed graph canvas (`react-force-graph-2d`) with soft elastic springs, collision avoidance, live health badges (Healthy, Warning, Critical, Executing), and edge throughput counters. | [`SupervisorGraphCanvas.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorGraphCanvas.tsx) |
| **KBN-02** | **Unit Node Diagnostic Drawer** | Sliding unit drawer for individual agents rendering total leads, qualification rate, emails sent, bounce rate, health score (0-100%), qualitative strengths, areas for improvement, and concrete action cards. | [`NodeDiagnosticDrawer.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/NodeDiagnosticDrawer.tsx) |
| **KBN-03** | **1-to-1 Link Diagnostic Engine** | Deep inter-agent handoff evaluation between a Sourcing Agent and a Target Prospect Agent. Analyzes actual transferred leads, acceptance rate, semantic alignment matrix, and root-cause rejection analysis from `prospect_agent_qualifications`. | [`EdgeDiagnosticDrawer.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/EdgeDiagnosticDrawer.tsx), `N8N_WEBHOOK_SUPERVISOR_LINK` |
| **KBN-04** | **Actionable Recommendation Engine** | Generates concrete recommendations adhering to executive documentation standards: **Quantified Observation**, **Probable Cause**, **Proposed Action**, **Estimated Impact**, and **Priority Score**. | Embedded in Node & Link evaluation pipelines (`fleet.ts`) |
| **KBN-05** | **Flash Fleet Audit ("▶ Run Now")** | Manual on-demand evaluation trigger evaluating all supervised nodes and links in sequence, updating the database, and triggering an executive summary email. Protected by Redis idempotency locks. | `POST /api/supervisor-agent/run-now/:id`, [`AgentsView.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/agents/AgentsView.tsx) |
| **KBN-06** | **Autopilot Scheduling Engine ("▶ Start")** | Background autonomous execution orchestrated via Upstash QStash cron schedules, browser timezone auto-detection (`getBrowserTimezone()`), and persistent Redis schedule locks (`agent:schedule:{uuid}`) without TTL. | `POST /api/supervisor-agent/start/:id`, [`SupervisorScheduleModal.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/agents/components/SupervisorScheduleModal.tsx) |
| **KBN-07** | **Anti-Waste Token Protection Engine** | State and lead delta hashing engine. Computes a cryptographic hash of agent configurations and transferred lead counts; unchanged nodes and links **bypass LLM re-evaluation**, saving thousands of API tokens per run. | `evaluateNodeInternal()`, `evaluateLinkInternal()` in [`fleet.ts`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/VMIND%20DEVOPS/VMIND%20AI/src/supervisor-agent/routes/fleet.ts) |
| **KBN-08** | **Executive HTML Email Digest System** | Automated executive HTML email digest delivered to managers after each audit run, featuring fleet health score rings, top bottleneck highlights, and actionable optimization priorities. | [`supervisorEmailService.ts`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/VMIND%20DEVOPS/VMIND%20AI/src/supervisor-agent/services/supervisorEmailService.ts) |
| **KBN-09** | **Company Strategic Context & AI Web Research** | Management modal for company value proposition, ICP titles, target industries, competitors, and differentiators. Includes live AI web research scraping company domain via dedicated webhook. | [`CompanyContextModal.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/company-context/components/CompanyContextModal.tsx), `N8N_WEBHOOK_SUPERVISOR_COMPANY_RESEARCH` |
| **KBN-10** | **3-Step Deployment Wizard** | Dedicated Marketplace card and deployment wizard: Step 1 (Supervisor Name & Supervised Fleet), Step 2 (Company Context & Mission), Step 3 (Trigger Rules, Interval Scheduling & Email Recipients). | [`WizardSupervisorView.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/wizard/WizardSupervisorView.tsx), [`AgentMultiSelect.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/wizard/components/AgentMultiSelect.tsx) |
| **KBN-11** | **Multi-Agent Fleet Isolation** | Backend and frontend scoping guaranteeing that a Supervisor workspace strictly renders the nodes and links corresponding to its `supervised_agent_ids` configuration. | `GET /api/supervisor/fleet-graph/:id`, [`SupervisorWorkspace.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorWorkspace.tsx) |
| **KBN-12** | **Identity-Aware Corporate NAT Support** | Express `trust proxy` configuration and Cloudflare `CF-Connecting-IP` resolution. Authenticated user-level keys (`user_${id}`) prevent corporate Wi-Fi lockouts across office networks. | [`src/rateLimiter.ts`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/VMIND%20DEVOPS/VMIND%20AI/src/rateLimiter.ts), [`src/server-http.ts`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/VMIND%20DEVOPS/VMIND%20AI/src/server-http.ts) |
| **KBN-13** | **Unified Overview & Condensed Pipeline HUD** | Unified overview workspace merging the 2D interactive force canvas with a sleek Apple-style frosted glass Pipeline HUD (`Sourcés ➔ Transférés ➔ Prospects Qualifiés ➔ Brouillons Prêts ➔ E-mails Envoyés`), zero-jargon French metrics (Taux de Qualification, Mobiles Démasqués), sliding binôme performance drawer, and simplified 2-tab navigation (`Vue d'ensemble` & `Historique`). | `GET /api/supervisor/fleet-funnel/:id`, [`SupervisorPipelineHUD.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorPipelineHUD.tsx), [`PipelineBinomesDrawer.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/PipelineBinomesDrawer.tsx), [`SupervisorWorkspace.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorWorkspace.tsx) |
| **KBN-14** | **Aggregate CRM Data Health & Completeness** | Integrated directly into the Global Pipeline Funnel tab. Audits database hygiene, deliverability rate (sent vs bounce errors), phone enrichment rate (unmasked mobile phones), profile completeness (Email, Company, Job Title, Sector), distinct account coverage, and multi-threading company detection without extra tab switching. | `GET /api/supervisor/fleet-funnel/:id`, [`SupervisorFunnelView.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorFunnelView.tsx) |
| **KBN-15** | **Priority Operational Alerts Feed & Hot Leads (>48h)** | Real-time friction detection engine monitoring fleet hot leads (`score >= 85` or `potentiel = 'Eleve'/'Élevé'`, `est_qualifie = true`) unattended for $>48\text{h}$ (never contacted vs overdue follow-up) with critical $72\text{h}+$ urgency tiers, and rolling 24h email bounce/failure rate spike detection ($>5\%$). Features live header flame beacon with pulsing badge counter, Pipeline HUD integration, interactive Cyber Obsidian sliding drawer with filters/search, one-click email copying, direct mailto, and deep-linking to agent workspaces. Real-time updates via Socket.io (`useProspectSocket`). | `GET /api/supervisor/fleet-alerts/:id`, [`SupervisorAlertsDrawer.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorAlertsDrawer.tsx), [`SupervisorPipelineHUD.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorPipelineHUD.tsx), [`SupervisorWorkspace.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorWorkspace.tsx), [`fleet.ts`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/VMIND%20DEVOPS/VMIND%20AI/src/supervisor-agent/routes/fleet.ts) |
| **KBN-16** | **Fleet Evaluation History & Audit Comparison Log View** | Dedicated workspace tab rendering chronological timeline of all audit sessions (Flash & Autopilot), score evolution differentials ($W$ vs $W-1$), unit agent alignment history, 1-to-1 link throughput evolution, and concrete recommendations history. Includes high-performance **Scalability & DOM Virtualization Architecture** (SQL window functions separating light trends from heavy snapshots for recent 50 runs, 60 FPS downsampling chart, progressive 15-session batch slicing, segmented filters, and Apple Pro pagination). See [SUPERVISOR_FLEET_HISTORY_SCALABILITY.md](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/documentation/SUPERVISOR_FLEET_HISTORY_SCALABILITY.md). | `GET /api/supervisor/fleet-history/:id`, [`SupervisorHistoryView.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorHistoryView.tsx), [`fleet.ts`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/VMIND%20DEVOPS/VMIND%20AI/src/supervisor-agent/routes/fleet.ts) |

---

## 🟡 4. Column 2: NEXT UP (Phase 1.5 - Existing VMIND Data)

> [!NOTE]
> All core Phase 1.5 capabilities utilizing existing PostgreSQL data (KBN-13 Pipeline HUD & Binômes Drawer, KBN-14 CRM Health, KBN-15 Hot Leads & Alerts Engine, KBN-16 Scalable Fleet History) have been successfully implemented, tested, and shipped to production.

*(All Phase 1.5 deliverables complete. Proceeding to Phase 2).*

---

## 🔵 5. Column 3: PENDING INTERNAL SPECIFICATIONS (Phase 2)

> Features feasible in the medium term, requiring business alignment and minor schema adjustments.

### KBN-20: LLM Scoring Drift Detection Over Time
- **Objective**: Detect whether qualification models become overly strict or lenient over time without configuration changes.
- **Prerequisite**: Define baseline sampling window (14-day rolling average vs 30-day baseline).

### KBN-21: Sequence Repetition & Email Subject Line Fatigue
- **Objective**: Detect diminishing open and reply rates for specific email subject lines after high send volumes (>200 sends).
- **Prerequisite**: Tag email subject line variants in `prospect_agent_emails_envoyes`.

### KBN-22: Human Quality Control Sampling Loop
- **Objective**: Provide a weekly sample of 5 randomly selected qualified leads and 5 generated email drafts for manager spot-checking and binary rating (Accurate / Inaccurate).
- **Prerequisite**: Schema migration creating `supervisor_quality_feedback`.

### KBN-23: Automated Weekly Manager Standup Summary
- **Objective**: Auto-generate an executive markdown agenda for Monday morning sales meetings (W-1 performance breakdown, bottleneck alerts, W priorities).



## 🔴 6. Column 4: BLOCKED (Phase 3 - External APIs Required)

> [!IMPORTANT]
> **These features depend on external APIs or third-party platforms not yet connected to VMIND**. In the UI, they should be presented as **Roadmap Suggestions** with clear badges indicating the required connector.

### KBN-30: Closed Revenue, Realized Margins & Signed Quotes
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **Sales ERP Connector (TraLIS / Odoo / Sage)**
- **Why It Is Blocked**: VMIND handles top and middle-of-funnel operations (Sourcing ➔ Qualification ➔ Outreach). Once a prospect becomes a customer, sales orders, invoices, and margins reside in the ERP. Without inbound ERP financial feeds, revenue attribution per agent cannot be calculated.
- **Recommended UI Display**: Grayed KPI card badged `[ 🔌 Required: TraLIS / Sage ERP Connector ]`.

### KBN-31: Booked Meetings & Cost per Meeting
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **Meeting Scheduling Webhooks (Calendly, Google Calendar, HubSpot Meetings)**
- **Why It Is Blocked**: Outreach emails include meeting booking links, but calendar confirmations, no-show rates, and meeting outcomes require an active calendar webhook.
- **Recommended UI Display**: Dotted funnel stage badged `[ 📅 Awaiting Calendar Integration ]`.

### KBN-32: Domain DNS Health & Spam Reputation Monitoring
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **DNS & Postmaster API (Google Postmaster Tools / SendGrid / MxToolbox API)**
- **Why It Is Blocked**: VMIND logs local SMTP errors, but lacks external visibility into domain-level sender reputation, Gmail/Outlook inbox placement, or real-time DMARC alignment.
- **Recommended UI Display**: Health indicator badged `[ 🛡️ Connect Google Postmaster API ]`.

### KBN-33: Sales Call Tracking & Audio Intelligence
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **Cloud Telephony VoIP Connector (Aircall / Twilio / Ringover)**
- **Why It Is Blocked**: VMIND unveils verified direct phone numbers, but has no softphone integration to log call attempts, durations, or speech-to-text sentiment analysis.
- **Recommended UI Display**: Suggested metric block `[ 📞 Required: Cloud Telephony Integration ]`.

### KBN-34: Automated A/B Split-Testing Engine
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **n8n Dynamic Split-Routing & Statistical Significance Calculator**
- **Why It Is Blocked**: Current n8n workflows execute static outreach sequences. An algorithmic split-router capable of 50/50 attribution and automated deprecation of losing variants is needed.
- **Recommended UI Display**: Roadmap badge `[ 🔬 Phase 3 Roadmap ]`.

### KBN-35: Executive Conversational AI Assistant
- **Status**: 🔴 **BLOCKED (Missing Dependency)**
- **Missing Dependency**: **Dedicated SQL RAG Pipeline on Supervisor Views**
- **Why It Is Blocked**: VMIND's main AI chat connects to TraLIS ERP tools, but lacks specialized tools for querying and synthesizing cross-agent supervisor analytics.
- **Recommended UI Display**: Preview prompt box with pre-populated suggested queries.

---

## 🛠️ 7. Supervisor Technical Specifications Reference

### 1. N8N Webhook Architecture
The Supervisor Agent relies on **4 specialized n8n workflows** declared in `.env`:
1. `N8N_WEBHOOK_SUPERVISOR_LINK`: Evaluates 1-to-1 handoff between Sourcing and Prospect agents.
2. `N8N_WEBHOOK_SUPERVISOR_NODE`: Evaluates single Sourcing Agent health and lead discovery criteria.
3. `N8N_WEBHOOK_SUPERVISOR_PROSPECT_NODE`: Evaluates single Prospect Agent health, qualification rate, and email deliverability.
4. `N8N_WEBHOOK_SUPERVISOR_COMPANY_RESEARCH`: Researches company domains and synthesizes strategic context.

### 2. Backend REST Endpoints
- `POST /api/supervisor-agent/deploy`: Deploys a new supervisor agent and saves settings to PostgreSQL & Redis.
- `GET /api/supervisor/fleet-graph/:id`: Returns scoped nodes, links, and health metrics for the supervisor's fleet.
- `POST /api/supervisor-agent/evaluate-node/:agentId`: Triggers unit AI evaluation of a single node.
- `POST /api/supervisor-agent/evaluate-link`: Triggers 1-to-1 AI evaluation of an inter-agent edge.
- `POST /api/supervisor-agent/run-now/:id`: Triggers immediate fleet-wide flash audit.
- `POST /api/supervisor-agent/start/:id`: Activates scheduled autopilot mode via QStash.
- `POST /api/supervisor-agent/stop/:id`: Deactivates autopilot mode and clears QStash schedules.
- `POST /api/supervisor-agent/enrich-company-context`: Runs AI web research on company website.

### 3. Database Schema (PostgreSQL `vmind_memory`)
- `agents`: Core identity (`run_mode = 'supervisor'`).
- `supervisor_agent_settings`: Configuration (`supervised_agent_ids integer[]`, `agent_mission text`, `company_context jsonb`).
- `supervisor_agent_evaluations`: Historical audit logs for individual nodes.
- `supervisor_link_evaluations`: Historical audit logs for inter-agent handoff links.
- `user_company_context`: Canonical tenant-level company strategic context and branding.

---

## 🎯 8. Strategic Recommendation for Next Sprint

1. **Phase 1.5 Completion**: KBN-13 (Condensed Pipeline HUD & Binômes Drawer), KBN-14 (Integrated CRM Health), KBN-15 (Priority Alerts & Hot Leads >48h Detection), and KBN-16 (Scalable Fleet History & Comparison Log) have all been completed and deployed.
2. **Phase 2 Implementation Target**: **KBN-20 (LLM Scoring Drift Detection Over Time)** & **KBN-21 (Sequence Repetition & Email Subject Line Fatigue)** to provide proactive model monitoring and outreach effectiveness diagnostics.
