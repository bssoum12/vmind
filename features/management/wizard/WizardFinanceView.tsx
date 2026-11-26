'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/management/components/Button';
import { useToast } from '@/shared/contexts/ToastContext';
import { useConnections } from '@/shared/contexts/ConnectionsContext';
import { deployAgent, runAgentNow } from '@/shared/api/n8n-api';
import { getBrowserTimezone } from '@/shared/utils/timezone';
import { VMindGuide, GuideMood } from '@/shared/management/components/VMindGuide';
import { Check, ArrowRight, ArrowLeft, AlertCircle, Info, Mail, X, Zap, Eye, EyeOff, Maximize2, Monitor, Smartphone, Paperclip, Star } from 'lucide-react';
import { TriggerRulesEditor, TriggerRule, DEFAULT_TRIGGER_RULE, describeTriggerRule } from './components/TriggerRulesEditor';

/**
 * Agent Finance & Trésorerie (templateId "finance").
 * Deployment goes through the backend `POST /deploy-agent` (same client as WizardView);
 * the backend validates the configuration and stores it in agents.parameters.
 */
const PROTOTYPE = false;

/** Fixed for this template, never shown to the user (§2.2). */
const RUN_MODE = 'finance_report' as const;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type Periode =
  | 'mois_en_cours' | 'trimestre' | 'semestre' | 'annee'
  | 'mois_precedent' | 'trimestre_termine' | 'semestre_termine' | 'annee_terminee';
export type Duree = 'mois' | 'trimestre' | 'semestre' | 'annee';
export type EtatPeriode = 'terminee' | 'en_cours';
export type Comparaison = 'precedente' | 'n1' | 'les_deux';
type Ton = 'direction' | 'operationnel';
type Longueur = 'courte' | 'standard' | 'detaillee';
export type SectionKey =
  | 'ca' | 'tendance' | 'concentration' | 'marge' | 'charges'
  | 'clients' | 'anciennete' | 'fournisseurs'
  | 'banque' | 'mouvements' | 'frais' | 'attente'
  | 'synthese' | 'tva' | 'devises' | 'prevision';

export interface FinanceConfig {
  templateId: 'finance';
  agent_name: string;
  run_mode: typeof RUN_MODE;
  /** From the active connector while there is no ERP selector. */
  erp_type: string | null;
  periode: Periode;
  comparaison: Comparaison;
  sections: Record<SectionKey, boolean>;
  seuils: { ecart_precedente_pct: number; ecart_n1_pct: number };
  top_n: { clients: number; fournisseurs: number };
  alertes: {
    inclure_alerte_credit: boolean;
    solde_client_min: number | null;
    retard_fournisseur_min: number | null;
  };
  objectifs: {
    ca_facture_mensuel: number | null;
    reste_a_encaisser_max: number | null;
    fournisseurs_retard_max: number | null;
  };
  redaction: { ton: Ton; longueur: Longueur; consigne: string };
  recipients: string[];
  recipients_cc: string[];
  trigger_rules: TriggerRule[];
  workflow_timezone: string;
}

// ─────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────
/** The period is chosen as a length and a state; one code is saved (the periods of the skill contract). */
export const DUREES: { value: Duree; label: string }[] = [
  { value: 'mois', label: 'Mois' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'annee', label: 'Année' },
];
export const ETATS_PERIODE: EtatPeriode[] = ['terminee', 'en_cours'];
export const etatLabel = (e: EtatPeriode, d: Duree): string => (e === 'en_cours' ? 'En cours' : d === 'annee' ? 'Précédente' : 'Précédent');
export const CODES: Record<Duree, Record<EtatPeriode, Periode>> = {
  mois: { terminee: 'mois_precedent', en_cours: 'mois_en_cours' },
  trimestre: { terminee: 'trimestre_termine', en_cours: 'trimestre' },
  semestre: { terminee: 'semestre_termine', en_cours: 'semestre' },
  annee: { terminee: 'annee_terminee', en_cours: 'annee' },
};
const PERIODES: { value: Periode; duree: Duree; etat: EtatPeriode; label: string }[] = DUREES.flatMap((d) =>
  ETATS_PERIODE.map((e) => ({ value: CODES[d.value][e], duree: d.value, etat: e, label: `${d.label} ${etatLabel(e, d.value).toLowerCase()}` })));
export const periodeInfo = (p: Periode) => PERIODES.find((x) => x.value === p)!;

const COMPARAISONS: { value: Comparaison; label: string; hint: string }[] = [
  { value: 'les_deux', label: 'Les deux', hint: 'Période précédente et même période de l’année précédente' },
  { value: 'precedente', label: 'Période précédente', hint: 'La période juste avant ; les mêmes jours si la période est en cours' },
  { value: 'n1', label: 'Même période de l’année précédente', hint: 'Les mêmes dates, un an plus tôt' },
];

/**
 * What a finance & treasury manager reports, grouped like a monthly management pack.
 * `available: false` = the ERP does not provide the data yet: shown, but cannot be switched on.
 */
export const SECTIONS: { key: SectionKey; group: string; label: string; hint: string; available: boolean; on: boolean; missing?: string }[] = [
  { key: 'ca', group: 'Activité & rentabilité', label: 'Chiffre d’affaires facturé', hint: 'Chiffre d’affaires hors taxes de la période, hors brouillons, et ses comparaisons', available: true, on: true },
  { key: 'tendance', group: 'Activité & rentabilité', label: 'Tendance du chiffre d’affaires', hint: 'Évolution mois par mois : 6 derniers mois, ou depuis janvier pour une année', available: true, on: true },
  { key: 'concentration', group: 'Activité & rentabilité', label: 'Concentration clients', hint: 'Part du chiffre d’affaires réalisée par les principaux clients', available: true, on: true },
  { key: 'marge', group: 'Activité & rentabilité', label: 'Marge des dossiers', hint: 'Chiffre d’affaires, coût d’achat, marge brute, taux de marge, dossiers déficitaires', available: true, on: true },
  { key: 'charges', group: 'Activité & rentabilité', label: 'Achats par catégorie', hint: 'Factures d’achat de la période par catégorie de dépense', available: true, on: false },

  { key: 'clients', group: 'Créances clients', label: 'Encours clients', hint: 'Facturé, encaissé, reste à encaisser, taux d’encaissement, délai moyen d’encaissement, principaux soldes', available: true, on: true },
  { key: 'anciennete', group: 'Créances clients', label: 'Créances de plus de 90 jours', hint: 'Montant et clients concernés ; les tranches 0–90 jours ne sont pas alimentées', available: true, on: true },

  { key: 'fournisseurs', group: 'Dettes fournisseurs', label: 'Encours fournisseurs', hint: 'Facturé, payé, reste à payer, montant en retard, délai moyen de paiement, principaux retards', available: true, on: true },

  { key: 'banque', group: 'Trésorerie', label: 'Solde bancaire', hint: 'Solde par compte et par devise, à partir du solde initial et des mouvements débités', available: true, on: true },
  { key: 'mouvements', group: 'Trésorerie', label: 'Mouvements de la période', hint: 'Encaissements, décaissements, impayés clients, flux net', available: true, on: true },
  { key: 'frais', group: 'Trésorerie', label: 'Frais bancaires', hint: 'Commissions, taxe sur la valeur ajoutée des commissions, agios, intérêts', available: true, on: true },
  { key: 'attente', group: 'Trésorerie', label: 'Paiements en attente', hint: 'Paiements validés, émis ou en cours, pas encore débités', available: true, on: true },
  { key: 'synthese', group: 'Trésorerie', label: 'Position nette et besoin en fonds de roulement', hint: 'Reste à encaisser − reste à payer, à partir des factures', available: true, on: true },
  { key: 'tva', group: 'Trésorerie', label: 'Taxe sur la valeur ajoutée de la période', hint: 'Taxe collectée sur les ventes, taxe déductible sur les achats, solde estimé', available: true, on: false },
  { key: 'devises', group: 'Trésorerie', label: 'Exposition en devises', hint: 'Créances et dettes par devise d’origine', available: true, on: false },
  { key: 'prevision', group: 'Trésorerie', label: 'Prévision 30 / 60 / 90 jours', hint: 'Encaissements et décaissements attendus par échéance', available: false, on: false, missing: 'Les dates d’échéance de la vue de trésorerie sont illisibles (correction attendue dans le logiciel de gestion)' },
];

export const SECTION_GROUPS = Array.from(new Set(SECTIONS.map((s) => s.group)));

const TONS: { value: Ton; label: string; hint: string }[] = [
  { value: 'direction', label: 'Direction', hint: 'Décisions et risques, peu de détail' },
  { value: 'operationnel', label: 'Opérationnel', hint: 'Actions concrètes, clients et fournisseurs cités' },
];

const LONGUEURS: { value: Longueur; label: string }[] = [
  { value: 'courte', label: 'Courte' },
  { value: 'standard', label: 'Standard' },
  { value: 'detaillee', label: 'Détaillée' },
];

const STEP_LABELS = ['Périmètre', 'Seuils & alertes', 'Destinataires & Planification', 'Rédaction & Confirmation'];

// ─────────────────────────────────────────────────────────────
// Guide texts (floating VMIND guide)
// ─────────────────────────────────────────────────────────────
export const GUIDE: Record<string, { title: string; text: string; mood?: GuideMood }> = {
  name: { title: "Nom de l'agent", text: 'Un nom clair aide à retrouver le rapport dans la liste des agents et dans les emails reçus. Exemple : « Finance & Trésorerie - Siège ».', mood: 'curious' },
  periode: { title: 'Période analysée', text: 'La période couverte par chaque rapport. « Précédent » donne la dernière période complète ; « En cours » s’arrête au jour de l’envoi. Les dates affichées sont celles du prochain envoi.' },
  comparaison: { title: 'Base de comparaison', text: 'Seul le chiffre d’affaires facturé est comparé. Une période terminée est comparée à une période entière ; une période en cours, aux mêmes jours. Pour une année, la période précédente est l’année précédente : il n’y a qu’une comparaison.' },
  sections: { title: 'Contenu du rapport', text: 'Désactivez les sections inutiles pour vos destinataires. L’aperçu à droite se met à jour immédiatement.', mood: 'convinced' },
  ecart_precedente: { title: 'Écart par rapport à la période précédente', text: 'À partir de ce pourcentage, en hausse ou en baisse, une alerte « À surveiller » apparaît. À partir du double, elle passe en « Priorité haute ».' },
  ecart_n1: { title: 'Écart par rapport à l’année précédente', text: 'Même principe, comparé à la même période de l’année précédente. Souvent plus large que l’écart mensuel.' },
  top_clients: { title: 'Principaux clients', text: 'S’applique à deux listes : les clients à surveiller, par solde dû, et les premiers clients par chiffre d’affaires.' },
  top_fournisseurs: { title: 'Principaux fournisseurs', text: 'Nombre de fournisseurs listés par montant en retard.' },
  alerte_credit: { title: 'Clients signalés à risque', text: 'Ajoute les clients dont le statut crédit n’est pas normal dans le logiciel de gestion. Exemple : tout statut autre que « RAS » (rien à signaler).' },
  solde_client_min: { title: 'Seuil solde client', text: 'Montant dû par un seul client, au jour de l’envoi. Laissez vide pour ne pas l’utiliser.' },
  retard_fournisseur_min: { title: 'Seuil retard fournisseur', text: 'Montant en retard envers un seul fournisseur, au jour de l’envoi. Laissez vide pour lister tous les retards.' },
  obj_ca: { title: 'Objectif de chiffre d’affaires', text: 'Chaque mois terminé de la tendance est comparé à cet objectif, quelle que soit la période. Le mois en cours et un mois sans facture ne sont pas jugés. Seuls les mois manqués de la période lèvent une alerte.' },
  obj_encaisser: { title: 'Reste à encaisser maximal', text: 'Total dû par tous les clients réunis, au jour de l’envoi. Au-dessus, l’objectif est « Non atteint » et une alerte apparaît.' },
  obj_retard: { title: 'Retard fournisseurs maximal', text: 'Total en retard envers tous les fournisseurs réunis, au jour de l’envoi. Au-dessus, l’objectif est « Non atteint » et une alerte apparaît.' },
  recipients: { title: 'Destinataires', text: 'Collez plusieurs adresses séparées par des virgules ou des points-virgules. Chaque adresse est vérifiée avant d’être ajoutée.', mood: 'curious' },
  cc: { title: 'Copie', text: 'Les personnes en copie reçoivent le même rapport pour information, par exemple la direction générale ou l’expert-comptable. Une adresse ne peut pas être à la fois en « À » et en « Copie ».', mood: 'curious' },
  ton: { title: 'Ton de la synthèse', text: 'Direction : décisions et risques en quelques lignes. Opérationnel : actions concrètes, avec les clients et fournisseurs concernés.' },
  longueur: { title: 'Longueur', text: 'Courte : un paragraphe. Standard : constat, causes, actions. Détaillée : ajoute les points de vigilance.' },
  consigne: { title: "Consigne à l'agent", text: 'Précisez ce que la synthèse doit privilégier : un client à surveiller, une échéance, un ton. La consigne oriente la rédaction, jamais les calculs.', mood: 'convinced' },
  trigger_interval: { title: 'Intervalle', text: 'Pour un rapport financier, un envoi mensuel en début de mois ou hebdomadaire le lundi matin est le plus courant.' },
  trigger_hour: { title: "Heure d'exécution", text: 'Choisissez une heure avant l’arrivée des destinataires, par exemple 07:00 ou 08:00.' },
  trigger_minute: { title: "Minute d'exécution", text: 'Minute exacte du déclenchement (0 à 59).' },
  trigger_weekdays: { title: 'Jours de la semaine', text: 'Jours où le rapport est envoyé.' },
  trigger_day_of_month: { title: 'Jour du mois', text: 'Avec « Précédent », un envoi le 1er ou le 2 du mois donne une période complète.' },
};

