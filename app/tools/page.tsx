'use client';

import React from 'react';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';
import { 
  FileText, 
  Package, 
  Truck, 
  Users, 
  ShoppingCart, 
  BarChart3, 
  ArrowRight,
  Settings2
} from 'lucide-react';

const tools = [
  {
    id: 'invoice-detail',
    name: 'Factures Clients',
    description: 'Analyse détaillée des factures de vente TraLIS, lignes de facturation et taxes.',
    params: 'client_id, invoice_ref',
    icon: FileText,
    color: 'var(--cyan)'
  },
  {
    id: 'dossier-detail',
    name: 'Dossiers Transport',
    description: 'Exploration complète 360° d\'un dossier d\'exploitation (Transit/Logistique).',
    params: 'client_id, dossier_ref',
    icon: Package,
    color: 'var(--purple)'
  },
  {
    id: 'expedition-status',
    name: 'Suivi Expéditions',
    description: 'État d\'avancement en temps réel, dates réelles et informations marchandises.',
    params: 'client_id, expedition_ref',
    icon: Truck,
    color: 'var(--green)'
  },
  {
    id: 'customer-profile',
    name: 'Profil Tiers',
    description: 'Fiche signalétique, contacts, balance agée et encours client.',
    params: 'client_id, tiers_search',
    icon: Users,
    color: 'var(--amber)'
  },
  {
    id: 'purchase-invoice-detail',
    name: 'Coûts & Achats',
    description: 'Détail des factures fournisseurs liées et suivi des coûts opérationnels.',
    params: 'client_id, invoice_ref',
    icon: ShoppingCart,
    color: 'var(--red)'
  },
  {
    id: 'search-cotations',
    name: 'Recherche Cotations',
    description: 'Recherche multicritères des offres commerciales et performances.',
    params: 'client_id, status, commercial',
    icon: BarChart3,
    color: 'var(--cyan)'
  }
];

export default function ToolsHub() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
    try {
      const token = localStorage.getItem('vmind_session');
      if (!token) {
        setIsAuthenticated(false);
        window.location.href = '/login';
        return;
      }

      const decoded: any = jwtDecode(token);
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('vmind_session');
        setIsAuthenticated(false);
        window.location.href = '/login';
        return;
      }

      setIsAuthenticated(true);
    } catch (err) {
      console.error("Auth check failed in tools", err);
      localStorage.removeItem('vmind_session');
      setIsAuthenticated(false);
      window.location.href = '/login';
    }
  }, []);

  if (!isMounted || isAuthenticated === null || isAuthenticated === false) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: '#050B16',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999
      }}>
        <div className="spinner" style={{
          width: '40px', height: '40px',
          border: '2px solid rgba(0, 229, 200, 0.1)',
          borderTopColor: '#00E5C8',
          borderRadius: '50%',
          animation: 'spinRing 1s linear infinite'
        }} />
        <style jsx global>{`
          @keyframes spinRing {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="tools-container">
      <header className="tools-header">
        <div className="header-content">
          <div className="header-icon">
            <Settings2 size={20} />
          </div>
          <div>
            <h1>Toolbox TraLIS</h1>
            <p>Hub de test et exploration des outils backend IA</p>
          </div>
        </div>
      </header>

      <main className="tools-grid">
        {tools.map((tool) => (
          <Link key={tool.id} href={`/tools/${tool.id}`} className="tool-card">
            <div className="card-top">
              <div className="icon-box" style={{ color: tool.color, backgroundColor: `${tool.color}15` }}>
                <tool.icon size={22} />
              </div>
              <div className="card-badge">PRODUCTION</div>
            </div>
            
            <div className="card-content">
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
            </div>

            <div className="card-footer">
              <div className="params-info">
                <span className="params-label">Params:</span>
                <code>{tool.params}</code>
              </div>
              <div className="action-btn">
                <span>Tester</span>
                <ArrowRight size={14} />
              </div>
            </div>

            <div className="card-glow" style={{ background: `radial-gradient(circle at 50% 50%, ${tool.color}15, transparent 70%)` }} />
          </Link>
        ))}
      </main>

      <style jsx>{`
        .tools-container {
          padding: 40px;
          min-height: 100vh;
          background: var(--navy);
          overflow-y: auto;
        }

        .tools-header {
          margin-bottom: 40px;
          animation: slideDown 0.5s ease-out;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          width: 48px;
          height: 48px;
          background: var(--navy2);
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cyan);
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }

        h1 {
          font-family: var(--font-title);
          font-size: 24px;
          font-weight: 800;
          color: var(--white);
          letter-spacing: 1px;
          margin: 0;
        }

        p {
          font-size: 14px;
          color: var(--muted);
          margin-top: 4px;
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
          animation: fadeIn 0.6s ease-out;
        }

        .tool-card {
          position: relative;
          background: var(--navy2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .tool-card:hover {
          transform: translateY(-5px);
          border-color: var(--cyan);
          background: var(--navy3);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(0, 229, 200, 0.1);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          z-index: 1;
        }

        .icon-box {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
        }

        .card-badge {
          font-size: 9px;
          font-family: var(--font-mono);
          color: var(--cyan);
          border: 1px solid var(--border2);
          padding: 2px 8px;
          border-radius: 4px;
          background: var(--cyan4);
        }

        .card-content h3 {
          font-size: 18px;
          color: var(--white);
          margin-bottom: 8px;
          z-index: 1;
        }

        .card-content p {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.5;
          z-index: 1;
        }

        .card-footer {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1;
        }

        .params-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .params-label {
          font-size: 9px;
          text-transform: uppercase;
          color: var(--muted);
          letter-spacing: 1px;
        }

        code {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--cyan);
          opacity: 0.8;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--white);
          background: var(--navy4);
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          transition: all 0.2s;
        }

        .tool-card:hover .action-btn {
          background: var(--cyan);
          color: var(--navy);
          border-color: var(--cyan);
        }

        .card-glow {
          position: absolute;
          width: 200px;
          height: 200px;
          bottom: -100px;
          right: -100px;
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
          transition: transform 0.5s;
        }

        .tool-card:hover .card-glow {
          transform: scale(1.5);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
