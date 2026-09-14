import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateConsentApplicability,
  recordUserConsent,
  withdrawUserConsent,
  revokeConsentByAdmin,
  getUserConsents,
} from '../../../src/lib/privacy/consent-service.ts';

describe('Consent Lifecycle Engine', () => {
  test('validateConsentApplicability throws error when purpose does not use CONSENT legal basis', () => {
    const nonConsentPolicies = [
      { legalBasis: 'PUBLIC_TASK', section26Condition: null },
    ];
    assert.throws(
      () => validateConsentApplicability(nonConsentPolicies),
      /Consent is not an applicable legal basis/
    );

    const statutoryPolicies = [
      { legalBasis: 'LEGAL_OBLIGATION', section26Condition: null },
    ];
    assert.throws(
      () => validateConsentApplicability(statutoryPolicies),
      /Consent is not an applicable legal basis/
    );
  });

  test('validateConsentApplicability passes when purpose uses pure CONSENT', () => {
    const consentPolicies = [
      { legalBasis: 'CONSENT', section26Condition: null, dataCategory: 'CONTACT_INFO' },
    ];
    assert.doesNotThrow(() => validateConsentApplicability(consentPolicies));
    assert.equal(validateConsentApplicability(consentPolicies), true);
  });

  test('validateConsentApplicability throws error when policies are empty or missing', () => {
    assert.throws(
      () => validateConsentApplicability([]),
      /no configured data category policies|Consent is not an applicable legal basis/
    );
    assert.throws(
      () => validateConsentApplicability(null),
      /no configured data category policies|Consent is not an applicable legal basis/
    );
  });

  test('validateConsentApplicability enforces explicit consent for sensitive data categories', () => {
    const sensitiveValid = [
      { legalBasis: 'CONSENT', section26Condition: 'EXPLICIT_CONSENT', dataCategory: 'SENSITIVE_HEALTH' },
    ];
    assert.doesNotThrow(() => validateConsentApplicability(sensitiveValid));
    assert.equal(validateConsentApplicability(sensitiveValid), true);

    const sensitiveBiometricValid = [
      { legalBasis: 'CONSENT', section26Condition: 'EXPLICIT_CONSENT', dataCategory: 'SENSITIVE_BIOMETRIC' },
    ];
    assert.doesNotThrow(() => validateConsentApplicability(sensitiveBiometricValid));
    assert.equal(validateConsentApplicability(sensitiveBiometricValid), true);

    const sensitiveInvalid = [
      { legalBasis: 'CONSENT', section26Condition: null, dataCategory: 'SENSITIVE_HEALTH' },
    ];
    assert.throws(
      () => validateConsentApplicability(sensitiveInvalid),
      /Consent is not an applicable legal basis/
    );
  });

  test('validateConsentApplicability rejects non-sensitive data categories with section 26 condition', () => {
    const invalidGeneralCategory = [
      { legalBasis: 'CONSENT', section26Condition: 'EXPLICIT_CONSENT', dataCategory: 'GENERAL_IDENTITY' },
    ];
    assert.throws(
      () => validateConsentApplicability(invalidGeneralCategory),
      /Consent is not an applicable legal basis/
    );
  });

  test('validateConsentApplicability rejects mixed non-consent legal bases (scope violation)', () => {
    const mixedPolicies = [
      { legalBasis: 'CONSENT', section26Condition: null, dataCategory: 'CONTACT_INFO' },
      { legalBasis: 'PUBLIC_TASK', section26Condition: null, dataCategory: 'GENERAL_IDENTITY' },
    ];
    assert.throws(
      () => validateConsentApplicability(mixedPolicies),
      /Consent is not an applicable legal basis/
    );
  });

  test('exports all consent management functions defined in task interfaces', () => {
    assert.equal(typeof validateConsentApplicability, 'function');
    assert.equal(typeof recordUserConsent, 'function');
    assert.equal(typeof withdrawUserConsent, 'function');
    assert.equal(typeof revokeConsentByAdmin, 'function');
    assert.equal(typeof getUserConsents, 'function');
  });
});
