import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';

interface TableRendererProps {
  table: NonNullable<VmindMessage['table']>;
}

export const TableRenderer: React.FC<TableRendererProps> = ({ table }) => {
  if (!table || !table.rows || table.rows.length === 0) return null;

  const extractColumns = (rows: any[]): string[] => {
    const cols = new Set<string>();
    rows.forEach((row) => {
      if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach((k) => cols.add(k));
      }
    });
    return Array.from(cols);
  };

  const columns = table.columns?.length ? table.columns : extractColumns(table.rows);

  if (columns.length === 0) return null;

  const findValue = (row: any, col: string, idx: number) => {
    if (typeof row === 'object' && row !== null) {
      if (col in row) return row[col];
      const keys = Object.keys(row);
      if (idx < keys.length) return row[keys[idx]];
    }
    return '';
  };

  return (
    <div className="premium-table-container" style={{ margin: '16px 0', overflow: 'hidden', borderRadius: '12px', borderStyle: 'solid', borderWidth: '1px' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="premium-table-th" style={{ borderBottom: '1px solid var(--border)' }}>
              {columns.map((col, idx) => (
                <th key={idx} style={{ padding: '12px 16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {String(col || '').replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="premium-table-tr"
                style={{ borderBottom: '1px solid rgba(0,229,200,0.1)' }}
              >
                {columns.map((col, colIdx) => {
                  const value = findValue(row, col, colIdx);
                  const isNumber = !isNaN(Number(value)) && value !== '';
                  return (
                    <td 
                      key={colIdx} 
                      style={{ 
                        padding: '12px 16px', 
                        color: 'var(--white)',
                        textAlign: isNumber ? 'right' : 'left',
                        fontFamily: isNumber ? 'var(--font-mono)' : 'inherit'
                      }}
                    >
                      {String(value ?? '')}
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
