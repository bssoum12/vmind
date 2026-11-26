'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/management/components/Button';
import { useToast } from '@/shared/contexts/ToastContext';
import { getAgents } from '@/shared/api/n8n-api';
import { VMindGuide, GuideMood } from '@/shared/management/components/VMindGuide';
import { Check, ArrowRight, ArrowLeft, Eye, EyeOff, Maximize2, Mail, X, Zap, Settings, Lock } from 'lucide-react';
import { VIRTUAL_MIND_GUIDE as RECOUVREMENT_GUIDE } from './WizardView';
import { TriggerRulesEditor, TriggerRule, DEFAULT_TRIGGER_RULE, describeTriggerRule } from './components/TriggerRulesEditor';
import {
  Periode, Duree, EtatPeriode, SectionKey, Plage, Device,
  DUREES, ETATS_PERIODE, etatLabel, CODES, periodeInfo, SECTIONS, SECTION_GROUPS,
  ACCENT, MUTED, ERR, labelStyle, hintStyle, inputStyle, fieldRow,
  parseAmount, amountError, pctError, TOP_N_MIN, TOP_N_MAX, intError,
  periodeDates, plageLabel, periodeLabel, jourEnvoi, nextSendLabel, sendMoment,
  Card, ErrorLine, Switch, EmailListField, Segmented, DeviceToggle, LayoutBanner,
  usePreviewHeight, GUIDE as FINANCE_GUIDE, E, EMAIL_FONT, capFirst, Dash, TextLine, PreviewSection, BlockTitle, Small, Lines,
} from './WizardFinanceView';

/**
 * Agent Direction Générale — form only (front). Nothing is saved yet: the backend and the n8n workflow
 * are not connected. Plan: rapports/plan-front-agent-direction-generale.md; mockup:
 * rapports/maquette-agent-direction-generale.html. Each source keeps its own settings, used only by the
 * Direction Générale; the period, comparisons, recipients, schedule and tone are common to all sources.
 */
const DG = '#00E5C8';
const TITRE = 'Rapport Direction Générale';

type SourceKey = 'finance' | 'recouvrement';
type Comparateur = 'precedente' | 'n1' | 'objectifs';
type Priorite = 'tresorerie' | 'rentabilite' | 'croissance' | 'risque_client' | 'couts';
type TonDg = 'direct' | 'factuel' | 'pedagogique';
type Urgence = 'CRITIQUE_ONLY' | 'ELEVE_ONLY' | 'MOYEN_ONLY' | 'FAIBLE_ONLY' | 'ELEVE_PLUS' | 'MOYEN_PLUS' | 'ALL';

interface FinanceSource {
  sections: Record<SectionKey, boolean>;
  ecartPrec: string; ecartN1: string;
  alerteCredit: boolean; soldeMin: string; retardMin: string;
  topClients: string; topFournisseurs: string;
  objCa: string; objEncaisser: string; objRetard: string;
}
interface RecouvrementSource {
  montantMin: string; devise: 'TND' | 'EUR' | 'USD'; urgence: Urgence | ''; escalade: string; relancesMax: string; consignes: string;
}

const SOURCES: { key: SourceKey | 'achats' | 'exploitation'; label: string; text: string; available: boolean }[] = [
  { key: 'finance', label: 'Finance & Trésorerie', text: 'Chiffre d’affaires, marge, créances, dettes, trésorerie et taxe sur la valeur ajoutée.', available: true },
  { key: 'recouvrement', label: 'Recouvrement', text: 'Factures impayées, retards et risque client. État à la date du jour.', available: true },
  { key: 'achats', label: 'Achats & Fournisseurs', text: 'Coûts d’achat, prix fournisseurs, délais de livraison.', available: false },
  { key: 'exploitation', label: 'Exploitation & Transport', text: 'Dossiers, retards, prestations non facturées.', available: false },
];
const COMPARATEURS: { value: Comparateur; label: string }[] = [
  { value: 'precedente', label: 'Période précédente' },
  { value: 'n1', label: 'Même période de l’année précédente' },
  { value: 'objectifs', label: 'Objectifs de la direction' },
];
const PRIORITES: { value: Priorite; label: string }[] = [
  { value: 'tresorerie', label: 'Trésorerie' }, { value: 'rentabilite', label: 'Rentabilité' }, { value: 'croissance', label: 'Croissance' },
  { value: 'risque_client', label: 'Risque client' }, { value: 'couts', label: 'Coûts' },
];
const TONS_DG: { value: TonDg; label: string; hint: string }[] = [
  { value: 'direct', label: 'Direct', hint: 'Décisions et risques, en peu de mots' },
  { value: 'factuel', label: 'Factuel', hint: 'Les chiffres et leurs écarts, sans interprétation' },
  { value: 'pedagogique', label: 'Pédagogique', hint: 'Explique chaque indicateur et sa cause probable' },
];
const URGENCES: { value: Urgence; label: string }[] = [
  { value: 'CRITIQUE_ONLY', label: 'Critique uniquement (plus de 90 jours)' },
  { value: 'ELEVE_ONLY', label: 'Élevée uniquement (60 à 90 jours)' },
  { value: 'MOYEN_ONLY', label: 'Moyenne uniquement (30 à 60 jours)' },
  { value: 'FAIBLE_ONLY', label: 'Faible uniquement (0 à 30 jours)' },
  { value: 'ELEVE_PLUS', label: 'Élevée et plus (plus de 60 jours)' },
  { value: 'MOYEN_PLUS', label: 'Moyenne et plus (plus de 30 jours)' },
  { value: 'ALL', label: 'Toutes les factures' },
];
const STEP_LABELS = ['Sources', 'Analyse', 'Diffusion', 'Planification', 'Confirmation'];

const GUIDE: Record<string, { title: string; text: string; mood?: GuideMood }> = {
  name: { title: "Nom de l'agent", text: 'Visible dans la liste de vos agents et dans l’objet de l’email. Exemple : « Rapport Direction Générale - Siège ».', mood: 'curious' },
  sources: { title: 'Sources', text: 'Chaque source garde ses propres réglages, utilisés uniquement par la Direction Générale. Chaque chiffre reste calculé par l’agent de son domaine.', mood: 'convinced' },
  periode: { title: 'Période analysée', text: 'La même période est imposée à toutes les sources. Le Recouvrement donne l’état à la date du jour.' },
  comparaison: { title: 'Comparer avec', text: 'Plusieurs choix possibles. Pour une année, la période précédente est l’année précédente.' },
  ecart: { title: 'Écart significatif', text: 'À partir de ce pourcentage, en hausse ou en baisse, l’écart devient une alerte.' },
  sante: { title: 'Indice de santé', text: 'Note sur 100 calculée à partir des règles de la Direction Générale. Sous ce seuil, une alerte apparaît.' },
  priorites: { title: 'Priorités du dirigeant', text: 'Elles ordonnent la lecture et les décisions proposées.' },
  signaux: { title: 'Signaux croisés', text: 'Rapprocher les résultats des sources pour voir ce qu’aucune ne voit seule.' },
  decisions: { title: 'Décisions proposées', text: 'Trois actions concrètes, classées par impact.' },
  recipients: { title: 'Destinataires', text: 'Collez plusieurs adresses séparées par des virgules ou des points-virgules.', mood: 'curious' },
  cc: { title: 'Copie', text: 'Les personnes en copie reçoivent le même email, pour information.', mood: 'curious' },
  ton: { title: 'Ton de la synthèse', text: 'Direct, factuel ou pédagogique. Il change la rédaction, jamais les chiffres.' },
  consigne: { title: "Consigne à l'agent", text: 'Ce que la lecture doit privilégier. La consigne oriente la rédaction, jamais les calculs.', mood: 'convinced' },
  trigger_interval: { title: 'Intervalle', text: 'Un envoi mensuel en début de mois ou hebdomadaire le lundi matin est le plus courant.' },
  trigger_hour: { title: "Heure d'exécution", text: 'Choisissez une heure avant l’arrivée des destinataires, par exemple 07:00.' },
};
const STEP_GUIDE: Record<number, { title: string; text: string }> = {
  1: { title: 'SOURCES', text: 'Cochez les sources et réglez chacune avec ⚙. Au moins deux sources sont nécessaires.' },
  2: { title: 'ANALYSE', text: 'Période, comparaisons, seuils et priorités : ils s’appliquent à toutes les sources.' },
  3: { title: 'DIFFUSION', text: 'Indiquez qui reçoit le rapport de direction.' },
  4: { title: 'PLANIFICATION', text: 'Quand le rapport est préparé et envoyé. Sans règle, il ne part que manuellement.' },
  5: { title: 'CONFIRMATION', text: 'Vérifiez le récapitulatif. Le déploiement sera possible quand le traitement sera branché.' },
};
const FOCUS_TO_PART: Record<string, string> = {
  periode: 'meta', comparaison: 'meta', ecart: 'alertes', sante: 'sante', priorites: 'lecture', signaux: 'signaux', decisions: 'decisions',
  recipients: 'meta', cc: 'meta', ton: 'lecture', consigne: 'lecture', sources: 'sources',
};