const STEP_GUIDE: Record<number, { title: string; text: string }> = {
  1: { title: 'PÉRIMÈTRE', text: 'Choisissez la période, la comparaison et les sections du rapport. L’aperçu à droite montre l’email tel qu’il sera reçu.' },
  2: { title: 'SEUILS & ALERTES', text: 'Réglez ce qui doit attirer l’attention : écarts de chiffre d’affaires, soldes clients élevés, retards fournisseurs, objectifs.' },
  3: { title: 'ENVOI', text: 'Indiquez qui reçoit le rapport et quand. Sans règle de planification, l’agent ne s’exécute que manuellement.' },
  4: { title: 'RÉDACTION', text: 'Ajustez le ton et la longueur de la synthèse, ajoutez une consigne si besoin, puis vérifiez le récapitulatif.' },
};

// ─────────────────────────────────────────────────────────────
// Styles & small helpers
// ─────────────────────────────────────────────────────────────
export const ACCENT = '#00E5C8';
export const FIN = '#3DDC97';
export const MUTED = '#8FA3B8';
export const ERR = '#FF4757';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const cardTitleStyle: React.CSSProperties = {
  fontSize: '14px', fontWeight: 700, textTransform: 'none', letterSpacing: '0.01em', color: '#FFFFFF', marginBottom: '14px',
};
export const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#E2E8F0' };
export const hintStyle: React.CSSProperties = { fontSize: '12px', color: MUTED, marginTop: '4px' };
export const inputStyle: React.CSSProperties = { fontSize: '13.5px', padding: '10px 14px', borderRadius: '8px' };
/** Row of side-by-side text fields: equal columns that wrap on narrow screens (see `textField`). */
export const fieldRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: '14px', rowGap: '14px' };

export const parseAmount = (v: string): number | null => {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(n) || n < 0 ? null : n;
};
export const amountError = (v: string) => (v.trim() && parseAmount(v) === null ? 'Montant invalide' : null);
export const pctError = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return !Number.isFinite(n) || n <= 0 || n > 100 ? 'Entre 1 et 100 %' : null;
};
// Top N: the backend accepts 3 to 20 lines; the wizard offers 3 to 10.
export const TOP_N_MIN = 3;
export const TOP_N_MAX = 10;
export const intError = (v: string, min: number, max: number) => {
  const n = Number(v);
  return !Number.isInteger(n) || n < min || n > max ? `Entre ${min} et ${max}` : null;
};

const tnd = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} TND`;
const formatTnd = (n: number | null) => (n === null ? '—' : tnd(n));

const MOIS_DUREE: Record<Duree, number> = { mois: 1, trimestre: 3, semestre: 6, annee: 12 };
export type Plage = [Date, Date];
/** Same day `n` months earlier, never spilling into the next month (31 March − 1 month = 28 February). */
const moisAvant = (d: Date, n: number): Date => {
  const last = new Date(d.getFullYear(), d.getMonth() - n + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() - n, Math.min(d.getDate(), last));
};
/** Dates of a period and of its comparisons for a given day: same rules as the skill contract (`periodes`). */
export const periodeDates = (p: Periode, now: Date): { periode: Plage; precedente: Plage; n1: Plage } => {
  const { duree, etat } = periodeInfo(p);
  const len = MOIS_DUREE[duree];
  const bloc = Math.floor(now.getMonth() / len) * len;
  const debut = (months: number) => new Date(now.getFullYear(), bloc + months, 1);
  const veille = (months: number) => new Date(now.getFullYear(), bloc + months, 0);
  if (etat === 'terminee') return { periode: [debut(-len), veille(0)], precedente: [debut(-2 * len), veille(-len)], n1: [debut(-len - 12), veille(-12)] };
  const jour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { periode: [debut(0), jour], precedente: [debut(-len), moisAvant(jour, len)], n1: [debut(-12), moisAvant(jour, 12)] };
};
const jourLabel = (d: Date, year: boolean): string =>
  `${d.getDate() === 1 ? '1er' : d.getDate()} ${d.toLocaleDateString('fr-FR', year ? { month: 'long', year: 'numeric' } : { month: 'long' })}`;
export const plageLabel = ([d, f]: Plage): string => d.getTime() === f.getTime() ? `le ${jourLabel(d, true)}` : `du ${jourLabel(d, d.getFullYear() !== f.getFullYear())} au ${jourLabel(f, true)}`;

export const periodeLabel = (p: Periode, now: Date): string => {
  const d = periodeDates(p, now).periode[0];
  const { duree } = periodeInfo(p);
  if (duree === 'mois') return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  if (duree === 'trimestre') return `${['premier', 'deuxième', 'troisième', 'quatrième'][Math.floor(d.getMonth() / 3)]} trimestre ${d.getFullYear()}`;
  if (duree === 'semestre') return `${d.getMonth() < 6 ? 'premier' : 'deuxième'} semestre ${d.getFullYear()}`;
  return `année ${d.getFullYear()}`;
};

// Window of the "Tendance" section (portée glissant_6m of the skill contract): the 6 months ending
// with the period's last month, or the months of the year for a year.
const tendanceLibelle = (p: Periode): string => (p === 'annee' ? 'depuis janvier' : p === 'annee_terminee' ? 'de janvier à décembre' : '6 derniers mois');
const tendanceMonths = (p: Periode, now: Date): string[] => {
  const fin = periodeDates(p, now).periode[1];
  const count = periodeInfo(p).duree === 'annee' ? fin.getMonth() + 1 : 6;
  return Array.from({ length: count }, (_, i) =>
    new Date(fin.getFullYear(), fin.getMonth() - (count - 1) + i, 1).toLocaleDateString('fr-FR', { month: 'long' }));
};

/** Next send of the first scheduling rule; null without a rule (manual send). */
export const nextSendDate = (rules: TriggerRule[]): Date | null => {
  if (!rules.length) return null;
  const r = rules[0];
  const hour = r.triggerAtHour === 'Midnight' ? 0 : r.triggerAtHour === 'Noon' ? 12
    : parseInt(r.triggerAtHour, 10) + (r.triggerAtHour.endsWith('pm') && !r.triggerAtHour.startsWith('12') ? 12 : 0);
  const now = new Date();
  const d = new Date(now);
  d.setHours(hour, r.triggerAtMinute || 0, 0, 0);
  if (r.interval === 'Months') {
    d.setDate(r.triggerAtDayOfMonth || 1);
    if (d <= now) d.setMonth(d.getMonth() + 1);
  } else if (r.interval === 'Weeks' && r.triggerOnWeekdays.length) {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 8; i++) {
      const c = new Date(d); c.setDate(d.getDate() + i);
      if (r.triggerOnWeekdays.includes(names[c.getDay()]) && c > now) { d.setTime(c.getTime()); break; }
    }
  } else if (d <= now) {
    d.setDate(d.getDate() + 1);
  }
  return d;
};
/** Day whose dates are shown in the form and the preview: the next send, or today without a rule. */
export const jourEnvoi = (rules: TriggerRule[]): Date => nextSendDate(rules) ?? new Date();

export const Card: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, right, children }) => (
  <div className="wcard" style={{ padding: '20px 24px', marginBottom: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: subtitle ? '6px' : '14px' }}>
      <div className="wcard-title" style={{ ...cardTitleStyle, margin: 0 }}>
        <span className="dot" style={{ width: '8px', height: '8px', backgroundColor: FIN }} />
        {title}
      </div>
      {right}
    </div>
    {subtitle && <div style={{ marginBottom: '14px', fontSize: '12.5px', color: MUTED, lineHeight: 1.45 }}>{subtitle}</div>}
    {children}
  </div>
);

export const ErrorLine: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: ERR, fontSize: '12px', marginTop: '4px' }}>
    <AlertCircle size={13} />
    <span>{text}</span>
  </div>
);

export const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    style={{
      width: '38px', height: '22px', borderRadius: '999px', border: 0, padding: '3px', cursor: 'pointer', flexShrink: 0,
      background: on ? FIN : 'rgba(255,255,255,0.14)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'all .2s ease',
    }}
  >
    <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#FFFFFF', display: 'block' }} />
  </button>
);

/** Email list input with chips: Enter, comma or semicolon adds; pasted lists are split; invalid or duplicate addresses are refused. */
export const EmailListField: React.FC<{
  id: string; label: string; list: string[]; onChange: (l: string[]) => void; exclude?: string[];
  placeholder?: string; onFocus?: () => void; onBlur?: () => void; chipTint?: string;
}> = ({ id, label, list, onChange, exclude = [], placeholder, onFocus, onBlur, chipTint = ACCENT }) => {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = (raw: string) => {
    const parts = raw.split(/[\s,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return;
    const invalid = parts.filter((p) => !EMAIL_RE.test(p));
    const taken = parts.filter((p) => EMAIL_RE.test(p) && exclude.includes(p));
    const fresh = parts.filter((p) => EMAIL_RE.test(p) && !exclude.includes(p) && !list.includes(p));
    if (fresh.length) onChange([...list, ...fresh]);
    const problems = [
      invalid.length ? `adresse invalide : ${invalid.join(', ')}` : '',
      taken.length ? `déjà en destinataire principal : ${taken.join(', ')}` : '',
    ].filter(Boolean);
    setError(problems.length ? problems.join(' · ').replace(/^./, (c) => c.toUpperCase()) : null);
    setDraft(invalid.join(', '));
  };

  return (
    <div className="form-group" style={{ minWidth: 0 }}>
      <label className="form-label" htmlFor={id} style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          id={id}
          type="text"
          className="form-input"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); if (error) setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === ';') { e.preventDefault(); add(draft); }
            if (e.key === 'Backspace' && !draft && list.length) onChange(list.slice(0, -1));
          }}
          onFocus={onFocus}
          onBlur={() => { onBlur?.(); if (draft.trim()) add(draft); }}
          placeholder={placeholder}
          style={{ ...inputStyle, flex: '1 1 260px', minWidth: 0, borderColor: error ? ERR : undefined }}
        />
        <Button onClick={() => add(draft)} style={{ fontSize: '13px', padding: '10px 16px' }}>Ajouter</Button>
      </div>
      {error && <ErrorLine text={error} />}
      {list.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
          {list.map((r) => (
            <span key={r} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 8px 5px 10px', borderRadius: '999px', maxWidth: '100%',
              background: `${chipTint}1A`, border: `1px solid ${chipTint}4D`, color: '#E2E8F0', fontSize: '12.5px',
            }}>
              <Mail size={12} color={chipTint} />
              <span style={{ overflowWrap: 'anywhere' }}>{r}</span>
              <button type="button" aria-label={`Retirer ${r}`} onClick={() => onChange(list.filter((x) => x !== r))}
                style={{ background: 'none', border: 0, color: MUTED, cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/** Segmented choice, same look as the weekday chips of the scheduler. */
export function Segmented<T extends string>({ value, options, onChange, onFocus }: {
  value: T; options: { value: T; label: string; hint?: string }[]; onChange: (v: T) => void; onFocus?: () => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`, gap: '8px' }} onMouseEnter={onFocus}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            onFocus={onFocus}
            style={{
              textAlign: 'left', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
              background: on ? 'rgba(61, 220, 151, 0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${on ? 'rgba(61, 220, 151, 0.55)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: on ? FIN : '#E2E8F0' }}>{o.label}</div>
            {o.hint && <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '2px' }}>{o.hint}</div>}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Report preview — the email without any value from the ERP
