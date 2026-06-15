import type { HeaderConfig } from '../components/jobCardTypes';
import { getGlobalHeaderConfig } from './jobCardConfig';

/**
 * Default ARS company header matching the paper job card forms.
 */
export const ARS_DEFAULT_HEADER: HeaderConfig = {
  companyName: 'AIR ROTARY SERVICES (PTY) LTD',
  registrationNumber: '2015/221198/07',
  vatNumber: '4470274590',
  address: 'PO Box 27674, Sunshine Coast, 4215',
  city: '16 Quality Street, Aeroport, Spartan, Kempton Park, 1619',
  phone: 'Tel: (011) 822 2218 · (011) 822 2331 · (011) 824 8844',
  email: 'Fax: (011) 822 6855',
};

/**
 * Returns merged header config (global settings with ARS defaults as fallback).
 */
export function getJobCardReportHeader(): HeaderConfig {
  const global = getGlobalHeaderConfig();
  return {
    ...ARS_DEFAULT_HEADER,
    ...global,
    companyName: global.companyName || ARS_DEFAULT_HEADER.companyName,
  };
}
