import { describe, it, expect } from 'vitest';
import { createFixedJobCardFieldResolver } from './fixedJobCardFieldResolver';
describe('Office report presentation overlays', () => {
  it('uses explicit header corrections without changing answers, hours or signatures', () => {
    const answers = [{ fieldId: 'model', type: 'text', value: 'original' }, { fieldId: 'hours', type: 'number', value: 0 }, { fieldId: 'sig', type: 'signature', value: '', signatureData: 'data:image/png;base64,original' }];
    const before = JSON.stringify(answers);
    const resolver = createFixedJobCardFieldResolver(answers, undefined, undefined, undefined, { model: 'corrected' });
    expect(resolver.resolve({ id: 'model', type: 'text' })).toBe('corrected');
    expect(resolver.resolve({ id: 'hours', type: 'number' })).toBe('0');
    expect(resolver.resolveSignatureImage('sig')).toBe('data:image/png;base64,original');
    expect(JSON.stringify(answers)).toBe(before);
  });
  it('honours deliberate clearing instead of falling back to a saved value', () => {
    const resolver = createFixedJobCardFieldResolver([{ fieldId: 'serial', type: 'machineField', value: 'old' }], undefined, { serialNumber: 'live' }, undefined, { serial: '' });
    expect(resolver.resolve({ id: 'serial', type: 'machineField', machineFieldKey: 'serialNumber' })).toBe('');
  });
});
