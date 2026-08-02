/**
 * Step 2: who the proposal is for and where the plant is.
 *
 * The customer and site are chosen from ARS rather than typed again. Choosing
 * a customer fills the customer identifier, the customer name and, where ARS
 * holds one, the address; choosing a site fills the site name. Those four
 * questions are therefore not shown as boxes — a user who has picked a customer
 * should not then be asked to type its name.
 *
 * Everything ARS does not hold is still a question. The site reference and the
 * GPS position are asked here, and the site conditions the engineering depends
 * on are asked on the following screens.
 */

import type {
  AuditIntakeDocument,
  IntakeAnswer,
} from '../../auditIntakeTypes';
import type { Machine } from '../../../../lib/api';
import { CustomerSitePicker } from '../components/CustomerSitePicker';
import type { ChosenCustomer, ChosenSite } from '../customerSiteSelection';
import { WizardAnswerField } from '../components/WizardAnswerField';
import type { WizardFieldView } from '../wizardState';
import type { WizardCustomerLink } from '../wizardTypes';

function answered(value: string): IntakeAnswer<unknown> {
  return { state: 'answered', value, note: null };
}

export interface CustomerSiteStepProps {
  customer: WizardCustomerLink;
  fields: WizardFieldView[];
  intake: AuditIntakeDocument;
  disabled: boolean;
  onAnswer: (path: string, answer: IntakeAnswer<unknown>) => void;
  onAnswerMany: (entries: readonly [string, IntakeAnswer<unknown>][]) => void;
  onLinkCustomer: (link: Partial<WizardCustomerLink>) => void;
  onMachinesLoaded: (machines: Machine[]) => void;
}

export function CustomerSiteStep({
  customer,
  fields,
  intake,
  disabled,
  onAnswer,
  onAnswerMany,
  onLinkCustomer,
  onMachinesLoaded,
}: CustomerSiteStepProps) {
  function chooseCustomer(chosen: ChosenCustomer) {
    onLinkCustomer({
      customerId: chosen.customerId,
      customerName: chosen.customerName,
    });
    const entries: [string, IntakeAnswer<unknown>][] = [
      ['identity.customerId', answered(chosen.customerId)],
      ['identity.customerName', answered(chosen.customerName)],
    ];
    if (chosen.address !== null && chosen.address.trim() !== '')
      entries.push(['identity.physicalAddress', answered(chosen.address.trim())]);
    onAnswerMany(entries);
  }

  function chooseSite(site: ChosenSite) {
    onLinkCustomer({ siteId: site.siteId, siteName: site.siteName });
    const entries: [string, IntakeAnswer<unknown>][] = [
      ['identity.siteName', answered(site.siteName)],
      /* ARS keeps no site register, so the record question is answered "not
         listed" rather than being left for a rep to invent an identifier in. */
      [
        'identity.siteId',
        site.siteId === null
          ? { state: 'not_listed_add_new', value: null, note: null }
          : answered(site.siteId),
      ],
    ];
    if (site.address !== null && site.address.trim() !== '')
      entries.push(['identity.physicalAddress', answered(site.address.trim())]);
    onAnswerMany(entries);
  }

  return (
    <div className="space-y-3">
      <CustomerSitePicker
        customerId={customer.customerId}
        customerName={customer.customerName}
        siteName={customer.siteName}
        disabled={disabled}
        onChooseCustomer={chooseCustomer}
        onChooseSite={chooseSite}
        onMachinesLoaded={onMachinesLoaded}
      />
      {fields.length === 0 ? null : (
        <div className="space-y-2">
          {fields.map(view => (
            <WizardAnswerField
              key={view.field.code}
              view={view}
              intake={intake}
              disabled={disabled}
              onAnswer={onAnswer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
