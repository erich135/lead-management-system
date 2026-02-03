/**
 * Global job card header and footer configuration.
 * Stored in localStorage and shared across all templates.
 */

import type { HeaderConfig, FooterConfig } from '../components/JobCardFormBuilder';

const HEADER_CONFIG_KEY = 'jobCardHeaderConfig';
const FOOTER_CONFIG_KEY = 'jobCardFooterConfig';

/**
 * Gets the global header configuration.
 */
export function getGlobalHeaderConfig(): HeaderConfig {
  try {
    const stored = localStorage.getItem(HEADER_CONFIG_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Saves the global header configuration.
 */
export function saveGlobalHeaderConfig(config: HeaderConfig): void {
  try {
    localStorage.setItem(HEADER_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save header config:', error);
  }
}

/**
 * Gets the global footer configuration.
 */
export function getGlobalFooterConfig(): FooterConfig {
  try {
    const stored = localStorage.getItem(FOOTER_CONFIG_KEY);
    return stored ? JSON.parse(stored) : {
      technicianSignatureLabel: 'Technician Signature',
      customerSignatureLabel: 'Customer Signature',
      dateLabel: 'Date',
      notesLabel: 'Notes',
    };
  } catch {
    return {
      technicianSignatureLabel: 'Technician Signature',
      customerSignatureLabel: 'Customer Signature',
      dateLabel: 'Date',
      notesLabel: 'Notes',
    };
  }
}

/**
 * Saves the global footer configuration.
 */
export function saveGlobalFooterConfig(config: FooterConfig): void {
  try {
    localStorage.setItem(FOOTER_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save footer config:', error);
  }
}
