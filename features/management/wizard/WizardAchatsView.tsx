'use client';

/**
 * Agent « Directeur des Achats et Supply Chain Amont » (templateId: 'achats_supply').
 *
 * Déploiement : /api/deploy-agent (run_mode 'achats_supply', skill achats-supply-tralis), comme le Recouvrement ;
 * le backend planifie l'agent et l'envoie au workflow n8n « VMIND - Agent Achats ». « Déployer et exécuter
 * maintenant » lance aussi /api/run-now. L'aperçu du rapport utilise des chiffres d'exemple, clairement signalés.
 *
 * Données prévues (vues TraLIS existantes, lecture seule) :
 *   vw_AI_Commande_Achat (retards, réception), vw_AI_Facture_Achat (dépenses, catégories, devises,
 *   factures contestées / non parvenues / non comptabilisées, débours), vw_AI_Balance_Fournisseur (dettes).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/shared/contexts/ToastContext';
import { VMindGuide } from '@/shared/management/components/VMindGuide';
import { getBrowserTimezone } from '@/shared/utils/timezone';
import { deployAgent, runAgentNow } from '@/shared/api/n8n-api';
import './WizardAchatsView.scss';

interface WizardAchatsViewProps {
  templateId: string;
  onCancel: () => void;
  agentToEdit?: any;
  initialStep?: number;
}

/* ───────────────────────── Constantes ───────────────────────── */

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS: [string, string][] = [['Monday', 'Lundi'], ['Tuesday', 'Mardi'], ['Wednesday', 'Mercredi'], ['Thursday', 'Jeudi'], ['Friday', 'Vendredi'], ['Saturday', 'Samedi'], ['Sunday', 'Dimanche']];
const STEPS = ['Périmètre', 'Seuils et alertes', 'Destinataires et planification', 'Rédaction et confirmation'];

type SectionKey = 'late' | 'ontime' | 'pending' | 'spend' | 'trend' | 'topsup' | 'cat' | 'fx' | 'debt' | 'due' | 'disputed' | 'missing' | 'notbooked' | 'disb';
interface SectionDef { k: SectionKey; t: string; d: string; on: boolean; rep: string; ex: string; na?: string; nad?: string }

const SECTIONS: { g: string; items: SectionDef[] }[] = [
  { g: 'Commandes et livraisons', items: [
    { k: 'late', t: 'Commandes en retard de livraison', d: 'Commandes non reçues dont la date de livraison prévue est dépassée, par fournisseur', on: true,
      rep: 'Un tableau par fournisseur : nombre de commandes en retard, retard le plus long, montant. Alimente aussi la tuile « Commandes en retard », les alertes et l\'action « Relancer ».', ex: 'Transporteur routier B : 3 commandes, jusqu\'à 12 jours de retard.' },
    { k: 'ontime', t: 'Livraisons à l\'heure', d: 'Part des commandes reçues avant ou à la date prévue, sur la période', on: false, na: 'Donnée à confirmer', nad: 'Les réceptions de commandes ne sont presque jamais saisies dans l\'ERP.',
      rep: 'Le nombre de commandes reçues, la part reçue à temps et les fournisseurs les moins ponctuels. Alimente la tuile « Livrées à l\'heure ».', ex: '37 commandes reçues à temps sur 44, soit 84 %.' },
    { k: 'pending', t: 'Commandes en attente de réception', d: 'Commandes passées, pas encore reçues et pas encore en retard', on: true,
      rep: 'Le nombre de commandes attendues et leur montant total. Alimente la tuile « En attente de réception ».', ex: '17 commandes attendues pour 96 200 TND.' },
  ] },
  { g: 'Dépenses', items: [
    { k: 'spend', t: 'Dépenses de la période', d: 'Factures d\'achat hors taxes, avoirs déduits, et leurs comparaisons', on: true,
      rep: 'Le total de la période et les comparaisons choisies à l\'étape 1. Alimente la tuile « Dépenses hors taxes » et les alertes de hausse.', ex: '962 000 TND, soit +14,8 % par rapport à la période précédente.' },
    { k: 'trend', t: 'Tendance des dépenses', d: 'Évolution sur les 6 derniers mois', on: true,
      rep: 'Un graphique en barres des 6 derniers mois, le dernier mis en avant.', ex: 'Six barres, le dernier mois au plus haut.' },
    { k: 'topsup', t: 'Principaux fournisseurs', d: 'Fournisseurs qui pèsent le plus dans les dépenses, et leur évolution', on: true,
      rep: 'Un tableau des fournisseurs : dépenses, part du total, évolution. Le nombre de lignes se règle à l\'étape 2. Sert aussi à l\'alerte de dépendance.', ex: 'Compagnie maritime A : 318 000 TND, 33 % des dépenses, +24,2 %.' },
    { k: 'cat', t: 'Dépenses par catégorie', d: 'Répartition par catégorie de dépense (fret, manutention, transport…)', on: true,
      rep: 'Un tableau des catégories de dépense avec leur montant et leur part.', ex: 'Fret maritime : 402 000 TND, 42 %.' },
    { k: 'fx', t: 'Achats en devises', d: 'Factures en euros, dollars et autres devises, avec leur montant d\'origine', on: false,
      rep: 'Un tableau par devise, montants dans la devise d\'origine de la facture.', ex: '68 400 euros et 41 200 dollars.' },
  ] },
  { g: 'Dettes fournisseurs', items: [
    { k: 'debt', t: 'Dettes fournisseurs', d: 'Facturé, payé, reste à payer, montant en retard de paiement', on: true,
      rep: 'Facturé, payé, reste à payer et part en retard, puis les fournisseurs en alerte de paiement. Alimente la tuile « Retard de paiement » et l\'action « Régler en priorité ».', ex: '241 800 TND restant à payer, dont 62 300 TND en retard.' },
    { k: 'due', t: 'Échéances à venir', d: 'Factures à payer dans les 30 prochains jours', on: false, na: 'Donnée à confirmer', nad: 'La vue des factures d\'achat ne dit pas encore si une facture est déjà payée.',
      rep: 'Indisponible pour l\'instant : la liste pourrait contenir des factures déjà réglées.', ex: '' },
  ] },
  { g: 'Factures à traiter', items: [
    { k: 'disputed', t: 'Factures contestées', d: 'Factures fournisseurs en litige, par fournisseur', on: true,
      rep: 'Un tableau des factures contestées par fournisseur, avec le montant. Alimente la tuile « Factures à traiter » et l\'action « Clore les litiges ».', ex: 'Compagnie maritime A : 1 facture, 14 200 TND.' },
    { k: 'missing', t: 'Factures non parvenues', d: 'Factures enregistrées dont l\'original n\'est pas encore reçu', on: true,
      rep: 'Un tableau des factures non parvenues par fournisseur. Alimente la tuile « Factures à traiter ».', ex: 'Agent portuaire F : 1 facture, 3 400 TND.' },
    { k: 'notbooked', t: 'Factures non comptabilisées', d: 'Factures de la période pas encore passées en comptabilité', on: false, na: 'Donnée à confirmer', nad: 'L\'indicateur de comptabilisation n\'est pas fiable dans les données récentes de l\'ERP.',
      rep: 'Le nombre et le montant des factures de la période non comptabilisées.', ex: '9 factures pour 57 800 TND.' },
    { k: 'disb', t: 'Débours de la période', d: 'Frais payés pour le compte des clients, par dossier, à vérifier avant facturation client', on: false,
      rep: 'Le nombre de débours, leur montant et les dossiers concernés, avec un rappel de vérification.', ex: '23 débours pour 46 900 TND sur 14 dossiers.' },
  ] },
];
const ALLSEC: SectionDef[] = SECTIONS.flatMap(g => g.items);

