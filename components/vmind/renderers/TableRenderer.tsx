import React from 'react';
import { VmindTable } from '@/shared/types/vmind';

interface TableRendererProps {
  table: VmindTable;
}

export const TableRenderer: React.FC<TableRendererProps> = ({ table }) => {
  if (!table || !table.rows || table.rows.length === 0) return null;

  const columns = table.columns || (table.rows.length > 0 ? Object.keys(table.rows[0]) : []);

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-[#1c2538] bg-[#0d121f]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#151b2b] border-b border-[#1c2538]">
              {columns.map((col, idx) => (
                <th key={idx} className="p-3 font-bold text-cyan-500 uppercase tracking-wider">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
                className="border-b border-[#1c2538]/50 hover:bg-cyan-900/10 transition-colors"
              >
                {columns.map((col, colIdx) => {
                  const value = row[col];
                  return (
                    <td key={colIdx} className="p-3 text-gray-300">
                      {Array.isArray(value) 
                        ? value.join(', ')
                        : typeof value === 'object' && value !== null 
                          ? JSON.stringify(value) 
                          : String(value ?? '-')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.rows.length >= 50 && (
        <div className="p-2 text-[10px] text-center text-gray-500 bg-black/20 italic">
          Affichage limité aux 50 premiers résultats.
        </div>
      )}
    </div>
  );
};
