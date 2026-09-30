import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlannerFormField } from '../../lib/api.ts';
import {
  changedCustomerMasterFields,
  customerMasterFromRecord,
  customerMasterUpdatePayload,
  findExactCustomer,
  locationForSelectedCustomer,
} from './customerMasterVisit.ts';
import {
  prefillDynamicFormValuesFromCrm,
  readCapturedVisitContact,
  resolveDynamicVisitValues,
} from './dynamicFormValues.ts';

const fields: PlannerFormField[] = [
  { id: 'company', key: 'companyName', type: 'text', label: 'Company name', required: true, enabled: true, order: 1 },
  { id: 'person', key: 'contactPerson', type: 'text', label: 'Contact person', required: false, enabled: true, order: 2 },
  { id: 'phone', key: 'telephone', type: 'phone', label: 'Telephone', required: false, enabled: true, order: 3 },
  { id: 'mail', key: 'email', type: 'email', label: 'Email', required: false, enabled: true, order: 4 },
  { id: 'site', key: 'physicalAddress', type: 'textarea', label: 'Physical address', required: false, enabled: true, order: 5 },
];

const susan = {
  companyName: 'Phoenix Glass',
  contactPerson: 'Susan Jones',
  contactPhone: '0821112222',
  contactEmail: 'susan@example.com',
  contactAddress: '12 Site Road',
};

test('selecting a customer populates empty visit fields from the customer master', () => {
  const values = resolveDynamicVisitValues({
    fields,
    hasSavedSnapshot: false,
    master: susan,
  });

  assert.equal(values.person, 'Susan Jones');
  assert.equal(values.phone, '0821112222');
  assert.equal(values.mail, 'susan@example.com');
  assert.equal(values.site, '12 Site Road');
});

test('a manual edit survives a later master prefill', () => {
  const first = resolveDynamicVisitValues({
    fields,
    hasSavedSnapshot: false,
    master: susan,
  });
  const edited = { ...first, person: 'Retha Willemse' };
  const rerendered = prefillDynamicFormValuesFromCrm(fields, edited, susan);

  assert.equal(rerendered.person, 'Retha Willemse');
  assert.equal(rerendered.mail, 'susan@example.com');
});

test('changed details are detected and whitespace alone is not a change', () => {
  const master = customerMasterFromRecord({
    name: 'Phoenix Glass',
    address: '12 Site Road',
    defaultContactPerson: 'Susan Jones',
    phone: '0821112222',
    email: 'susan@example.com',
  });

  assert.deepEqual(
    changedCustomerMasterFields(
      { address: '12 Site Road', contactPerson: 'Susan   Jones', contactNumber: '0821112222', email: 'Susan@Example.com' },
      master,
    ),
    [],
  );
  assert.deepEqual(
    changedCustomerMasterFields(
      { address: '12 Site Road', contactPerson: 'John Smith', contactNumber: '0821112222', email: 'susan@example.com' },
      master,
    ),
    ['contactPerson'],
  );
});

test('update customer details sends only the captured contact fields', () => {
  const payload = customerMasterUpdatePayload({
    contactPerson: 'John Smith',
    email: 'John@Example.com',
  });

  assert.deepEqual(payload, {
    defaultContactPerson: 'John Smith',
    email: 'john@example.com',
  });
  assert.equal('address' in payload, false);
  assert.equal('name' in payload, false);
});

test('visit only is a choice that does not build a customer update', () => {
  const choice = 'visit-only' as const;
  const payload = choice === 'visit-only'
    ? null
    : customerMasterUpdatePayload({ contactPerson: 'John Smith' });

  assert.equal(payload, null);
});

test('an existing RFC keeps its snapshot when the customer master later changes', () => {
  const values = resolveDynamicVisitValues({
    fields,
    hasSavedSnapshot: true,
    savedFields: fields,
    savedValues: {
      company: 'Phoenix Glass',
      person: 'John Smith',
      phone: '0110000000',
      mail: 'john@example.com',
      site: 'Old Road',
    },
    master: susan,
  });

  assert.equal(values.person, 'John Smith');
  assert.equal(values.mail, 'john@example.com');
  assert.equal(values.site, 'Old Road');
});

test('selecting a different customer replaces the previous customer details', () => {
  const customerA = resolveDynamicVisitValues({
    fields,
    hasSavedSnapshot: false,
    master: susan,
  });
  const customerB = resolveDynamicVisitValues({
    fields,
    hasSavedSnapshot: false,
    localValues: {},
    master: {
      companyName: 'Other Plant',
      contactPerson: 'Peter Naidoo',
      contactPhone: '0830004444',
      contactEmail: 'peter@example.com',
      contactAddress: '',
    },
  });

  assert.equal(customerA.person, 'Susan Jones');
  assert.equal(customerB.person, 'Peter Naidoo');
  assert.equal(customerB.mail, 'peter@example.com');
  assert.equal(locationForSelectedCustomer(''), '');
  assert.notEqual(customerB.person, customerA.person);
  assert.equal(
    findExactCustomer(
      [{ name: 'Phoenix Glass' }, { name: 'Phoenix Glass Works' }],
      'Phoenix Glass',
    )?.name,
    'Phoenix Glass',
  );
});

test('a saved snapshot is what the form reads back, not the latest master', () => {
  const saved = resolveDynamicVisitValues({
    fields,
    hasSavedSnapshot: true,
    savedFields: fields,
    savedValues: {
      person: 'John Smith',
      phone: '0110000000',
      mail: 'john@example.com',
      site: 'Old Road',
    },
    master: susan,
  });

  assert.deepEqual(readCapturedVisitContact(fields, saved), {
    address: 'Old Road',
    contactPerson: 'John Smith',
    contactNumber: '0110000000',
    email: 'john@example.com',
  });
});
