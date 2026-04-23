# La Bible Technique VMIND : Code Source et Consommation des Tools 🚀

Ce document contient l'intégralité du code source nécessaire pour comprendre, maintenir et modifier les 6 outils métier du projet.

---

## 🏗️ Structure d'un Tool (Le Standard)
Chaque outil suit ce cycle de vie :
- **FRONT (NLP)** : Extraction des paramètres depuis le texte utilisateur.
- **FRONT (API)** : Envoi de la requête structurée.
- **BACK (SQL)** : Exécution de la requête en base de données.
- **FRONT (UI)** : Génération du code HTML pour l'affichage.

---

## 📊 TOOL 6 : Pipeline Commercial (`searchCotations`)

### 1. Étape NLP (Frontend - `useChat.ts`)
```typescript
if (toolName === 'searchCotations') {
    const t = text.toLowerCase();
    let statut = undefined;
    if (t.includes('gagn')) statut = 'ClotureeGagnee';
    else if (t.includes('perdu')) statut = 'ClotureePerdue';
    else if (t.includes('annul')) statut = 'Annulee';
    else if (t.includes('valid')) statut = 'Validee';
    else if (t.includes('brouillon')) statut = 'Brouillon';
    else if (t.includes('envoy')) statut = 'Envoye';
    else if (t.includes('en cours') || t.includes('actif')) statut = undefined;

    let nature = undefined;
    if (t.includes('routier')) nature = 'Routier';
    else if (t.includes('maritime')) nature = 'Maritime';
    else if (t.includes('aérien') || t.includes('aerien')) nature = 'Aérien';

    const val = (extractedValue || '').toLowerCase();
    const isStatusOrNature = ['gagn', 'perdu', 'annul', 'valid', 'brouillon', 'envoy', 'en cours', 'actif', 'routier', 'maritime', 'aérien', 'aerien'].some(w => val.includes(w));
    
    const cleanCommercial = extractedValue ? extractedValue.replace(/['"]+/g, '').trim() : undefined;

    response = await tralisApi.searchCotations({
        client_id: clientId,
        statut,
        nature,
        commercial: (cleanCommercial && cleanCommercial.length > 3 && !isStatusOrNature) ? cleanCommercial : undefined
    });
}
```

### 2. Étape SQL (Backend - `src/cotation.ts`)
```sql
-- Recherche multi-mots flexible
DECLARE @has_commercial BIT = CASE WHEN @commercial IS NULL THEN 0 ELSE 1 END;

WITH filtered AS (
    SELECT * FROM dbo.vw_AI_Cotation_Pipeline
    WHERE
    (
        (@has_statut = 0 AND @has_commercial = 0 AND ISNULL(statut, '') IN ('Brouillon', 'Validee', 'Envoye'))
        OR
        (@has_statut = 1 AND statut = @statut)
        OR
        (@has_statut = 0 AND @has_commercial = 1) -- Tout l'historique si commercial seul
    )
    AND (@has_commercial = 0 OR (commercial_responsable LIKE '%Larson%' AND commercial_responsable LIKE '%Miller%'))
)
SELECT * FROM filtered
```

### 3. Étape Rendu HTML (Frontend - `useChat.ts`)
```typescript
const summary = d.pipeline_summary;
responseText = `
    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px">
        <div style="background:var(--navy3); border:1px solid var(--cyan)"> ${summary.nb_en_cours} <br> TOTAL </div>
        <div style="background:var(--navy3)"> ${summary.nb_import} <br> IMPORT </div>
        <div style="background:var(--navy3)"> ${summary.nb_export} <br> EXPORT </div>
    </div>
    <div style="border-left:3px solid var(--cyan)">
        POTENTIEL : ${summary.ca_potentiel_total.toLocaleString()} TND
    </div>
`;
```

---

## 📂 TOOL 2 : Détails Dossier (`getDossierDetail`)

### 1. Étape Appel API (Frontend - `tralis-api.ts`)
```typescript
export interface DossierPayload {
  client_id: string;
  dossier_ref: string;
  include_expeditions?: boolean;
  include_invoices?: boolean;
  include_costs?: boolean;
}
```

### 2. Étape SQL (Backend - `src/dossier.ts`)
```sql
SELECT 
    d.*, 
    m.ca_client, 
    m.cout_achat, 
    m.marge_brute
FROM dbo.vw_AI_Dossier_Detail d
LEFT JOIN dbo.vw_AI_Marge_Dossier m ON m.dossier_id = d.dossier_id
WHERE d.reference_dossier = @dossier_ref
```