const defaultFinance = (): FinanceSource => ({
  sections: Object.fromEntries(SECTIONS.map((s) => [s.key, s.available && s.on])) as Record<SectionKey, boolean>,
  ecartPrec: '15', ecartN1: '20', alerteCredit: true, soldeMin: '', retardMin: '', topClients: '5', topFournisseurs: '5', objCa: '', objEncaisser: '', objRetard: '',
});
const defaultRecouvrement = (): RecouvrementSource => ({ montantMin: '', devise: 'TND', urgence: '', escalade: '', relancesMax: '', consignes: '' });
const fmtTnd = (v: string) => { const n = parseAmount(v); return n === null ? '' : `${n.toLocaleString('fr-FR')} dinars`; };

const parseParams = (p: unknown): Record<string, any> | null => {
  if (!p) return null;
  if (typeof p === 'string') { try { return JSON.parse(p); } catch { return null; } }
  return typeof p === 'object' ? (p as Record<string, any>) : null;
};
/** Settings of an existing agent copied once into the panel: no link is kept. */
const financeFrom = (a: any): FinanceSource => {
  const p = parseParams(a?.parameters) || a || {};
  const d = defaultFinance();
  const str = (v: unknown, fallback: string) => (v === null || v === undefined ? fallback : String(v));
  const sections = { ...d.sections };
  Object.entries(p.sections || {}).forEach(([k, v]) => { if (k in sections && typeof v === 'boolean') sections[k as SectionKey] = v && SECTIONS.some((s) => s.key === k && s.available); });
  return {
    sections, ecartPrec: str(p.seuils?.ecart_precedente_pct, d.ecartPrec), ecartN1: str(p.seuils?.ecart_n1_pct, d.ecartN1),
    alerteCredit: p.alertes?.inclure_alerte_credit ?? d.alerteCredit, soldeMin: str(p.alertes?.solde_client_min, ''), retardMin: str(p.alertes?.retard_fournisseur_min, ''),
    topClients: str(p.top_n?.clients, d.topClients), topFournisseurs: str(p.top_n?.fournisseurs, d.topFournisseurs),
    objCa: str(p.objectifs?.ca_facture_mensuel, ''), objEncaisser: str(p.objectifs?.reste_a_encaisser_max, ''), objRetard: str(p.objectifs?.fournisseurs_retard_max, ''),
  };
};
const recouvrementFrom = (a: any): RecouvrementSource => {
  const p = parseParams(a?.parameters) || a || {};
  const r = p.recovery_config || a?.recovery_config || {};
  const t = r.thresholds || {};
  const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  return {
    montantMin: str(t.minimum_amount), devise: ['TND', 'EUR', 'USD'].includes(t.currency) ? t.currency : 'TND',
    urgence: URGENCES.some((u) => u.value === r.min_urgency) ? r.min_urgency : '', escalade: str(t.days_before_escalation), relancesMax: str(t.max_reminders), consignes: str(r.instructions),
  };
};
const financeErrors = (c: FinanceSource) => ({
  sections: !Object.values(c.sections).some(Boolean) ? 'Activez au moins une section' : null,
  ecartPrec: pctError(c.ecartPrec), ecartN1: pctError(c.ecartN1),
  soldeMin: amountError(c.soldeMin), retardMin: amountError(c.retardMin),
  topClients: intError(c.topClients, TOP_N_MIN, TOP_N_MAX), topFournisseurs: intError(c.topFournisseurs, TOP_N_MIN, TOP_N_MAX),
  objCa: c.sections.tendance ? amountError(c.objCa) : null, objEncaisser: amountError(c.objEncaisser), objRetard: amountError(c.objRetard),
});
const recouvrementErrors = (c: RecouvrementSource) => {
  const int = (v: string, min: number, max: number) => (v.trim() === '' ? null : intError(v, min, max));
  return {
    montantMin: amountError(c.montantMin), urgence: c.urgence ? null : 'Choisissez une urgence minimale',
    escalade: int(c.escalade, 1, 365), relancesMax: int(c.relancesMax, 1, 10),
  };
};
const noError = (o: Record<string, string | null>) => Object.values(o).every((e) => !e);

// ─────────────────────────────────────────────────────────────
// Report preview — the Direction Générale email without any value
// ─────────────────────────────────────────────────────────────
interface DgPreviewConfig {
  agentName: string; periode: Periode; comparateurs: Comparateur[]; ecart: string; seuilSante: string; priorites: Priorite[];
  signaux: boolean; decisions: boolean; sources: Record<SourceKey, boolean>; finance: FinanceSource; recouvrement: RecouvrementSource;
  recipients: string[]; recipientsCc: string[]; triggerRules: TriggerRule[];
}

