import { Orbitron, Syne, JetBrains_Mono } from 'next/font/google';

export const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-title',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['Consolas', 'Courier New', 'monospace'],
});