### 3. Étape Rendu (Frontend - `useChat.ts`)
```typescript
const marge = d.marge;
responseText = `
    <div style="background:var(--navy4); padding:10px; border-radius:8px; border:1px solid var(--border)">
        <strong style="color:var(--cyan)">ANALYSE RENTABILITÉ :</strong><br>
        CA Client HT : <strong>${marge.ca_client || 0} TND</strong><br>
        Coûts Achats : <span style="color:var(--red)">-${marge.cout_achat || 0} TND</span><br>
        <strong>MARGE BRUTE : ${marge.marge_brute || 0} TND</strong>
    </div>
`;
```

---

## 👤 TOOL 4 : Profil Client (`getCustomerProfile`)

### 1. Étape NLP & Appel (Frontend - `useChat.ts`)
```typescript
response = await tralisApi.getCustomerProfile({
    client_id: clientId,
    tiers_search: extractedValue || 'NOM_CLIENT',
    include_balance: true,
});
```

### 2. Étape SQL (Backend - `src/customer.ts`)
```sql
-- Recherche du tiers
SELECT * FROM dbo.vw_AI_Tiers_Directory 
WHERE raison_sociale LIKE '%' + @tiers_search + '%' OR code_client = @tiers_search;

-- Recherche de sa balance
SELECT TOP 1 * FROM dbo.vw_AI_Balance_Client WHERE client = @raison_sociale;
```

### 3. Étape Rendu (Frontend - `useChat.ts`)
```typescript
const bal = c.balance;
const soldeColor = bal.solde_client > 0 ? 'var(--red)' : 'var(--green)';
responseText += `Solde Actuel : <strong style="color:${soldeColor}">${bal.solde_client.toLocaleString()} TND</strong><br>`;
responseText += `Limite Crédit : ${bal.limite_credit.toLocaleString()} TND<br>`;
```

---

## 🧾 TOOL 1 : Facture Vente (`getInvoiceDetail`)

### 1. Étape SQL (Backend - `src/invoice.ts`)
```sql
SELECT TOP 1 * FROM dbo.vw_AI_Invoice_Detail WHERE reference = @invoice_ref;
SELECT * FROM dbo.vw_AI_Invoice_Lines WHERE invoice_id = @id;
```

### 2. Étape Rendu (Frontend - `useChat.ts`)
```typescript
responseText = `
    Facture : <strong>${inv.reference}</strong><br>
    Total HT : ${inv.total_ht} ${inv.devise}<br>
    <strong>TOTAL TTC : ${inv.total_ttc} ${inv.devise}</strong><br>
    <a href="${inv.pdf_url}" target="_blank" style="color:var(--cyan)">📄 Visualiser la Facture PDF</a>
`;
```

---

## 💸 TOOL 5 : Factures Achat (`getPurchaseInvoiceDetail`)

### 1. Étape NLP (Frontend - `useChat.ts`)
```typescript
const purchaseMatch = text.match(/\b(?:FA|FAC|PU)-\d{4}-\d{5}\b/i);
if (purchaseMatch) {
    response = await tralisApi.getPurchaseInvoiceDetail({
        client_id: clientId,
        invoice_ref: purchaseMatch[0]
    });
}
```

### 2. Étape Rendu (Frontend - `useChat.ts`)
```typescript
const inv = d.purchase_invoice;
responseText += `<div style="background:var(--navy3); border:1px solid var(--border2)">`;
responseText += `Total HT : ${inv.total_ht} ${inv.devise}<br>`;
responseText += `<div style="color:var(--cyan)">TOTAL TTC : ${inv.total_ttc} ${inv.devise}</div>`;
responseText += `</div>`;
```

---

## 🚛 TOOL 3 : Suivi Expédition (`getExpeditionStatus`)

### 1. Étape SQL (Backend - `src/expedition.ts`)
```sql
SELECT TOP 1 * FROM dbo.vw_AI_Expedition_Status WHERE reference = @expedition_ref;
```

### 2. Étape Rendu (Frontend - `useChat.ts`)
```typescript
responseText += `<div style="background:var(--navy4); border:1px solid var(--border)">`;
responseText += `• Réception : ${exp.dates.reception}<br>`;
responseText += `• Enlèvement : <span style="color:var(--green)">${exp.dates.enlevement_reel}</span><br>`;
responseText += `• Livraison : <strong>${exp.dates.livraison}</strong><br>`;
responseText += `</div>`;
```

---

## 💡 Résumé pour les modifications futures

| Si vous voulez changer... | Fichier à modifier |
| :--- | :--- |
| **La requête SQL ou un calcul** | `Vmind_Backend/src/[outil].ts` |
| **Les couleurs, les icônes ou le texte** | `Vmind_Front/shared/hooks/useChat.ts` |
| **Ajouter un nouveau paramètre** | `shared/api/tralis-api.ts` (Interface) |

---
*Manuel Technique Intégral VMIND - Avril 2026*