interface GuideEntry { t: string; how: string; rep: string; blk?: string; na?: string }
const FIELD_GUIDE: Record<string, GuideEntry> = {
  name: { t: 'Nom de l\'agent', how: 'Gardez le nom proposé ou précisez le site. Exemple : « Directeur des Achats - Radès ».', rep: 'Dans l\'en-tête de l\'email et sous le titre du rapport.', blk: 'meta' },
  period: { t: 'Période analysée', how: 'Choisissez la période selon la fréquence d\'envoi : « Mois en cours, jusqu\'à la veille » pour un envoi chaque semaine (le cumul du mois avance à chaque email), « Mois précédent » pour un envoi chaque mois. « Semaine précédente » se compare seulement à l\'an dernier.', rep: 'Dans l\'objet de l\'email, sous le titre et dans la section « Dépenses de la période ».', blk: 'spend' },
  compare: { t: 'Comparaison des dépenses', how: 'Cliquez sur un choix. Les dates indiquées sous chaque choix sont celles qui seront réellement comparées. « Aucune comparaison » affiche les montants seuls, sans alerte de hausse.', rep: 'Lignes « Période précédente » et « Même période l\'an dernier » de la section « Dépenses de la période », et la tuile des dépenses.', blk: 'spend' },
  delay: { t: 'Seuil de retard de livraison', how: 'Tapez un nombre de jours, de 1 à 365. Exemple : 3 signale une commande prévue le lundi et toujours pas reçue le jeudi.', rep: 'Filtre le tableau « Commandes en retard de livraison », la tuile et l\'alerte correspondantes.', blk: 'late' },
  ontime: { t: 'Taux de livraison à l\'heure attendu', how: 'Tapez un pourcentage, de 1 à 100. Exemple : 90 veut dire 36 commandes à temps sur 40 au minimum.', rep: 'Colore la tuile « Livrées à l\'heure » et déclenche une alerte en dessous du taux.', blk: 'ontime' },
  thprev: { t: 'Hausse par rapport à la période précédente', how: 'Tapez un pourcentage. Exemple : 15 signale un fournisseur passé de 100 000 à 116 000 TND.', rep: 'Alertes de hausse, colonne « Évolution » des principaux fournisseurs, couleur de la tuile des dépenses.', blk: 'spend' },
  thyear: { t: 'Hausse par rapport à l\'an dernier', how: 'Tapez un pourcentage. Utile pour le fret, qui varie avec les saisons.', rep: 'Alerte de hausse par rapport à l\'an dernier, visible si cette comparaison est choisie à l\'étape 1.', blk: 'spend' },
  conc: { t: 'Part maximale d\'un fournisseur', how: 'Tapez un pourcentage, ou laissez vide pour ne pas surveiller. Exemple : avec 30, un fournisseur à 33 % des dépenses est signalé.', rep: 'Alerte de dépendance et action « Consulter un deuxième fournisseur ».', blk: 'topsup' },
  erpalert: { t: 'Alerte de paiement de TraLIS', how: 'Laissez activé pour reprendre les fournisseurs que TraLIS marque déjà en alerte de paiement.', rep: 'Ligne sous la section « Dettes fournisseurs », alerte rouge et action « Régler en priorité ».', blk: 'debt' },
  thlate: { t: 'Retard de paiement par fournisseur', how: 'Tapez un montant en TND, ou laissez vide. Exemple : 10 000 signale un fournisseur à qui on doit 12 400 TND en retard.', rep: 'Alerte rouge dans la liste des alertes.', blk: 'alerts' },
  topn: { t: 'Longueur des listes', how: 'Tapez un nombre de 1 à 20. Cinq suffit pour une lecture rapide.', rep: 'Nombre de lignes des tableaux « Commandes en retard » et « Principaux fournisseurs ».', blk: 'topsup' },
  objspend: { t: 'Objectif de dépenses', how: 'Tapez un montant en TND, ou laissez vide. Exemple : 900 000.', rep: 'Ligne « atteint » ou « non atteint » dans la section « Objectifs ».', blk: 'objectives' },
  objlate: { t: 'Objectif de dettes en retard', how: 'Tapez un montant en TND, ou laissez vide. Exemple : 50 000.', rep: 'Ligne « atteint » ou « non atteint » dans la section « Objectifs ».', blk: 'objectives' },
  objontime: { t: 'Objectif de livraisons à l\'heure', how: 'Tapez un pourcentage, ou laissez vide. Exemple : 95.', rep: 'Ligne « atteint » ou « non atteint » dans la section « Objectifs ».', blk: 'objectives' },
  to: { t: 'Destinataire principal', how: 'Tapez l\'adresse puis cliquez sur « Ajouter » ou appuyez sur Entrée. Vous pouvez en ajouter plusieurs ; une croix retire une adresse.', rep: 'Champ « À » de l\'email.', blk: 'meta' },
  cc: { t: 'Copie', how: 'Même saisie que pour « À ». Exemple : le directeur financier, pour suivre les dettes fournisseurs.', rep: 'Mention « copie » sous l\'expéditeur.', blk: 'meta' },
  rules: { t: 'Règles de planification', how: 'Choisissez un intervalle, puis réglez le rythme, le jour et l\'heure. « + Ajouter une règle » crée un deuxième envoi ; « Supprimer la règle » en retire une.', rep: 'Date et heure affichées à droite de l\'expéditeur.', blk: 'meta' },
  send: { t: 'Quand envoyer', how: '« Seulement en cas d\'alerte » évite un email quand rien ne dépasse vos seuils.', rep: 'Aucun email n\'est envoyé les jours sans alerte.', blk: 'alerts' },
  tone: { t: 'Ton de la synthèse', how: '« Factuel » expose la situation puis les actions. « Direct » commence par la décision à prendre.', rep: 'Section « Synthèse » : une ligne « À décider » apparaît en tête avec le ton direct.', blk: 'synth' },
  length: { t: 'Longueur de la synthèse', how: 'Courte : le constat et 2 actions. Standard : constat, causes probables et 3 actions. Détaillée : avec les points de vigilance et jusqu\'à 5 actions.', rep: 'Sections « Synthèse » et « Actions recommandées ».', blk: 'synth' },
  instr: { t: 'Consigne à l\'agent', how: 'Écrivez une phrase simple, ou laissez vide. Exemple : « Ne pas tenir compte des fournisseurs du groupe. »', rep: 'Oriente la synthèse et les actions, jamais les chiffres.', blk: 'actions' },
  runnow: { t: 'Déployer et exécuter maintenant', how: 'L\'agent est enregistré et lancé tout de suite : utile pour vérifier le rapport réel dès aujourd\'hui.', rep: 'Un premier email part maintenant aux destinataires, puis les envois suivent la planification.', blk: 'meta' },
  deployonly: { t: 'Déployer', how: 'L\'agent est enregistré sans être lancé. Il travaillera à la prochaine date prévue par vos règles.', rep: 'Aucun email maintenant ; le premier part selon la planification.', blk: 'meta' },
};
ALLSEC.forEach(i => {
  FIELD_GUIDE['sec-' + i.k] = { t: i.t, how: i.na ? (i.nad || '') : 'Activez ou coupez l\'interrupteur. Le rapport change aussitôt à droite.', rep: i.rep + (i.ex ? ' Exemple : ' + i.ex : ''), blk: i.k, na: i.na };
});
const STEP_GUIDE: Record<number, GuideEntry> = {
  1: { t: 'Ce que le rapport couvre', how: 'Donnez un nom, choisissez la période des dépenses, puis les sections utiles.', rep: 'Cliquez dans un champ ou survolez une section : son emplacement s\'éclaire dans l\'aperçu.' },
  2: { t: 'Quand l\'agent doit vous alerter', how: 'Tapez vos seuils. En dessous d\'un seuil, l\'information reste dans le rapport sans être signalée.', rep: 'Les seuils alimentent les alertes, les tuiles en couleur et les actions recommandées.' },
  3: { t: 'Qui reçoit le rapport, et quand', how: 'Ajoutez au moins un destinataire principal, puis réglez la planification.', rep: 'L\'en-tête de l\'email montre les destinataires et l\'heure d\'envoi.' },
  4: { t: 'Le ton, puis la vérification', how: 'Réglez la synthèse, relisez le récapitulatif, puis choisissez : déployer et exécuter maintenant, ou déployer uniquement.', rep: 'Le rapport à droite est celui qui sera envoyé, avec vos données à la place des chiffres d\'exemple.' },
};

type NumKey = 'delay' | 'ontime' | 'thprev' | 'thyear' | 'conc' | 'thlate' | 'topn' | 'objspend' | 'objlate' | 'objontime';
const NUM_RULES: Record<NumKey, { min: number; max: number; req: boolean; msg: string }> = {
  delay: { min: 1, max: 365, req: true, msg: 'Entre 1 et 365 jours.' },
  ontime: { min: 1, max: 100, req: true, msg: 'Entre 1 et 100 %.' },
  thprev: { min: 1, max: 1000, req: true, msg: 'Un pourcentage supérieur à 0.' },
  thyear: { min: 1, max: 1000, req: true, msg: 'Un pourcentage supérieur à 0.' },
  conc: { min: 1, max: 100, req: false, msg: 'Entre 1 et 100 %, ou vide.' },
  thlate: { min: 0, max: 1e9, req: false, msg: 'Un montant positif, ou vide.' },
  topn: { min: 1, max: 20, req: true, msg: 'Entre 1 et 20.' },
  objspend: { min: 0, max: 1e10, req: false, msg: 'Un montant positif, ou vide.' },
  objlate: { min: 0, max: 1e10, req: false, msg: 'Un montant positif, ou vide.' },
  objontime: { min: 1, max: 100, req: false, msg: 'Entre 1 et 100 %, ou vide.' },
};

type Interval = 'Days' | 'Weeks' | 'Hours' | 'Minutes' | 'Seconds' | 'Months';
const INTERVALS: [Interval, string][] = [['Days', 'Jours'], ['Weeks', 'Semaines'], ['Hours', 'Heures'], ['Minutes', 'Minutes'], ['Seconds', 'Secondes'], ['Months', 'Mois']];
interface Rule {
  interval: Interval; daysBetween: number; weeksBetween: number; hoursBetween: number; minutesBetween: number;
  secondsBetween: number; monthsBetween: number; dayOfMonth: number; hour: number; minute: number; weekdays: string[];
}
const newRule = (): Rule => ({ interval: 'Weeks', daysBetween: 1, weeksBetween: 1, hoursBetween: 1, minutesBetween: 5, secondsBetween: 30, monthsBetween: 1, dayOfMonth: 1, hour: 8, minute: 0, weekdays: ['Monday'] });


/* ───────────────────────── Utilitaires ───────────────────────── */

const nf = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

function monthsAgo(n: number) { const t = new Date(); const d = new Date(t.getFullYear(), t.getMonth() - n, 1); return { m: d.getMonth(), y: d.getFullYear() }; }
const lbl = (p: { m: number; y: number }) => MOIS[p.m] + ' ' + p.y;

