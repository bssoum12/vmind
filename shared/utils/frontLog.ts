/**
 * Utilitaire de journalisation console riche et stylisé pour le Frontend VMIND
 * Affiche des messages lisibles et colorés dans la console du navigateur (F12).
 */

export const frontLog = {
  info: (category: string, message: string, data?: any) => {
    const time = new Date().toTimeString().split(' ')[0];
    console.log(
      `%c[VMIND-FRONT]%c [${time}]%c [${category}]%c ${message}`,
      'background: #2563eb; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 3px;',
      'color: #94a3b8; font-weight: normal;',
      'color: #38bdf8; font-weight: bold;',
      'color: #f1f5f9;',
      data !== undefined ? data : ''
    );
  },

  success: (category: string, message: string, data?: any) => {
    const time = new Date().toTimeString().split(' ')[0];
    console.log(
      `%c[VMIND-FRONT]%c [${time}]%c [${category}]%c ✔ ${message}`,
      'background: #16a34a; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 3px;',
      'color: #94a3b8; font-weight: normal;',
      'color: #4ade80; font-weight: bold;',
      'color: #f1f5f9;',
      data !== undefined ? data : ''
    );
  },

  warn: (category: string, message: string, data?: any) => {
    const time = new Date().toTimeString().split(' ')[0];
    console.warn(
      `%c[VMIND-FRONT]%c [${time}]%c [${category}]%c ⚠ ${message}`,
      'background: #d97706; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 3px;',
      'color: #94a3b8; font-weight: normal;',
      'color: #fbbf24; font-weight: bold;',
      'color: #fef08a;',
      data !== undefined ? data : ''
    );
  },

  error: (category: string, message: string, error?: any) => {
    const time = new Date().toTimeString().split(' ')[0];
    console.error(
      `%c[VMIND-FRONT]%c [${time}]%c [${category}]%c ✖ ${message}`,
      'background: #dc2626; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 3px;',
      'color: #94a3b8; font-weight: normal;',
      'color: #f87171; font-weight: bold;',
      'color: #fecaca; font-weight: bold;',
      error !== undefined ? error : ''
    );
  }
};