// ─────────────────────────────────────────────────────────────
/*
 * Same layout, order, titles and labels as the report email (n8n-report-agents/code/build-email.js,
 * labels of the skill « Rapport Finance & Trésorerie »). Two separate codes: any change to the email is
 * made here too, and the reverse. No figure is invented: every value is « — »; the only numbers shown
 * come from the configuration (thresholds, objectives, number of lines, dates).
 */
const P = {
  ink: '#0d2b33', soft: '#66787d', line: '#dbe4e4', head: '#F4F7F9', brand: '#0b6b68',
  bad: '#C0392B', badBg: '#FCEBEA', warn: '#9A6700', warnBg: '#FFF4D6', good: '#1E8449', goodBg: '#E8F6EE',
};
/** Colours of the email (build-email.js). */
export const E = { page: '#edf2f2', ink: '#0d2b33', text: '#33474d', muted: '#66787d', rule: '#dbe4e4', track: '#c9dcdb', teal: '#0b6b68', soft: '#8fb3b1', mint: '#12c4a8', red: '#b3261e', amber: '#96580a' };
export const EMAIL_FONT = "'Segoe UI',-apple-system,Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";
export const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const ghostNames = (label: string, n: number) => Array.from({ length: n }, (_, i) => `${label} ${i + 1}`);

/** A value computed from the ERP at each send, with its unit. */
export const Dash: React.FC<{ unit?: string; big?: number }> = ({ unit = 'dinars', big }) => (
  <span style={{ whiteSpace: 'nowrap' }}>
    <span style={{ color: E.muted, fontSize: big ? `${big}px` : undefined, fontWeight: big ? 400 : 600 }}>—</span>
    {unit && <span style={{ fontSize: big ? `${Math.round(big / 2)}px` : '12px', color: E.muted }}>{' '}{unit}</span>}
  </span>
);
/** A name read from the ERP at each send (client, supplier, account…). */
export const Ghost: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: E.muted }}>{children}</span>;
export const TextLine: React.FC<{ width: string; height?: number }> = ({ width, height = 8 }) => (
  <span aria-hidden style={{ display: 'block', height: `${height}px`, width, borderRadius: '4px', background: E.rule, margin: '7px 0' }} />
);
/** Empty bar: its length comes from the figures of each send. */
export const Track: React.FC<{ height?: number; max?: number }> = ({ height = 4, max }) => (
  <span aria-hidden style={{ display: 'block', height: `${height}px`, background: E.track, maxWidth: max ? `${max}px` : undefined, marginTop: '5px' }} />
);

/** A part of the report. When `hl` is set (the field being edited relates to it), it glows and scrolls into view. */
export const PreviewSection: React.FC<{ hl?: boolean; children: React.ReactNode }> = ({ hl, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hl) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [hl]);
  return (
    <div ref={ref} style={{
      borderRadius: '8px', margin: '0 -8px', padding: '0 8px',
      background: hl ? 'rgba(11, 107, 104, 0.06)' : 'transparent',
      boxShadow: hl ? `0 0 0 2px ${E.teal}55` : 'none', transition: 'background .25s ease, box-shadow .25s ease',
    }}>{children}</div>
  );
};

/** Which report section a focused form field relates to. */
const FOCUS_TO_SECTION: Record<string, string> = {
  periode: 'ca', comparaison: 'ca', ecart_precedente: 'ca', ecart_n1: 'ca', obj_ca: 'tendance',
  alerte_credit: 'clients', solde_client_min: 'clients', top_clients: 'clients', obj_encaisser: 'clients',
  retard_fournisseur_min: 'fournisseurs', top_fournisseurs: 'fournisseurs', obj_retard: 'fournisseurs',
  ton: 'synthese_ia', longueur: 'synthese_ia', consigne: 'synthese_ia',
};