type Period = 'prev_week' | 'prev_month' | 'cur_month' | 'cur_quarter' | 'cur_year';
type Compare = 'both' | 'prev' | 'lastyear' | 'none';
/* « du 9 au 15 novembre 2026 » ou « du 26 octobre au 1 novembre 2026 » */
function semaine(lundi: Date) {
  const d = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + 6);
  const memeMois = d.getMonth() === lundi.getMonth() && d.getFullYear() === lundi.getFullYear();
  return `du ${lundi.getDate()}${memeMois ? '' : ' ' + MOIS[lundi.getMonth()] + (d.getFullYear() !== lundi.getFullYear() ? ' ' + lundi.getFullYear() : '')} au ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}
function periodInfo(v: Period) {
  const t = new Date(), y = t.getFullYear(), q = Math.floor(t.getMonth() / 3) + 1;
  if (v === 'prev_week') {
    // Semaine complète (lundi à dimanche) qui précède l'envoi.
    const lundi = new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 6) % 7) - 7);
    const avant = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() - 7);
    const anDernier = new Date(lundi.getFullYear() - 1, lundi.getMonth(), lundi.getDate());
    return { name: 'semaine ' + semaine(lundi), prev: 'semaine ' + semaine(avant), year: 'mêmes dates en ' + (lundi.getFullYear() - 1) + ' (' + semaine(anDernier) + ')' };
  }
  if (v === 'prev_month') { const a = monthsAgo(1), b = monthsAgo(2); return { name: lbl(a), prev: lbl(b), year: lbl({ m: a.m, y: a.y - 1 }) }; }
  if (v === 'cur_month') { const a = monthsAgo(0), b = monthsAgo(1); return { name: lbl(a) + ' jusqu\'à la veille', prev: 'même nombre de jours en ' + MOIS[b.m], year: 'même nombre de jours en ' + MOIS[a.m] + ' ' + (a.y - 1) }; }
  if (v === 'cur_quarter') { const pq = q === 1 ? 4 : q - 1, py = q === 1 ? y - 1 : y; return { name: `trimestre ${q} de ${y}`, prev: `trimestre ${pq} de ${py}`, year: `trimestre ${q} de ${y - 1}` }; }
  return { name: `année ${y} jusqu'à la veille`, prev: `même période en ${y - 1}`, year: `même période en ${y - 1}` };
}

function ruleText(r: Rule) {
  const at = `à ${hhmm(r.hour, r.minute)}`;
  const days = r.weekdays.map(v => (JOURS.find(j => j[0] === v) || ['', v])[1].toLowerCase()).join(', ');
  switch (r.interval) {
    case 'Days': return r.daysBetween === 1 ? `chaque jour ${at}` : `tous les ${r.daysBetween} jours ${at}`;
    case 'Weeks': return `${r.weeksBetween === 1 ? 'chaque semaine' : `toutes les ${r.weeksBetween} semaines`}, le ${days} ${at}`;
    case 'Hours': return `toutes les ${r.hoursBetween} heure${r.hoursBetween > 1 ? 's' : ''}, à la minute ${r.minute}`;
    case 'Minutes': return `toutes les ${r.minutesBetween} minutes`;
    case 'Seconds': return `toutes les ${r.secondsBetween} secondes`;
    default: return `${r.monthsBetween === 1 ? 'chaque mois' : `tous les ${r.monthsBetween} mois`}, le ${r.dayOfMonth} ${at}`;
  }
}

/* ───────────────────────── Composant ───────────────────────── */

