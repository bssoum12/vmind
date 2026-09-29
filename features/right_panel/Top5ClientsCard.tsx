"use client";

import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, ShieldCheck, Clock, Sparkles } from 'lucide-react';

function getAuthToken() {
  if (typeof window === 'undefined') return '';
  const mcpToken = localStorage.getItem('vmind_mcp_token');
  if (mcpToken) return mcpToken;
  try {
    const sessionStr = localStorage.getItem('vmind_session');
    if (!sessionStr) return '';
    if (sessionStr.startsWith('eyJ')) return sessionStr;
    const parsed = JSON.parse(sessionStr);
    return parsed?.token || parsed?.access_token || parsed?.user?.token || '';
  } catch(e) { return ''; }
}

interface ClientRankItem {
  rank: number;
  client: string;
  caTotal: number;
  caTotalFormatted: string;
  nbDossiers: number;
  prevCaTotal?: number;
  variationPct?: number;
  statutFidelite?: 'Fidèle' | 'Récents' | 'Occasionnel';
}

interface Top5ClientsCardProps {
  activeAgentId?: string;
}

export const Top5ClientsCard: React.FC<Top5ClientsCardProps> = ({ activeAgentId = 'VSELL' }) => {
  const [clients, setClients] = useState<ClientRankItem[]>([]);
  const [period, setPeriod] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  const fetchTopClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'DEMO';
      const token = getAuthToken();

      const response = await fetch(`${baseUrl}/api/tools/get-top-clients-revenue`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ client_id: clientId })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const resData = await response.json();
      if (resData.ok && Array.isArray(resData.data)) {
        setClients(resData.data);
        if (resData.period) setPeriod(resData.period);
      } else {
        throw new Error(resData.error?.message || "Format de données invalide");
      }
    } catch (err: any) {
      console.error("[Top5ClientsCard] Erreur de récupération:", err);
      setError(err.message || "Impossible de charger le Top 5 Clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeAgentId === 'VSELL') {
      fetchTopClients();
    }
  }, [activeAgentId]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 text-xs border border-amber-200/50 flex-shrink-0">
            🥇
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-slate-400/20 text-xs border border-slate-100/50 flex-shrink-0">
            🥈
          </div>
        );
      case 3:
        return (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center text-amber-100 font-black shadow-lg shadow-amber-700/20 text-xs border border-amber-500/50 flex-shrink-0">
            🥉
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 font-bold text-xs flex-shrink-0">
            #{rank}
          </div>
        );
    }
  };

  const getLoyaltyBadge = (status?: 'Fidèle' | 'Récents' | 'Occasionnel') => {
    switch (status) {
      case 'Fidèle':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
            <ShieldCheck className="w-2.5 h-2.5" />
            Fidèle
          </span>
        );
      case 'Récents':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
            <Sparkles className="w-2.5 h-2.5" />
            Récent
          </span>
        );
      case 'Occasionnel':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
            <Clock className="w-2.5 h-2.5" />
            Occasionnel
          </span>
        );
    }
  };

  // Strictly return null if active agent is not VSELL (placed after all hooks)
  if (activeAgentId !== 'VSELL') {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-900/80 border border-amber-500/30 backdrop-blur-xl p-4 shadow-xl my-4 transition-all duration-300 hover:border-amber-500/50">
      {/* Background Ambient Glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 tracking-wide flex items-center gap-1.5">
              Top 5 Clients <span className="text-[10px] font-normal text-slate-400">(CA & Fidélité)</span>
            </h3>
            {period && (
              <p className="text-[10px] text-slate-400 font-medium">{period}</p>
            )}
          </div>
        </div>
        <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-400 font-mono font-bold">
          VSELL
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 animate-pulse border border-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-700/50" />
                <div className="space-y-1">
                  <div className="w-24 h-3 rounded bg-slate-700/50" />
                  <div className="w-14 h-2 rounded bg-slate-700/40" />
                </div>
              </div>
              <div className="w-16 h-3 rounded bg-slate-700/50" />
            </div>
          ))}
        </div>
      )}

      {/* Error View */}
      {error && !loading && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center text-rose-400 text-xs flex flex-col gap-2">
          <span>{error}</span>
          <button
            onClick={fetchTopClients}
            className="text-[10px] text-amber-400 underline hover:text-amber-300 font-mono"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Content List */}
      {!loading && !error && (
        <div className="space-y-2">
          {clients.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-800/20 rounded-lg border border-slate-800/40">
              Aucune donnée de vente enregistrée sur cette période.
            </div>
          ) : (
            clients.map((item) => (
              <div
                key={item.rank}
                className="group relative flex items-center justify-between p-2.5 rounded-lg bg-slate-800/30 border border-slate-800/60 hover:bg-slate-800/60 hover:border-amber-500/40 transition-all duration-200"
              >
                {/* Left side: Rank + Client Name + Loyalty Badge */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {getRankBadge(item.rank)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 transition-colors truncate max-w-[130px]">
                        {item.client}
                      </span>
                      {getLoyaltyBadge(item.statutFidelite)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{item.nbDossiers} dossier{item.nbDossiers > 1 ? 's' : ''}</span>
                      {item.variationPct !== undefined && item.variationPct !== 0 && (
                        <span className={`inline-flex items-center font-medium ${item.variationPct > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {item.variationPct > 0 ? (
                            <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                          ) : (
                            <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                          )}
                          {item.variationPct > 0 ? '+' : ''}{item.variationPct}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: CA Turnover Amount */}
                <div className="text-right pl-2 flex-shrink-0">
                  <div className="text-xs font-bold text-slate-100 font-mono tracking-tight">
                    {item.caTotalFormatted}
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium">TND</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
