'use client';

/**
 * Agent « Directeur des Achats et Supply Chain Amont » (templateId: 'achats_supply').
 *
 * Partie front de l'agent. Le module backend (run_mode 'achats_supply') et le workflow n8n restent à brancher :
 * en attendant, les deux boutons de déploiement n'appellent aucune API ; ils confirment la configuration
 * puis reviennent à la Marketplace. L'aperçu du rapport utilise des chiffres d'exemple, clairement signalés.
 *
 * Données prévues (vues TraLIS existantes, lecture seule) :
 *   vw_AI_Commande_Achat (retards, réception), vw_AI_Facture_Achat (dépenses, catégories, devises,
 *   factures contestées / non parvenues / non comptabilisées, débours), vw_AI_Balance_Fournisseur (dettes).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/shared/contexts/ToastContext';
import { VMindGuide } from '@/shared/management/components/VMindGuide';
import { getBrowserTimezone } from '@/shared/utils/timezone';
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
    { k: 'ontime', t: 'Livraisons à l\'heure', d: 'Part des commandes reçues avant ou à la date prévue, sur la période', on: true,
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
    { k: 'notbooked', t: 'Factures non comptabilisées', d: 'Factures de la période pas encore passées en comptabilité', on: false,
      rep: 'Le nombre et le montant des factures de la période non comptabilisées.', ex: '9 factures pour 57 800 TND.' },
    { k: 'disb', t: 'Débours de la période', d: 'Frais payés pour le compte des clients, par dossier, à vérifier avant facturation client', on: false,
      rep: 'Le nombre de débours, leur montant et les dossiers concernés, avec un rappel de vérification.', ex: '23 débours pour 46 900 TND sur 14 dossiers.' },
  ] },
];
const ALLSEC: SectionDef[] = SECTIONS.flatMap(g => g.items);

interface GuideEntry { t: string; how: string; rep: string; blk?: string; na?: string }
const FIELD_GUIDE: Record<string, GuideEntry> = {
  name: { t: 'Nom de l\'agent', how: 'Gardez le nom proposé ou précisez le site. Exemple : « Directeur des Achats - Radès ».', rep: 'Dans l\'en-tête de l\'email et sous le titre du rapport.', blk: 'meta' },
  period: { t: 'Période analysée', how: 'Choisissez dans la liste. « Mois précédent » donne des chiffres clos ; les autres choix suivent l\'activité jusqu\'à la veille de l\'envoi.', rep: 'Dans l\'objet de l\'email, sous le titre et dans la section « Dépenses de la période ».', blk: 'spend' },
  compare: { t: 'Comparaison des dépenses', how: 'Cliquez sur un choix. Les mois indiqués sous chaque choix sont ceux qui seront réellement comparés.', rep: 'Lignes « Période précédente » et « Même période l\'an dernier » de la section « Dépenses de la période », et la tuile des dépenses.', blk: 'spend' },
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

/* Chiffres d'exemple (fictifs) pour l'aperçu */
const D = {
  late: [['Transporteur routier B', 3, 12, 18400], ['Fournisseur emballages E', 2, 6, 7200], ['Agent portuaire F', 1, 4, 3100], ['Transitaire G', 1, 3, 2600], ['Manutention portuaire C', 1, 2, 1900], ['Fournisseur fournitures H', 1, 1, 600]] as [string, number, number, number][],
  ontime: { rate: 84, received: 44, onTime: 37, worst: [['Transporteur routier B', 58], ['Fournisseur emballages E', 71]] as [string, number][] },
  pending: { count: 17, amount: 96200 },
  spend: { cur: 962000, prev: 838000, year: 891000 },
  trend: [812000, 790000, 845000, 861000, 838000, 962000],
  top: [['Compagnie maritime A', 318000, 256000], ['Transporteur routier B', 142000, 139000], ['Manutention portuaire C', 97000, 88000], ['Transitaire G', 64000, 71000], ['Agent portuaire F', 51000, 49000], ['Fournisseur emballages E', 38000, 36500], ['Assurance transport I', 27000, 27000], ['Fournisseur fournitures H', 12000, 14000], ['Prestataire informatique J', 9800, 9800], ['Location matériel K', 8400, 7900]] as [string, number, number][],
  cat: [['Fret maritime', 402000], ['Transport routier', 188000], ['Manutention', 121000], ['Frais portuaires', 96000], ['Autres', 155000]] as [string, number][],
  fx: [['euros', 68400], ['dollars', 41200]] as [string, number][],
  debt: { billed: 1240000, paid: 998200, rest: 241800, late: 62300, alerts: [['Manutention portuaire C', 12400], ['Transitaire G', 8100]] as [string, number][] },
  disputed: [['Transporteur routier B', 2, 8900], ['Compagnie maritime A', 1, 14200]] as [string, number, number][],
  missing: [['Agent portuaire F', 1, 3400], ['Location matériel K', 1, 2100]] as [string, number, number][],
  notbooked: { count: 9, amount: 57800 },
  disb: { count: 23, amount: 46900, dossiers: 14 },
};

