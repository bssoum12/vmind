'use client';

import React, { useEffect, useState } from 'react';
import { resetReminders } from '@/shared/api/n8n-api';

const ITEMS_PER_PAGE = 5;

export const GlobalMaxRemindersPopup: React.FC = () => {
  const [invoices, setInvoices] = useState<{ref: string, client: string, escalated?: boolean, amount?: number}[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Accordion & Pagination state
  const [expandedClients, setExpandedClients] = useState<string[]>([]);
  const [clientPages, setClientPages] = useState<Record<string, number>>({});
  
  type SortOrder = 'alphabet' | 'total' | 'count';
  const [sortOrder, setSortOrder] = useState<SortOrder>('total');
  const [isSortOpen, setIsSortOpen] = useState(false);
  type SortDirection = 'asc' | 'desc';
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const token = localStorage.getItem("vmind_session") || "";
    const sse = new EventSource(`http://localhost:3001/api/recovery/sse?token=${token}`);

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === 'INIT' || payload.type === 'MAX_REMINDERS_REACHED') {
          const reachedInvoices = payload.data || [];
          if (reachedInvoices.length > 0) {
            setInvoices(reachedInvoices);
            setSelectedInvoices(reachedInvoices.map((i: any) => i.ref || i));
            setIsOpen(true);
            setResetSuccess(false);
            setExpandedClients([]); // collapse all initially
            setClientPages({});
          }
        } else if (payload.type === 'MAX_REMINDERS_CLEARED') {
          setIsOpen(false);
          setInvoices([]);
          setSelectedInvoices([]);
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    return () => {
      sse.close();
    };
  }, []);

  const handleReset = async () => {
    if (selectedInvoices.length === 0) return;
    setIsResetting(true);
    try {
      await resetReminders(selectedInvoices);
      setResetSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    } catch (err: any) {
      alert(`Erreur lors de la réinitialisation: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  // Group invoices by client
  const groupedInvoices = invoices.reduce((acc, item) => {
    const ref = typeof item === 'string' ? item : item.ref;
    const client = typeof item === 'string' ? 'Client Inconnu' : (item.client || 'Client Inconnu');
    const escalated = typeof item === 'string' ? false : !!item.escalated;
    const amount = typeof item === 'string' ? 0 : (item.amount || 0);
    
    if (!acc[client]) acc[client] = [];
    acc[client].push({ ref, escalated, amount });
    return acc;
  }, {} as Record<string, {ref: string, escalated: boolean, amount: number}[]>);

  const allRefs = invoices.map(i => typeof i === 'string' ? i : i.ref);
  const escalatedRefs = invoices.filter(i => typeof i !== 'string' && i.escalated).map(i => (i as any).ref);
  const notEscalatedRefs = invoices.filter(i => typeof i === 'string' || !i.escalated).map(i => typeof i === 'string' ? i : i.ref);

  const selectAll = () => setSelectedInvoices(allRefs);
  const selectEscalated = () => setSelectedInvoices(escalatedRefs);
  const selectNotEscalated = () => setSelectedInvoices(notEscalatedRefs);

  const isAllActive = selectedInvoices.length > 0 && selectedInvoices.length === allRefs.length;
  const isEscalatedActive = escalatedRefs.length > 0 && selectedInvoices.length === escalatedRefs.length && escalatedRefs.every(r => selectedInvoices.includes(r));
  const isNotEscalatedActive = notEscalatedRefs.length > 0 && selectedInvoices.length === notEscalatedRefs.length && notEscalatedRefs.every(r => selectedInvoices.includes(r));

  // Utility to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(val);
  };

  const sortedClientEntries = Object.entries(groupedInvoices).sort((a, b) => {
    const [clientA, invoicesA] = a;
    const [clientB, invoicesB] = b;
    
    let result = 0;
    if (sortOrder === 'alphabet') {
      result = clientA.localeCompare(clientB);
    } else if (sortOrder === 'total') {
      const totalA = invoicesA.reduce((sum, inv) => sum + inv.amount, 0);
      const totalB = invoicesB.reduce((sum, inv) => sum + inv.amount, 0);
      result = totalA - totalB;
    } else if (sortOrder === 'count') {
      result = invoicesA.length - invoicesB.length;
    }
    
    return sortDirection === 'asc' ? result : -result;
  });

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <div className="popup-glow"></div>

        <div className="popup-header">
          <div className="popup-title">
            <span className="popup-icon-alert">⚠️</span>
            Limite de Relances Atteinte ({invoices.length})
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="popup-close"
            title="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="popup-body">
          Les factures suivantes ont atteint le nombre maximum de relances autorisées et ont été ignorées par le système IA.
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--muted)' }}>Sélection rapide :</span>
              <button className={`popup-quick-select ${isAllActive ? 'active' : ''}`} onClick={selectAll}>Tout</button>
              <button className={`popup-quick-select ${isEscalatedActive ? 'active' : ''}`} onClick={selectEscalated}>🔥 Escaladées</button>
              <button className={`popup-quick-select ${isNotEscalatedActive ? 'active' : ''}`} onClick={selectNotEscalated}>⏳ Non Escaladées</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <span style={{ color: 'var(--muted)' }}>Trier par :</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div 
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  style={{
                    background: 'var(--navy2)',
                    border: `1px solid ${isSortOpen ? 'var(--cyan)' : 'var(--border)'}`,
                    color: 'var(--white)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: '120px',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s'
                  }}
                >
                  {sortOrder === 'total' ? '💰 Montant Total' : sortOrder === 'count' ? '📄 Nb Factures' : '🔤 Alphabétique'}
                  <span style={{ fontSize: '8px', opacity: 0.6 }}>▼</span>
                </div>
                
                <button
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  style={{
                    background: 'var(--navy2)',
                    border: '1px solid var(--border)',
                    color: 'var(--cyan)',
                    borderRadius: '4px',
                    width: '26px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title={sortDirection === 'desc' ? "Décroissant" : "Croissant"}
                >
                  {sortDirection === 'desc' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M19 12l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  )}
                </button>
              </div>

              {isSortOpen && (
                <>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} 
                    onClick={() => setIsSortOpen(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    background: 'var(--navy3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    zIndex: 100,
                    minWidth: '130px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}>
                    {[
                      { val: 'total', label: '💰 Montant Total' },
                      { val: 'count', label: '📄 Nb Factures' },
                      { val: 'alphabet', label: '🔤 Alphabétique' }
                    ].map(opt => (
                      <div 
                        key={opt.val}
                        onClick={() => {
                          setSortOrder(opt.val as SortOrder);
                          setIsSortOpen(false);
                        }}
                        style={{
                          padding: '6px 8px',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          borderRadius: '4px',
                          background: sortOrder === opt.val ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                          color: sortOrder === opt.val ? 'var(--cyan)' : 'var(--white)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (sortOrder !== opt.val) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          if (sortOrder !== opt.val) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="popup-invoice-list">
          {sortedClientEntries.map(([client, invoiceObjects]) => {
            const allSelected = invoiceObjects.every(obj => selectedInvoices.includes(obj.ref));
            const someSelected = invoiceObjects.some(obj => selectedInvoices.includes(obj.ref));
            const isExpanded = expandedClients.includes(client);
            
            // Calculate total amount for this client based only on selected invoices
            const totalAmount = invoiceObjects
              .filter(obj => selectedInvoices.includes(obj.ref))
              .reduce((sum, obj) => sum + obj.amount, 0);
            
            const handleToggleClient = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (allSelected) {
                const refsToRemove = invoiceObjects.map(obj => obj.ref);
                setSelectedInvoices(prev => prev.filter(i => !refsToRemove.includes(i)));
              } else {
                const refsToAdd = invoiceObjects.map(obj => obj.ref);
                setSelectedInvoices(prev => {
                  const newSet = new Set([...prev, ...refsToAdd]);
                  return Array.from(newSet);
                });
              }
            };

            const toggleAccordion = () => {
              setExpandedClients(prev => prev.includes(client) ? prev.filter(c => c !== client) : [...prev, client]);
            };

            // Pagination
            const rawPage = clientPages[client] || 1;
            const totalPages = Math.max(1, Math.ceil(invoiceObjects.length / ITEMS_PER_PAGE));
            const currentPage = Math.min(rawPage, totalPages);
            const paginatedInvoices = invoiceObjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

            const handlePageChange = (e: React.MouseEvent, newPage: number) => {
              e.stopPropagation();
              setClientPages(prev => ({ ...prev, [client]: newPage }));
            };

            return (
              <div key={client} className={`popup-client-group ${isExpanded ? 'expanded' : ''}`}>
                <div 
                  className={`popup-client-header ${someSelected ? 'selected' : 'unselected'}`} 
                  onClick={toggleAccordion}
                >
                  <div className="client-header-left">
                    <span 
                      className="client-checkbox" 
                      onClick={handleToggleClient}
                      title={allSelected ? "Désélectionner tout" : "Sélectionner tout"}
                    >
                      {allSelected ? '☑' : someSelected ? '⊟' : '☐'}
                    </span> 
                    <span className="client-name">{client}</span>
                  </div>
                  <div className="client-header-right">
                    <span className="client-count badge">{invoiceObjects.length} facture(s)</span>
                    <span className="client-total">{formatCurrency(totalAmount)}</span>
                    <span className="accordion-icon">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="popup-client-content">
                    <div className="popup-table-container">
                      <table className="popup-invoice-table">
                        <thead>
                          <tr>
                            <th>Référence</th>
                            <th style={{textAlign: 'right'}}>Montant</th>
                            <th style={{textAlign: 'center'}}>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedInvoices.map((obj, idx) => {
                            const isSelected = selectedInvoices.includes(obj.ref);
                            return (
                              <tr 
                                key={idx} 
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedInvoices(prev => prev.filter(i => i !== obj.ref));
                                  } else {
                                    setSelectedInvoices(prev => [...prev, obj.ref]);
                                  }
                                }}
                                className={`invoice-row ${isSelected ? 'selected' : 'unselected'}`}
                              >
                                <td className="row-ref">
                                  <span className="row-checkbox">{isSelected ? '☑' : '☐'}</span>
                                  {obj.ref}
                                </td>
                                <td className="row-amount" style={{textAlign: 'right'}}>
                                  {obj.amount > 0 ? formatCurrency(obj.amount) : '-'}
                                </td>
                                <td className="row-status" style={{textAlign: 'center'}}>
                                  {obj.escalated ? (
                                    <span title="Escaladée">🔥 Escaladée</span>
                                  ) : (
                                    <span title="En attente d'escalade" style={{color: 'var(--muted)'}}>⏳ En attente</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <div className="popup-pagination">
                        <button 
                          disabled={currentPage === 1} 
                          onClick={(e) => handlePageChange(e, currentPage - 1)}
                          className="pagination-btn"
                        >
                          Précédent
                        </button>
                        <span className="pagination-info">Page {currentPage} sur {totalPages}</span>
                        <button 
                          disabled={currentPage === totalPages} 
                          onClick={(e) => handlePageChange(e, currentPage + 1)}
                          className="pagination-btn"
                        >
                          Suivant
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          );
        })}
        </div>
        
        <div className="popup-actions">
          <button
            onClick={() => setIsOpen(false)}
            className="popup-btn-ignore"
          >
            Ignorer
          </button>
          
          <button
            onClick={handleReset}
            disabled={isResetting || resetSuccess || selectedInvoices.length === 0}
            className={`popup-btn-reset ${resetSuccess ? 'success' : ''}`}
          >
            {resetSuccess ? (
              <><span>✅</span> Réinitialisé</>
            ) : isResetting ? (
              <><span>⏳</span> En cours...</>
            ) : (
              <><span>🔄</span> Relancer la machine (Reset)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
