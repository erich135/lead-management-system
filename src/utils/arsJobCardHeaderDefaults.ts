import type { HeaderConfig } from '../components/jobCardTypes';

/**
 * Older shared letterhead still read by proposal documents.
 * Job-card reports do not use these street, postal, phone, or registration lines.
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
 * Company block for a printed job card. The street address is the Johannesburg
 * head office shown on the ARS website. Registration and VAT numbers are not
 * included here because that website address does not publish current values.
 */
export function jobCardLetterhead(): HeaderConfig {
  return {
    logoUrl: '/Logo.png',
    companyName: 'AIR ROTARY SERVICES (PTY) LTD',
    address: 'Johannesburg (Head Office)',
    city: 'Centric Park, Block C, 21 Romeo Street, Boksburg, Gauteng, 1459, South Africa',
  };
}

/**
 * Header used by every technician job-card report.
 * A saved office header cannot put the old postal address back onto the page.
 */
export function getJobCardReportHeader(): HeaderConfig {
  return jobCardLetterhead();
}
