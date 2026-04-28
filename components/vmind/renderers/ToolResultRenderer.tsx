import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { InvoiceDetailResult } from './InvoiceDetailResult';

interface ToolResultRendererProps {
  message: VmindMessage;
}

export const ToolResultRenderer: React.FC<ToolResultRendererProps> = ({ message }) => {
  const { tool, data, text } = message;

  // Si c'est un message sans tool (message texte simple de l'assistant)
  if (!tool) {
    return (
      <div 
        className="msg-text whitespace-pre-wrap"
        dangerouslySetInnerHTML={{
          __html: message.isThinking
            ? `<div class="thinking"><div class="thdot"></div><div class="thdot"></div><div class="thdot"></div></div>`
            : text
        }}
      />
    );
  }

  // Switch selon le tool
  switch (tool) {
    case 'get_invoice_detail':
      return <InvoiceDetailResult data={data} />;
      
    // Les autres outils ne sont pas encore implémentés visuellement
    case 'search_cotations':
    case 'get_dossier_detail':
    case 'get_expedition_status':
    case 'get_customer_profile':
    case 'get_purchase_invoice_detail':
      return (
        <div className="bg-[#151b2b] p-4 rounded border border-amber-500/50">
          <div className="text-amber-500 font-bold mb-2">Tool : {tool}</div>
          <div className="text-xs text-gray-300">
            Ce tool n'a pas encore de vue spécifique dans cette itération. 
            Voici les données brutes :
          </div>
          <pre className="text-[10px] text-gray-400 mt-2 overflow-x-auto p-2 bg-black/40 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
      
    default:
      return (
        <div className="text-red-400">
          Tool non reconnu : {tool}
        </div>
      );
  }
};
