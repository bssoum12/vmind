# Documentation Technique : Synchronisation Agentique Vmind

Cette documentation détaille l'implémentation de la synchronisation globale des agents et de la réactivité visuelle mise en place sur le Dashboard TraLIS.

## 1. Objectif Architecturel
Passer d'une gestion d'état fragmentée à une **Source Unique de Vérité (Single Source of Truth)**. L'intégralité du flux de données et de l'état visuel est pilotée par un hook unique partagé.

## 2. Structure des Fichiers

### 📄 `shared/constants/data.ts`
Définit les identités des agents et le mapping automatique entre les outils API et les agents responsables.
```typescript
export const TOOL_AGENT_MAPPING: Record<string, AgentId> = {
  getCustomerProfile: 'VDATA',
  getInvoiceDetail: 'VDATA',
  getDossierDetail: 'VDATA',
  getExpeditionStatus: 'VDATA',
  searchCotations: 'VDATA',
  getPurchaseInvoiceDetail: 'VDATA',
};
```

### 📄 `shared/hooks/useChat.ts`
Le moteur de l'application. Il gère :
1. **La détection de l'intention** : Analyse du texte pour identifier le tool et le tenant.
2. **Le Handoff** : Transition visuelle et textuelle entre agents (ex: VMIND vers VDATA).
3. **La consommation logique** : Appel aux APIs `tralisApi` et formatage des données en HTML riche (tableaux, couleurs conditionnelles).
4. **La persistance visuelle** : Maintient l'état `activeAgentId` pour l'agent concerné.

### 📄 `app/page.tsx` (Chef d'orchestre)
Centralise le hook et distribue les propriétés aux composants.
```tsx
const { messages, logs, addMessage, activeAgentId } = useChat();

// Distribution
<Sidebar activeAgentId={activeAgentId} />
<ChatPanel messages={messages} addMessage={addMessage} />
<RightPanel logs={logs} activeAgentId={activeAgentId} />
```

### 📄 `features/chat/ChatPanel.tsx`
Refactorisé pour être un composant de présentation pur (stateless). Il ne gère plus son propre état de chat mais reçoit tout via les props de `Home`.

## 3. Réactivité Visuelle (globals.css)

### État Actif de l'Agent (Right Panel)
L'indicateur passe en vert éclatant avec une pulsation vitale.
```css
.agent-state.on {
  color: var(--green);
  text-shadow: 0 0 8px var(--green);
  animation: premiumStatusPulse 2s infinite ease-in-out;
}
```

### État Actif dans la Sidebar
L'agent sélectionné affiche un cadre néon cyan et un gradient de fond dynamique.
```css
.nav-item.agent-card-active {
  background: linear-gradient(90deg, rgba(0, 229, 200, 0.12), transparent) !important;
  border-left: 2px solid var(--cyan) !important;
  animation: agentCardPulse 4s infinite ease-in-out;
}
```

## 4. Logique Métier Restaurée
La consommation des outils inclut désormais :
- **Tableaux HTML** : Pour le détail des lignes de factures.
- **Analyse de Marge** : Calcul et affichage automatique pour les dossiers transport.
- **Dispositif de Handoff** : Message d'attente système pendant le changement d'agent.
- **Log Automatique** : Mise à jour du journal d'activité à chaque exécution de tool.

## 5. Comment Tester
1. Envoyer : `profil client tunisie telecom sur demo` -> **VDATA s'allume instantanément.**
2. Envoyer : `détail facture FC-2024...` -> **Affichage du tableau riche.**
3. Vérifier le **Right Panel** -> L'état doit être `● ACTIF` et clignoter.