/* ───────────────────────── Utilitaires ───────────────────────── */

const nf = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ');
const pct = (a: number, b: number) => (a - b) / b * 100;
const fmtPct = (v: number) => (v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + ' %';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

function monthsAgo(n: number) { const t = new Date(); const d = new Date(t.getFullYear(), t.getMonth() - n, 1); return { m: d.getMonth(), y: d.getFullYear() }; }
const lbl = (p: { m: number; y: number }) => MOIS[p.m] + ' ' + p.y;

type Period = 'prev_month' | 'cur_month' | 'cur_quarter' | 'cur_year';
function periodInfo(v: Period) {
  const t = new Date(), y = t.getFullYear(), q = Math.floor(t.getMonth() / 3) + 1;
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

export const WizardAchatsView: React.FC<WizardAchatsViewProps> = ({ onCancel, initialStep }) => {
  const { showToast } = useToast();

  const [step, setStep] = useState<number>(Math.min(4, Math.max(1, initialStep || 1)));
  const [showPreview, setShowPreview] = useState(true);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  const [name, setName] = useState('Directeur des Achats - Siège');
  const [period, setPeriod] = useState<Period>('prev_month');
  const [compare, setCompare] = useState<'both' | 'prev' | 'lastyear'>('both');
  const [secOn, setSecOn] = useState<Record<string, boolean>>(() => Object.fromEntries(ALLSEC.map(i => [i.k, i.na ? false : i.on])));

  const [nums, setNums] = useState<Record<NumKey, string>>({ delay: '3', ontime: '90', thprev: '15', thyear: '20', conc: '30', thlate: '', topn: '5', objspend: '', objlate: '', objontime: '' });
  const [erpAlert, setErpAlert] = useState(true);

  const [rcp, setRcp] = useState<{ to: string[]; cc: string[] }>({ to: [], cc: [] });
  const [rcpIn, setRcpIn] = useState<{ to: string; cc: string }>({ to: '', cc: '' });
  const [rcpErr, setRcpErr] = useState<{ to: string; cc: string }>({ to: '', cc: '' });
  const [rules, setRules] = useState<Rule[]>([newRule()]);
  const [send, setSend] = useState<'always' | 'alerts'>('always');

  const [tone, setTone] = useState<'factual' | 'direct'>('factual');
  const [length, setLength] = useState<'short' | 'standard' | 'long'>('standard');
  const [instr, setInstr] = useState('');

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
  const cmpLabel = { both: period === 'cur_year' ? p.year : `${p.prev} et ${p.year}`, prev: p.prev, lastyear: p.year }[compare];
  useEffect(() => { if (period === 'cur_year' && compare === 'prev') setCompare('lastyear'); }, [period, compare]);

  /* Calculs du rapport d'exemple */
  const topn = Math.min(20, Math.max(1, val('topn') || 5));
  const delay = val('delay') || 1;
  const thP = val('thprev') ?? Infinity, thY = val('thyear') ?? Infinity, conc = val('conc'), ot = val('ontime') ?? 0, thLate = val('thlate');
  const lateRows = D.late.filter(r => r[2] >= delay);
  const vp = pct(D.spend.cur, D.spend.prev), vy = pct(D.spend.cur, D.spend.year);
  const showPrev = compare !== 'lastyear', showYear = compare !== 'prev';
  const topShare = D.top[0][1] / D.spend.cur * 100;

  const alerts = (() => {
    const a: { lv: 'red' | 'amber'; t: string }[] = [];
    if (secOn.late && lateRows.length) a.push({ lv: 'red', t: `${lateRows.reduce((s, r) => s + r[1], 0)} commandes en retard d'au moins ${delay} jours, chez ${lateRows.length} fournisseur${lateRows.length > 1 ? 's' : ''}` });
    if (secOn.ontime && val('ontime') !== null && D.ontime.rate < ot) a.push({ lv: 'amber', t: `Livraisons à l'heure : ${D.ontime.rate} %, sous le taux attendu de ${ot} %` });
    if (secOn.spend) {
      if (showPrev && vp >= thP) a.push({ lv: 'amber', t: `Dépenses ${fmtPct(vp)} par rapport à la période précédente (seuil ${thP} %)` });
      if (showYear && vy >= thY) a.push({ lv: 'amber', t: `Dépenses ${fmtPct(vy)} par rapport à l'an dernier (seuil ${thY} %)` });
    }
    if (secOn.topsup) {
      const up = D.top.filter(r => pct(r[1], r[2]) >= thP);
      if (up.length) a.push({ lv: 'amber', t: `${up[0][0]} : dépenses ${fmtPct(pct(up[0][1], up[0][2]))} sur la période` });
      if (conc !== null && topShare >= conc) a.push({ lv: 'amber', t: `${D.top[0][0]} pèse ${Math.round(topShare)} % des dépenses (seuil ${conc} %)` });
    }
    if (secOn.debt) {
      if (erpAlert) a.push({ lv: 'red', t: `${D.debt.alerts.length} fournisseurs en alerte de paiement dans TraLIS` });
      if (thLate !== null) { const n = D.debt.alerts.filter(r => r[1] >= thLate).length; if (n) a.push({ lv: 'red', t: `${n} fournisseur${n > 1 ? 's' : ''} avec au moins ${nf(thLate)} TND en retard de paiement` }); }
    }
    if (secOn.disputed) a.push({ lv: 'amber', t: `${D.disputed.reduce((s, r) => s + r[1], 0)} factures contestées en attente de règlement du litige` });
    return a;
  })();

  const actions = (() => {
    const x: [string, string][] = [];
    if (secOn.late && lateRows[0]) { const r = lateRows[0]; x.push(['Relancer ' + r[0], `${r[1]} commande${r[1] > 1 ? 's' : ''} en retard, jusqu'à ${r[2]} jours. Demander une date de livraison ferme.`]); }
    if (secOn.debt && erpAlert) x.push(['Régler en priorité ' + D.debt.alerts[0][0], `${nf(D.debt.alerts[0][1])} TND en retard, fournisseur en alerte de paiement.`]);
    if (secOn.topsup || secOn.spend) x.push([`Analyser la hausse chez ${D.top[0][0]}`, `${fmtPct(pct(D.top[0][1], D.top[0][2]))} sur la période : vérifier s'il s'agit de volume ou d'un nouveau tarif.`]);
    if (secOn.disputed) x.push([`Clore les litiges avec ${D.disputed[1][0]}`, `${nf(D.disputed[1][2])} TND contestés bloquent le paiement.`]);
    if (secOn.topsup && conc !== null && topShare >= conc) x.push(['Consulter un deuxième fournisseur maritime', `${D.top[0][0]} représente ${Math.round(topShare)} % des dépenses.`]);
    return x.slice(0, { short: 2, standard: 3, long: 5 }[length]);
  })();

  const activeSections = ALLSEC.filter(i => secOn[i.k]);
  const subject = `[VMIND] Rapport Achats — ${p.name}` + (alerts.length ? ` · ${alerts.length} alerte${alerts.length > 1 ? 's' : ''}` : '');
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
    if (s === 1) { const ok = name.trim() !== ''; setNameErr(ok ? '' : 'Donnez un nom à l\'agent.'); return ok; }
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
        showToast(k === 3 ? 'Ajoutez au moins un destinataire principal et une règle d\'envoi.' : 'Corrigez les champs signalés en rouge.', 'warning');
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

  /* Déploiement : module serveur pas encore branché, aucun appel API */
  const deploy = (mode: 'run_now' | 'deploy_only') => {
    if (!stepValid(3)) { go(3); return; }
    setDeploying(mode);
    const config = {
      agent_name: name.trim(), run_mode: 'achats_supply', action: mode, workflow_timezone: timezone,
      achats_config: { period, compare, sections: activeSections.map(s => s.k), thresholds: nums, erp_payment_alert: erpAlert, recipients: rcp, send, tone, length, instructions: instr },
      trigger_rules: rules,
    };
    // Le module backend de l'agent Achats n'est pas encore branché : configuration journalisée uniquement
    console.info('[Agent Achats] Configuration à enregistrer dans agents.parameters :', config);
    setTimeout(() => {
      setDeploying(null);
      showToast(mode === 'run_now'
        ? `Agent « ${name.trim()} » configuré. Le premier rapport sera envoyé à ${rcp.to.join(', ')} dès que le module d'exécution de l'agent Achats sera branché.`
        : `Agent « ${name.trim()} » configuré. Envoi prévu ${rules.map(ruleText).join(' ; ')}, dès que le module d'exécution de l'agent Achats sera branché.`, 'success', 6000);
      onCancel();
    }, 900);
  };

  /* Récapitulatif */
  const recapRows: [string, React.ReactNode, number, string][] = (() => {
    const th = [`retard de livraison dès ${val('delay') ?? '—'} jours`, `livraisons à l'heure au moins ${val('ontime') ?? '—'} %`, `hausse au-delà de ${val('thprev') ?? '—'} % par rapport à la période précédente et ${val('thyear') ?? '—'} % par rapport à l'an dernier`];
    if (conc !== null) th.push(`un fournisseur au-delà de ${conc} % des dépenses`);
    if (erpAlert) th.push('alerte de paiement de TraLIS');
    if (thLate !== null) th.push(`retard de paiement dès ${nf(thLate)} TND`);
    const obj: string[] = [];
    if (val('objspend') !== null) obj.push(`dépenses au plus ${nf(val('objspend') as number)} TND`);
    if (val('objlate') !== null) obj.push(`dettes en retard au plus ${nf(val('objlate') as number)} TND`);
    if (val('objontime') !== null) obj.push(`livraisons à l'heure au moins ${val('objontime')} %`);
    return [
      ['Agent', name, 1, 'aw-name'],
      ['Période', `${p.name}, comparée à ${cmpLabel}`, 1, 'aw-period'],
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
            <h1 className="aw-htitle">Configuration : Directeur des Achats et Supply Chain Amont</h1>
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
              <input id="aw-name" className={`aw-inp${nameErr ? ' bad' : ''}`} value={name} {...f('name')} onChange={e => { setName(e.target.value); setNameErr(''); }} />
              {nameErr && <div className="aw-ferr">{nameErr}</div>}
            </div>
            <div className="aw-card">
              <h2 className="aw-ct">Période et comparaison</h2>
              <p className="aw-cs">Concerne les dépenses et les livraisons à l&apos;heure. Les retards, les dettes et les factures à traiter sont toujours la situation du jour de l&apos;envoi.</p>
              <label className="aw-lbl" htmlFor="aw-period">Période analysée</label>
              <select id="aw-period" className="aw-inp" value={period} {...f('period')} onChange={e => { setPeriod(e.target.value as Period); openGuide('period'); }}>
                <option value="prev_month">Mois précédent</option>
                <option value="cur_month">Mois en cours, jusqu&apos;à la veille</option>
                <option value="cur_quarter">Trimestre en cours, jusqu&apos;à la veille</option>
                <option value="cur_year">Année en cours, jusqu&apos;à la veille</option>
              </select>
              <div className="aw-help">Prochain rapport : {p.name}.</div>
              <span className="aw-lbl">Comparer les dépenses avec</span>
              {Seg({ value: compare, onChange: setCompare, gk: 'compare', options: [
                { v: 'both', b: 'Les deux', s: period === 'cur_year' ? p.year : `${p.prev} et ${p.year}` },
                { v: 'prev', b: 'La période précédente', s: p.prev, hidden: period === 'cur_year' },
                { v: 'lastyear', b: 'La même période l\'an dernier', s: p.year },
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
                {NumField({ k: 'ontime', label: 'Taux de livraison à l\'heure attendu', unit: '%' })}
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
              <div className="aw-grid2">{NumField({ k: 'objontime', label: 'Livraisons à l\'heure au moins', unit: '%', placeholder: 'Exemple : 95' })}</div>
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
                  {deploying === 'deploy_only' ? 'Déploiement…' : 'Déployer'}
                </button>
                <button type="button" className="aw-bdep main" disabled={!!deploying} onFocus={() => openGuide('runnow')} onMouseEnter={() => openGuide('runnow')} onClick={() => deploy('run_now')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  <span>{deploying === 'run_now' ? 'Déploiement…' : 'Déployer et exécuter maintenant'}</span>
                </button>
              </>)}
            </div>
          </div>
        </div>

        {/* APERÇU DU RAPPORT */}
        {showPreview && (
          <aside className="aw-preview" aria-label="Aperçu du rapport envoyé">
            <div className="aw-pt">APERÇU DU RAPPORT ENVOYÉ</div>
            <div className="aw-ps">En direct · {activeSections.length} sections · {rcp.to.length + rcp.cc.length} destinataire{rcp.to.length + rcp.cc.length > 1 ? 's' : ''} · {alerts.length} alerte{alerts.length > 1 ? 's' : ''}</div>
            <div className="aw-dev">
              <button type="button" className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}>Ordinateur</button>
              <button type="button" className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}>Mobile</button>
            </div>
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
                      <div className="row1"><small>VMIND</small><span className="ex">Données d&apos;exemple</span></div>
                      <h4>Rapport Achats et Supply Chain</h4>
                      <p>{cap(p.name)} · {name}</p>
                    </div>
                    <div className="aw-msheet">
                      {/* Tuiles */}
                      <div className="aw-tiles" data-blk="tiles">
                        {secOn.late && <div className="aw-tile red"><small>Commandes en retard</small><b>{lateRows.reduce((s, r) => s + r[1], 0)}</b><span>{lateRows.length} fournisseurs</span></div>}
                        {secOn.ontime && <div className={`aw-tile ${D.ontime.rate < ot ? 'amber' : 'green'}`}><small>Livrées à l&apos;heure</small><b>{D.ontime.rate} %</b><span>taux attendu {ot || '—'} %</span></div>}
                        {secOn.spend && <div className={`aw-tile${vp >= thP ? ' amber' : ''}`}><small>Dépenses hors taxes</small><b>{nf(D.spend.cur)}<em>TND</em></b><span>{showPrev ? <><span className={vp > 0 ? 'bad' : 'good'}>{fmtPct(vp)}</span> par rapport à la période précédente</> : <><span className={vy > 0 ? 'bad' : 'good'}>{fmtPct(vy)}</span> par rapport à l&apos;an dernier</>}</span></div>}
                        {secOn.debt && <div className="aw-tile red"><small>Retard de paiement</small><b>{nf(D.debt.late)}<em>TND</em></b><span>sur {nf(D.debt.rest)} TND restant à payer</span></div>}
                        {(secOn.disputed || secOn.missing) && <div className="aw-tile amber"><small>Factures à traiter</small><b>{(secOn.disputed ? 3 : 0) + (secOn.missing ? 2 : 0)}</b><span>contestées ou non parvenues</span></div>}
                        {secOn.pending && <div className="aw-tile"><small>En attente de réception</small><b>{D.pending.count}</b><span>{nf(D.pending.amount)} TND commandés</span></div>}
                      </div>

                      {Blk("synth", <>
                        <h5>Synthèse</h5>
                        <div className="aw-syn">
                          {tone === 'direct' && actions[0] && <p><b>À décider.</b> {actions[0][0]}.</p>}
                          <p><b>Constat.</b> {(() => {
                            const c: string[] = [];
                            if (secOn.spend) c.push(`les dépenses atteignent ${nf(D.spend.cur)} TND hors taxes, soit ${showPrev ? fmtPct(vp) + ' par rapport à la période précédente' : fmtPct(vy) + ' par rapport à l\'an dernier'}`);
                            if (secOn.late) c.push(`${lateRows.reduce((s, r) => s + r[1], 0)} commandes sont en retard de livraison`);
                            if (secOn.debt) c.push(`${nf(D.debt.late)} TND de dettes fournisseurs sont en retard de paiement`);
                            return c.length ? cap(c.join(' ; ')) + '.' : 'Aucune section active.';
                          })()}</p>
                          {length !== 'short' && <p><b>Causes probables.</b> Hausse concentrée sur le fret maritime et retards répétés d&apos;un transporteur routier.</p>}
                          {length === 'long' && <p><b>Points de vigilance.</b> Dépendance au premier fournisseur maritime et factures contestées qui retardent les paiements.</p>}
                        </div>
                      </>)}

                      {Blk("alerts", <>
                        <h5>Alertes ({alerts.length})</h5>
                        {alerts.length ? <ul className="aw-al">{alerts.map(a => <li key={a.t}><span className={`d ${a.lv}`} /><span>{a.t}</span></li>)}</ul> : <p className="aw-note">Aucune alerte : tout est sous vos seuils.</p>}
                      </>)}

                      {actions.length > 0 && Blk("actions", <>
                        <h5>Actions recommandées</h5>
                        <ol className="aw-act">{actions.map(a => <li key={a[0]}><b>{a[0]}</b><span>{a[1]}</span></li>)}</ol>
                      </>)}

                      {Blk("objectives", <>
                        <h5>Objectifs</h5>
                        {(val('objspend') !== null || val('objlate') !== null || val('objontime') !== null) ? (
                          <table className="aw-mt"><tbody>
                            {val('objspend') !== null && <tr><td>Dépenses au plus {nf(val('objspend') as number)} TND</td><td className={`r${D.spend.cur > (val('objspend') as number) ? ' bad' : ''}`}>{D.spend.cur > (val('objspend') as number) ? 'non atteint' : 'atteint'}</td></tr>}
                            {val('objlate') !== null && <tr><td>Dettes en retard au plus {nf(val('objlate') as number)} TND</td><td className={`r${D.debt.late > (val('objlate') as number) ? ' bad' : ''}`}>{D.debt.late > (val('objlate') as number) ? 'non atteint' : 'atteint'}</td></tr>}
                            {val('objontime') !== null && <tr><td>Livraisons à l&apos;heure au moins {val('objontime')} %</td><td className={`r${D.ontime.rate < (val('objontime') as number) ? ' bad' : ''}`}>{D.ontime.rate < (val('objontime') as number) ? 'non atteint' : 'atteint'}</td></tr>}
                          </tbody></table>
                        ) : <p className="aw-note">Aucun objectif renseigné à l&apos;étape 2.</p>}
                      </>)}

                      {secOn.late && Blk("late", <>
                        <h5>Commandes en retard de livraison</h5>
                        {lateRows.length ? <table className="aw-mt"><tbody>
                          <tr><th>Fournisseur</th><th className="r">Commandes</th><th className="r">Retard maximum</th><th className="r">Montant</th></tr>
                          {lateRows.slice(0, topn).map(r => <tr key={r[0]}><td>{r[0]}</td><td className="r">{r[1]}</td><td className="r bad">{r[2]} jours</td><td className="r">{nf(r[3])} TND</td></tr>)}
                        </tbody></table> : <p className="aw-note">Aucune commande au-delà du seuil.</p>}
                        <p className="aw-note">Commandes non reçues dont la date de livraison prévue est dépassée d&apos;au moins {val('delay') || '—'} jours.</p>
                      </>)}

                      {secOn.ontime && Blk("ontime", <>
                        <h5>Livraisons à l&apos;heure</h5>
                        <table className="aw-mt"><tbody>
                          <tr><td>Commandes reçues sur la période</td><td className="r">{D.ontime.received}</td></tr>
                          <tr><td>Reçues à temps</td><td className="r">{D.ontime.onTime} · {D.ontime.rate} %</td></tr>
                          {D.ontime.worst.map(r => <tr key={r[0]}><td>{r[0]}</td><td className="r bad">{r[1]} % à l&apos;heure</td></tr>)}
                        </tbody></table>
                      </>)}

                      {secOn.pending && Blk("pending", <>
                        <h5>Commandes en attente de réception</h5>
                        <table className="aw-mt"><tbody>
                          <tr><td>Commandes passées, pas encore reçues</td><td className="r">{D.pending.count}</td></tr>
                          <tr><td>Montant commandé</td><td className="r">{nf(D.pending.amount)} TND</td></tr>
                        </tbody></table>
                      </>)}

                      {secOn.spend && Blk("spend", <>
                        <h5>Dépenses de la période</h5>
                        <table className="aw-mt"><tbody>
                          <tr><td>{cap(p.name)}</td><td className="r">{nf(D.spend.cur)} TND</td></tr>
                          {showPrev && <tr><td>Période précédente : {p.prev}</td><td className="r">{nf(D.spend.prev)} TND · <span className={vp > 0 ? 'bad' : ''}>{fmtPct(vp)}</span></td></tr>}
                          {showYear && <tr><td>Même période l&apos;an dernier : {p.year}</td><td className="r">{nf(D.spend.year)} TND · <span className={vy > 0 ? 'bad' : ''}>{fmtPct(vy)}</span></td></tr>}
                        </tbody></table>
                        <p className="aw-note">Factures d&apos;achat hors taxes, avoirs déduits. Une hausse peut venir du volume autant que des prix.</p>
                      </>)}

                      {secOn.trend && Blk("trend", <>
                        <h5>Tendance des dépenses sur 6 mois</h5>
                        <div className="aw-bars">{D.trend.map((v, i) => <div key={i} className={i === 5 ? 'last' : ''} style={{ height: `${Math.round(v / Math.max(...D.trend) * 100)}%` }} title={`${nf(v)} TND`} />)}</div>
                        <div className="aw-bl">{[5, 4, 3, 2, 1, 0].map(n => <span key={n}>{MOIS[monthsAgo(n + 1).m]}</span>)}</div>
                      </>)}

                      {secOn.topsup && Blk("topsup", <>
                        <h5>Principaux fournisseurs</h5>
                        <table className="aw-mt"><tbody>
                          <tr><th>Fournisseur</th><th className="r">Dépenses</th><th className="r">Part</th><th className="r">Évolution</th></tr>
                          {D.top.slice(0, topn).map(r => { const e = pct(r[1], r[2]); return <tr key={r[0]}><td>{r[0]}</td><td className="r">{nf(r[1])}</td><td className="r">{Math.round(r[1] / D.spend.cur * 100)} %</td><td className={`r${e >= thP ? ' bad' : ''}`}>{fmtPct(e)}</td></tr>; })}
                        </tbody></table>
                      </>)}

                      {secOn.cat && Blk("cat", <>
                        <h5>Dépenses par catégorie</h5>
                        <table className="aw-mt"><tbody>{D.cat.map(r => <tr key={r[0]}><td>{r[0]}</td><td className="r">{nf(r[1])} TND</td><td className="r">{Math.round(r[1] / D.spend.cur * 100)} %</td></tr>)}</tbody></table>
                      </>)}

                      {secOn.fx && Blk("fx", <>
                        <h5>Achats en devises</h5>
                        <table className="aw-mt"><tbody>{D.fx.map(r => <tr key={r[0]}><td>En {r[0]}</td><td className="r">{nf(r[1])} {r[0]}</td></tr>)}</tbody></table>
                        <p className="aw-note">Montants dans la devise d&apos;origine de la facture.</p>
                      </>)}

                      {secOn.debt && Blk("debt", <>
                        <h5>Dettes fournisseurs</h5>
                        <table className="aw-mt"><tbody>
                          <tr><td>Facturé</td><td className="r">{nf(D.debt.billed)} TND</td></tr>
                          <tr><td>Payé</td><td className="r">{nf(D.debt.paid)} TND</td></tr>
                          <tr><td>Reste à payer</td><td className="r">{nf(D.debt.rest)} TND</td></tr>
                          <tr><td>Dont en retard de paiement</td><td className="r bad">{nf(D.debt.late)} TND</td></tr>
                        </tbody></table>
                        {erpAlert && <p className="aw-note">En alerte de paiement dans TraLIS : {D.debt.alerts.map(r => `${r[0]} (${nf(r[1])} TND)`).join(', ')}.</p>}
                      </>)}

                      {secOn.disputed && Blk("disputed", <>
                        <h5>Factures contestées</h5>
                        <table className="aw-mt"><tbody>{D.disputed.map(r => <tr key={r[0]}><td>{r[0]}</td><td className="r">{r[1]} facture{r[1] > 1 ? 's' : ''}</td><td className="r">{nf(r[2])} TND</td></tr>)}</tbody></table>
                      </>)}

                      {secOn.missing && Blk("missing", <>
                        <h5>Factures non parvenues</h5>
                        <table className="aw-mt"><tbody>{D.missing.map(r => <tr key={r[0]}><td>{r[0]}</td><td className="r">{r[1]} facture</td><td className="r">{nf(r[2])} TND</td></tr>)}</tbody></table>
                      </>)}

                      {secOn.notbooked && Blk("notbooked", <>
                        <h5>Factures non comptabilisées</h5>
                        <table className="aw-mt"><tbody><tr><td>Factures de la période</td><td className="r">{D.notbooked.count}</td><td className="r">{nf(D.notbooked.amount)} TND</td></tr></tbody></table>
                      </>)}

                      {secOn.disb && Blk("disb", <>
                        <h5>Débours de la période</h5>
                        <table className="aw-mt"><tbody>
                          <tr><td>Débours payés</td><td className="r">{D.disb.count}</td><td className="r">{nf(D.disb.amount)} TND</td></tr>
                          <tr><td>Dossiers concernés</td><td className="r" colSpan={2}>{D.disb.dossiers}</td></tr>
                        </tbody></table>
                        <p className="aw-note">À vérifier avant facturation client : le rapprochement automatique avec les factures de vente n&apos;est pas encore disponible.</p>
                      </>)}

                      <div className="aw-mfoot">Généré par VMIND à partir des commandes, factures d&apos;achat et soldes fournisseurs de TraLIS, en lecture seule. Chiffres de cet aperçu fictifs.</div>
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