// Pieces of the email.
export const BlockTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 style={{ margin: '30px 0 10px', paddingTop: '12px', borderTop: `3px solid ${E.ink}`, fontSize: '21px', lineHeight: 1.3, fontWeight: 600, color: E.ink }}>{children}</h2>
);
export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 style={{ margin: '22px 0 4px', fontSize: '15px', lineHeight: 1.4, fontWeight: 600, color: E.teal }}>{children}</h3>
);
const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: '16px 0 4px', fontSize: '13px', fontWeight: 600, color: E.ink }}>{children}</p>
);
export const Small: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontSize: '12px', lineHeight: 1.5, color: E.muted, ...style }}>{children}</div>
);
export const td = (extra: React.CSSProperties = {}): React.CSSProperties => ({ padding: '7px 0', borderBottom: `1px solid ${E.rule}`, fontSize: '14px', lineHeight: 1.45, verticalAlign: 'top', ...extra });
/** Lines « label — value », as the totals of the email. */
export const Lines: React.FC<{ rows: Array<[React.ReactNode, React.ReactNode, React.ReactNode?]> }> = ({ rows }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
    <tbody>
      {rows.map(([k, v, below], i) => (
        <tr key={i}>
          <td style={td({ color: E.text })}>{k}{below}</td>
          <td style={td({ textAlign: 'right', paddingLeft: '16px', whiteSpace: 'nowrap', color: E.ink })}>{v}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
/** A list with its column names, as the lists of the email: a name and its empty bar, then the values. */
const List: React.FC<{ headers: string[]; names: string[]; units: string[]; bar?: boolean; lastText?: boolean }> = ({ headers, names, units, bar = true, lastText }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '14px', color: E.ink }}>
    <thead>
      <tr>{headers.map((h, i) => (
        <th key={h} style={{ textAlign: i ? 'right' : 'left', padding: `0 ${i === headers.length - 1 ? 0 : 14}px 6px 0`, borderBottom: `1px solid ${E.ink}`, fontSize: '12px', fontWeight: 400, color: E.muted }}>{h}</th>
      ))}</tr>
    </thead>
    <tbody>
      {names.map((n) => (
        <tr key={n}>
          <td style={td({ paddingRight: '14px' })}><Ghost>{n}</Ghost>{bar && <Track max={190} />}</td>
          {units.map((u, i) => (
            <td key={i} style={td({ textAlign: 'right', paddingRight: i === units.length - 1 ? 0 : '14px' })}>
              {lastText && i === units.length - 1 ? <Ghost>oui ou non</Ghost> : <Dash unit={u} />}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

/** Visible notice at the top of the preview (§2.5). */
export const LayoutBanner: React.FC = () => (
  <div role="note" style={{
    display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '9px 12px', borderRadius: '9px', marginBottom: '10px',
    background: 'rgba(255, 184, 0, 0.10)', border: '1px solid rgba(255, 184, 0, 0.35)', color: '#FFD66B', fontSize: '12px', lineHeight: 1.45,
  }}>
    <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
    <span>Aperçu de l’email reçu, sans les chiffres : ils seront calculés depuis votre logiciel de gestion à chaque envoi.</span>
  </div>
);

const ReportPreview: React.FC<{ config: FinanceConfig; highlight?: string | null; compact?: boolean }> = ({ config, highlight = null, compact }) => {
  const { sections: s, seuils, comparaison, alertes, objectifs, top_n } = config;
  const jour = jourEnvoi(config.trigger_rules);
  const plages = periodeDates(config.periode, jour);
  const showPrec = comparaison !== 'n1';
  const showN1 = comparaison !== 'precedente';
  const titre = 'Rapport Finance & Trésorerie';
  const agent = config.agent_name && !titre.includes(config.agent_name) ? config.agent_name : '';
  const fin = plages.periode[1];
  const months = (() => {
    const count = periodeInfo(config.periode).duree === 'annee' ? fin.getMonth() + 1 : 6;
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(fin.getFullYear(), fin.getMonth() - (count - 1) + i, 1);
      return capFirst(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
    });
  })();
  const fmtObj = (n: number) => `${n.toLocaleString('fr-FR')} dinars`;
  const comparaisons = [
    showPrec && { libelle: 'la période précédente', court: 'Période précédente', seuil: seuils.ecart_precedente_pct, dates: plages.precedente },
    showN1 && { libelle: 'la même période de l’année précédente', court: 'Même période de l’année précédente', seuil: seuils.ecart_n1_pct, dates: plages.n1 },
  ].filter(Boolean) as Array<{ libelle: string; court: string; seuil: number; dates: Plage }>;

  // Alerts the configuration can trigger: the email lists only those that are triggered, by priority.
  const rules: string[] = [];
  if (s.ca) comparaisons.forEach((c) => rules.push(`Chiffre d’affaires facturé : écart d’au moins ${c.seuil} % par rapport à ${c.libelle}`));
  if (s.clients && alertes.inclure_alerte_credit) rules.push('Clients signalés à risque par le logiciel de gestion');
  if (s.clients && alertes.solde_client_min !== null) rules.push(`Clients à surveiller : solde d’au moins ${fmtObj(alertes.solde_client_min)}`);
  if (s.fournisseurs && alertes.retard_fournisseur_min !== null) rules.push(`Fournisseurs avec un retard d’au moins ${fmtObj(alertes.retard_fournisseur_min)}`);
  const objMois = s.tendance && objectifs.ca_facture_mensuel !== null ? objectifs.ca_facture_mensuel : null;
  const objMax = [
    s.clients && objectifs.reste_a_encaisser_max !== null && { libelle: 'Total dû par l’ensemble des clients', cible: objectifs.reste_a_encaisser_max, porte: 'tous les clients réunis' },
    s.fournisseurs && objectifs.fournisseurs_retard_max !== null && { libelle: 'Total en retard envers les fournisseurs', cible: objectifs.fournisseurs_retard_max, porte: 'tous les fournisseurs réunis' },
  ].filter(Boolean) as Array<{ libelle: string; cible: number; porte: string }>;
  if (objMois !== null) rules.push(`Objectif mensuel de chiffre d’affaires non atteint (au moins ${fmtObj(objMois)} par mois)`);
  objMax.forEach((o) => rules.push(`${o.libelle} au-dessus du maximum fixé (${fmtObj(o.cible)})`));

  // Key figures of the skill: the first one large, with what it is compared with.
  const cles = [
    s.marge && 'Taux de marge', s.clients && 'Reste à encaisser', s.fournisseurs && 'Reste à payer', s.synthese && 'Position nette',
  ].filter(Boolean) as string[];
  const cleUnit = (l: string) => (l === 'Taux de marge' ? '%' : 'dinars');
  const half = (top: boolean, right: boolean): React.CSSProperties => ({
    flex: '1 1 240px', minWidth: 0, padding: top ? `14px ${right ? 0 : 28}px 16px 0` : `0 ${right ? 0 : 28}px 22px 0`, borderTop: top ? `1px solid ${E.rule}` : 'none',
  });
  const pad = compact ? '26px 18px' : '34px 40px 40px';
  const variation = (c: { libelle: string }) => (
    <div key={c.libelle} style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.5, color: E.text }}>
      <span style={{ fontWeight: 600, color: E.muted, whiteSpace: 'nowrap' }}>▲▼ —{' '}%</span> par rapport à {c.libelle}
    </div>
  );
  const groupe = (t: string, keys: SectionKey[]) => (keys.some((k) => s[k]) ? <BlockTitle>{t}</BlockTitle> : null);

  return (
    <div style={{ background: E.page, padding: compact ? 0 : '20px 10px', fontFamily: EMAIL_FONT, color: E.ink, fontVariantNumeric: 'tabular-nums' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', background: '#FFFFFF', borderTop: `5px solid ${E.mint}`, padding: pad }}>
        {/* Title, logo, period and dates */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ flex: 1, margin: 0, fontSize: compact ? '23px' : '32px', lineHeight: 1.2, fontWeight: 400, color: E.ink }}>{titre}</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/vmind-logo-rapport.png" alt="VMIND" width={compact ? 84 : 104} style={{ display: 'block', height: 'auto' }} />
        </div>
        <div style={{ marginTop: '4px', fontSize: '18px', color: E.teal }}>{capFirst(periodeLabel(config.periode, jour))}</div>
        {agent && <div style={{ marginTop: '2px', fontSize: '13px', color: E.muted }}>{agent}</div>}
        <PreviewSection hl={highlight === 'meta'}>
          <table style={{ marginTop: '16px', borderCollapse: 'collapse' }}>
            <tbody>
              {[['Période analysée', plages.periode] as [string, Plage], ...comparaisons.map((c) => [`Comparée à ${c.libelle}`, c.dates] as [string, Plage])].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '2px 18px 2px 0', fontSize: '13px', lineHeight: 1.5, color: E.muted, verticalAlign: 'top' }}>{k}</td>
                  <td style={{ padding: '2px 0', fontSize: '13px', lineHeight: 1.5, color: E.ink, verticalAlign: 'top' }}>{plageLabel(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PreviewSection>

        {/* Key figures */}
        {(s.ca || cles.length > 0) && <BlockTitle>Chiffres clés</BlockTitle>}
        {s.ca && (
          <PreviewSection hl={highlight === 'ca'}>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              <div style={half(false, false)}>
                <div style={{ fontSize: '13px', color: E.muted }}>Chiffre d’affaires facturé</div>
                <div style={{ marginTop: '4px', lineHeight: 1.2 }}><Dash big={40} /></div>
                {comparaisons.map(variation)}
              </div>
              <div style={half(false, true)}>
                {[{ court: 'Période analysée', c: E.teal }, ...comparaisons.map((c) => ({ court: c.court, c: E.soft }))].map((x) => (
                  <div key={x.court} style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', color: E.muted, paddingBottom: '4px' }}>
                      <span>{x.court}</span><Dash />
                    </div>
                    <span aria-hidden style={{ display: 'block', height: '8px', background: E.track }} />
                  </div>
                ))}
              </div>
            </div>
          </PreviewSection>
        )}
        {cles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {cles.map((l, i) => (
              <div key={l} style={half(true, i % 2 === 1)}>
                <div style={{ fontSize: '13px', color: E.muted }}>{l}</div>
                <div style={{ marginTop: '4px', lineHeight: 1.2 }}><Dash big={25} unit={cleUnit(l)} /></div>
              </div>
            ))}
            {cles.length % 2 === 1 && <div style={half(true, true)} />}
          </div>
        )}

        {/* Summary: written by the agent at each send */}
        <PreviewSection hl={highlight === 'synthese_ia'}>
          <BlockTitle>Synthèse</BlockTitle>
          <TextLine width="100%" height={12} /><TextLine width="92%" height={12} /><TextLine width="60%" height={12} />
          <div style={{ height: '8px' }} />
          <TextLine width="100%" /><TextLine width="96%" /><TextLine width="70%" />
          {[['Actions recommandées', '☐'], ['Causes probables', '•']].map(([t, mark]) => (
            <div key={t}>
              <SectionTitle>{t}</SectionTitle>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ width: '14px', fontSize: '15px', color: E.teal }}>{mark}</span>
                  <TextLine width={i === 2 ? '55%' : '85%'} />
                </div>
              ))}
            </div>
          ))}
        </PreviewSection>

        {/* Alerts: in the email, only those that are triggered */}
        <BlockTitle>Alertes</BlockTitle>
        {rules.length ? (
          <div style={{ borderLeft: `4px solid ${E.rule}`, padding: '2px 0 2px 18px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: E.muted }}>Signalées seulement si elles sont déclenchées, par priorité</div>
            {rules.map((r, i) => (
              <div key={r} style={{ padding: '8px 0', borderTop: i ? `1px solid ${E.rule}` : 'none', fontSize: '14px', lineHeight: 1.55, color: E.ink }}>{r}</div>
            ))}
          </div>
        ) : <Small>Aucune alerte.</Small>}

        {/* Objectives */}
        {(objMois !== null || objMax.length > 0) && <BlockTitle>Objectifs</BlockTitle>}
        {objMois !== null && (
          <PreviewSection hl={highlight === 'tendance'}>
            <div style={{ padding: '12px 0', borderBottom: `1px solid ${E.rule}` }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Chiffre d’affaires facturé par mois</div>
              <Small>Au moins {fmtObj(objMois)} par mois. Le détail par mois figure dans « Tendance ».</Small>
              <div style={{ marginTop: '6px', fontSize: '14px', color: E.muted }}>Nombre de mois atteints, non atteints, sans facture et en cours : à l’envoi</div>
            </div>
          </PreviewSection>
        )}
        {objMax.map((o) => (
          <PreviewSection key={o.libelle} hl={highlight === (o.porte.includes('clients') ? 'clients' : 'fournisseurs')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 0 4px', fontSize: '14px', fontWeight: 600 }}>
              <span>{o.libelle}</span><Dash />
            </div>
            <span aria-hidden style={{ display: 'block', height: '8px', background: E.track }} />
            <span aria-hidden style={{ display: 'block', height: '3px', background: E.track, marginTop: '4px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '6px 0 14px', borderBottom: `1px solid ${E.rule}` }}>
              <Small>Au plus {fmtObj(o.cible)}, {o.porte}</Small>
              <span style={{ fontSize: '12px', fontWeight: 600, color: E.muted, whiteSpace: 'nowrap' }}>Atteint ou non, à l’envoi</span>
            </div>
          </PreviewSection>
        ))}

        {/* Sections, grouped as the skill says */}
        {groupe('Activité et rentabilité', ['ca', 'tendance', 'concentration', 'marge', 'charges'])}
        {s.ca && (
          <PreviewSection hl={highlight === 'ca'}>
            <SectionTitle>Chiffre d’affaires facturé</SectionTitle>
            <Lines rows={[['Chiffre d’affaires', <Dash key="v" />, <>{comparaisons.map(variation)}</>], ['Factures', <Dash key="n" unit="" />]]} />
          </PreviewSection>
        )}
        {s.tendance && (
          <PreviewSection hl={highlight === 'tendance'}>
            <SectionTitle>Tendance</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '14px', color: E.ink }}>
              <thead>
                <tr>
                  {['Mois', 'Chiffre d’affaires', ...(objMois !== null ? ['Objectif'] : [])].map((h, i, all) => (
                    <th key={h} style={{ textAlign: i ? 'right' : 'left', padding: `0 ${i === all.length - 1 ? 0 : 14}px 6px 0`, borderBottom: `1px solid ${E.ink}`, fontSize: '12px', fontWeight: 400, color: E.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m}>
                    <td style={td({ paddingRight: '14px' })}>{m}<Track height={6} /></td>
                    <td style={td({ textAlign: 'right', width: '150px', paddingRight: objMois !== null ? '14px' : 0 })}><Dash /></td>
                    {objMois !== null && <td style={td({ textAlign: 'right', width: '104px', fontSize: '12px', color: E.muted })}>À l’envoi</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {objMois !== null && <Small style={{ marginTop: '6px' }}>Objectif : au moins {fmtObj(objMois)} par mois.</Small>}
          </PreviewSection>
        )}
        {s.concentration && (
          <PreviewSection hl={highlight === 'clients'}>
            <SectionTitle>Concentration clients</SectionTitle>
            <List headers={['Client', 'Chiffre d’affaires', 'Part']} names={ghostNames('Client', top_n.clients)} units={['dinars', '%']} />
          </PreviewSection>
        )}
        {s.marge && (
          <PreviewSection>
            <SectionTitle>Marge des dossiers</SectionTitle>
            <SubTitle>Total de tous les dossiers de la période, facturés ou pas encore facturés</SubTitle>
            <Lines rows={[['Chiffre d’affaires', <Dash key="a" />], ['Coût', <Dash key="b" />], ['Marge', <Dash key="c" />], ['Nombre de dossiers', <Dash key="d" unit="" />]]} />
            <SubTitle>Dossiers déficitaires</SubTitle>
            <Lines rows={[['Nombre de dossiers', <Dash key="e" unit="" />], ['Perte', <Dash key="f" />], ['Taux de marge', <Dash key="g" unit="%" />]]} />
          </PreviewSection>
        )}
        {s.charges && (
          <PreviewSection>
            <SectionTitle>Achats par catégorie</SectionTitle>
            <List headers={['Catégorie', 'Montant', 'Factures']} names={ghostNames('Catégorie', 3)} units={['dinars', '']} />
          </PreviewSection>
        )}

        {groupe('Créances clients', ['clients', 'anciennete'])}
        {s.clients && (
          <PreviewSection hl={highlight === 'clients'}>
            <SectionTitle>Encours clients</SectionTitle>
            <SubTitle>Encours de tous les clients</SubTitle>
            <Lines rows={[
              ['Facturé', <Dash key="a" />], ['Encaissé', <Dash key="b" />], ['Reste', <Dash key="c" />],
              ['Taux d’encaissement', <Dash key="d" unit="%" />, <Track key="t" height={5} max={260} />],
              ['Clients en alerte crédit', <Dash key="e" unit="" />],
              ['Chiffre d’affaires des 365 derniers jours', <Dash key="f" />],
              ['Délai moyen d’encaissement', <Dash key="g" unit="jours" />],
            ]} />
            <SubTitle>Clients à surveiller</SubTitle>
            <List headers={['Client', 'Solde', 'Alerte crédit']} names={ghostNames('Client', top_n.clients)} units={['dinars', '']} lastText />
          </PreviewSection>
        )}
        {s.anciennete && (
          <PreviewSection>
            <SectionTitle>Créances de plus de 90 jours</SectionTitle>
            <Lines rows={[['Montant', <Dash key="a" />], ['Clients', <Dash key="b" unit="" />]]} />
          </PreviewSection>
        )}

        {groupe('Dettes fournisseurs', ['fournisseurs'])}
        {s.fournisseurs && (
          <PreviewSection hl={highlight === 'fournisseurs'}>
            <SectionTitle>Encours fournisseurs</SectionTitle>
            <SubTitle>Encours de tous les fournisseurs</SubTitle>
            <Lines rows={[
              ['Facturé', <Dash key="a" />], ['Payé', <Dash key="b" />], ['Reste', <Dash key="c" />], ['En retard', <Dash key="d" />],
              ['Nombre de fournisseurs en retard', <Dash key="e" unit="" />],
              ['Achats des 365 derniers jours', <Dash key="f" />],
              ['Délai moyen de paiement', <Dash key="g" unit="jours" />],
            ]} />
            <SubTitle>Fournisseurs en retard</SubTitle>
            <List headers={['Fournisseur', 'En retard', 'Reste']} names={ghostNames('Fournisseur', top_n.fournisseurs)} units={['dinars', 'dinars']} />
          </PreviewSection>
        )}

        {groupe('Trésorerie', ['banque', 'mouvements', 'frais', 'attente', 'synthese', 'tva', 'devises'])}
        {s.banque && (
          <PreviewSection>
            <SectionTitle>Solde bancaire</SectionTitle>
            <SubTitle>Dinars</SubTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '4%' }}>
              {ghostNames('Compte', 4).map((n) => (
                <div key={n} style={{ flex: '1 1 46%', minWidth: '200px', display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${E.rule}`, fontSize: '13px', lineHeight: 1.35 }}>
                  <span><Ghost>{n}</Ghost><div style={{ fontSize: '11px', color: E.muted }}>—</div></span><Dash unit="" />
                </div>
              ))}
            </div>
            <Small style={{ marginTop: '6px' }}>Un bloc par devise ; les comptes à 0,000 sont regroupés sur une ligne.</Small>
            <Small style={{ marginTop: '10px' }}>Sous chaque compte : dernier mouvement.</Small>
          </PreviewSection>
        )}
        {s.mouvements && (
          <PreviewSection>
            <SectionTitle>Mouvements de la période</SectionTitle>
            <Lines rows={[['Encaissements', <Dash key="a" />], ['Décaissements', <Dash key="b" />], ['Impayés', <Dash key="c" />], ['Virements internes', <Dash key="d" />], ['Flux net', <Dash key="e" />]]} />
          </PreviewSection>
        )}
        {s.frais && (
          <PreviewSection>
            <SectionTitle>Frais bancaires</SectionTitle>
            <List headers={['Nature', 'Montant']} names={ghostNames('Nature', 2)} units={['dinars']} />
          </PreviewSection>
        )}
        {s.attente && (
          <PreviewSection>
            <SectionTitle>Paiements en attente</SectionTitle>
            <List headers={['Statut', 'Montant', 'Paiements']} names={ghostNames('Statut', 3)} units={['dinars', '']} />
          </PreviewSection>
        )}
        {s.synthese && (
          <Lines rows={[[<span key="t" style={{ fontSize: '15px', fontWeight: 600, color: E.teal }}>Position nette</span>, <Dash key="v" />]]} />
        )}
        {s.tva && (
          <PreviewSection>
            <SectionTitle>Taxe sur la valeur ajoutée</SectionTitle>
            <Lines rows={[['Taxe collectée sur les ventes', <Dash key="a" />], ['Taxe déductible sur les achats', <Dash key="b" />], ['Solde de taxe sur la valeur ajoutée estimé', <Dash key="c" />, <Small key="s">à payer, ou en votre faveur</Small>]]} />
          </PreviewSection>
        )}
        {s.devises && (
          <PreviewSection>
            <SectionTitle>Exposition en devises</SectionTitle>
            <SubTitle>Ventes par devise</SubTitle>
            <List headers={['Devise', 'Contre-valeur', 'Factures']} names={ghostNames('Devise', 2)} units={['dinars', '']} />
            <SubTitle>Achats par devise</SubTitle>
            <List headers={['Devise', 'Contre-valeur', 'Factures']} names={ghostNames('Devise', 2)} units={['dinars', '']} />
          </PreviewSection>
        )}

        <BlockTitle>Notes sur les données</BlockTitle>
        <Small>Lignes non comptées et remarques sur les données de votre logiciel de gestion, à l’envoi.</Small>

        <p style={{ margin: '26px 0 0', paddingTop: '12px', borderTop: `1px solid ${E.rule}`, fontSize: '12px', lineHeight: 1.6, color: E.muted }}>
          Chiffres calculés par VMIND à partir de votre logiciel de gestion, sans intelligence artificielle. La synthèse est rédigée à partir de ces seuls chiffres.
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Preview frame: inbox chrome, desktop / mobile, full screen
// ─────────────────────────────────────────────────────────────
export type Device = 'desktop' | 'mobile';

export const nextSendLabel = (rules: TriggerRule[]): string => {
  const d = nextSendDate(rules);
  return d ? d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Envoi manuel';
};

export const DeviceToggle: React.FC<{ value: Device; onChange: (d: Device) => void }> = ({ value, onChange }) => (
  <div role="group" aria-label="Format d'affichage" style={{ display: 'inline-flex', padding: '3px', borderRadius: '9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
    {([['desktop', Monitor, 'Ordinateur'], ['mobile', Smartphone, 'Mobile']] as const).map(([d, Icon, label]) => {
      const on = value === d;
      return (
        <button key={d} type="button" aria-pressed={on} title={label} onClick={() => onChange(d)} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '7px', border: 0, cursor: 'pointer', fontSize: '11.5px', fontWeight: 600,
          background: on ? 'rgba(61, 220, 151, 0.16)' : 'transparent', color: on ? FIN : MUTED,
        }}>
          <Icon size={13} /> {label}
        </button>
      );
    })}
  </div>
);

/** End of the subject, as in the email: date and time of the send (none for a manual send). */
export const sendMoment = (rules: TriggerRule[]): string => {
  const d = nextSendDate(rules);
  if (!d) return '';
  const jourNum = d.getDate() === 1 ? '1er' : String(d.getDate());
  return ` — ${jourNum} ${d.toLocaleDateString('fr-FR', { month: 'long' })} ${d.getFullYear()} à ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const InboxMail: React.FC<{ config: FinanceConfig; highlight: string | null; compact?: boolean }> = ({ config, highlight, compact }) => {
  const label = periodeLabel(config.periode, jourEnvoi(config.trigger_rules));
  const recips = config.recipients;
  return (
    <div style={{ background: '#FFFFFF', color: P.ink }}>
      {/* Message header, like an email client */}
      <div style={{ padding: compact ? '12px 14px' : '16px 18px', borderBottom: `1px solid ${P.line}` }}>
        <div style={{ fontSize: compact ? '14px' : '15.5px', fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.005em' }}>
          [VMIND] Rapport Finance &amp; Trésorerie — {label}{sendMoment(config.trigger_rules)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          <div aria-hidden style={{
            width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
            background: `linear-gradient(135deg, ${FIN}, ${P.brand})`, color: '#FFFFFF', fontWeight: 800, fontSize: '13px',
          }}>V</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700 }}>VMIND <span style={{ fontWeight: 400, color: P.soft }}>· {config.agent_name || 'Finance & Trésorerie'}</span></span>
              <span style={{ fontSize: '11px', color: P.soft, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {nextSendLabel(config.trigger_rules)} <Star size={12} />
              </span>
            </div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', borderRadius: '6px', padding: highlight === 'meta' ? '3px' : 0,
              boxShadow: highlight === 'meta' ? `0 0 0 2px ${P.brand}55` : 'none', transition: 'box-shadow .25s ease',
            }}>
              <span style={{ fontSize: '11px', color: P.soft }}>À</span>
              {recips.length ? recips.map((r) => (
                <span key={r} style={{ fontSize: '11px', padding: '0 7px', borderRadius: '999px', background: P.head, border: `1px solid ${P.line}`, color: P.ink }}>{r}</span>
              )) : <span style={{ fontSize: '11px', color: P.bad }}>aucun destinataire</span>}
              {config.recipients_cc.length > 0 && (
                <>
                  <span style={{ fontSize: '11px', color: P.soft, marginLeft: '6px' }}>Copie</span>
                  {config.recipients_cc.map((r) => (
                    <span key={r} style={{ fontSize: '11px', padding: '0 7px', borderRadius: '999px', background: '#FFFFFF', border: `1px dashed ${P.line}`, color: P.soft }}>{r}</span>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <ReportPreview config={config} highlight={highlight} compact={compact} />
      <div style={{ padding: '10px 18px', borderTop: `1px solid ${P.line}`, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: P.soft }}>
        <Paperclip size={12} /> Aucune pièce jointe · rapport inclus dans le corps de l&apos;email
      </div>
    </div>
  );
};

const PreviewFrame: React.FC<{ config: FinanceConfig; highlight: string | null }> = ({ config, highlight }) => {
  const [device, setDevice] = useState<Device>('desktop');
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  const activeSections = Object.values(config.sections).filter(Boolean).length;

  const stage = (inModal: boolean) => (<>
    <LayoutBanner />
    {device === 'mobile' ? (
      <div style={{ display: 'flex', justifyContent: 'center', padding: inModal ? '8px 0' : '4px 0' }}>
        <div style={{
          width: '100%', maxWidth: '380px', borderRadius: '34px', padding: '10px', background: 'linear-gradient(160deg, #1C2733, #0D141C)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.45)',
        }}>
          <div style={{ borderRadius: '26px', overflow: 'hidden', background: '#FFFFFF' }}>
            <div style={{ height: '26px', background: '#FFFFFF', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ width: '90px', height: '18px', borderRadius: '999px', background: '#0D141C' }} />
            </div>
            <InboxMail config={config} highlight={highlight} compact />
          </div>
        </div>
      </div>
    ) : (
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: '#111B26', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ display: 'flex', gap: '6px' }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <span key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.85 }} />)}
          </span>
          <span style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: MUTED, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
            <Mail size={12} /> Boîte de réception
          </span>
          <span style={{ width: '42px' }} />
        </div>
        <InboxMail config={config} highlight={highlight} />
      </div>
    )}
  </>);

  return (
    <>
      <div style={{
        borderRadius: '16px', padding: '14px', position: 'relative',
        background: 'radial-gradient(120% 80% at 100% 0%, rgba(61,220,151,0.10) 0%, rgba(5,11,22,0) 55%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        border: '1px solid rgba(61, 220, 151, 0.18)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <style>{`@keyframes finPulse { 0% { box-shadow: 0 0 0 0 rgba(61,220,151,.55) } 70% { box-shadow: 0 0 0 7px rgba(61,220,151,0) } 100% { box-shadow: 0 0 0 0 rgba(61,220,151,0) } }
          @media (prefers-reduced-motion: reduce) { .fin-live-dot { animation: none !important } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FFFFFF' }}>
              <span className="fin-live-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: FIN, animation: 'finPulse 2s infinite' }} />
              Aperçu du rapport envoyé
            </div>
            <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '2px' }}>
              En direct · {activeSections} section{activeSections > 1 ? 's' : ''} · {config.recipients.length} destinataire{config.recipients.length > 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DeviceToggle value={device} onChange={setDevice} />
            <button type="button" onClick={() => setFull(true)} title="Plein écran" aria-label="Afficher l'aperçu en plein écran" style={{
              display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0',
            }}>
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
        {stage(false)}
      </div>

      {/* Portal to <body>: the wizard's entry animation creates a containing block that would trap a fixed overlay. */}
      {full && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu du rapport en plein écran"
          onClick={() => setFull(false)}
          style={{
            // Above the app top bar (10005) and page overlays (99999), below toasts (999999).
            position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(3, 8, 15, 0.82)', backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '32px 16px 48px',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: device === 'mobile' ? '420px' : '760px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' }}>
              <DeviceToggle value={device} onChange={setDevice} />
              <button type="button" onClick={() => setFull(false)} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', fontSize: '12.5px',
              }}>
                <X size={14} /> Fermer
              </button>
            </div>
            {stage(true)}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// Wizard
// ─────────────────────────────────────────────────────────────
/**
 * Height of the sticky preview: the room left in the scroll area under the preview's top, minus the
 * bottom padding, so that the preview alone never makes the whole page scroll. Without the sticky
 * layout (narrow screens), no limit.
 */
export const usePreviewHeight = (scrollRef: React.RefObject<HTMLDivElement | null>, asideRef: React.RefObject<HTMLElement | null>, deps: unknown[]) => {
  useEffect(() => {
    const fit = () => {
      const sc = scrollRef.current;
      const el = asideRef.current;
      if (!sc || !el) return;
      if (getComputedStyle(el).position !== 'sticky') { el.style.maxHeight = ''; return; }
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
      el.style.maxHeight = `${Math.max(320, sc.clientHeight - top - 48)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

interface WizardFinanceViewProps {
  templateId: string;
  onCancel: () => void;
  agentToEdit?: any;
  /** Saved agents.parameters of the agent being edited (read from /list-agents). Defaults to agentToEdit.parameters. */
  initialConfig?: Partial<FinanceConfig> & Record<string, any>;
  initialStep?: number;
}

const parseParams = (p: unknown): Record<string, any> | null => {
  if (!p) return null;
  if (typeof p === 'string') { try { return JSON.parse(p); } catch { return null; } }
  return typeof p === 'object' ? (p as Record<string, any>) : null;
};

/** Maps a backend INVALID_CONFIG `field` (e.g. "seuils.ecart_n1_pct") to the wizard step and element id. */
const FIELD_TARGETS: Array<[string, number, string]> = [
  ['agent_name', 1, 'fin-name'], ['periode', 1, 'fin-periode'], ['comparaison', 1, 'fin-comparaison'], ['sections', 1, 'fin-sections'],
  ['seuils.ecart_n1_pct', 2, 'fin-ecart-n1'], ['seuils', 2, 'fin-ecart-prec'],
  ['top_n.fournisseurs', 2, 'fin-top-fourn'], ['top_n', 2, 'fin-top-clients'],
  ['alertes.solde_client_min', 2, 'fin-solde-min'], ['alertes.retard_fournisseur_min', 2, 'fin-retard-min'], ['alertes', 2, 'fin-alertes'],
  ['objectifs.reste_a_encaisser_max', 2, 'fin-obj-enc'], ['objectifs.fournisseurs_retard_max', 2, 'fin-obj-ret'], ['objectifs', 2, 'fin-obj-ca'],
  ['recipients_cc', 3, 'fin-email-cc'], ['recipients', 3, 'fin-email-to'], ['trigger_rules', 3, 'fin-planif'],
  ['redaction.consigne', 4, 'fin-consigne'], ['redaction', 4, 'fin-redaction'],
];
const fieldTarget = (field?: string): { step: number; id: string } | null => {
  if (!field) return null;
  const hit = FIELD_TARGETS.find(([prefix]) => field === prefix || field.startsWith(`${prefix}.`));
  return hit ? { step: hit[1], id: hit[2] } : null;
};

export const WizardFinanceView: React.FC<WizardFinanceViewProps> = ({ onCancel, agentToEdit, initialConfig, initialStep = 1 }) => {
  const { showToast } = useToast();
  const { activeConnection } = useConnections();
  const isEditMode = Boolean(agentToEdit || initialConfig);
  const saved: Partial<FinanceConfig> & Record<string, any> =
    initialConfig || parseParams(agentToEdit?.parameters) || parseParams(agentToEdit?.config) || agentToEdit || {};

  const [step, setStep] = useState<number>(Math.min(initialStep || 1, 4));
  const [focus, setFocus] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  usePreviewHeight(scrollRef, asideRef, [step, showPreview]);
  const f = (key: string) => ({ onFocus: () => setFocus(key), onBlur: () => setFocus(null) });

  // Step 1 — Périmètre
  const [agentName, setAgentName] = useState<string>(
    saved.agent_name || agentToEdit?.agent_name || agentToEdit?.nom || `Finance & Trésorerie - ${Math.random().toString(36).slice(2, 7).toUpperCase()}`
  );
  const [periode, setPeriode] = useState<Periode>(PERIODES.some((p) => p.value === saved.periode) ? saved.periode! : 'mois_precedent');
  const { duree, etat: etatPeriode } = periodeInfo(periode);
  const [comparaisonChoisie, setComparaison] = useState<Comparaison>(COMPARAISONS.some((c) => c.value === saved.comparaison) ? saved.comparaison! : 'les_deux');
  // For a year, the previous period is the previous year: one comparison.
  const comparaison: Comparaison = duree === 'annee' ? 'n1' : comparaisonChoisie;
  const [sections, setSections] = useState<Record<SectionKey, boolean>>(() => {
    const defaults = Object.fromEntries(SECTIONS.map((s) => [s.key, s.on])) as Record<SectionKey, boolean>;
    // Only known section keys with boolean values are taken from the saved config.
    const merged = { ...defaults };
    Object.entries(saved.sections || {}).forEach(([k, v]) => { if (k in defaults && typeof v === 'boolean') merged[k as SectionKey] = v; });
    SECTIONS.filter((s) => !s.available).forEach((s) => { merged[s.key] = false; });
    return merged;
  });

  // Step 2 — Seuils & alertes
  const [ecartPrec, setEcartPrec] = useState<string>(String(saved.seuils?.ecart_precedente_pct ?? saved.seuil_ecart_pct ?? 15));
  // A year has one comparison (previous year): the threshold of a saved « période précédente » is kept for it.
  const [ecartN1, setEcartN1] = useState<string>(String(
    (saved.periode === 'annee' && saved.comparaison === 'precedente' ? saved.seuils?.ecart_precedente_pct : saved.seuils?.ecart_n1_pct) ?? 20));
  const [topClients, setTopClients] = useState<string>(String(saved.top_n?.clients ?? 5));
  const [topFournisseurs, setTopFournisseurs] = useState<string>(String(saved.top_n?.fournisseurs ?? 5));
  const [alerteCredit, setAlerteCredit] = useState<boolean>(saved.alertes?.inclure_alerte_credit ?? true);
  const [soldeMin, setSoldeMin] = useState<string>(saved.alertes?.solde_client_min?.toString() ?? '');
  const [retardMin, setRetardMin] = useState<string>(saved.alertes?.retard_fournisseur_min?.toString() ?? '');
  const [objCa, setObjCa] = useState<string>(saved.objectifs?.ca_facture_mensuel?.toString() ?? '');
  const [objEncaisser, setObjEncaisser] = useState<string>(saved.objectifs?.reste_a_encaisser_max?.toString() ?? '');
  const [objRetard, setObjRetard] = useState<string>(saved.objectifs?.fournisseurs_retard_max?.toString() ?? '');

  // Step 3 — Destinataires & planification
  const [recipients, setRecipients] = useState<string[]>(Array.isArray(saved.recipients) ? saved.recipients : []);
  const [recipientsCc, setRecipientsCc] = useState<string[]>(Array.isArray(saved.recipients_cc) ? saved.recipients_cc : []);
  // An address moved to "À" leaves the Cc list.
  const setTo = (list: string[]) => { setRecipients(list); setRecipientsCc((cc) => cc.filter((c) => !list.includes(c))); };
  const [triggerRules, setTriggerRules] = useState<TriggerRule[]>(
    Array.isArray(saved.trigger_rules) && saved.trigger_rules.length > 0
      ? saved.trigger_rules
      : [{ ...DEFAULT_TRIGGER_RULE, interval: 'Months', triggerOnWeekdays: [...DEFAULT_TRIGGER_RULE.triggerOnWeekdays] }]
  );

  // Step 4 — Rédaction
  const [ton, setTon] = useState<Ton>(TONS.some((t) => t.value === saved.redaction?.ton) ? saved.redaction!.ton : 'direction');
  const [longueur, setLongueur] = useState<Longueur>(LONGUEURS.some((l) => l.value === saved.redaction?.longueur) ? saved.redaction!.longueur : 'standard');
  const [consigne, setConsigne] = useState<string>(saved.redaction?.consigne ?? saved.consigne_agent ?? saved.contexte_ia ?? '');

  // ── Validation ──
  const errors1 = {
    name: !agentName.trim() ? "Le nom de l'agent est requis" : null,
    sections: !Object.values(sections).some(Boolean) ? 'Activez au moins une section' : null,
  };
  const errors2 = {
    ecartPrec: comparaison !== 'n1' ? pctError(ecartPrec) : null,
    ecartN1: comparaison !== 'precedente' ? pctError(ecartN1) : null,
    topClients: intError(topClients, TOP_N_MIN, TOP_N_MAX),
    topFournisseurs: intError(topFournisseurs, TOP_N_MIN, TOP_N_MAX),
    soldeMin: amountError(soldeMin),
    retardMin: amountError(retardMin),
    objCa: sections.tendance ? amountError(objCa) : null,
    objEncaisser: amountError(objEncaisser),
    objRetard: amountError(objRetard),
  };
  const valid = {
    1: Object.values(errors1).every((e) => !e),
    2: Object.values(errors2).every((e) => !e),
    3: recipients.length > 0,
  } as Record<number, boolean>;

  // Values used by the live preview stay usable even while a field is being typed.
  const num = (v: string, fallback: number) => {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  // No ERP selector yet: the active connector gives the ERP; the saved value is kept when no connector is loaded.
  const erpType: string | null = activeConnection?.connector_type?.trim().toLowerCase() || (typeof saved.erp_type === 'string' ? saved.erp_type : null);

  // Built field by field: anything else read from the saved parameters (e.g. requetes_enregistrees) is never sent back.
  const config: FinanceConfig = useMemo(() => ({
    templateId: 'finance',
    agent_name: agentName.trim(),
    run_mode: RUN_MODE,
    erp_type: erpType,
    periode,
    comparaison,
    sections,
    seuils: { ecart_precedente_pct: num(ecartPrec, 15), ecart_n1_pct: num(ecartN1, 20) },
    top_n: { clients: Math.min(10, Math.round(num(topClients, 5))), fournisseurs: Math.min(10, Math.round(num(topFournisseurs, 5))) },
    alertes: { inclure_alerte_credit: alerteCredit, solde_client_min: parseAmount(soldeMin), retard_fournisseur_min: parseAmount(retardMin) },
    objectifs: { ca_facture_mensuel: parseAmount(objCa), reste_a_encaisser_max: parseAmount(objEncaisser), fournisseurs_retard_max: parseAmount(objRetard) },
    redaction: { ton, longueur, consigne: consigne.trim() },
    recipients,
    recipients_cc: recipientsCc,
    trigger_rules: triggerRules,
    workflow_timezone: getBrowserTimezone(),
  }), [agentName, erpType, periode, comparaison, sections, ecartPrec, ecartN1, topClients, topFournisseurs, alerteCredit, soldeMin, retardMin,
    objCa, objEncaisser, objRetard, ton, longueur, consigne, recipients, recipientsCc, triggerRules]);

  const jour = jourEnvoi(triggerRules);
  const plages = periodeDates(periode, jour);
  const scheduleSummary = triggerRules.length
    ? triggerRules.map(describeTriggerRule).join(' · ')
    : 'Aucune planification (exécution manuelle uniquement)';

  const goNext = () => {
    if (!valid[step]) {
      showToast('Corrigez les champs signalés avant de continuer.', 'err');
      return;
    }
    setStep(step + 1);
  };

  // ── Deployment (§2.3) ──
  const [isDeploying, setIsDeploying] = useState(false);
  const [erpRequired, setErpRequired] = useState(false);
  /** Backend validation message (400 INVALID_CONFIG), shown under the field it names. Cleared on any change. */
  const [serverError, setServerError] = useState<{ id: string; message: string } | null>(null);
  useEffect(() => { setServerError(null); }, [config]);
  const serverErr = (id: string) => (serverError?.id === id ? serverError.message : null);

  const handleDeploy = async (action: 'deploy_only' | 'run_now') => {
    if (isDeploying) return;
    const firstInvalid = [1, 2, 3].find((s) => !valid[s]);
    if (firstInvalid) {
      showToast('Configuration incomplète.', 'err');
      setStep(firstInvalid);
      return;
    }
    if (PROTOTYPE) return;

    setServerError(null);
    setIsDeploying(true);
    try {
      const deployed = await deployAgent(config);
      // Saved without automatic scheduling (e.g. local installation): say it, the agent still runs on demand.
      if (deployed && typeof deployed.avertissement === 'string') showToast(deployed.avertissement, 'err');
      if (action === 'run_now') {
        try {
          await runAgentNow(config.agent_name);
          showToast(`${isEditMode ? 'Modifications enregistrées' : 'Agent déployé'}. Exécution lancée : le rapport arrivera par email.`, 'ok');
        } catch (runErr) {
          console.error('[Finance] run-now error:', runErr);
          showToast(`${isEditMode ? 'Modifications enregistrées' : 'Agent déployé'}, mais l’exécution immédiate n’a pas démarré. Relancez-la depuis « Mes agents ».`, 'err');
        }
      } else {
        showToast(isEditMode ? 'Modifications enregistrées.' : 'Agent Finance & Trésorerie déployé.', 'ok');
      }
      // Back to "Mes agents" (read by the page when the wizard closes).
      if (typeof window !== 'undefined') sessionStorage.setItem('vmind_wizard_prev_view', 'agents');
      onCancel();
    } catch (err: any) {
      if (err?.status === 428 || err?.code === 'ERP_CONNECTOR_REQUIRED') {
        setErpRequired(true);
        return;
      }
      if (err?.status === 400 && err?.code === 'INVALID_CONFIG') {
        const target = fieldTarget(err.field);
        if (target) {
          setServerError({ id: target.id, message: err.message });
          goToField(target.step, target.id);
        }
        showToast(err.message || 'Configuration refusée.', 'err');
        return;
      }
      console.error('[Finance] deploy error:', err);
      showToast('Le déploiement a échoué. Réessayez dans un instant.', 'err');
    } finally {
      setIsDeploying(false);
    }
  };

  // ── Field renderers ──
  // Inside a `fieldRow` grid, each field spans three shared lines (label, input, hint or error):
  // labels sit at the bottom of their line, so inputs of one row stay level even when a label wraps.
  // Outside a grid, `subgrid` falls back to plain stacked lines, as before.
  const textField = (id: string, guideKey: string, label: string, value: string, set: (v: string) => void, localErr: string | null, opts: { placeholder?: string; suffix?: string; hint?: string; numeric?: boolean } = {}) => {
    const err = localErr ?? serverErr(id);
    return (
    <div className="form-group" style={{ display: 'grid', gridRow: 'span 3', gridTemplateRows: 'subgrid', alignContent: 'start', minWidth: 0 }}>
      <label className="form-label" htmlFor={id} style={{ ...labelStyle, alignSelf: 'end' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type="text"
          inputMode={opts.numeric ? 'decimal' : undefined}
          className="form-input"
          value={value}
          onChange={(e) => set(e.target.value)}
          placeholder={opts.placeholder}
          {...f(guideKey)}
          style={{ ...inputStyle, width: '100%', paddingRight: opts.suffix ? '46px' : undefined, borderColor: err ? ERR : undefined }}
        />
        {opts.suffix && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: MUTED }}>{opts.suffix}</span>}
      </div>
      {err ? <ErrorLine text={err} /> : opts.hint ? <span className="form-hint" style={hintStyle}>{opts.hint}</span> : null}
    </div>
    );
  };
  /** Backend message for a field that is not a text field. */
  const serverLine = (id: string) => { const m = serverErr(id); return m ? <ErrorLine text={m} /> : null; };

  const navButtons = (opts: { back?: boolean; nextLabel?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
      {opts.back ? (
        <Button onClick={() => setStep(step - 1)} style={{ fontSize: '13px', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={14} /> Retour
        </Button>
      ) : (
        <Button onClick={onCancel} style={{ fontSize: '13px', padding: '10px 20px' }}>Annuler</Button>
      )}
      <button
        type="button"
        className="btn btn-primary"
        onClick={goNext}
        disabled={!valid[step]}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '13.5px', fontWeight: 700, borderRadius: '8px' }}
      >
        <span>{opts.nextLabel || 'Continuer'}</span>
        <ArrowRight size={15} />
      </button>
    </div>
  );

  // "Modifier" in the recap: open the step, then scroll to the exact field, focus it and flash it.
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  const goToField = (targetStep: number, id: string) => { setStep(targetStep); setJumpTo(id); };
  useEffect(() => {
    if (!jumpTo) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(jumpTo);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = el.matches('input, select, textarea, button')
          ? el
          : el.querySelector<HTMLElement>('select, input, textarea') ?? el.querySelector<HTMLElement>('button');
        focusable?.focus({ preventScroll: true });
        el.classList.remove('fin-flash');
        void el.offsetWidth; // restart the animation
        el.classList.add('fin-flash');
        window.setTimeout(() => el.classList.remove('fin-flash'), 1700);
      }
      setJumpTo(null);
    }, 80); // let the step render first
    return () => window.clearTimeout(timer);
  }, [jumpTo, step]);

  const guideEntry = focus ? GUIDE[focus] : null;
  const highlight = focus ? (FOCUS_TO_SECTION[focus] ?? (focus === 'recipients' || focus === 'cc' ? 'meta' : null)) : null;

  return (
    <div id="view-wizard" className="anim" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .fin-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 22px; align-items: start; }
        .fin-flash { border-radius: 10px; animation: finFlash 1.7s ease; }
        @keyframes finFlash {
          0%, 45% { box-shadow: 0 0 0 3px rgba(61,220,151,.7), 0 0 26px rgba(61,220,151,.35); }
          100% { box-shadow: 0 0 0 0 rgba(61,220,151,0), 0 0 0 rgba(61,220,151,0); }
        }
        @media (prefers-reduced-motion: reduce) { .fin-flash { animation: none; box-shadow: 0 0 0 3px rgba(61,220,151,.7); } }
        .fin-preview { position: static; }
        /* Same scrollbar as the skills pages (features/skills/skills-premium.css, .sk-page). */
        .fin-scroll { scrollbar-width: thin; scrollbar-color: rgba(148, 163, 184, 0.2) transparent; }
        .fin-scroll::-webkit-scrollbar { width: 8px; }
        .fin-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.18); border-radius: 8px; }
        @media (min-width: 1240px) {
          .fin-layout.with-preview { grid-template-columns: minmax(0, 1fr) 440px; }
          .fin-preview { position: sticky; top: 0; overflow-y: auto; }
        }
      `}</style>

      {/* Header */}
      <div className="page-head" style={{ padding: '16px 28px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#050B16', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(61, 220, 151, 0.12)',
              border: '1px solid rgba(61, 220, 151, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
            }}>
              💰
            </div>
            <div>
              <div className="page-title" style={{ fontSize: '16.5px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {isEditMode ? 'Configuration : Finance & Trésorerie (Modification)' : 'Configuration : Finance & Trésorerie'}
                {PROTOTYPE && (
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', background: 'rgba(255, 184, 0, 0.15)', color: '#FFB800', border: '1px solid rgba(255, 184, 0, 0.3)' }}>
                    Prototype
                  </span>
                )}
              </div>
              <div className="page-sub" style={{ fontSize: '12px', color: MUTED, marginTop: '2px' }}>
                Chiffre d’affaires facturé, trésorerie clients et fournisseurs, écarts et synthèse rédigée par l’agent, envoyés par email
              </div>
            </div>
          </div>
          <div className="page-actions" style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => setShowPreview((v) => !v)} style={{ fontSize: '13px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? 'Masquer l’aperçu' : 'Afficher l’aperçu'}
            </Button>
            <Button onClick={onCancel} style={{ fontSize: '13px', padding: '8px 16px' }}>← Annuler</Button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="scroll fin-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: showPreview ? '1360px' : '880px', margin: '0 auto', padding: '24px 20px 48px' }}>

          {/* Stepper */}
          <div className="wizard-steps" style={{ marginBottom: '22px', maxWidth: '880px' }}>
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const canGo = step > n;
              return (
                <div key={label} className={`wstep ${step === n ? 'active' : step > n ? 'done' : ''}`} onClick={() => canGo && setStep(n)} style={{ cursor: canGo ? 'pointer' : 'default' }}>
                  <div className="wstep-inner">
                    <div className="wstep-num" style={{ width: '34px', height: '34px', fontSize: '13px', fontWeight: 700 }}>
                      {step > n ? <Check size={14} strokeWidth={3} /> : n}
                    </div>
                    <div className="wstep-label" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'none', letterSpacing: 0, marginTop: '4px', color: step >= n ? ACCENT : MUTED }}>
                      {label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`fin-layout ${showPreview ? 'with-preview' : ''}`}>
            {/* ── Left: form ── */}
            <div className="anim" key={step} style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>

              {step === 1 && (
                <>
                  <Card title="Identité de l'agent">
                    {textField('fin-name', 'name', "Nom de l'agent *", agentName, setAgentName, errors1.name, { placeholder: 'Exemple : Finance & Trésorerie - Siège', hint: 'Visible dans la liste de vos agents et dans l’objet de l’email' })}
                  </Card>

                  <Card title="Période et comparaison">
                    <div className="form-group">
                      <label className="form-label" htmlFor="fin-periode" style={labelStyle}>Période analysée</label>
                      <div style={fieldRow}>
                        <select id="fin-periode" aria-label="Durée de la période" className="form-input" value={duree} onChange={(e) => setPeriode(CODES[e.target.value as Duree][etatPeriode])} {...f('periode')} style={inputStyle}>
                          {DUREES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                        <select id="fin-periode-etat" aria-label="Période précédente ou en cours" className="form-input" value={etatPeriode} onChange={(e) => setPeriode(CODES[duree][e.target.value as EtatPeriode])} {...f('periode')} style={inputStyle}>
                          {ETATS_PERIODE.map((e) => <option key={e} value={e}>{etatLabel(e, duree)}</option>)}
                        </select>
                      </div>
                      {serverLine('fin-periode')}
                    </div>
                    <div id="fin-comparaison" className="form-group" style={{ marginTop: '14px' }}>
                      <label className="form-label" style={labelStyle}>Comparer le chiffre d’affaires avec</label>
                      {duree === 'annee'
                        ? <div style={{ fontSize: '13px', color: '#E2E8F0' }}>L’année précédente <span style={{ color: MUTED }}>(pour une année, c’est aussi la période précédente)</span></div>
                        : <Segmented value={comparaisonChoisie} options={COMPARAISONS} onChange={setComparaison} onFocus={() => setFocus('comparaison')} />}
                      {serverLine('fin-comparaison')}
                    </div>
                    <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 14px', margin: '10px 0 0', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '12.5px' }}>
                      {([
                        ['Prochain envoi', nextSendLabel(triggerRules)],
                        ['Période analysée', plageLabel(plages.periode)],
                        comparaison !== 'n1' && ['Période précédente', plageLabel(plages.precedente)],
                        comparaison !== 'precedente' && ['Année précédente', plageLabel(plages.n1)],
                      ].filter(Boolean) as string[][]).map(([k, v]) => (
                        <React.Fragment key={k}>
                          <dt style={{ color: MUTED }}>{k}</dt>
                          <dd style={{ margin: 0, color: '#E2E8F0' }}>{v}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </Card>

                  <Card
                    title="Sections du rapport"
                    subtitle="Le contenu habituel du reporting d'un responsable financier et trésorerie. La synthèse rédigée par l’agent et les alertes sont toujours incluses."
                    right={(() => {
                      const available = SECTIONS.filter((s) => s.available);
                      const activeCount = available.filter((s) => sections[s.key]).length;
                      const allOn = activeCount === available.length;
                      const setAll = (v: boolean) => setSections((prev) => {
                        const next = { ...prev };
                        available.forEach((s) => { next[s.key] = v; });
                        return next;
                      });
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '12px', color: MUTED }}>{activeCount} / {available.length} actives</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: allOn ? '#FFFFFF' : MUTED }}>Tout activer</span>
                          <Switch on={allOn} label="Activer toutes les sections" onChange={setAll} />
                        </div>
                      );
                    })()}
                  >
                    <div id="fin-sections" style={{ display: 'grid', gap: '16px' }} onMouseEnter={() => setFocus('sections')} onMouseLeave={() => setFocus(null)}>
                      {SECTION_GROUPS.map((group) => (
                        <div key={group} style={{ display: 'grid', gap: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED }}>{group}</div>
                          {SECTIONS.filter((s) => s.group === group).map((s) => (
                            <div key={s.key} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', borderRadius: '8px',
                              background: sections[s.key] ? 'rgba(61, 220, 151, 0.06)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                              opacity: s.available ? 1 : 0.6,
                            }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: sections[s.key] ? '#FFFFFF' : MUTED, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  {s.label}
                                  {!s.available && (
                                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: '5px', background: 'rgba(255, 184, 0, 0.12)', color: '#FFB800', border: '1px solid rgba(255, 184, 0, 0.3)' }}>
                                      Donnée manquante dans le logiciel de gestion
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11.5px', color: MUTED }}>{s.available ? s.hint : `${s.hint}. ${s.missing}.`}</div>
                              </div>
                              {s.available ? (
                                <Switch on={sections[s.key]} label={s.label} onChange={(v) => setSections((prev) => ({ ...prev, [s.key]: v }))} />
                              ) : (
                                <span aria-label={`${s.label} indisponible`} style={{ width: '38px', height: '22px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    {errors1.sections ? <ErrorLine text={errors1.sections} /> : serverLine('fin-sections')}
                  </Card>

                  {navButtons({ nextLabel: 'Seuils & alertes' })}
                </>
              )}

              {step === 2 && (
                <>
                  <Card title="Écarts significatifs du chiffre d’affaires" subtitle="Alerte « À surveiller » à partir du pourcentage, en hausse ou en baisse ; « Priorité haute » à partir du double.">
                    <div style={fieldRow}>
                      {comparaison !== 'n1' && textField('fin-ecart-prec', 'ecart_precedente', 'Signaler si le chiffre d’affaires varie d’au moins (période précédente)', ecartPrec, setEcartPrec, errors2.ecartPrec, { suffix: '± %', numeric: true })}
                      {comparaison !== 'precedente' && textField('fin-ecart-n1', 'ecart_n1', duree === 'annee' ? 'Signaler si le chiffre d’affaires varie d’au moins (année précédente)' : 'Signaler si le chiffre d’affaires varie d’au moins (même période, année précédente)', ecartN1, setEcartN1, errors2.ecartN1, { suffix: '± %', numeric: true })}
                    </div>
                  </Card>

                  <Card title="Alertes de trésorerie" subtitle="Montants en TND, au jour de l’envoi, quelle que soit la période. Laissez un seuil vide pour ne pas l'utiliser.">
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '12px',
                    }} id="fin-alertes" onMouseEnter={() => setFocus('alerte_credit')} onMouseLeave={() => setFocus(null)}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>Inclure les clients signalés à risque par le logiciel de gestion</div>
                        <div style={{ fontSize: '11.5px', color: MUTED }}>Statut crédit autre que normal, par exemple autre que « RAS » (rien à signaler)</div>
                      </div>
                      <Switch on={alerteCredit} onChange={setAlerteCredit} label="Inclure les clients signalés à risque par le logiciel de gestion" />
                    </div>
                    {serverLine('fin-alertes')}
                    <div style={fieldRow}>
                      {textField('fin-solde-min', 'solde_client_min', 'Signaler tout client qui doit au moins', soldeMin, setSoldeMin, errors2.soldeMin, { placeholder: 'Exemple : 100 000', suffix: 'TND', numeric: true })}
                      {textField('fin-retard-min', 'retard_fournisseur_min', 'Signaler tout fournisseur à qui l’on doit, en retard, au moins', retardMin, setRetardMin, errors2.retardMin, { placeholder: 'Exemple : 20 000', suffix: 'TND', numeric: true })}
                    </div>
                  </Card>

                  <Card title="Listes du rapport">
                    <div style={fieldRow}>
                      {textField('fin-top-clients', 'top_clients', 'Nombre de clients dans les listes', topClients, setTopClients, errors2.topClients, { suffix: '/ 10', numeric: true, hint: 'Par solde dû et par chiffre d’affaires' })}
                      {textField('fin-top-fourn', 'top_fournisseurs', 'Nombre de fournisseurs en retard à lister', topFournisseurs, setTopFournisseurs, errors2.topFournisseurs, { suffix: '/ 10', numeric: true, hint: 'Classés par montant en retard' })}
                    </div>
                  </Card>

                  <Card title="Objectifs (optionnels)" subtitle={`Le rapport affiche pour chacun « Atteint » ou « Non atteint ».${sections.tendance ? '' : ' L’objectif de chiffre d’affaires par mois demande la section « Tendance du chiffre d’affaires ».'}`}>
                    <div style={fieldRow}>
                      {sections.tendance && textField('fin-obj-ca', 'obj_ca', 'Objectif de chiffre d’affaires par mois', objCa, setObjCa, errors2.objCa, { placeholder: 'Exemple : 1 200 000', suffix: 'TND', numeric: true })}
                      {textField('fin-obj-enc', 'obj_encaisser', 'Total maximal dû par l’ensemble des clients', objEncaisser, setObjEncaisser, errors2.objEncaisser, { placeholder: 'Exemple : 800 000', suffix: 'TND', numeric: true })}
                      {textField('fin-obj-ret', 'obj_retard', 'Total maximal en retard envers les fournisseurs', objRetard, setObjRetard, errors2.objRetard, { placeholder: 'Exemple : 50 000', suffix: 'TND', numeric: true })}
                    </div>
                  </Card>

                  {navButtons({ back: true, nextLabel: 'Destinataires & planification' })}
                </>
              )}

              {step === 3 && (
                <>
                  <Card
                    title="Destinataires du rapport"
                    subtitle="Au moins un destinataire principal est requis. Les personnes en copie reçoivent le même email, pour information."
                    right={<span style={{ fontSize: '12px', color: MUTED, whiteSpace: 'nowrap' }}>{recipients.length} à · {recipientsCc.length} cc</span>}
                  >
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <EmailListField
                        id="fin-email-to"
                        label="À *"
                        list={recipients}
                        onChange={setTo}
                        placeholder="nom@entreprise.com, puis Entrée"
                        onFocus={() => setFocus('recipients')}
                        onBlur={() => setFocus(null)}
                      />
                      {serverErr('fin-email-to') && <div style={{ marginTop: '-12px' }}>{serverLine('fin-email-to')}</div>}
                      {recipients.length === 0 && <div style={{ ...hintStyle, marginTop: '-8px' }}>Aucun destinataire principal pour l&apos;instant.</div>}
                      <EmailListField
                        id="fin-email-cc"
                        label="Copie (optionnelle)"
                        list={recipientsCc}
                        onChange={setRecipientsCc}
                        exclude={recipients}
                        chipTint={FIN}
                        placeholder="Personnes en copie, par exemple le directeur général"
                        onFocus={() => setFocus('cc')}
                        onBlur={() => setFocus(null)}
                      />
                      {serverErr('fin-email-cc') && <div style={{ marginTop: '-12px' }}>{serverLine('fin-email-cc')}</div>}
                    </div>
                  </Card>

                  <div id="fin-planif">
                    <TriggerRulesEditor
                      rules={triggerRules}
                      onChange={setTriggerRules}
                      accent={FIN}
                      onFocusField={setFocus}
                      note="En cliquant sur déployer, l'agent Finance & Trésorerie s'exécutera selon la planification configurée et enverra son rapport aux destinataires."
                    />
                    {serverLine('fin-planif')}
                  </div>

                  {navButtons({ back: true, nextLabel: 'Rédaction & confirmation' })}
                </>
              )}

              {step === 4 && (
                <>
                  <Card title="Missions de l'agent" subtitle="Les impayés critiques ne sont pas traités ici : ils relèvent de l'agent Recouvrement.">
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '9px', color: '#E2E8F0', fontSize: '13px', lineHeight: 1.5 }}>
                      {[
                        sections.ca && `Analyser le chiffre d’affaires facturé de la période (hors brouillons)${comparaison === 'les_deux' ? ' et le comparer à la période précédente et à la même période de l’année précédente' : comparaison === 'n1' ? ' et le comparer à la même période de l’année précédente' : ' et le comparer à la période précédente'}`,
                        sections.tendance && `Montrer la tendance du chiffre d’affaires mois par mois, ${tendanceLibelle(periode)}`,
                        sections.concentration && 'Mesurer la dépendance aux principaux clients',
                        sections.marge && 'Calculer la marge brute des dossiers et repérer les dossiers déficitaires',
                        sections.charges && 'Répartir les achats de la période par catégorie de dépense',
                        sections.clients && `Suivre l’encours clients, le taux d’encaissement et le délai moyen d’encaissement, et lister les ${config.top_n.clients} principaux soldes`,
                        sections.anciennete && 'Isoler les créances de plus de 90 jours',
                        sections.fournisseurs && `Suivre l’encours fournisseurs et le délai moyen de paiement, et lister les ${config.top_n.fournisseurs} principaux retards`,
                        sections.banque && 'Calculer le solde de chaque compte bancaire à partir du solde initial et des mouvements débités',
                        sections.mouvements && 'Présenter les encaissements, décaissements et impayés de la période',
                        sections.frais && 'Détailler les frais bancaires par nature',
                        sections.attente && 'Lister les paiements validés, émis ou en cours, pas encore débités',
                        sections.synthese && 'Calculer la position nette et le besoin en fonds de roulement approché à partir des factures',
                        sections.tva && 'Estimer le solde de taxe sur la valeur ajoutée de la période',
                        sections.devises && 'Présenter l’exposition par devise',
                        'Signaler les écarts, les alertes de trésorerie et les objectifs non atteints',
                        `Rédiger une synthèse ${ton === 'direction' ? 'orientée direction' : 'opérationnelle'}, ${LONGUEURS.find((l) => l.value === longueur)?.label.toLowerCase()}`,
                        `Envoyer le rapport à ${recipients.length} destinataire${recipients.length > 1 ? 's' : ''}${recipientsCc.length ? `, ${recipientsCc.length} en copie,` : ''} selon la planification`,
                      ].filter(Boolean).map((m) => (
                        <li key={m as string} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '8px', alignItems: 'start' }}>
                          <Check size={14} color={FIN} strokeWidth={3} style={{ marginTop: '3px' }} />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <div id="fin-redaction">
                  <Card title="Rédaction de la synthèse">
                    <div className="form-group">
                      <label className="form-label" style={labelStyle}>Ton</label>
                      <Segmented value={ton} options={TONS} onChange={setTon} onFocus={() => setFocus('ton')} />
                    </div>
                    <div className="form-group" style={{ marginTop: '6px' }}>
                      <label className="form-label" style={labelStyle}>Longueur</label>
                      <Segmented value={longueur} options={LONGUEURS} onChange={setLongueur} onFocus={() => setFocus('longueur')} />
                    </div>
                    {serverLine('fin-redaction')}
                  </Card>
                  </div>

                  <Card title="Consigne à l'agent (optionnelle)" subtitle="Elle oriente la rédaction de la synthèse. Elle ne modifie pas les calculs.">
                    <textarea
                      id="fin-consigne"
                      className="form-input"
                      rows={4}
                      value={consigne}
                      onChange={(e) => setConsigne(e.target.value)}
                      {...f('consigne')}
                      placeholder="Exemple : fin d'exercice en décembre ; insister sur le reste à encaisser des clients du secteur maritime."
                      style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    {serverLine('fin-consigne')}
                  </Card>

                  <Card title="Récapitulatif">
                    <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 200px) 1fr', gap: '9px 16px', margin: 0, fontSize: '13px' }}>
                      {[
                        ['Agent', config.agent_name, 1, 'fin-name'],
                        ['Période', `${periodeInfo(periode).label} (prochain : ${periodeLabel(periode, jour)})`, 1, 'fin-periode'],
                        ['Comparaison', duree === 'annee' ? 'Année précédente' : COMPARAISONS.find((c) => c.value === comparaison)?.label, 1, 'fin-comparaison'],
                        ['Sections', SECTIONS.filter((s) => sections[s.key]).map((s) => s.label).join(', '), 1, 'fin-sections'],
                        ['Seuils d’écart', [comparaison !== 'n1' && `±${config.seuils.ecart_precedente_pct} % par rapport à la période précédente`, comparaison !== 'precedente' && `±${config.seuils.ecart_n1_pct} % par rapport à l’année précédente`].filter(Boolean).join(' · '), 2, comparaison !== 'n1' ? 'fin-ecart-prec' : 'fin-ecart-n1'],
                        ['Alertes', [alerteCredit && 'clients signalés à risque', config.alertes.solde_client_min !== null && `client ≥ ${tnd(config.alertes.solde_client_min)}`, config.alertes.retard_fournisseur_min !== null && `fournisseur ≥ ${tnd(config.alertes.retard_fournisseur_min)}`].filter(Boolean).join(' · ') || '—', 2, 'fin-alertes'],
                        ['Objectifs', [sections.tendance && config.objectifs.ca_facture_mensuel !== null && `chiffre d’affaires par mois ≥ ${formatTnd(config.objectifs.ca_facture_mensuel)}`, config.objectifs.reste_a_encaisser_max !== null && `total dû par les clients ≤ ${formatTnd(config.objectifs.reste_a_encaisser_max)}`, config.objectifs.fournisseurs_retard_max !== null && `total en retard envers les fournisseurs ≤ ${formatTnd(config.objectifs.fournisseurs_retard_max)}`].filter(Boolean).join(' · ') || '—', 2, sections.tendance ? 'fin-obj-ca' : 'fin-obj-enc'],
                        ['Destinataires', recipients.join(', '), 3, 'fin-email-to'],
                        ['Copie', recipientsCc.join(', ') || '—', 3, 'fin-email-cc'],
                        ['Planification', scheduleSummary, 3, 'fin-planif'],
                      ].map(([k, v, s, target]) => (
                        <React.Fragment key={k as string}>
                          <dt style={{ color: MUTED }}>{k}</dt>
                          <dd style={{ margin: 0, color: '#E2E8F0', minWidth: 0, overflowWrap: 'anywhere', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                            <span>{v}</span>
                            <button type="button" onClick={() => goToField(s as number, target as string)} aria-label={`Modifier : ${k}`} style={{ background: 'none', border: 0, color: ACCENT, cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>Modifier</button>
                          </dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </Card>

                  {!showPreview && <PreviewFrame config={config} highlight={highlight} />}


                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <Button onClick={() => setStep(3)} style={{ fontSize: '13px', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <ArrowLeft size={14} /> Retour
                    </Button>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <Button onClick={() => handleDeploy('deploy_only')} disabled={isDeploying} style={{ fontSize: '13px', padding: '10px 18px' }}>
                        {isDeploying ? 'Enregistrement…' : isEditMode ? 'Enregistrer' : 'Déployer'}
                      </Button>
                      <button type="button" className="btn btn-primary" onClick={() => handleDeploy('run_now')} disabled={isDeploying} aria-busy={isDeploying}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '13.5px', fontWeight: 700, borderRadius: '8px', opacity: isDeploying ? 0.6 : 1 }}>
                        <Zap size={15} />
                        <span>{isEditMode ? 'Enregistrer et exécuter maintenant' : 'Déployer et exécuter maintenant'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Right: live preview ── */}
            {showPreview && (
              <aside ref={asideRef} className="fin-preview fin-scroll" aria-label="Aperçu du rapport envoyé">
                <PreviewFrame config={config} highlight={highlight} />
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* 428 ERP_CONNECTOR_REQUIRED: same block as the marketplace, with a link to the integrations. */}
      {erpRequired && typeof document !== 'undefined' && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="fin-erp-required-title" style={{
          position: 'fixed', inset: 0, background: 'rgba(4, 16, 30, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '20px',
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #0A192F 0%, #06101E 100%)', border: '1px solid rgba(0, 229, 200, 0.4)', borderRadius: '16px',
            padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', textAlign: 'center',
          }}>
            <div aria-hidden style={{ fontSize: '48px', marginBottom: '16px' }}>🔌</div>
            <h3 id="fin-erp-required-title" style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 800, marginBottom: '10px' }}>Connexion ERP requise</h3>
            <p style={{ color: MUTED, fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              L&apos;agent <strong>Finance &amp; Trésorerie</strong> lit les factures, les encours et la trésorerie dans votre ERP.
              Connectez votre ERP, puis déployez de nouveau l&apos;agent.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setErpRequired(false)} style={{
                padding: '10px 18px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                color: MUTED, cursor: 'pointer', fontSize: '13px',
              }}>Fermer</button>
              <button type="button" onClick={() => {
                setErpRequired(false);
                window.dispatchEvent(new CustomEvent('switch-assistant-view', { detail: 'connectors' }));
              }} style={{
                padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #00E5C8 0%, #00B4D8 100%)', border: 'none',
                color: '#04101E', fontWeight: 800, cursor: 'pointer', fontSize: '13px', boxShadow: '0 0 20px rgba(0, 229, 200, 0.4)',
              }}>Connecter mon ERP</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <VMindGuide
        isOpen={Boolean(guideEntry) || (!showPreview && step >= 1)}
        title={guideEntry ? guideEntry.title : STEP_GUIDE[step]?.title}
        message={guideEntry ? guideEntry.text : STEP_GUIDE[step]?.text ?? null}
        mood={guideEntry?.mood || 'focused'}
        customColor={FIN}
      />
    </div>
  );
};