const DgReport: React.FC<{ c: DgPreviewConfig; highlight: string | null; compact?: boolean }> = ({ c, highlight, compact }) => {
  const jour = jourEnvoi(c.triggerRules);
  const plages = periodeDates(c.periode, jour);
  const annee = periodeInfo(c.periode).duree === 'annee';
  const comparaisons = [
    !annee && c.comparateurs.includes('precedente') && { libelle: 'la période précédente', court: 'Période précédente', dates: plages.precedente },
    c.comparateurs.includes('n1') && { libelle: 'la même période de l’année précédente', court: 'Même période de l’année précédente', dates: plages.n1 },
  ].filter(Boolean) as Array<{ libelle: string; court: string; dates: Plage }>;
  const fin = c.sources.finance ? c.finance.sections : null;
  const cles = fin ? ([
    fin.marge && ['Taux de marge', '%'], fin.clients && ['Reste à encaisser', 'dinars'], fin.synthese && ['Position nette', 'dinars'],
  ].filter(Boolean) as Array<[string, string]>) : [];
  const priorites = PRIORITES.filter((p) => c.priorites.includes(p.value)).map((p) => p.label.toLowerCase());
  const seuil = Number(c.seuilSante) || 50;
  const ecart = Number(c.ecart.replace(',', '.')) || 15;

  const rules: string[] = [];
  if (fin?.ca) comparaisons.forEach((x) => rules.push(`Chiffre d’affaires facturé : écart d’au moins ${ecart} % par rapport à ${x.libelle}`));
  rules.push(`Indice de santé sous ${seuil} sur 100`);
  if (fin?.clients && c.finance.alerteCredit) rules.push('Finance : clients signalés à risque par le logiciel de gestion');
  if (fin?.clients && fmtTnd(c.finance.soldeMin)) rules.push(`Finance : client qui doit au moins ${fmtTnd(c.finance.soldeMin)}`);
  if (fin?.fournisseurs && fmtTnd(c.finance.retardMin)) rules.push(`Finance : fournisseur avec au moins ${fmtTnd(c.finance.retardMin)} en retard`);
  if (c.sources.recouvrement && c.recouvrement.urgence) rules.push(`Recouvrement : factures impayées, ${URGENCES.find((u) => u.value === c.recouvrement.urgence)!.label.toLowerCase()}`);
  if (c.comparateurs.includes('objectifs')) rules.push('Objectifs de la direction non atteints');

  const half = (top: boolean, right: boolean): React.CSSProperties => ({
    flex: '1 1 240px', minWidth: 0, padding: top ? `14px ${right ? 0 : 28}px 16px 0` : `0 ${right ? 0 : 28}px 22px 0`, borderTop: top ? `1px solid ${E.rule}` : 'none',
  });
  const grey = (lines: string[], h = 8) => lines.map((w, i) => <TextLine key={i} width={w} height={h} />);

  return (
    <div style={{ background: E.page, padding: compact ? 0 : '20px 10px', fontFamily: EMAIL_FONT, color: E.ink, fontVariantNumeric: 'tabular-nums' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', background: '#FFFFFF', borderTop: `5px solid ${E.mint}`, padding: compact ? '26px 18px' : '34px 40px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ flex: 1, margin: 0, fontSize: compact ? '23px' : '32px', lineHeight: 1.2, fontWeight: 400, color: E.ink }}>{TITRE}</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/vmind-logo-rapport.png" alt="VMIND" width={compact ? 84 : 104} style={{ display: 'block', height: 'auto' }} />
        </div>
        <div style={{ marginTop: '4px', fontSize: '18px', color: E.teal }}>{capFirst(periodeLabel(c.periode, jour))}</div>
        {c.agentName && !TITRE.includes(c.agentName) && <div style={{ marginTop: '2px', fontSize: '13px', color: E.muted }}>{c.agentName}</div>}
        <PreviewSection hl={highlight === 'meta'}>
          <table style={{ marginTop: '16px', borderCollapse: 'collapse' }}>
            <tbody>
              {[['Période analysée', plages.periode] as [string, Plage], ...comparaisons.map((x) => [`Comparée à ${x.libelle}`, x.dates] as [string, Plage])].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '2px 18px 2px 0', fontSize: '13px', lineHeight: 1.5, color: E.muted, verticalAlign: 'top' }}>{k}</td>
                  <td style={{ padding: '2px 0', fontSize: '13px', lineHeight: 1.5, color: E.ink, verticalAlign: 'top' }}>{plageLabel(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PreviewSection>

        <PreviewSection hl={highlight === 'sante'}>
          <BlockTitle>Santé de l’entreprise</BlockTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div style={half(false, false)}>
              <div style={{ fontSize: '13px', color: E.muted }}>Indice de santé</div>
              <div style={{ marginTop: '4px', lineHeight: 1.2 }}><Dash big={40} unit="sur 100" /></div>
              <Small style={{ marginTop: '6px' }}>Solide à partir de 70 · vigilance de 50 à 69 · fragile sous 50 · alerte sous {seuil}</Small>
            </div>
            <div style={half(false, true)}>
              <div style={{ fontSize: '13px', color: E.muted }}>Domaine le plus fragile</div>
              <div style={{ marginTop: '6px', fontSize: '18px', color: E.muted }}>—</div>
              <Small style={{ marginTop: '6px' }}>Activité, créances clients, dettes fournisseurs, trésorerie</Small>
            </div>
          </div>
        </PreviewSection>

        {(fin?.ca || cles.length > 0) && (
          <>
            <BlockTitle>Chiffres clés</BlockTitle>
            {fin?.ca && (
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <div style={half(false, false)}>
                  <div style={{ fontSize: '13px', color: E.muted }}>Chiffre d’affaires facturé</div>
                  <div style={{ marginTop: '4px', lineHeight: 1.2 }}><Dash big={40} /></div>
                  {comparaisons.map((x) => (
                    <div key={x.libelle} style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.5, color: E.text }}>
                      <span style={{ fontWeight: 600, color: E.muted, whiteSpace: 'nowrap' }}>▲▼ —{' '}%</span> par rapport à {x.libelle}
                    </div>
                  ))}
                </div>
                <div style={half(false, true)}>
                  {[{ court: 'Période analysée', col: E.teal }, ...comparaisons.map((x) => ({ court: x.court, col: E.soft }))].map((x) => (
                    <div key={x.court} style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', color: E.muted, paddingBottom: '4px' }}><span>{x.court}</span><Dash /></div>
                      <span aria-hidden style={{ display: 'block', height: '8px', background: E.track }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {cles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {cles.map(([l, u], i) => (
                  <div key={l} style={half(true, i % 2 === 1)}>
                    <div style={{ fontSize: '13px', color: E.muted }}>{l}</div>
                    <div style={{ marginTop: '4px', lineHeight: 1.2 }}><Dash big={25} unit={u} /></div>
                  </div>
                ))}
                {cles.length % 2 === 1 && <div style={half(true, true)} />}
              </div>
            )}
          </>
        )}

        <PreviewSection hl={highlight === 'lecture'}>
          <BlockTitle>Lecture de l’entreprise</BlockTitle>
          {grey(['100%', '94%', '58%'], 12)}
          <div style={{ height: '6px' }} />
          {grey(['100%', '88%'])}
          {priorites.length > 0 && <Small style={{ marginTop: '8px' }}>Rédigée en suivant les priorités : {priorites.join(', ')}.</Small>}
        </PreviewSection>

        {c.decisions && (
          <PreviewSection hl={highlight === 'decisions'}>
            <BlockTitle>Décisions proposées</BlockTitle>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: `1px solid ${E.rule}` }}>
                <span style={{ fontSize: '18px', color: E.teal, width: '18px' }}>{n}</span>
                <div style={{ flex: 1 }}>
                  <TextLine width={n === 3 ? '60%' : '82%'} height={10} />
                  <Small>Responsable suggéré : — · échéance : —</Small>
                </div>
              </div>
            ))}
          </PreviewSection>
        )}

        {c.signaux && (
          <PreviewSection hl={highlight === 'signaux'}>
            <BlockTitle>Signaux croisés</BlockTitle>
            <Small>Ce qu’aucune source ne voit seule, par exemple un client à fort solde aussi en impayé critique.</Small>
            {[0, 1].map((i) => (
              <div key={i} style={{ borderLeft: `3px solid ${E.mint}`, padding: '2px 0 2px 16px', margin: '12px 0' }}>
                <TextLine width="45%" height={10} /><TextLine width={i ? '70%' : '90%'} />
              </div>
            ))}
          </PreviewSection>
        )}

        <PreviewSection hl={highlight === 'alertes'}>
          <BlockTitle>Alertes</BlockTitle>
          <div style={{ borderLeft: `4px solid ${E.rule}`, padding: '2px 0 2px 18px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: E.muted }}>Signalées seulement si elles sont déclenchées, par priorité et par source</div>
            {rules.map((r, i) => (
              <div key={r} style={{ padding: '8px 0', borderTop: i ? `1px solid ${E.rule}` : 'none', fontSize: '14px', lineHeight: 1.55, color: E.ink }}>{r}</div>
            ))}
          </div>
        </PreviewSection>

        <PreviewSection hl={highlight === 'sources'}>
          <BlockTitle>État des sources</BlockTitle>
          <Lines rows={SOURCES.filter((s) => s.available && c.sources[s.key as SourceKey]).map((s) => [
            s.label, <span key="v" style={{ fontSize: '12px', fontWeight: 600, color: E.muted }}>Disponible ou indisponible, à l’envoi</span>,
            s.key === 'recouvrement' ? <Small key="r">État à la date du jour, sans relance envoyée</Small> : undefined,
          ] as [React.ReactNode, React.ReactNode, React.ReactNode?])} />
          <Small style={{ marginTop: '6px' }}>Une source indisponible est signalée ; le reste du rapport part quand même.</Small>
        </PreviewSection>

        <p style={{ margin: '26px 0 0', paddingTop: '12px', borderTop: `1px solid ${E.rule}`, fontSize: '12px', lineHeight: 1.6, color: E.muted }}>
          Chiffres calculés par les agents VMIND de chaque domaine à partir de votre logiciel de gestion, sans intelligence artificielle. La lecture est rédigée à partir de ces seuls chiffres.
        </p>
      </div>
    </div>
  );
};

const DgMail: React.FC<{ c: DgPreviewConfig; highlight: string | null; compact?: boolean }> = ({ c, highlight, compact }) => (
  <div style={{ background: '#FFFFFF', color: E.ink }}>
    <div style={{ padding: compact ? '12px 14px' : '16px 18px', borderBottom: `1px solid ${E.rule}` }}>
      <div style={{ fontSize: compact ? '14px' : '15.5px', fontWeight: 700, lineHeight: 1.35 }}>
        [VMIND] {TITRE} — {periodeLabel(c.periode, jourEnvoi(c.triggerRules))}{sendMoment(c.triggerRules)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
        <div aria-hidden style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${DG}, ${E.teal})`, color: '#FFFFFF', fontWeight: 800, fontSize: '13px' }}>V</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700 }}>VMIND <span style={{ fontWeight: 400, color: E.muted }}>· {c.agentName || TITRE}</span></span>
            <span style={{ fontSize: '11px', color: E.muted, whiteSpace: 'nowrap' }}>{nextSendLabel(c.triggerRules)}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', borderRadius: '6px', padding: highlight === 'meta' ? '3px' : 0, boxShadow: highlight === 'meta' ? `0 0 0 2px ${E.teal}55` : 'none' }}>
            <span style={{ fontSize: '11px', color: E.muted }}>À</span>
            {c.recipients.length ? c.recipients.map((r) => (
              <span key={r} style={{ fontSize: '11px', padding: '0 7px', borderRadius: '999px', background: '#F4F7F9', border: `1px solid ${E.rule}` }}>{r}</span>
            )) : <span style={{ fontSize: '11px', color: E.red }}>aucun destinataire</span>}
            {c.recipientsCc.length > 0 && <span style={{ fontSize: '11px', color: E.muted, marginLeft: '6px' }}>Copie {c.recipientsCc.join(', ')}</span>}
          </div>
        </div>
      </div>
    </div>
    <DgReport c={c} highlight={highlight} compact={compact} />
  </div>
);

const DgPreviewFrame: React.FC<{ c: DgPreviewConfig; highlight: string | null }> = ({ c, highlight }) => {
  const [device, setDevice] = useState<Device>('desktop');
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);
  const nb = Object.values(c.sources).filter(Boolean).length;
  const stage = () => (<>
    <LayoutBanner />
    {device === 'mobile' ? (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
        <div style={{ width: '100%', maxWidth: '380px', borderRadius: '34px', padding: '10px', background: 'linear-gradient(160deg, #1C2733, #0D141C)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.45)' }}>
          <div style={{ borderRadius: '26px', overflow: 'hidden', background: '#FFFFFF' }}>
            <div style={{ height: '26px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><span style={{ width: '90px', height: '18px', borderRadius: '999px', background: '#0D141C' }} /></div>
            <DgMail c={c} highlight={highlight} compact />
          </div>
        </div>
      </div>
    ) : (
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: '#111B26', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ display: 'flex', gap: '6px' }}>{['#FF5F57', '#FEBC2E', '#28C840'].map((x) => <span key={x} style={{ width: '10px', height: '10px', borderRadius: '50%', background: x, opacity: 0.85 }} />)}</span>
          <span style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: MUTED, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}><Mail size={12} /> Boîte de réception</span>
          <span style={{ width: '42px' }} />
        </div>
        <DgMail c={c} highlight={highlight} />
      </div>
    )}
  </>);
  return (
    <>
      <div style={{ borderRadius: '16px', padding: '14px', background: 'radial-gradient(120% 80% at 100% 0%, rgba(0,229,200,0.10) 0%, rgba(5,11,22,0) 55%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid rgba(0, 229, 200, 0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FFFFFF' }}>Aperçu du rapport envoyé</div>
            <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '2px' }}>En direct · {nb} source{nb > 1 ? 's' : ''} · {c.recipients.length} destinataire{c.recipients.length > 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DeviceToggle value={device} onChange={setDevice} />
            <button type="button" onClick={() => setFull(true)} title="Plein écran" aria-label="Afficher l'aperçu en plein écran" style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0' }}>
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
        {stage()}
      </div>
      {full && typeof document !== 'undefined' && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Aperçu du rapport en plein écran" onClick={() => setFull(false)} style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(3, 8, 15, 0.82)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '32px 16px 48px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: device === 'mobile' ? '420px' : '760px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
              <DeviceToggle value={device} onChange={setDevice} />
              <button type="button" onClick={() => setFull(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', fontSize: '12.5px' }}><X size={14} /> Fermer</button>
            </div>
            {stage()}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// ⚙ Settings of a source, used only by the Direction Générale
// ─────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; onSave: () => void; canSave: boolean; children: React.ReactNode }> = ({ title, onClose, onSave, canSave, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(3, 8, 15, 0.82)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px 16px' }}>
      {/* Title and buttons stay in place; only the settings scroll. */}
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '760px', maxHeight: '100%', background: '#06101E', border: '1px solid rgba(0, 229, 200, 0.25)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>{title}</div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 0, color: MUTED, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <style>{`
          /* Same scrollbar as the skills pages (features/skills/skills-premium.css, .sk-page). */
          .dg-scroll { scrollbar-width: thin; scrollbar-color: rgba(148, 163, 184, 0.2) transparent; }
          .dg-scroll::-webkit-scrollbar { width: 8px; }
          .dg-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.18); border-radius: 8px; }
        `}</style>
        <div className="dg-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '18px 24px', display: 'grid', gap: '16px', alignContent: 'start' }}>
          {children}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <Button onClick={onClose} style={{ fontSize: '13px', padding: '10px 18px' }}>Annuler</Button>
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={!canSave} style={{ padding: '10px 22px', fontSize: '13.5px', fontWeight: 700, borderRadius: '8px' }}>Valider</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** « Partir d'un agent existant »: one-time copy of its settings, no link kept. */
type AgentsState = 'loading' | 'error' | 'ok';
const CopyFrom: React.FC<{ agents: any[]; state: AgentsState; onPick: (a: any) => void; fixed: string }> = ({ agents, state, onPick, fixed }) => (
  <div style={{ display: 'grid', gap: '8px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
    <label className="form-label" htmlFor="dg-copy" style={labelStyle}>Partir d’un agent existant <span style={{ color: MUTED, fontWeight: 400 }}>(facultatif)</span></label>
    <select id="dg-copy" className="form-input" defaultValue="" onChange={(e) => { const a = agents.find((x) => String(x.uuid ?? x.agent_name) === e.target.value); if (a) onPick(a); }} style={inputStyle} disabled={!agents.length}>
      <option value="">{state === 'loading' ? 'Chargement de vos agents…' : state === 'error' ? 'Impossible de charger vos agents : réessayez plus tard' : agents.length ? 'Choisir un agent de « Mes agents »…' : 'Aucun agent de ce type dans « Mes agents »'}</option>
      {agents.map((a) => <option key={String(a.uuid ?? a.agent_name)} value={String(a.uuid ?? a.agent_name)}>{a.agent_name || a.nom}</option>)}
    </select>
    <span style={hintStyle}>Copie unique de ses réglages : l’agent d’origine ne change pas et ses changements futurs n’arrivent pas ici.</span>
    <span style={{ ...hintStyle, marginTop: 0 }}><b style={{ color: '#E2E8F0' }}>Fixé par la Direction Générale :</b> {fixed}</span>
  </div>
);

type FocusProps = { onFocus?: () => void; onBlur?: () => void };
const Field: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; err: string | null; suffix?: string; placeholder?: string; hint?: string; guide?: FocusProps }> = ({ id, label, value, onChange, err, suffix, placeholder, hint, guide }) => (
  <div className="form-group" style={{ display: 'grid', gridRow: 'span 3', gridTemplateRows: 'subgrid', alignContent: 'start', minWidth: 0 }}>
    <label className="form-label" htmlFor={id} style={{ ...labelStyle, alignSelf: 'end' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <input id={id} type="text" className="form-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} {...guide} style={{ ...inputStyle, width: '100%', paddingRight: suffix ? '46px' : undefined, borderColor: err ? ERR : undefined }} />
      {suffix && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: MUTED }}>{suffix}</span>}
    </div>
    {err ? <ErrorLine text={err} /> : hint ? <span className="form-hint" style={hintStyle}>{hint}</span> : null}
  </div>
);

const FinancePanel: React.FC<{ value: FinanceSource; agents: any[]; agentsState: AgentsState; onClose: () => void; onSave: (v: FinanceSource) => void; onFocusField: (k: string | null) => void }> = ({ value, agents, agentsState, onClose, onSave, onFocusField }) => {
  const [d, setD] = useState<FinanceSource>(value);
  const g = (k: string): FocusProps => ({ onFocus: () => onFocusField(`fin:${k}`), onBlur: () => onFocusField(null) });
  const hover = (k: string) => ({ onMouseEnter: () => onFocusField(`fin:${k}`), onMouseLeave: () => onFocusField(null) });
  const set = <K extends keyof FinanceSource>(k: K) => (v: FinanceSource[K]) => setD((p) => ({ ...p, [k]: v }));
  const err = financeErrors(d);
  return (
    <Modal title="Finance & Trésorerie — réglages pour la Direction Générale" onClose={onClose} onSave={() => onSave(d)} canSave={noError(err)}>
      <CopyFrom agents={agents} state={agentsState} onPick={(a) => setD(financeFrom(a))} fixed="période, comparaisons, destinataires, planification et ton de la synthèse. La prévision à 30, 60 et 90 jours reste désactivée." />
      <Card title="Sections du rapport">
        <div style={{ display: 'grid', gap: '14px' }} {...hover('sections')}>
          {SECTION_GROUPS.map((g) => (
            <div key={g} style={{ display: 'grid', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED }}>{g}</div>
              {SECTIONS.filter((s) => s.group === g).map((s) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 12px', borderRadius: '8px', background: d.sections[s.key] ? 'rgba(0, 229, 200, 0.06)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', opacity: s.available ? 1 : 0.6 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: d.sections[s.key] ? '#FFFFFF' : MUTED }}>{s.label}</div>
                    <div style={{ fontSize: '11.5px', color: MUTED }}>{s.available ? s.hint : `${s.missing}.`}</div>
                  </div>
                  {s.available
                    ? <Switch on={d.sections[s.key]} label={s.label} onChange={(v) => setD((p) => ({ ...p, sections: { ...p.sections, [s.key]: v } }))} />
                    : <span aria-label={`${s.label} indisponible`} style={{ width: '38px', height: '22px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          ))}
        </div>
        {err.sections && <ErrorLine text={err.sections} />}
      </Card>
      <Card title="Écarts significatifs du chiffre d’affaires" subtitle="Une variation au-delà du seuil est signalée dans les alertes.">
        <div style={fieldRow}>
          <Field id="dg-fin-ecart-prec" label="Par rapport à la période précédente" value={d.ecartPrec} onChange={set('ecartPrec')} err={err.ecartPrec} suffix="± %" guide={g('ecart_precedente')} />
          <Field id="dg-fin-ecart-n1" label="Par rapport à la même période de l’année précédente" value={d.ecartN1} onChange={set('ecartN1')} err={err.ecartN1} suffix="± %" guide={g('ecart_n1')} />
        </div>
      </Card>
      <Card title="Alertes de trésorerie" subtitle="Montants en TND. Laissez un seuil vide pour ne pas l’utiliser.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '12px' }} {...hover('alerte_credit')}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>Inclure les clients signalés à risque par le logiciel de gestion</div>
          <Switch on={d.alerteCredit} onChange={set('alerteCredit')} label="Inclure les clients signalés à risque" />
        </div>
        <div style={fieldRow}>
          <Field id="dg-fin-solde" label="Signaler tout client qui doit au moins" value={d.soldeMin} onChange={set('soldeMin')} err={err.soldeMin} suffix="TND" placeholder="Exemple : 100 000" guide={g('solde_client_min')} />
          <Field id="dg-fin-retard" label="Signaler tout fournisseur à qui l’on doit, en retard, au moins" value={d.retardMin} onChange={set('retardMin')} err={err.retardMin} suffix="TND" placeholder="Exemple : 20 000" guide={g('retard_fournisseur_min')} />
        </div>
      </Card>
      <Card title="Listes du rapport">
        <div style={fieldRow}>
          <Field id="dg-fin-top-c" label="Nombre de clients dans les listes" value={d.topClients} onChange={set('topClients')} err={err.topClients} suffix="/ 10" hint="Par solde dû et par chiffre d’affaires" guide={g('top_clients')} />
          <Field id="dg-fin-top-f" label="Nombre de fournisseurs en retard à lister" value={d.topFournisseurs} onChange={set('topFournisseurs')} err={err.topFournisseurs} suffix="/ 10" hint="Classés par montant en retard" guide={g('top_fournisseurs')} />
        </div>
      </Card>
      <Card title="Objectifs (optionnels)" subtitle="Le rapport indique pour chacun s’il est atteint.">
        <div style={fieldRow}>
          {d.sections.tendance && <Field id="dg-fin-obj-ca" label="Objectif de chiffre d’affaires par mois" value={d.objCa} onChange={set('objCa')} err={err.objCa} suffix="TND" placeholder="Exemple : 1 200 000" guide={g('obj_ca')} />}
          <Field id="dg-fin-obj-enc" label="Total maximal dû par l’ensemble des clients" value={d.objEncaisser} onChange={set('objEncaisser')} err={err.objEncaisser} suffix="TND" placeholder="Exemple : 800 000" guide={g('obj_encaisser')} />
          <Field id="dg-fin-obj-ret" label="Total maximal en retard envers les fournisseurs" value={d.objRetard} onChange={set('objRetard')} err={err.objRetard} suffix="TND" placeholder="Exemple : 50 000" guide={g('obj_retard')} />
        </div>
      </Card>
    </Modal>
  );
};

const RecouvrementPanel: React.FC<{ value: RecouvrementSource; agents: any[]; agentsState: AgentsState; onClose: () => void; onSave: (v: RecouvrementSource) => void; onFocusField: (k: string | null) => void }> = ({ value, agents, agentsState, onClose, onSave, onFocusField }) => {
  const [d, setD] = useState<RecouvrementSource>(value);
  const g = (k: string): FocusProps => ({ onFocus: () => onFocusField(`rec:${k}`), onBlur: () => onFocusField(null) });
  const set = <K extends keyof RecouvrementSource>(k: K) => (v: RecouvrementSource[K]) => setD((p) => ({ ...p, [k]: v }));
  const err = recouvrementErrors(d);
  return (
    <Modal title="Recouvrement — réglages pour la Direction Générale" onClose={onClose} onSave={() => onSave(d)} canSave={noError(err)}>
      <CopyFrom agents={agents} state={agentsState} onPick={(a) => setD(recouvrementFrom(a))} fixed="destinataires, planification et ton de la synthèse. Ici, l’agent analyse les impayés sans envoyer de relance aux clients." />
      <Card title="Factures analysées">
        <div style={fieldRow}>
          <Field id="dg-rec-min" label="Montant minimum d’une facture" value={d.montantMin} onChange={set('montantMin')} err={err.montantMin} placeholder="Exemple : 1 000" hint="Les impayés plus petits sont ignorés." guide={g('minimum_amount')} />
          <div className="form-group" style={{ display: 'grid', gridRow: 'span 3', gridTemplateRows: 'subgrid', alignContent: 'start', minWidth: 0 }}>
            <label className="form-label" style={{ ...labelStyle, alignSelf: 'end' }}>Devise</label>
            <div role="group" aria-label="Devise" onMouseEnter={() => onFocusField('rec:currency')} onMouseLeave={() => onFocusField(null)} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
              {(['TND', 'EUR', 'USD'] as const).map((x) => {
                const on = d.devise === x;
                return (
                  <button key={x} type="button" aria-pressed={on} onClick={() => set('devise')(x)} style={{
                    padding: '10px 0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                    background: on ? 'rgba(61, 220, 151, 0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? 'rgba(61, 220, 151, 0.55)' : 'rgba(255,255,255,0.1)'}`, color: on ? '#3DDC97' : '#E2E8F0',
                  }}>{x}</button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '14px' }}>
          <label className="form-label" htmlFor="dg-rec-urg" style={labelStyle}>Urgence minimale *</label>
          <select id="dg-rec-urg" className="form-input" value={d.urgence} onChange={(e) => set('urgence')(e.target.value as Urgence)} {...g('min_urgency')} style={{ ...inputStyle, borderColor: err.urgence ? ERR : undefined }}>
            <option value="">Choisir…</option>
            {URGENCES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
          {err.urgence && <ErrorLine text={err.urgence} />}
        </div>
      </Card>
      <Card title="Suivi des relances" subtitle="Lus pour l’analyse : la Direction Générale n’envoie aucune relance.">
        <div style={fieldRow}>
          <Field id="dg-rec-esc" label="Délai avant escalade (jours)" value={d.escalade} onChange={set('escalade')} err={err.escalade} placeholder="Exemple : 15" guide={g('days_before_escalation')} />
          <Field id="dg-rec-max" label="Nombre maximum de relances" value={d.relancesMax} onChange={set('relancesMax')} err={err.relancesMax} placeholder="Exemple : 3" guide={g('max_reminders')} />
        </div>
      </Card>
      <Card title="Consignes de recouvrement (facultatives)">
        <textarea id="dg-rec-consignes" className="form-input" rows={3} value={d.consignes} onChange={(e) => set('consignes')(e.target.value)} {...g('instructions')} placeholder="Exemple : ne pas compter les factures en litige." style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
      </Card>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Confirmation: the agent in one sentence and the Sources → Analyse → Diffusion timeline (mockup, step 5)
// ─────────────────────────────────────────────────────────────
const GOLD = '#E8C77B';
const VIOLET = '#A78BFA';
const RECAP_CSS = `
  .dg-ov { position: relative; padding: 20px 22px; border-radius: 16px; background: linear-gradient(135deg, rgba(232,199,123,.11), rgba(0,229,200,.05) 60%, rgba(13,21,40,.4)); border: 1px solid rgba(232,199,123,.32); overflow: hidden; }
  .dg-ov-eye { font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase; color: ${GOLD}; font-weight: 700; }
  .dg-ov-txt { font-size: 17px; line-height: 1.5; margin: 10px 0 14px; color: #F0F4F8; overflow-wrap: anywhere; }
  .dg-ov-txt b { color: ${GOLD}; font-weight: 600; }
  .dg-ov-next { display: inline-flex; align-items: center; gap: 8px; padding: 7px 13px; border-radius: 999px; font-size: 12.5px; font-weight: 600; color: ${GOLD}; background: rgba(232,199,123,.1); border: 1px solid rgba(232,199,123,.38); }
  .dg-ov-next::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: ${GOLD}; }
  .dg-flow-wrap { container-type: inline-size; }
  .dg-flow { position: relative; display: grid; gap: 16px; padding-left: 38px; }
  .dg-flow::before { content: ""; position: absolute; left: 13px; top: 18px; bottom: 18px; width: 2px; background: linear-gradient(${ACCENT}, rgba(167,139,250,.8), ${GOLD}); opacity: .55; }
  @container (min-width: 860px) {
    .dg-flow { grid-template-columns: 1.15fr 1fr 1fr; gap: 30px; padding-left: 0; padding-top: 22px; }
    .dg-flow::before { left: 14px; right: 14px; top: 13px; bottom: auto; width: auto; height: 2px; background: linear-gradient(90deg, ${ACCENT}, rgba(167,139,250,.8), ${GOLD}); }
    .dg-fnode { left: 0 !important; top: -22px !important; }
  }
  .dg-fcard { position: relative; padding: 16px 18px; border-radius: 15px; background: rgba(18,28,52,.55); border: 1px solid rgba(148,163,184,.18); transition: border-color .3s ease, transform .3s ease; min-width: 0; }
  .dg-fcard:hover { border-color: rgba(0,229,200,.4); transform: translateY(-2px); }
  .dg-fnode { position: absolute; left: -38px; top: 14px; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 700; color: #021a17; }
  .dg-fcard-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .dg-fcard-h b { font-size: 14.5px; color: #FFFFFF; }
  .dg-link { background: none; border: 0; padding: 0; color: ${ACCENT}; font-weight: 600; font-size: 12px; cursor: pointer; opacity: .75; }
  .dg-link:hover { opacity: 1; }
  .dg-fsrc { padding: 11px 13px; border-radius: 12px; background: rgba(0,0,0,.22); border-left: 3px solid ${ACCENT}; margin-bottom: 10px; }
  .dg-fsrc:last-child { margin-bottom: 0; }
  .dg-fsrc.rec { border-left-color: ${VIOLET}; }
  .dg-fsrc-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-weight: 700; font-size: 13px; margin-bottom: 6px; color: #FFFFFF; }
  .dg-fl { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .dg-fl li { display: grid; grid-template-columns: 16px 1fr; gap: 7px; font-size: 12.8px; color: #A7B4C8; line-height: 1.45; }
  .dg-fl li::before { content: "✓"; color: ${ACCENT}; font-weight: 700; font-size: 11.5px; margin-top: 1px; }
  .dg-fl li.clock::before { content: "◷"; color: ${GOLD}; font-size: 13px; margin-top: -1px; }
  .dg-fl li.off::before { content: "–"; color: #66748B; }
  .dg-fl li.todo { color: #FFB800; }
  .dg-fl li.todo::before { content: "!"; color: #FFB800; }
  .dg-flbl { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: #66748B; margin: 12px 0 7px; font-weight: 700; display: flex; justify-content: space-between; }
  .dg-flbl:first-child { margin-top: 0; }
  .dg-fchips { display: flex; flex-wrap: wrap; gap: 6px; }
  .dg-fchip { padding: 5px 10px; border-radius: 999px; font-size: 12px; background: rgba(0,229,200,.09); border: 1px solid rgba(0,229,200,.28); color: #F0F4F8; overflow-wrap: anywhere; }
  .dg-fchip.cc { background: rgba(232,199,123,.09); border-color: rgba(232,199,123,.3); }
  .dg-fchip.pri { background: rgba(167,139,250,.1); border-color: rgba(167,139,250,.32); }
`;
type Line = [string, '' | 'off' | 'todo' | 'clock'];
const FLines: React.FC<{ lines: Line[] }> = ({ lines }) => <ul className="dg-fl">{lines.map(([t, c]) => <li key={t} className={c}>{t}</li>)}</ul>;
const Chips2: React.FC<{ items: string[]; kind?: '' | 'cc' | 'pri'; empty: string }> = ({ items, kind = '', empty }) => (
  <div className="dg-fchips">{(items.length ? items : [empty]).map((x) => <span key={x} className={`dg-fchip ${kind}`}>{x}</span>)}</div>
);
const nombre = (v: string) => { const n = parseAmount(v); return n === null ? '' : n.toLocaleString('fr-FR'); };
const financeLines = (c: FinanceSource): Line[] => {
  const n = SECTIONS.filter((x) => c.sections[x.key]).length;
  return ([
    [`${n} section${n > 1 ? 's' : ''} du rapport`, ''],
    [c.ecartPrec === c.ecartN1 ? `Écart significatif au-delà de ± ${c.ecartPrec} %` : `Écart significatif au-delà de ± ${c.ecartPrec} % (période précédente) et ± ${c.ecartN1} % (année précédente)`, ''],
    [`${c.topClients} principaux clients et ${c.topFournisseurs} principaux fournisseurs`, ''],
    c.alerteCredit ? ['Clients en alerte crédit du logiciel de gestion', ''] : ['Alerte crédit du logiciel de gestion non reprise', 'off'],
    nombre(c.soldeMin) && [`Client avec un reste à encaisser d’au moins ${nombre(c.soldeMin)} TND`, ''],
    nombre(c.retardMin) && [`Fournisseur avec au moins ${nombre(c.retardMin)} TND en retard`, ''],
    c.sections.tendance && nombre(c.objCa) && [`Objectif : chiffre d’affaires facturé mensuel ≥ ${nombre(c.objCa)} TND`, ''],
    nombre(c.objEncaisser) && [`Objectif : reste à encaisser ≤ ${nombre(c.objEncaisser)} TND`, ''],
    nombre(c.objRetard) && [`Objectif : fournisseurs en retard ≤ ${nombre(c.objRetard)} TND`, ''],
  ] as Array<Line | false | ''>).filter(Boolean) as Line[];
};
const recouvrementLines = (c: RecouvrementSource): Line[] => ([
  [nombre(c.montantMin) ? `Impayés de ${nombre(c.montantMin)} ${c.devise} et plus` : `Impayés de tout montant, en ${c.devise}`, ''],
  [`Urgence : ${(URGENCES.find((u) => u.value === c.urgence)?.label || '').replace(/^./, (x) => x.toLowerCase())}`, ''],
  c.escalade.trim() && [`Escalade après ${c.escalade.trim()} jours`, ''],
  c.relancesMax.trim() && [`${c.relancesMax.trim()} relances au maximum`, ''],
] as Array<Line | false | ''>).filter(Boolean) as Line[];

// ─────────────────────────────────────────────────────────────
// Wizard
// ─────────────────────────────────────────────────────────────
const Chips = <T extends string>({ options, values, onToggle, onFocus }: { options: { value: T; label: string }[]; values: T[]; onToggle: (v: T) => void; onFocus?: () => void }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} onMouseEnter={onFocus}>
    {options.map((o) => {
      const on = values.includes(o.value);
      return (
        <button key={o.value} type="button" aria-pressed={on} onClick={() => onToggle(o.value)} onFocus={onFocus} style={{
          padding: '8px 12px', borderRadius: '999px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600,
          background: on ? 'rgba(0, 229, 200, 0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? 'rgba(0, 229, 200, 0.55)' : 'rgba(255,255,255,0.1)'}`, color: on ? DG : '#E2E8F0',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}>{on && <Check size={12} strokeWidth={3} />}{o.label}</button>
      );
    })}
  </div>
);

export const WizardDirectionView: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [focus, setFocus] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  usePreviewHeight(scrollRef, asideRef, [step, showPreview]);
  const f = (key: string) => ({ onFocus: () => setFocus(key), onBlur: () => setFocus(null) });

  // 1 — Sources
  const [agentName, setAgentName] = useState(`${TITRE} - ${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
  const [sources, setSources] = useState<Record<SourceKey, boolean>>({ finance: true, recouvrement: true });
  const [finance, setFinance] = useState<FinanceSource>(defaultFinance);
  const [recouvrement, setRecouvrement] = useState<RecouvrementSource>(defaultRecouvrement);
  const [panel, setPanel] = useState<SourceKey | null>(null);
  const [mesAgents, setMesAgents] = useState<any[] | null>(null);
  const [agentsError, setAgentsError] = useState(false);
  useEffect(() => { getAgents().then((l) => setMesAgents(Array.isArray(l) ? l : [])).catch(() => { setAgentsError(true); setMesAgents([]); }); }, []);
  const agentsOf = (k: SourceKey) => (mesAgents || []).filter((a) => {
    const t = String(a.templateId ?? a.template_id ?? '').toLowerCase();
    const m = String(a.run_mode ?? '').toLowerCase();
    const rec = a.recovery_config && typeof a.recovery_config === 'object' && Object.keys(a.recovery_config).length > 0;
    return k === 'finance' ? t === 'finance' || m === 'finance_report' : t === 'recouvrement' || t === 'recovery' || m === 'recouvrement' || m === 'daily_recovery_check' || rec;
  });
  const agentsState: AgentsState = mesAgents === null ? 'loading' : agentsError ? 'error' : 'ok';
  const configured: Record<SourceKey, boolean> = { finance: noError(financeErrors(finance)), recouvrement: noError(recouvrementErrors(recouvrement)) };

  // 2 — Analyse
  const [periode, setPeriode] = useState<Periode>('mois_precedent');
  const { duree, etat } = periodeInfo(periode);
  const [comparateurs, setComparateurs] = useState<Comparateur[]>(['precedente', 'n1']);
  const [ecart, setEcart] = useState('15');
  const [seuilSante, setSeuilSante] = useState('50');
  const [priorites, setPriorites] = useState<Priorite[]>(['tresorerie', 'rentabilite', 'risque_client']);
  const [signaux, setSignaux] = useState(true);
  const [decisions, setDecisions] = useState(true);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // 3 — Diffusion, 4 — Planification
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientsCc, setRecipientsCc] = useState<string[]>([]);
  const setTo = (list: string[]) => { setRecipients(list); setRecipientsCc((cc) => cc.filter((x) => !list.includes(x))); };
  const [triggerRules, setTriggerRules] = useState<TriggerRule[]>([{ ...DEFAULT_TRIGGER_RULE, interval: 'Months', triggerOnWeekdays: [...DEFAULT_TRIGGER_RULE.triggerOnWeekdays] }]);

  // 5 — Confirmation
  const [ton, setTon] = useState<TonDg>('direct');
  const [consigne, setConsigne] = useState('');

  const nbSources = Object.values(sources).filter(Boolean).length;
  const santeErr = (() => { const n = Number(seuilSante); return !Number.isInteger(n) || n < 1 || n > 99 ? 'Entre 1 et 99' : null; })();
  const errors: Record<number, string | null> = {
    1: !agentName.trim() ? "Le nom de l'agent est requis" : nbSources < 2 ? 'Choisissez au moins deux sources' : (Object.keys(sources) as SourceKey[]).some((k) => sources[k] && !configured[k]) ? 'Réglez chaque source cochée avec ⚙ Réglages' : null,
    2: !comparateurs.length ? 'Choisissez au moins une comparaison' : pctError(ecart) || santeErr,
    3: recipients.length ? null : 'Au moins un destinataire principal est requis',
    4: null,
    5: null,
  };
  const goNext = () => { if (errors[step]) { showToast(errors[step]!, 'err'); return; } setStep(step + 1); };

  const jour = jourEnvoi(triggerRules);
  const plages = periodeDates(periode, jour);
  const preview: DgPreviewConfig = useMemo(() => ({
    agentName: agentName.trim(), periode, comparateurs, ecart, seuilSante, priorites, signaux, decisions, sources, finance, recouvrement, recipients, recipientsCc, triggerRules,
  }), [agentName, periode, comparateurs, ecart, seuilSante, priorites, signaux, decisions, sources, finance, recouvrement, recipients, recipientsCc, triggerRules]);
  const guideEntry = !focus ? null
    : focus.startsWith('fin:') ? FINANCE_GUIDE[focus.slice(4)] ?? null
    : focus.startsWith('rec:') ? RECOUVREMENT_GUIDE[focus.slice(4)] ?? null
    : GUIDE[focus] ?? null;
  const highlight = focus ? FOCUS_TO_PART[focus] ?? null : null;

  const nav = (next?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
      {step > 1
        ? <Button onClick={() => setStep(step - 1)} style={{ fontSize: '13px', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={14} /> Retour</Button>
        : <Button onClick={onCancel} style={{ fontSize: '13px', padding: '10px 20px' }}>Annuler</Button>}
      {next && (
        <button type="button" className="btn btn-primary" onClick={goNext} disabled={Boolean(errors[step])} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '13.5px', fontWeight: 700, borderRadius: '8px' }}>
          <span>{next}</span><ArrowRight size={15} />
        </button>
      )}
    </div>
  );

  return (
    <div id="view-wizard" className="anim" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .dg-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 22px; align-items: start; }
        .dg-preview { position: static; }
        /* Same scrollbar as the skills pages (features/skills/skills-premium.css, .sk-page). */
        .dg-page-scroll { scrollbar-width: thin; scrollbar-color: rgba(148, 163, 184, 0.2) transparent; }
        .dg-page-scroll::-webkit-scrollbar { width: 8px; }
        .dg-page-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.18); border-radius: 8px; }
        @media (min-width: 1240px) {
          .dg-layout.with-preview { grid-template-columns: minmax(0, 1fr) 440px; }
          .dg-preview { position: sticky; top: 0; overflow-y: auto; }
        }
      `}</style>

      <div className="page-head" style={{ padding: '16px 28px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#050B16', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0, 229, 200, 0.12)', border: '1px solid rgba(0, 229, 200, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🧭</div>
            <div>
              <div className="page-title" style={{ fontSize: '16.5px', fontWeight: 700, color: '#FFFFFF' }}>Configuration : {TITRE}</div>
              <div className="page-sub" style={{ fontSize: '12px', color: MUTED, marginTop: '2px' }}>Un seul rapport de direction à partir de vos agents Finance &amp; Trésorerie et Recouvrement</div>
            </div>
          </div>
          <div className="page-actions" style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => setShowPreview((v) => !v)} style={{ fontSize: '13px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}{showPreview ? 'Masquer l’aperçu' : 'Afficher l’aperçu'}
            </Button>
            <Button onClick={onCancel} style={{ fontSize: '13px', padding: '8px 16px' }}>← Annuler</Button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="scroll dg-page-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: showPreview ? '1360px' : '880px', margin: '0 auto', padding: '24px 20px 48px' }}>
          <div className="wizard-steps" style={{ marginBottom: '22px', maxWidth: '880px' }}>
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const canGo = step > n;
              return (
                <div key={label} className={`wstep ${step === n ? 'active' : step > n ? 'done' : ''}`} onClick={() => canGo && setStep(n)} style={{ cursor: canGo ? 'pointer' : 'default' }}>
                  <div className="wstep-inner">
                    <div className="wstep-num" style={{ width: '34px', height: '34px', fontSize: '13px', fontWeight: 700 }}>{step > n ? <Check size={14} strokeWidth={3} /> : n}</div>
                    <div className="wstep-label" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'none', letterSpacing: 0, marginTop: '4px', color: step >= n ? ACCENT : MUTED }}>{label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`dg-layout ${showPreview ? 'with-preview' : ''}`}>
            <div className="anim" key={step} style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>

              {step === 1 && (<>
                <Card title="Identité de l'agent">
                  <div className="form-group">
                    <label className="form-label" htmlFor="dg-name" style={labelStyle}>Nom de l&apos;agent *</label>
                    <input id="dg-name" className="form-input" value={agentName} onChange={(e) => setAgentName(e.target.value)} {...f('name')} style={{ ...inputStyle, width: '100%' }} />
                    <span className="form-hint" style={hintStyle}>Visible dans la liste de vos agents et dans l’objet de l’email</span>
                  </div>
                </Card>
                <Card title="Sources" subtitle="Au moins deux. Chaque source a ses propres réglages, utilisés uniquement par la Direction Générale. Chaque chiffre reste calculé par l’agent de son domaine.">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }} onMouseEnter={() => setFocus('sources')} onMouseLeave={() => setFocus(null)}>
                    {SOURCES.map((s) => {
                      const k = s.key as SourceKey;
                      const on = s.available && sources[k];
                      return (
                        <div key={s.key} style={{ padding: '14px', borderRadius: '12px', background: on ? 'rgba(0, 229, 200, 0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${on ? 'rgba(0, 229, 200, 0.4)' : 'rgba(255,255,255,0.08)'}`, opacity: s.available ? 1 : 0.55, display: 'grid', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{s.label}</div>
                            {s.available
                              ? <Switch on={on} label={s.label} onChange={(v) => setSources((p) => ({ ...p, [k]: v }))} />
                              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(255, 184, 0, 0.12)', color: '#FFB800', border: '1px solid rgba(255, 184, 0, 0.3)' }}><Lock size={10} /> Bientôt</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: MUTED, lineHeight: 1.45 }}>{s.text}</div>
                          {s.available && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                              <span style={{ fontSize: '11.5px', fontWeight: 600, color: configured[k] ? DG : '#FFB800' }}>{configured[k] ? 'Configuré' : 'À configurer'}</span>
                              <button type="button" onClick={() => setPanel(k)} disabled={!on} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '8px', cursor: on ? 'pointer' : 'not-allowed', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', fontSize: '12px' }}>
                                <Settings size={13} /> Réglages
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {errors[1] && <ErrorLine text={errors[1]} />}
                </Card>
                {nav('Analyse')}
              </>)}

              {step === 2 && (<>
                <Card title="Période et comparaisons">
                  <div className="form-group">
                    <label className="form-label" htmlFor="dg-periode" style={labelStyle}>Période analysée</label>
                    <div style={fieldRow}>
                      <select id="dg-periode" aria-label="Durée de la période" className="form-input" value={duree} onChange={(e) => setPeriode(CODES[e.target.value as Duree][etat])} {...f('periode')} style={inputStyle}>
                        {DUREES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                      <select aria-label="Période précédente ou en cours" className="form-input" value={etat} onChange={(e) => setPeriode(CODES[duree][e.target.value as EtatPeriode])} {...f('periode')} style={inputStyle}>
                        {ETATS_PERIODE.map((x) => <option key={x} value={x}>{etatLabel(x, duree)}</option>)}
                      </select>
                    </div>
                    <span className="form-hint" style={hintStyle}>La même période est imposée à toutes les sources. Période analysée : {plageLabel(plages.periode)}.</span>
                  </div>
                  <div className="form-group" style={{ marginTop: '14px' }}>
                    <label className="form-label" style={labelStyle}>Comparer avec <span style={{ color: MUTED, fontWeight: 400 }}>(plusieurs choix possibles)</span></label>
                    <Chips options={duree === 'annee' ? COMPARATEURS.filter((c) => c.value !== 'precedente') : COMPARATEURS} values={comparateurs} onToggle={(v) => setComparateurs((p) => toggle(p, v))} onFocus={() => setFocus('comparaison')} />
                    {duree === 'annee' && <span className="form-hint" style={hintStyle}>Pour une année, la période précédente est l’année précédente.</span>}
                  </div>
                </Card>
                <Card title="Seuils">
                  <div style={fieldRow}>
                    <div className="form-group" style={{ display: 'grid', gridRow: 'span 3', gridTemplateRows: 'subgrid', alignContent: 'start' }}>
                      <label className="form-label" htmlFor="dg-ecart" style={{ ...labelStyle, alignSelf: 'end' }}>Écart significatif</label>
                      <div style={{ position: 'relative' }}><input id="dg-ecart" className="form-input" value={ecart} onChange={(e) => setEcart(e.target.value)} {...f('ecart')} style={{ ...inputStyle, width: '100%', paddingRight: '46px' }} /><span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: MUTED }}>± %</span></div>
                      {pctError(ecart) ? <ErrorLine text={pctError(ecart)!} /> : <span style={hintStyle}>À partir de ce pourcentage, en hausse ou en baisse, l’écart devient une alerte.</span>}
                    </div>
                    <div className="form-group" style={{ display: 'grid', gridRow: 'span 3', gridTemplateRows: 'subgrid', alignContent: 'start' }}>
                      <label className="form-label" htmlFor="dg-sante" style={{ ...labelStyle, alignSelf: 'end' }}>Indice de santé : seuil d’alerte</label>
                      <div style={{ position: 'relative' }}><input id="dg-sante" className="form-input" value={seuilSante} onChange={(e) => setSeuilSante(e.target.value)} {...f('sante')} style={{ ...inputStyle, width: '100%', paddingRight: '70px' }} /><span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: MUTED }}>sur 100</span></div>
                      {santeErr ? <ErrorLine text={santeErr} /> : <span style={hintStyle}>Sous ce seuil, une alerte apparaît.</span>}
                    </div>
                  </div>
                </Card>
                <Card title="Lecture et décisions">
                  <div className="form-group">
                    <label className="form-label" style={labelStyle}>Priorités du dirigeant</label>
                    <Chips options={PRIORITES} values={priorites} onToggle={(v) => setPriorites((p) => toggle(p, v))} onFocus={() => setFocus('priorites')} />
                    <span className="form-hint" style={hintStyle}>Elles ordonnent la lecture et les décisions proposées.</span>
                  </div>
                  {([['signaux', 'Signaux croisés entre domaines', 'Rapprocher les résultats des sources pour détecter ce qu’aucune ne voit seule.', signaux, setSignaux], ['decisions', 'Décisions proposées', 'Trois actions concrètes, classées par impact.', decisions, setDecisions]] as const).map(([k, t, h, v, s]) => (
                    <div key={k} onMouseEnter={() => setFocus(k)} onMouseLeave={() => setFocus(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginTop: '12px' }}>
                      <div><div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>{t}</div><div style={{ fontSize: '11.5px', color: MUTED }}>{h}</div></div>
                      <Switch on={v} onChange={s} label={t} />
                    </div>
                  ))}
                </Card>
                {errors[2] && <ErrorLine text={errors[2]} />}
                {nav('Diffusion')}
              </>)}

              {step === 3 && (<>
                <Card title="Destinataires du rapport" subtitle="Au moins un destinataire principal est requis. Les personnes en copie reçoivent le même email, pour information." right={<span style={{ fontSize: '12px', color: MUTED, whiteSpace: 'nowrap' }}>{recipients.length} à · {recipientsCc.length} cc</span>}>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <EmailListField id="dg-email-to" label="À *" list={recipients} onChange={setTo} placeholder="nom@entreprise.com, puis Entrée" onFocus={() => setFocus('recipients')} onBlur={() => setFocus(null)} chipTint={DG} />
                    <EmailListField id="dg-email-cc" label="Copie (facultative)" list={recipientsCc} onChange={setRecipientsCc} exclude={recipients} placeholder="Personnes en copie" onFocus={() => setFocus('cc')} onBlur={() => setFocus(null)} chipTint={DG} />
                  </div>
                </Card>
                {nav('Planification')}
              </>)}

              {step === 4 && (<>
                <TriggerRulesEditor rules={triggerRules} onChange={setTriggerRules} accent={DG} onFocusField={setFocus}
                  note="En cliquant sur déployer, la Direction Générale lancera chaque source avec ses réglages selon cette planification, puis enverra la synthèse aux destinataires." />
                {nav('Confirmation')}
              </>)}

              {step === 5 && (<>
                <style>{RECAP_CSS}</style>
                <div className="dg-ov">
                  <div className="dg-ov-eye">L’agent en une phrase</div>
                  <p className="dg-ov-txt">
                    <b>{triggerRules.length === 0 ? 'Sur demande uniquement' : triggerRules.length > 1 ? `Selon ${triggerRules.length} règles de planification` : describeTriggerRule(triggerRules[0])}</b>, la Direction Générale lance {SOURCES.filter((x) => x.available && sources[x.key as SourceKey]).map((x) => x.label).join(' et ') || 'aucune source'} sur <b>{periodeInfo(periode).label.toLowerCase()} ({periodeLabel(periode, jour)})</b>, puis envoie la synthèse à {recipients.length === 1 ? recipients[0] : `${recipients.length} destinataires`}{recipientsCc.length ? `, avec ${recipientsCc.length} personne${recipientsCc.length > 1 ? 's' : ''} en copie` : ''}.
                  </p>
                  {triggerRules.length > 0 && <span className="dg-ov-next">Prochain envoi : {nextSendLabel(triggerRules)}</span>}
                </div>
                <Card title="Ton de la synthèse">
                  <Segmented value={ton} options={TONS_DG} onChange={setTon} onFocus={() => setFocus('ton')} />
                </Card>
                <Card title="Consigne à l'agent (facultative)" subtitle="Elle oriente la rédaction. Elle ne modifie pas les calculs.">
                  <textarea className="form-input" rows={3} value={consigne} onChange={(e) => setConsigne(e.target.value)} {...f('consigne')} placeholder="Exemple : insister sur la trésorerie du trimestre et sur les clients du secteur maritime." style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
                </Card>
                <div className="dg-flow-wrap">
                  <div className="dg-flow">
                    <div className="dg-fcard">
                      <span className="dg-fnode" style={{ background: ACCENT, boxShadow: '0 0 0 5px rgba(0,229,200,.12)' }}>1</span>
                      <div className="dg-fcard-h"><b>Sources</b><button type="button" className="dg-link" onClick={() => setStep(1)}>Modifier</button></div>
                      {(['finance', 'recouvrement'] as SourceKey[]).filter((k) => sources[k]).map((k) => (
                        <div key={k} className={`dg-fsrc ${k === 'recouvrement' ? 'rec' : ''}`}>
                          <div className="dg-fsrc-h"><span>{SOURCES.find((x) => x.key === k)!.label}</span><button type="button" className="dg-link" onClick={() => setPanel(k)}>⚙ Réglages</button></div>
                          <FLines lines={!configured[k] ? [['À configurer', 'todo']] : k === 'finance' ? financeLines(finance) : recouvrementLines(recouvrement)} />
                        </div>
                      ))}
                      {nbSources === 0 && <FLines lines={[['Aucune source choisie', 'todo']]} />}
                    </div>
                    <div className="dg-fcard">
                      <span className="dg-fnode" style={{ background: VIOLET, boxShadow: '0 0 0 5px rgba(167,139,250,.14)' }}>2</span>
                      <div className="dg-fcard-h"><b>Analyse</b><button type="button" className="dg-link" onClick={() => setStep(2)}>Modifier</button></div>
                      <div className="dg-flbl">Période</div><Chips2 items={[periodeInfo(periode).label]} empty="" />
                      <div className="dg-flbl">Comparée à</div><Chips2 items={COMPARATEURS.filter((x) => comparateurs.includes(x.value) && !(duree === 'annee' && x.value === 'precedente')).map((x) => x.label)} empty="Aucune comparaison" />
                      <div className="dg-flbl">Priorités</div><Chips2 kind="pri" items={PRIORITES.filter((x) => priorites.includes(x.value)).map((x) => x.label)} empty="Aucune" />
                      <div className="dg-flbl">Règles</div>
                      <FLines lines={[[`Écart significatif au-delà de ± ${ecart} %`, ''], [`Alerte santé sous ${seuilSante} sur 100`, ''], ['Signaux croisés entre domaines', signaux ? '' : 'off'], ['Décisions proposées', decisions ? '' : 'off']]} />
                    </div>
                    <div className="dg-fcard">
                      <span className="dg-fnode" style={{ background: GOLD, boxShadow: '0 0 0 5px rgba(232,199,123,.14)' }}>3</span>
                      <div className="dg-fcard-h"><b>Diffusion</b><button type="button" className="dg-link" onClick={() => setStep(3)}>Modifier</button></div>
                      <div className="dg-flbl">Destinataires</div><Chips2 items={recipients} empty="Aucun destinataire" />
                      {recipientsCc.length > 0 && <><div className="dg-flbl">En copie</div><Chips2 kind="cc" items={recipientsCc} empty="" /></>}
                      <div className="dg-flbl"><span>Planification</span><button type="button" className="dg-link" onClick={() => setStep(4)} style={{ textTransform: 'none', letterSpacing: 0 }}>Modifier</button></div>
                      <FLines lines={triggerRules.length ? triggerRules.map((r) => [describeTriggerRule(r), 'clock'] as Line) : [['Aucune planification automatique', 'off']]} />
                    </div>
                  </div>
                </div>
                {!showPreview && <DgPreviewFrame c={preview} highlight={highlight} />}
                <div role="note" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '9px', background: 'rgba(255, 184, 0, 0.10)', border: '1px solid rgba(255, 184, 0, 0.35)', color: '#FFD66B', fontSize: '12.5px', lineHeight: 1.45 }}>
                  <Lock size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Le déploiement sera disponible quand le traitement de la Direction Générale sera branché. Rien n’est enregistré pour l’instant.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <Button onClick={() => setStep(4)} style={{ fontSize: '13px', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={14} /> Retour</Button>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Button disabled style={{ fontSize: '13px', padding: '10px 18px', opacity: 0.5, cursor: 'not-allowed' }}>Déployer</Button>
                    <button type="button" className="btn btn-primary" disabled title="Disponible quand le traitement sera branché" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '13.5px', fontWeight: 700, borderRadius: '8px', opacity: 0.5, cursor: 'not-allowed' }}>
                      <Zap size={15} /><span>Déployer et exécuter maintenant</span>
                    </button>
                  </div>
                </div>
              </>)}
            </div>

            {showPreview && (
              <aside ref={asideRef} className="dg-preview dg-page-scroll" aria-label="Aperçu du rapport envoyé">
                <DgPreviewFrame c={preview} highlight={highlight} />
              </aside>
            )}
          </div>
        </div>
      </div>

      {panel === 'finance' && <FinancePanel value={finance} agents={agentsOf('finance')} agentsState={agentsState} onFocusField={setFocus} onClose={() => { setFocus(null); setPanel(null); }} onSave={(v) => { setFinance(v); setFocus(null); setPanel(null); }} />}
      {panel === 'recouvrement' && <RecouvrementPanel value={recouvrement} agents={agentsOf('recouvrement')} agentsState={agentsState} onFocusField={setFocus} onClose={() => { setFocus(null); setPanel(null); }} onSave={(v) => { setRecouvrement(v); setFocus(null); setPanel(null); }} />}

      <VMindGuide
        isOpen={Boolean(guideEntry) || (!panel && !showPreview && step >= 1)}
        title={guideEntry ? guideEntry.title : STEP_GUIDE[step]?.title}
        message={guideEntry ? guideEntry.text : STEP_GUIDE[step]?.text ?? null}
        mood={guideEntry?.mood || 'focused'}
        customColor={DG}
      />
    </div>
  );
};
