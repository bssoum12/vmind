# Guide d'Intégration VMIND x n8n (A à Z)

Cette documentation détaille l'architecture et l'implémentation technique de la connexion entre le frontend VMIND et les workflows n8n, en passant par un proxy backend sécurisé.

---

## 1. Architecture Globale

L'intégration repose sur trois piliers :
1.  **Frontend (Next.js)** : Interface utilisateur qui envoie les prompts et affiche les résultats (KPIs, Tableaux, Graphiques).
2.  **Backend Proxy (Express)** : Agit comme un pont pour éviter les erreurs de CORS et gérer les longs délais d'attente de l'IA (No Timeout).
3.  **n8n (Workflow Engine)** : Reçoit le prompt, exécute la logique métier (appels outils ERP, LLM), et renvoie une réponse standardisée.

---

## 2. Standardisation du Protocole (VmindStandardResponse)

Pour que le frontend sache comment afficher les données sans code spécifique à chaque outil, nous utilisons un format JSON universel.

**Fichier :** `Vmind_Front/shared/types/vmind.ts`

```typescript
export interface VmindN8nResponse {
  ok: boolean;          // Succès ou erreur
  tool_used: string;    // Nom de l'outil ERP utilisé
  response_type: string;// 'full', 'kpi', 'table', 'chart', 'error'
  title: string;       // Titre du résultat
  message: string;     // Message textuel pour l'utilisateur
  kpis: VmindKpi[];    // Liste d'indicateurs clés
  table: VmindTable;   // Données tabulaires
  chart: VmindChart;   // Configuration de graphique
  details: any;        // Données brutes supplémentaires
}
```

---

## 3. Étape 1 : Le Proxy Backend (Vmind_Backend)

Le backend expose un endpoint `/api/n8n-proxy` qui redirige les requêtes vers n8n.

### Configuration des Timeouts
Les processus IA peuvent être longs. Nous avons désactivé les timeouts par défaut de Node.js.

**Fichier :** `Vmind_Backend/src/server-http.ts`

```typescript
// Désactiver les timeouts du serveur
const server = app.listen(port, () => ...);
server.timeout = 0;
server.keepAliveTimeout = 0;

// Proxy vers n8n
app.post('/api/n8n-proxy', async (req, res) => {
    const n8nUrl = process.env.N8N_WEBHOOK_URL || "http://127.0.0.1:5678/webhook-test/vmind-chat";
    
    try {
        const response = await fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ ok: false, error: "PROXY_ERROR" });
    }
});
```

---

## 4. Étape 2 : Communication Frontend (Vmind_Front)

Le frontend utilise un client API dédié pour appeler le proxy.

**Fichier :** `Vmind_Front/shared/api/n8n-api.ts`

```typescript
export async function sendVmindMessage(message: string, clientId = "DEMO") {
  const proxyUrl = "http://localhost:3001/api/n8n-proxy";
  
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, client_id: clientId })
  });

  return await response.json();
}
```

---

## 5. Étape 3 : Interface de Chat & Gestion d'État

Le composant `VmindChat` gère l'historique des messages et l'état "En cours de réflexion" (Thinking).

**Fichier :** `Vmind_Front/components/vmind/VmindChat.tsx`

```typescript
const handleSend = async () => {
  // 1. Ajouter le message utilisateur + message "Thinking"
  setMessages(prev => [...prev, userMsg, thinkingMsg]);

  try {
    // 2. Appel API
    const response = await sendVmindMessage(text, clientId);
    
    // 3. Remplacer "Thinking" par la réponse réelle
    setMessages(prev => [
      ...prev.filter(m => !m.isThinking),
      { ...response, sender: 'vm' }
    ]);
  } catch (error) {
    // Gestion d'erreur...
  }
};
```

---

## 6. Étape 4 : Rendu Dynamique des Résultats

Le `StandardResponseRenderer` analyse la réponse de n8n et affiche automatiquement les composants appropriés (KPIs, Charts, Tables).

**Fichier :** `Vmind_Front/components/vmind/renderers/StandardResponseRenderer.tsx`

```tsx
export const StandardResponseRenderer = ({ message }) => {
  return (
    <div className="flex flex-col gap-2">
      {/* Texte */}
      {message.text && <div>{message.text}</div>}

      {/* Indicateurs (KPIs) */}
      {message.kpis?.length > 0 && <KpiRenderer kpis={message.kpis} />}

      {/* Graphique */}
      {message.chart?.data?.length > 0 && <ChartRenderer chart={message.chart} />}

      {/* Tableau */}
      {message.table?.rows?.length > 0 && <TableRenderer table={message.table} />}
    </div>
  );
};
```

---

## 7. Résumé des bénéfices
- **Plus de CORS** : Le proxy backend gère les entêtes.
- **Pas de Timeout** : L'utilisateur peut attendre 2 minutes une analyse complexe sans coupure.
- **Format Standard** : n8n peut changer ses outils, le frontend affichera toujours les données si elles respectent le format `ok/message/kpis/table/chart`.