export const WizardAchatsView: React.FC<WizardAchatsViewProps> = ({ onCancel, initialStep, agentToEdit }) => {
  const { showToast } = useToast();

  /* Modification : « Modifier la configuration » dans Mes agents rouvre l'assistant avec la configuration enregistrée.
     L'enregistrement repasse par /api/deploy-agent, qui met à jour l'agent du même nom (même identifiant). */
  const isEdit = Boolean(agentToEdit);
  const ac: any = (agentToEdit && (agentToEdit.achats_config || agentToEdit.parameters?.achats_config || agentToEdit.config?.achats_config)) || null;
  const pick = <T extends string>(v: any, ok: readonly T[], def: T): T => (ok.includes(v) ? v : def);

  const [step, setStep] = useState<number>(Math.min(4, Math.max(1, initialStep || 1)));
  const [showPreview, setShowPreview] = useState(true);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  const [name, setName] = useState<string>(String((isEdit && (agentToEdit.agent_name || agentToEdit.nom)) || 'Directeur des Achats - Siège'));
  // Par défaut : envoi chaque semaine (newRule) → « Mois en cours, jusqu'à la veille » : le cumul avance à chaque email
  // et se compare au mois précédent et à l'an dernier (comparaison fiable, contrairement à semaine contre semaine).
  const [period, setPeriod] = useState<Period>(pick(ac?.period, ['prev_week', 'prev_month', 'cur_month', 'cur_quarter', 'cur_year'] as const, 'cur_month'));
  const [compare, setCompare] = useState<Compare>(pick(ac?.compare, ['both', 'prev', 'lastyear', 'none'] as const, 'both'));
  const [secOn, setSecOn] = useState<Record<string, boolean>>(() => Object.fromEntries(ALLSEC.map(i => [i.k, i.na ? false : Array.isArray(ac?.sections) ? ac.sections.includes(i.k) : i.on])));

  const [nums, setNums] = useState<Record<NumKey, string>>(() => {
    const d: Record<NumKey, string> = { delay: '3', ontime: '90', thprev: '15', thyear: '20', conc: '30', thlate: '', topn: '5', objspend: '', objlate: '', objontime: '' };
    const th = ac?.thresholds && typeof ac.thresholds === 'object' ? ac.thresholds : {};
    for (const k of Object.keys(d) as NumKey[]) if (th[k] !== undefined && th[k] !== null) d[k] = String(th[k]);
    return d;
  });
  const [erpAlert, setErpAlert] = useState(ac ? ac.erp_payment_alert !== false : true);

  const [rcp, setRcp] = useState<{ to: string[]; cc: string[] }>(() => ({
    to: Array.isArray(ac?.recipients?.to) ? ac.recipients.to.map(String) : [],
    cc: Array.isArray(ac?.recipients?.cc) ? ac.recipients.cc.map(String) : [],
  }));
  const [rcpIn, setRcpIn] = useState<{ to: string; cc: string }>({ to: '', cc: '' });
  const [rcpErr, setRcpErr] = useState<{ to: string; cc: string }>({ to: '', cc: '' });
  const [rules, setRules] = useState<Rule[]>(() => (Array.isArray(ac?.regles_assistant) && ac.regles_assistant.length
    ? ac.regles_assistant.map((r: any) => ({ ...newRule(), ...r, weekdays: Array.isArray(r?.weekdays) && r.weekdays.length ? r.weekdays : newRule().weekdays }))
    : [newRule()]));
  const [send, setSend] = useState<'always' | 'alerts'>(pick(ac?.send, ['always', 'alerts'] as const, 'always'));

  const [tone, setTone] = useState<'factual' | 'direct'>(pick(ac?.tone, ['factual', 'direct'] as const, 'factual'));
  const [length, setLength] = useState<'short' | 'standard' | 'long'>(pick(ac?.length, ['short', 'standard', 'long'] as const, 'standard'));
  const [instr, setInstr] = useState<string>(typeof ac?.instructions === 'string' ? ac.instructions : '');

  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [guideClosed, setGuideClosed] = useState(false);
  const [nameErr, setNameErr] = useState('');
  const [deploying, setDeploying] = useState<'run_now' | 'deploy_only' | null>(null);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const timezone = useMemo(() => getBrowserTimezone(), []);

  /* Guide */
  const openGuide = (k: string | null) => { if (k !== guideKey) setGuideClosed(false); setGuideKey(k); };
  const guide = (guideKey && FIELD_GUIDE[guideKey]) || STEP_GUIDE[step];
  const guideOff = !!guideKey && guideKey.startsWith('sec-') && !secOn[guideKey.slice(4)] && !guide.na;
  const f = (k: string) => ({ onFocus: () => openGuide(k) });

  /* Valeurs numériques */
  const val = (k: NumKey): number | null => { const v = nums[k].trim(); return v === '' ? null : Number(v); };
  const numError = (k: NumKey): string => {
    const r = NUM_RULES[k], v = nums[k].trim(), n = Number(v);
    if (v === '' && r.req) return 'Champ obligatoire. ' + r.msg;
    if (v !== '' && (!isFinite(n) || n < r.min || n > r.max)) return r.msg;
    return '';
  };
  const [showNumErr, setShowNumErr] = useState<Record<string, boolean>>({});

  const p = periodInfo(period);
  /* Période et fréquence d'envoi doivent aller ensemble, sinon les emails répètent les mêmes dépenses (ou en oublient). */
  const PERIODE_LIB: Record<Period, string> = { prev_week: 'Semaine précédente', prev_month: 'Mois précédent', cur_month: 'Mois en cours, jusqu\'à la veille', cur_quarter: 'Trimestre en cours, jusqu\'à la veille', cur_year: 'Année en cours, jusqu\'à la veille' };
  const conseilPeriode = (() => {
    if (!rules.length) return null;
    const rang = (r: Rule) => (r.interval === 'Months' ? 2 : r.interval === 'Weeks' ? 1 : 0);   // 0 : plusieurs fois par semaine
    const fq = Math.min(...rules.map(rang));
    const c = (texte: string, periode: Period) => ({ texte, periode, libelle: PERIODE_LIB[periode] });
    if (fq === 0 && (period === 'prev_week' || period === 'prev_month')) return c(`Envoi plusieurs fois par semaine avec « ${PERIODE_LIB[period]} » : plusieurs emails de suite montreront les mêmes dépenses.`, 'cur_month');
    if (fq === 1 && period === 'prev_month') return c('Envoi chaque semaine avec « Mois précédent » : les emails d\'un même mois montreront les mêmes dépenses.', 'cur_month');
    if (fq === 2 && period === 'prev_week') return c('Envoi chaque mois avec « Semaine précédente » : les dépenses des autres semaines du mois ne seront dans aucun rapport.', 'prev_month');
    return null;
  })();
  const cmpLabel = { both: period === 'cur_year' ? p.year : `${p.prev} et ${p.year}`, prev: p.prev, lastyear: p.year, none: '' }[compare];
  useEffect(() => { if (period === 'cur_year' && compare === 'prev') setCompare('lastyear'); }, [period, compare]);
  // Semaine contre semaine n'est pas fiable (factures d'achat irrégulières) : la semaine se compare à l'an dernier, ou à rien.
  useEffect(() => { if (period === 'prev_week' && (compare === 'prev' || compare === 'both')) setCompare('lastyear'); }, [period, compare]);

  /* Aperçu = mise en page seulement : aucun chiffre, ils sont calculés depuis l'ERP à chaque envoi.
     Les blocs, tuiles et alertes suivent exactement la configuration, comme dans l'email. */
  const V = '—';
  const topn = Math.min(20, Math.max(1, val('topn') || 5));
  const delay = val('delay') || 1;
  const conc = val('conc'), thLate = val('thlate');
  const showPrev = compare === 'both' || compare === 'prev', showYear = compare === 'both' || compare === 'lastyear';
  const lignesListe = Math.min(topn, 5);   // lignes montrées dans l'aperçu ; « … » au-delà
  const liste = (libelle: string) => Array.from({ length: lignesListe }, (_, i) => `${libelle} ${i + 1}`);
  const nbActions = { short: 2, standard: 3, long: 5 }[length];
  // Mêmes règles que le calcul du rapport dans n8n (nœud « Contrôler et calculer »).
  const alertesPossibles = (() => {
    const a: string[] = [];
    if (secOn.late) a.push(`Commandes en retard d'au moins ${delay} jour${delay > 1 ? 's' : ''}`);
    if (secOn.spend) {
      if (showPrev && val('thprev') !== null) a.push(`Dépenses en hausse d'au moins ${val('thprev')} % par rapport à la période précédente`);
      if (showYear && val('thyear') !== null) a.push(`Dépenses en hausse d'au moins ${val('thyear')} % par rapport à la même période de l'an dernier`);
      if (val('objspend') !== null) a.push(`Dépenses au-dessus de l'objectif de ${nf(val('objspend') as number)} TND`);
    }
    if (secOn.topsup) {
      if (conc !== null) a.push(`Premier fournisseur au-delà de ${conc} % des dépenses`);
      if (showPrev && val('thprev') !== null) a.push(`Fournisseur en hausse d'au moins ${val('thprev')} % sur la période`);
    }
    if (secOn.debt) {
      if (erpAlert) a.push('Fournisseurs en alerte de paiement dans l\'ERP (CRITIQUE ou ÉLEVÉ)');
      if (thLate !== null) a.push(`Fournisseurs avec au moins ${nf(thLate)} TND en retard de paiement`);
      if (val('objlate') !== null) a.push(`Dettes en retard au-dessus de l'objectif de ${nf(val('objlate') as number)} TND`);
    }
    if (secOn.disputed) a.push('Factures contestées sur la période');
    if (secOn.missing) a.push('Factures dont l\'original n\'est pas parvenu');
    return a;
  })();

  const activeSections = ALLSEC.filter(i => secOn[i.k]);
  const subject = `[VMIND] Rapport Achats — ${p.name} · — alertes`;
  const r0 = rules[0];
  const when = r0 ? `${r0.interval === 'Weeks' ? (JOURS.find(j => j[0] === r0.weekdays[0]) || ['', ''])[1].toLowerCase() : r0.interval === 'Months' ? `le ${r0.dayOfMonth}` : 'aujourd\'hui'}, ${hhmm(r0.hour, r0.minute)}` : 'non planifié';

  /* Mise en évidence du bloc concerné dans l'aperçu, centré dans la partie visible */
  const activeBlk = guideKey ? FIELD_GUIDE[guideKey]?.blk : undefined;
  useEffect(() => {
    if (!activeBlk || !scrollRef.current) return;
    const sc = scrollRef.current;
    const el = sc.querySelector<HTMLElement>(`[data-blk="${activeBlk}"]`);
    if (!el) return;
    const sr = sc.getBoundingClientRect(), er = el.getBoundingClientRect();
    let visTop = sr.top, visBottom = sr.bottom;
    const panel = document.querySelector<HTMLElement>('.vmind-guide-panel');
    if (panel && !guideClosed) { const gr = panel.getBoundingClientRect(); if (gr.left < sr.right && gr.top < visBottom && gr.bottom > visTop) visBottom = Math.max(visTop + 160, gr.top - 8); }
    const visH = visBottom - visTop, offset = er.top - sr.top + sc.scrollTop;
    let target = er.height + 24 <= visH ? offset - (visH - er.height) / 2 : offset - 16;
    target = Math.max(0, Math.min(target, sc.scrollHeight - sc.clientHeight));
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sc.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
  }, [activeBlk, guideKey, secOn, device, showPreview, guideClosed]);

  /* Focus après « Modifier » */
  useEffect(() => {
    if (!pendingFocus) return;
    const t = setTimeout(() => {
      const el = rootRef.current?.querySelector<HTMLElement>('#' + pendingFocus);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
        const card = el.closest('.aw-card');
        if (card) { card.classList.remove('aw-flash'); void (card as HTMLElement).offsetWidth; card.classList.add('aw-flash'); }
      }
      setPendingFocus(null);
    }, 150);
    return () => clearTimeout(t);
  }, [pendingFocus, step]);

  /* Navigation entre étapes */
  const stepValid = (s: number): boolean => {
    if (s === 1) { const ok = name.trim() !== ''; setNameErr(ok ? '' : 'Donnez un nom à l\'agent.'); return ok && activeSections.length > 0; }
    if (s === 2) {
      const errs = (Object.keys(NUM_RULES) as NumKey[]).filter(k => numError(k));
      setShowNumErr(Object.fromEntries((Object.keys(NUM_RULES) as NumKey[]).map(k => [k, true])));
      return errs.length === 0;
    }
    if (s === 3) return rcp.to.length > 0 && rules.length > 0;
    return true;
  };
  const go = (target: number, focusId?: string) => {
    for (let k = step; k < target; k++) {
      if (!stepValid(k)) {
        setStep(k); setGuideKey(null);
        showToast(k === 3 ? 'Ajoutez au moins un destinataire principal et une règle d\'envoi.' : k === 1 && name.trim() !== '' && activeSections.length === 0 ? 'Activez au moins une section du rapport.' : 'Corrigez les champs signalés en rouge.', 'warning');
        return;
      }
    }
    setStep(Math.max(1, Math.min(4, target)));
    setGuideKey(null);
    if (focusId) setPendingFocus(focusId);
    else bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Destinataires */
  const addRcp = (kind: 'to' | 'cc') => {
    const v = rcpIn[kind].trim();
    setRcpErr(e => ({ ...e, [kind]: '' }));
    if (!v) return;
    if (!emailOk(v)) { setRcpErr(e => ({ ...e, [kind]: 'Adresse invalide. Exemple : achats@votre-societe.tn' })); return; }
    if (rcp.to.includes(v) || rcp.cc.includes(v)) { setRcpErr(e => ({ ...e, [kind]: 'Cette adresse est déjà dans la liste.' })); return; }
    setRcp(r => ({ ...r, [kind]: [...r[kind], v] }));
    setRcpIn(i => ({ ...i, [kind]: '' }));
  };

  /* Règles de planification */
  const setRule = (i: number, patch: Partial<Rule>) => setRules(rs => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const toggleDay = (i: number, d: string) => setRules(rs => rs.map((r, k) => {
    if (k !== i) return r;
    const has = r.weekdays.includes(d);
    if (has && r.weekdays.length === 1) return r;
    return { ...r, weekdays: has ? r.weekdays.filter(x => x !== d) : [...r.weekdays, d] };
  }));

  /* Déploiement : même chemin que le Recouvrement (/api/deploy-agent), workflow n8n « VMIND - Agent Achats » */
  const deploy = async (mode: 'run_now' | 'deploy_only') => {
    if (!stepValid(1)) { setStep(1); showToast(activeSections.length === 0 ? 'Activez au moins une section du rapport.' : 'Donnez un nom à l\'agent.', 'warning'); return; }
    if (!stepValid(3)) { go(3); return; }
    setDeploying(mode);
    // Règles de l'assistant → format lu par le planificateur du backend (convertToCron).
    const heure = (h: number) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`);
    const reglesBackend = rules.map(r => ({
      interval: r.interval, daysBetween: r.daysBetween, weeksBetween: r.weeksBetween, hoursBetween: r.hoursBetween,
      minutesBetween: r.minutesBetween, monthsBetween: r.monthsBetween,
      triggerAtHour: heure(r.hour), triggerAtMinute: r.minute, triggerOnWeekdays: r.weekdays, triggerAtDayOfMonth: r.dayOfMonth,
    }));
    // Recette uniquement : date de référence passée (la base de test s'arrête en avril 2026). Vide en production.
    const dateTest = String(process.env.NEXT_PUBLIC_AGENT_TEST_REFERENCE_DATE || '').trim();
    const config = {
      agent_name: name.trim(), run_mode: 'achats_supply', template_id: 'achats_supply', action: mode, workflow_timezone: timezone,
      erp_type: 'tralis', selected_skills: ['achats-supply-tralis'],
      achats_config: {
        period, compare, sections: activeSections.map(s => s.k), thresholds: nums, erp_payment_alert: erpAlert, recipients: rcp,
        send, tone, length, instructions: instr, regles_assistant: rules,
        ...(/^\d{4}-\d{2}-\d{2}$/.test(dateTest) ? { date_reference: dateTest } : {}),
      },
      trigger_rules: reglesBackend,
    };
    try {
      await deployAgent(config);
      if (mode === 'run_now') await runAgentNow(config.agent_name);
      showToast(isEdit
        ? (mode === 'run_now' ? `Configuration de « ${name.trim()} » enregistrée. Le rapport est en préparation et sera envoyé à ${rcp.to.join(', ')} dans quelques minutes.` : `Configuration de « ${name.trim()} » enregistrée. Envoi prévu ${rules.map(ruleText).join(' ; ')}.`)
        : mode === 'run_now'
        ? `Agent « ${name.trim()} » déployé. Le rapport est en préparation et sera envoyé à ${rcp.to.join(', ')} dans quelques minutes ; suivez-le dans le journal de l'agent.`
        : `Agent « ${name.trim()} » déployé. Envoi prévu ${rules.map(ruleText).join(' ; ')}.`, 'success', 7000);
      onCancel();
    } catch (err: any) {
      console.error('[Agent Achats] Déploiement :', err);
      showToast(`Déploiement impossible : ${err?.message || 'erreur inconnue'}`, 'error', 9000);
    } finally {
      setDeploying(null);
    }
  };

  /* Récapitulatif */
  const recapRows: [string, React.ReactNode, number, string][] = (() => {
    const th = [`retard de livraison dès ${val('delay') ?? '—'} jours`, ...(secOn.ontime ? [`livraisons à l'heure au moins ${val('ontime') ?? '—'} %`] : []), `hausse au-delà de ${val('thprev') ?? '—'} % par rapport à la période précédente et ${val('thyear') ?? '—'} % par rapport à l'an dernier`];
    if (conc !== null) th.push(`un fournisseur au-delà de ${conc} % des dépenses`);
    if (erpAlert) th.push('alerte de paiement de TraLIS');
    if (thLate !== null) th.push(`retard de paiement dès ${nf(thLate)} TND`);
    const obj: string[] = [];
    if (val('objspend') !== null) obj.push(`dépenses au plus ${nf(val('objspend') as number)} TND`);
    if (val('objlate') !== null) obj.push(`dettes en retard au plus ${nf(val('objlate') as number)} TND`);
    if (secOn.ontime && val('objontime') !== null) obj.push(`livraisons à l'heure au moins ${val('objontime')} %`);
    return [
      ['Agent', name, 1, 'aw-name'],
      ['Période', compare === 'none' ? `${p.name}, sans comparaison` : `${p.name}, comparée à ${cmpLabel}`, 1, 'aw-period'],
      ['Sections', `${activeSections.length} : ${activeSections.map(i => i.t).join(', ')}`, 1, 'sec-late'],
      ['Alertes', th.join(' · '), 2, 'aw-delay'],
      ['Listes', `${val('topn') ?? '—'} fournisseurs par liste`, 2, 'aw-topn'],
      ['Objectifs', obj.length ? obj.join(' · ') : 'aucun', 2, 'aw-objspend'],
      ['Destinataires', rcp.to.join(', ') + (rcp.cc.length ? ` · en copie : ${rcp.cc.join(', ')}` : ''), 3, 'aw-to'],
      ['Envoi', rules.map(ruleText).join(' ; ') + (send === 'alerts' ? ', seulement en cas d\'alerte' : ''), 3, 'aw-r0-interval'],
      ['Synthèse', `${tone === 'factual' ? 'factuelle' : 'directe'}, ${{ short: 'courte', standard: 'standard', long: 'détaillée' }[length]}${instr.trim() ? ` · consigne : « ${instr.trim()} »` : ''}`, 4, 'aw-instr'],
    ];
  })();

  /* ───────── Rendu des petits éléments ───────── */

  function Seg<T extends string>({ value, options, onChange, gk, compact }: { value: T; options: { v: T; b: string; s?: string; hidden?: boolean }[]; onChange: (v: T) => void; gk: string; compact?: boolean }) { return (
    <div className="aw-seg" role="group">
      {options.filter(o => !o.hidden).map(o => (
        <button key={o.v} type="button" className={`aw-so${compact ? ' compact' : ''}${value === o.v ? ' on' : ''}`} aria-pressed={value === o.v}
          onFocus={() => openGuide(gk)} onClick={() => { onChange(o.v); openGuide(gk); }}>
          <b>{o.b}</b>{o.s && <small>{o.s}</small>}
        </button>
      ))}
    </div>
  ); }

  const NumField = ({ k, label, unit, placeholder }: { k: NumKey; label: string; unit: string; placeholder?: string }) => {
    const err = showNumErr[k] || nums[k] !== '' ? numError(k) : '';
    return (
      <div className="aw-fg">
        <label className="aw-lbl" htmlFor={'aw-' + k}>{label}</label>
        <div className="aw-unit">
          <input id={'aw-' + k} className={`aw-inp${err ? ' bad' : ''}`} type="number" inputMode="decimal" min={NUM_RULES[k].min} max={NUM_RULES[k].max}
            value={nums[k]} placeholder={placeholder} {...f(k)}
            onChange={e => { const v = e.target.value; setNums(n => ({ ...n, [k]: v })); setShowNumErr(s => ({ ...s, [k]: true })); }} />
          <span>{unit}</span>
        </div>
        {err && <div className="aw-ferr">{err}</div>}
      </div>
    );
  };

  const numF = (i: number, r: Rule, key: keyof Rule, label: string, min: number, max: number) => (
    <div className="aw-fg">
      <label className="aw-lbl" htmlFor={`aw-r${i}-${key}`}>{label}</label>
      <input id={`aw-r${i}-${key}`} className="aw-inp" type="number" min={min} max={max} value={r[key] as number} {...f('rules')}
        onChange={e => setRule(i, { [key]: Math.max(min, Math.min(max, Number(e.target.value) || min)) } as Partial<Rule>)} />
    </div>
  );
  const hourF = (i: number, r: Rule) => (
    <div className="aw-fg">
      <label className="aw-lbl" htmlFor={`aw-r${i}-hour`}>Heure d&apos;exécution</label>
      <select id={`aw-r${i}-hour`} className="aw-inp" value={r.hour} {...f('rules')} onChange={e => setRule(i, { hour: Number(e.target.value) })}>
        {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hhmm(h, 0)}</option>)}
      </select>
    </div>
  );

  const Blk = (k: string, children: React.ReactNode, className = 'aw-msec') => (
    <div className={`${className}${activeBlk === k ? ' aw-hl' : ''}`} data-blk={k}>
      {activeBlk === k && <div className="aw-hlnote">Ce champ modifie cette partie</div>}
      {children}
    </div>
  );

  /* ───────── Rendu ───────── */

  return (
    <div className="achats-wiz anim" ref={rootRef}>
      <div className="aw-head">
        <div className="aw-head-l">
          <div className="aw-hic" aria-hidden="true">🏭</div>
          <div style={{ minWidth: 0 }}>
            <h1 className="aw-htitle">Configuration : Directeur des Achats et Supply Chain Amont{isEdit ? ' (modification)' : ''}</h1>
            <p className="aw-hsub">Commandes en retard, dépenses, dettes fournisseurs et factures à traiter, avec alertes et actions recommandées, envoyés par email</p>
          </div>
        </div>
        <div className="aw-hbtns">
          <button type="button" className="aw-gbtn" onClick={() => setShowPreview(s => !s)}>{showPreview ? 'Masquer l\'aperçu' : 'Afficher l\'aperçu'}</button>
          <button type="button" className="aw-gbtn" onClick={onCancel}>← Annuler</button>
        </div>
      </div>

      <nav className="aw-steps" aria-label="Étapes de configuration">
        {STEPS.map((t, i) => (
          <button key={t} type="button" className={`aw-st${i + 1 === step ? ' on' : i + 1 < step ? ' done' : ''}`} aria-current={i + 1 === step ? 'step' : undefined} onClick={() => go(i + 1)}>
            <span className="n">{i + 1 < step ? '✓' : i + 1}</span><span className="t">{t}</span>
          </button>
        ))}
      </nav>

      <div className="aw-body" ref={bodyRef}>
      <div className={`aw-layout${showPreview ? '' : ' nopreview'}`}>
        <div style={{ minWidth: 0 }}>
          {/* ÉTAPE 1 */}
          {step === 1 && (<>
            <div className="aw-card">
              <h2 className="aw-ct">Identité de l&apos;agent</h2>
              <label className="aw-lbl" htmlFor="aw-name">Nom de l&apos;agent *</label>
              <input id="aw-name" className={`aw-inp${nameErr ? ' bad' : ''}`} value={name} readOnly={isEdit} {...f('name')} onChange={e => { if (isEdit) return; setName(e.target.value); setNameErr(''); }} />
              {nameErr && <div className="aw-ferr">{nameErr}</div>}
              {isEdit && <div className="aw-help">Le nom ne change pas en modification : un autre nom créerait un second agent.</div>}
            </div>
            <div className="aw-card">
              <h2 className="aw-ct">Période et comparaison</h2>
              <p className="aw-cs">Concerne les dépenses (montant, tendance, fournisseurs, catégories) et les factures à traiter. Les retards de livraison, les commandes en attente et les dettes sont toujours la situation du jour de l&apos;envoi.</p>
              <label className="aw-lbl" htmlFor="aw-period">Période analysée</label>
              <select id="aw-period" className="aw-inp" value={period} {...f('period')} onChange={e => { setPeriod(e.target.value as Period); openGuide('period'); }}>
                <option value="cur_month">Mois en cours, jusqu&apos;à la veille</option>
                <option value="prev_month">Mois précédent</option>
                <option value="prev_week">Semaine précédente (lundi à dimanche)</option>
                <option value="cur_quarter">Trimestre en cours, jusqu&apos;à la veille</option>
                <option value="cur_year">Année en cours, jusqu&apos;à la veille</option>
              </select>
              <div className="aw-help">Prochain rapport : {p.name}.</div>
              {conseilPeriode && <div className="aw-warnbox">⚠ {conseilPeriode.texte} <button type="button" className="aw-gbtn" onClick={() => { setPeriod(conseilPeriode.periode); openGuide('period'); }}>Utiliser « {conseilPeriode.libelle} »</button></div>}
              <span className="aw-lbl">Comparer les dépenses avec</span>
              {Seg({ value: compare, onChange: setCompare, gk: 'compare', options: [
                { v: 'both', b: 'Les deux', s: period === 'cur_year' ? p.year : `${p.prev} et ${p.year}`, hidden: period === 'prev_week' },
                { v: 'prev', b: 'La période précédente', s: p.prev, hidden: period === 'cur_year' || period === 'prev_week' },
                { v: 'lastyear', b: 'La même période l\'an dernier', s: p.year },
                { v: 'none', b: 'Aucune comparaison', s: 'les montants seuls, sans alerte de hausse' },
              ] })}
            </div>
            <div className="aw-card">
              <h2 className="aw-ct">Sections du rapport <span className="aw-cnt">{activeSections.length} / {ALLSEC.filter(i => !i.na).length} actives</span></h2>
              <p className="aw-cs">Tout ce qu&apos;un responsable achats suit au quotidien. Survolez ou activez une section : le guide l&apos;explique et l&apos;aperçu montre où elle apparaît. La synthèse, les alertes et les actions recommandées sont toujours incluses.</p>
              {SECTIONS.map(g => (
                <React.Fragment key={g.g}>
                  <div className="aw-grp">{g.g}</div>
                  {g.items.map(i => (
                    <div key={i.k} className={`aw-tg${i.na ? ' na' : ''}`} onMouseEnter={() => openGuide('sec-' + i.k)}>
                      <div><b>{i.t}{i.na && <span className="aw-na">{i.na}</span>}</b><small>{i.na ? i.nad : i.d}</small></div>
                      <label className="aw-sw">
                        <input id={'sec-' + i.k} type="checkbox" checked={!!secOn[i.k]} disabled={!!i.na} aria-label={i.t} {...f('sec-' + i.k)}
                          onChange={e => { const c = e.target.checked; setSecOn(s => ({ ...s, [i.k]: c })); openGuide('sec-' + i.k); }} />
                        <span />
                      </label>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </>)}

          {/* ÉTAPE 2 */}
          {step === 2 && (<>
            <div className="aw-card">
              <h2 className="aw-ct">Retards de livraison</h2>
              <p className="aw-cs">Les commandes non reçues après leur date de livraison prévue.</p>
              <div className="aw-grid2">
                {NumField({ k: 'delay', label: 'Signaler une commande en retard à partir de', unit: 'jours' })}
                {secOn.ontime && NumField({ k: 'ontime', label: 'Taux de livraison à l\'heure attendu', unit: '%' })}
              </div>
            </div>
            <div className="aw-card">
              <h2 className="aw-ct">Hausse des dépenses</h2>
              <p className="aw-cs">Une dépense qui augmente au-delà du seuil est signalée, au total et pour chaque fournisseur.</p>
              <div className="aw-grid2">
                {NumField({ k: 'thprev', label: 'Hausse par rapport à la période précédente', unit: '%' })}
                {NumField({ k: 'thyear', label: 'Hausse par rapport à l\'an dernier', unit: '%' })}
              </div>
              {NumField({ k: 'conc', label: 'Part maximale d\'un seul fournisseur dans les dépenses', unit: '%', placeholder: 'Laisser vide pour ne pas surveiller' })}
            </div>
            <div className="aw-card">
              <h2 className="aw-ct">Dettes fournisseurs</h2>
              <div className="aw-tg" onMouseEnter={() => openGuide('erpalert')}>
                <div><b>Fournisseurs en alerte de paiement</b><small>Reprendre l&apos;alerte de paiement indiquée par TraLIS</small></div>
                <label className="aw-sw"><input id="aw-erpalert" type="checkbox" checked={erpAlert} aria-label="Reprendre l'alerte de paiement de TraLIS" {...f('erpalert')} onChange={e => setErpAlert(e.target.checked)} /><span /></label>
              </div>
              {NumField({ k: 'thlate', label: 'Retard de paiement par fournisseur à partir de', unit: 'TND', placeholder: 'Laisser vide pour ne pas utiliser' })}
            </div>
            <div className="aw-card">
              <h2 className="aw-ct">Listes du rapport</h2>
              {NumField({ k: 'topn', label: 'Nombre de fournisseurs affichés dans chaque liste', unit: 'sur 20' })}
            </div>
            <div className="aw-card">
              <h2 className="aw-ct">Objectifs (facultatifs)</h2>
              <p className="aw-cs">Le rapport indique pour chacun s&apos;il est atteint. Laissez vide pour ne pas suivre un objectif.</p>
              <div className="aw-grid2">
                {NumField({ k: 'objspend', label: 'Dépenses de la période au plus', unit: 'TND', placeholder: 'Exemple : 900 000' })}
                {NumField({ k: 'objlate', label: 'Dettes en retard de paiement au plus', unit: 'TND', placeholder: 'Exemple : 50 000' })}
              </div>
              {secOn.ontime && <div className="aw-grid2">{NumField({ k: 'objontime', label: 'Livraisons à l\'heure au moins', unit: '%', placeholder: 'Exemple : 95' })}</div>}
            </div>
          </>)}

          {/* ÉTAPE 3 */}
          {step === 3 && (<>
            <div className="aw-card">
              <h2 className="aw-ct">Destinataires du rapport <span className="aw-cnt">{rcp.to.length} principal{rcp.to.length > 1 ? 'aux' : ''} · {rcp.cc.length} en copie</span></h2>
              <p className="aw-cs">Au moins un destinataire principal est requis. Les personnes en copie reçoivent le même email, pour information.</p>
              {(['to', 'cc'] as const).map(kind => (
                <div key={kind} style={{ marginTop: kind === 'cc' ? 18 : 0 }}>
                  <label className="aw-lbl" htmlFor={'aw-' + kind}>{kind === 'to' ? 'À *' : 'Copie (facultatif)'}</label>
                  <div className="aw-addrow">
                    <input id={'aw-' + kind} className="aw-inp" type="email" placeholder={kind === 'to' ? 'achats@votre-societe.tn' : 'daf@votre-societe.tn'} value={rcpIn[kind]} {...f(kind)}
                      onChange={e => { const v = e.target.value; setRcpIn(i => ({ ...i, [kind]: v })); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRcp(kind); } }} />
                    <button type="button" className="aw-abtn" onClick={() => addRcp(kind)}>Ajouter</button>
                  </div>
                  {rcpErr[kind] && <div className="aw-ferr">{rcpErr[kind]}</div>}
                  <div className="aw-chips">
                    {rcp[kind].map(m => (
                      <span key={m} className="aw-chip">{m}<button type="button" aria-label={`Retirer ${m}`} onClick={() => setRcp(r => ({ ...r, [kind]: r[kind].filter(x => x !== m) }))}>×</button></span>
                    ))}
                    {kind === 'to' && rcp.to.length === 0 && <div className="aw-empty">Aucun destinataire principal pour l&apos;instant.</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="aw-card">
              <h2 className="aw-ct">Règles de planification automatique
                <button type="button" className="aw-addrule" onFocus={() => openGuide('rules')} onClick={() => { setRules(rs => [...rs, newRule()]); openGuide('rules'); }}>+ Ajouter une règle</button>
              </h2>
              <p className="aw-cs">Chaque règle déclenche un envoi. Plusieurs règles peuvent s&apos;additionner, par exemple chaque lundi et le 1er du mois.</p>
              {rules.length === 0 && <div className="aw-empty">Aucune règle : l&apos;agent ne s&apos;enverra pas tout seul.</div>}
              {rules.map((r, i) => (
                <div className="aw-rule" key={i}>
                  <div className="aw-rh"><span>⚡ Règle d&apos;envoi {i + 1}</span>{rules.length > 1 && <button type="button" className="aw-del" onClick={() => setRules(rs => rs.filter((_, k) => k !== i))}>Supprimer la règle</button>}</div>
                  <div className="aw-fg">
                    <label className="aw-lbl" htmlFor={`aw-r${i}-interval`}>Intervalle de déclenchement</label>
                    <select id={`aw-r${i}-interval`} className="aw-inp" value={r.interval} {...f('rules')} onChange={e => setRule(i, { interval: e.target.value as Interval })}>
                      {INTERVALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  {r.interval === 'Days' && (<><div className="aw-grid2">{numF(i, r, 'daysBetween', 'Jours entre deux envois (1 à 31)', 1, 31)}{hourF(i, r)}</div><div className="aw-grid2">{numF(i, r, 'minute', 'Minute d\'exécution (0 à 59)', 0, 59)}</div></>)}
                  {r.interval === 'Weeks' && (<>
                    <div className="aw-grid2">{numF(i, r, 'weeksBetween', 'Semaines entre deux envois (1 à 4)', 1, 4)}{hourF(i, r)}</div>
                    <span className="aw-lbl">Jours autorisés de la semaine</span>
                    <div className="aw-wd">{JOURS.map(([v, l]) => <button key={v} type="button" className={r.weekdays.includes(v) ? 'on' : ''} aria-pressed={r.weekdays.includes(v)} onFocus={() => openGuide('rules')} onClick={() => toggleDay(i, v)}>{l}</button>)}</div>
                    <div className="aw-grid2" style={{ marginTop: 8 }}>{numF(i, r, 'minute', 'Minute d\'exécution (0 à 59)', 0, 59)}</div>
                  </>)}
                  {r.interval === 'Hours' && <div className="aw-grid2">{numF(i, r, 'hoursBetween', 'Heures entre deux envois (1 à 23)', 1, 23)}{numF(i, r, 'minute', 'Minute d\'exécution (0 à 59)', 0, 59)}</div>}
                  {r.interval === 'Minutes' && numF(i, r, 'minutesBetween', 'Minutes entre deux envois (1 à 59)', 1, 59)}
                  {r.interval === 'Seconds' && numF(i, r, 'secondsBetween', 'Secondes entre deux envois (1 à 59)', 1, 59)}
                  {r.interval === 'Months' && (<>
                    <div className="aw-grid2">{numF(i, r, 'monthsBetween', 'Mois entre deux envois (1 à 12)', 1, 12)}{numF(i, r, 'dayOfMonth', 'Jour du mois (1 à 31)', 1, 31)}</div>
                    <div className="aw-grid2">{hourF(i, r)}{numF(i, r, 'minute', 'Minute d\'exécution (0 à 59)', 0, 59)}</div>
                    <div className="aw-help">Remarque : si le mois n&apos;a pas ce jour, l&apos;envoi n&apos;a pas lieu ce mois-là.</div>
                  </>)}
                </div>
              ))}
              <span className="aw-lbl" style={{ marginTop: 18 }}>Quand envoyer</span>
              {Seg({ value: send, onChange: setSend, gk: 'send', options: [
                { v: 'always', b: 'À chaque fois', s: 'même quand tout va bien' },
                { v: 'alerts', b: 'Seulement en cas d\'alerte', s: 'pas d\'email si rien ne dépasse vos seuils' },
              ] })}
              {conseilPeriode && <div className="aw-warnbox">⚠ {conseilPeriode.texte} <button type="button" className="aw-gbtn" onClick={() => setPeriod(conseilPeriode.periode)}>Utiliser « {conseilPeriode.libelle} »</button></div>}
              <div className="aw-infobox">{rules.length ? `⚡ Envoi ${rules.map(ruleText).join(' ; ')}${send === 'alerts' ? ', seulement les jours où une alerte est levée' : ''}.` : 'Ajoutez une règle pour planifier l\'envoi.'}</div>
            </div>
          </>)}

          {/* ÉTAPE 4 */}
          {step === 4 && (<>
            <div className="aw-card">
              <h2 className="aw-ct">Rédaction de la synthèse</h2>
              <span className="aw-lbl">Ton</span>
              {Seg({ value: tone, onChange: setTone, gk: 'tone', options: [
                { v: 'factual', b: 'Factuel', s: 'les faits et les chiffres, puis les actions' },
                { v: 'direct', b: 'Direct', s: 'la décision à prendre d\'abord' },
              ] })}
              <span className="aw-lbl">Longueur</span>
              {Seg({ value: length, onChange: setLength, gk: 'length', compact: true, options: [{ v: 'short', b: 'Courte' }, { v: 'standard', b: 'Standard' }, { v: 'long', b: 'Détaillée' }] })}
            </div>
            <div className="aw-card">
              <h2 className="aw-ct">Consigne à l&apos;agent (facultative)</h2>
              <p className="aw-cs">Elle oriente la rédaction de la synthèse et des actions. Elle ne modifie pas les calculs.</p>
              <textarea id="aw-instr" className="aw-inp" value={instr} {...f('instr')} onChange={e => setInstr(e.target.value)} placeholder="Exemple : ne pas tenir compte des fournisseurs du groupe ; insister sur les transporteurs routiers." />
            </div>
            <div className="aw-card">
              <h2 className="aw-ct">Récapitulatif</h2>
              <p className="aw-cs">Cliquez sur « Modifier » pour revenir directement au champ concerné.</p>
              <dl className="aw-recap">
                {recapRows.map(([k, v, s, fid]) => (
                  <React.Fragment key={k}>
                    <dt>{k}</dt>
                    <dd><span>{v}</span><button type="button" className="aw-edit" onClick={() => go(s, fid)}>Modifier</button></dd>
                  </React.Fragment>
                ))}
              </dl>
              <div className="aw-help" style={{ marginTop: 14 }}>L&apos;agent lit les données de TraLIS sans jamais les modifier et ne contacte aucun fournisseur.</div>
            </div>
          </>)}

          <div className="aw-navb">
            <button type="button" className="aw-bprev" style={{ visibility: step === 1 ? 'hidden' : 'visible' }} onClick={() => go(step - 1)} disabled={!!deploying}>← Retour</button>
            <div className="aw-nright">
              {step < 4 && <button type="button" className="aw-bnext" onClick={() => go(step + 1)}>{STEPS[step]} →</button>}
              {step === 4 && (<>
                <button type="button" className="aw-bdep" disabled={!!deploying} onFocus={() => openGuide('deployonly')} onMouseEnter={() => openGuide('deployonly')} onClick={() => deploy('deploy_only')}>
                  {deploying === 'deploy_only' ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Déployer'}
                </button>
                <button type="button" className="aw-bdep main" disabled={!!deploying} onFocus={() => openGuide('runnow')} onMouseEnter={() => openGuide('runnow')} onClick={() => deploy('run_now')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  <span>{deploying === 'run_now' ? 'Enregistrement…' : isEdit ? 'Enregistrer et exécuter maintenant' : 'Déployer et exécuter maintenant'}</span>
                </button>
              </>)}
            </div>
          </div>
        </div>

        {/* APERÇU DU RAPPORT */}
        {showPreview && (
          <aside className="aw-preview" aria-label="Aperçu du rapport envoyé">
            <div className="aw-pt">APERÇU DU RAPPORT ENVOYÉ</div>
            <div className="aw-ps">En direct · {activeSections.length} sections · {rcp.to.length + rcp.cc.length} destinataire{rcp.to.length + rcp.cc.length > 1 ? 's' : ''}</div>
            <div className="aw-dev">
              <button type="button" className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}>Ordinateur</button>
              <button type="button" className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}>Mobile</button>
            </div>
            <div className="aw-pinfo">ⓘ Aperçu de la mise en page. Les chiffres seront calculés depuis votre ERP à chaque envoi.</div>
            <div className="aw-inbox">
              <div className="aw-ibar"><i style={{ background: '#F0525C' }} /><i style={{ background: '#F2B53A' }} /><i style={{ background: '#2BD47D' }} /><span>Boîte de réception</span></div>
              <div className="aw-scroll" ref={scrollRef}>
                <div className={`aw-mail${device === 'mobile' ? ' mobile' : ''}`}>
                  {Blk("meta", <>
                    <h3>{subject}</h3>
                    <div className="aw-mfrom">
                      <div className="av">V</div>
                      <div><b>VMIND</b> · {name}<br />À {rcp.to.length ? rcp.to.join(', ') : <span className="noto">aucun destinataire</span>}{rcp.cc.length ? ` · copie ${rcp.cc.join(', ')}` : ''}</div>
                      <span className="when">{when}</span>
                    </div>
                  </>, 'aw-mhead')}
                  <div className="aw-mbody">
                    <div className="aw-mbanner">
                      <div className="row1"><small>VMIND</small></div>
                      <h4>Rapport Achats et Supply Chain</h4>
                      <p>{cap(p.name)} · {name}</p>
                    </div>
                    <div className="aw-msheet">
                      {/* Tuiles : même ordre que l'email (retard, dépenses, retard de paiement, factures à traiter, attente) */}
                      <div className="aw-tiles" data-blk="tiles">
                        {secOn.late && <div className="aw-tile"><small>Commandes en retard</small><b>{V}</b><span>{V} fournisseurs</span></div>}
                        {secOn.spend && <div className="aw-tile"><small>Dépenses hors taxes</small><b>{V}<em>TND</em></b><span>{showPrev || showYear ? `${V} % par rapport ${showPrev ? 'à la période précédente' : 'à l\'an dernier'}` : ''}</span></div>}
                        {secOn.debt && <div className="aw-tile"><small>Retard de paiement</small><b>{V}<em>TND</em></b><span>sur {V} TND restant à payer</span></div>}
                        {(secOn.disputed || secOn.missing) && <div className="aw-tile"><small>Factures à traiter</small><b>{V}</b><span>contestées ou non parvenues</span></div>}
                        {secOn.pending && <div className="aw-tile"><small>En attente de réception</small><b>{V}</b><span>{V} TND commandés</span></div>}
                      </div>

                      {Blk("synth", <>
                        <h5>Synthèse</h5>
                        <div className="aw-syn">
                          <p className="aw-skh">Rédigée par l&apos;agent à chaque envoi · ton {tone === 'direct' ? 'direct' : 'factuel'} · longueur {{ short: 'courte', standard: 'standard', long: 'détaillée' }[length]}</p>
                          {tone === 'direct' && <><p><b>À décider.</b></p><div className="aw-sk w90" /></>}
                          <p><b>Constat.</b></p><div className="aw-sk" /><div className="aw-sk w60" />
                          {length === 'long' && <><p><b>Points de vigilance.</b></p><div className="aw-sk" /><div className="aw-sk w60" /></>}
                        </div>
                      </>)}

                      {Blk("alerts", <>
                        <h5>Alertes</h5>
                        {alertesPossibles.length ? <>
                          <p className="aw-note">Signalées dans l&apos;email seulement si elles sont déclenchées :</p>
                          <ul className="aw-alc">{alertesPossibles.map(t => <li key={t}>▲ {t}</li>)}</ul>
                        </> : <p className="aw-note">Aucune alerte possible avec les sections et les seuils choisis.</p>}
                      </>)}

                      {Blk("actions", <>
                        <h5>Actions recommandées</h5>
                        <p className="aw-note">Proposées par l&apos;agent à partir des alertes déclenchées, {nbActions} au plus.</p>
                        <ol className="aw-act">{Array.from({ length: Math.min(nbActions, 3) }, (_, i) => <li key={i}><div className="aw-sk w60" /><div className="aw-sk" /></li>)}</ol>
                      </>)}

                      {Blk("objectives", <>
                        <h5>Objectifs</h5>
                        {(secOn.spend && val('objspend') !== null) || (secOn.debt && val('objlate') !== null) ? (
                          <table className="aw-mt"><tbody>
                            {secOn.spend && val('objspend') !== null && <tr><td>Dépenses au plus {nf(val('objspend') as number)} TND</td><td className="r">atteint ou non atteint</td></tr>}
                            {secOn.debt && val('objlate') !== null && <tr><td>Dettes en retard au plus {nf(val('objlate') as number)} TND</td><td className="r">atteint ou non atteint</td></tr>}
                          </tbody></table>
                        ) : <p className="aw-note">Aucun objectif renseigné à l&apos;étape 2.</p>}
                      </>)}

                      {secOn.late && Blk("late", <>
                        <h5>Commandes en retard de livraison</h5>
                        <table className="aw-mt"><tbody>
                          <tr><th>Fournisseur</th><th className="r">Commandes</th><th className="r">Retard maximum</th><th className="r">Montant</th></tr>
                          {liste('Fournisseur').map(f => <tr key={f}><td>{f}</td><td className="r">{V}</td><td className="r">{V} jours</td><td className="r">{V} TND</td></tr>)}
                          {topn > lignesListe && <tr><td colSpan={4}>…</td></tr>}
                        </tbody></table>
                        <p className="aw-note">Commandes non reçues dont la date de livraison prévue est dépassée d&apos;au moins {delay} jours ; {topn} fournisseurs au plus, du plus long retard au plus court.</p>
                      </>)}

                      {secOn.pending && Blk("pending", <>
                        <h5>Commandes en attente de réception</h5>
                        <table className="aw-mt"><tbody>
                          <tr><td>Commandes passées, pas encore reçues</td><td className="r">{V}</td></tr>
                          <tr><td>Montant commandé</td><td className="r">{V} TND</td></tr>
                        </tbody></table>
                      </>)}

                      {secOn.spend && Blk("spend", <>
                        <h5>Dépenses de la période</h5>
                        <table className="aw-mt"><tbody>
                          <tr><td>{cap(p.name)}</td><td className="r">{V} TND</td></tr>
                          {showPrev && <tr><td>Période précédente : {p.prev}</td><td className="r">{V} TND · {V} %</td></tr>}
                          {showYear && <tr><td>Même période l&apos;an dernier : {p.year}</td><td className="r">{V} TND · {V} %</td></tr>}
                        </tbody></table>
                        <p className="aw-note">Factures d&apos;achat hors taxes, avoirs déduits. Une hausse peut venir du volume autant que des prix.</p>
                      </>)}

                      {secOn.trend && Blk("trend", <>
                        <h5>Tendance des dépenses sur 6 mois</h5>
                        <div className="aw-bars">{[5, 4, 3, 2, 1, 0].map(n => <div key={n} className={`sk${n === 0 ? ' last' : ''}`} style={{ height: '55%' }} />)}</div>
                        <div className="aw-bl">{[5, 4, 3, 2, 1, 0].map(n => <span key={n}>{MOIS[monthsAgo(n + 1).m]}<br />{V}</span>)}</div>
                      </>)}

                      {secOn.topsup && Blk("topsup", <>
                        <h5>Principaux fournisseurs</h5>
                        <table className="aw-mt"><tbody>
                          <tr><th>Fournisseur</th><th className="r">Dépenses</th><th className="r">Part</th><th className="r">Évolution</th></tr>
                          {liste('Fournisseur').map(f => <tr key={f}><td>{f}</td><td className="r">{V} TND</td><td className="r">{V} %</td><td className="r">{showPrev ? `${V} %` : ''}</td></tr>)}
                          {topn > lignesListe && <tr><td colSpan={4}>…</td></tr>}
                        </tbody></table>
                      </>)}

                      {secOn.cat && Blk("cat", <>
                        <h5>Dépenses par catégorie</h5>
                        <table className="aw-mt"><tbody>{['Catégorie 1', 'Catégorie 2', 'Catégorie 3'].map(c => <tr key={c}><td>{c}</td><td className="r">{V} TND</td><td className="r">{V} %</td></tr>)}<tr><td colSpan={3}>…</td></tr></tbody></table>
                      </>)}

                      {secOn.fx && Blk("fx", <>
                        <h5>Achats en devises</h5>
                        <table className="aw-mt"><tbody>{['Devise 1', 'Devise 2'].map(c => <tr key={c}><td>{c}</td><td className="r">{V}</td></tr>)}</tbody></table>
                        <p className="aw-note">Montants dans la devise d&apos;origine de la facture.</p>
                      </>)}

                      {secOn.debt && Blk("debt", <>
                        <h5>Dettes fournisseurs</h5>
                        <table className="aw-mt"><tbody>
                          <tr><td>Facturé</td><td className="r">{V} TND</td></tr>
                          <tr><td>Payé</td><td className="r">{V} TND</td></tr>
                          <tr><td>Reste à payer</td><td className="r">{V} TND</td></tr>
                          <tr><td>Dont en retard de paiement</td><td className="r">{V} TND</td></tr>
                        </tbody></table>
                        {erpAlert && <p className="aw-note">En alerte de paiement dans l&apos;ERP : fournisseurs classés CRITIQUE ou ÉLEVÉ, {topn} au plus, avec leur montant en retard.</p>}
                        <p className="aw-note">Montants issus de la balance fournisseurs, non rapprochés avec le solde comptable officiel.</p>
                      </>)}

                      {secOn.disputed && Blk("disputed", <>
                        <h5>Factures contestées</h5>
                        <table className="aw-mt"><tbody>{liste('Fournisseur').slice(0, 2).map(f => <tr key={f}><td>{f}</td><td className="r">{V} factures</td><td className="r">{V} TND</td></tr>)}</tbody></table>
                      </>)}

                      {secOn.missing && Blk("missing", <>
                        <h5>Factures non parvenues</h5>
                        <table className="aw-mt"><tbody>{liste('Fournisseur').slice(0, 2).map(f => <tr key={f}><td>{f}</td><td className="r">{V} factures</td><td className="r">{V} TND</td></tr>)}</tbody></table>
                      </>)}

                      {secOn.disb && Blk("disb", <>
                        <h5>Débours de la période</h5>
                        <table className="aw-mt"><tbody>{liste('Fournisseur').slice(0, 2).map(f => <tr key={f}><td>{f}</td><td className="r">{V} débours</td><td className="r">{V} TND</td></tr>)}</tbody></table>
                        <p className="aw-note">À vérifier avant facturation client : le rapprochement automatique avec les factures de vente n&apos;est pas encore disponible.</p>
                      </>)}

                      <div className="aw-mfoot">Généré par VMIND à partir des commandes, factures d&apos;achat et soldes fournisseurs de l&apos;ERP, en lecture seule.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
      </div>

      <VMindGuide
        isOpen={!guideClosed}
        title={guide.t}
        message={guide.how}
        mood="curious"
        customColor="#00E5C8"
        onClose={() => setGuideClosed(true)}
      >
        <div className="aw-guide-rep">
          <b>Dans le rapport :</b> {guide.rep}
          {guideOff && <><br /><b>État :</b> section désactivée, elle n&apos;apparaît pas dans le rapport.</>}
        </div>
      </VMindGuide>
      {guideClosed && (
        <button type="button" className="aw-guide-reopen" aria-label="Afficher le guide VMind" onClick={() => setGuideClosed(false)} />
      )}
    </div>
  );
};

export default WizardAchatsView;
