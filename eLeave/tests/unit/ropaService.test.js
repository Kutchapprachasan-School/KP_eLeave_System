import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePurposeConsentRequirement,
  isConsentApplicableForPurpose,
  getPublicRopaSummary,
} from '../../../src/lib/privacy/ropa-service.ts';

describe('ROPA Resolution Service', () => {
  test('evaluatePurposeConsentRequirement returns false when legal basis is PUBLIC_TASK or LEGAL_OBLIGATION', () => {
    const policies = [
      { legalBasis: 'LEGAL_OBLIGATION', section26Condition: null, dataCategory: 'GENERAL_IDENTITY' },
      { legalBasis: 'LEGAL_OBLIGATION', section26Condition: 'LABOR_AND_SOCIAL_SECURITY_LAW', dataCategory: 'SENSITIVE_HEALTH' },
    ];
    assert.equal(evaluatePurposeConsentRequirement(policies), false, 'Leave with legal obligation must not require consent');
  });

  test('evaluatePurposeConsentRequirement returns true when legal basis is CONSENT or EXPLICIT_CONSENT', () => {
    const policies = [
      { legalBasis: 'CONSENT', section26Condition: null, dataCategory: 'CONTACT_INFO' },
    ];
    assert.equal(evaluatePurposeConsentRequirement(policies), true, 'LINE notification relying on consent must return true');
  });

  test('evaluatePurposeConsentRequirement returns false for empty or missing policies', () => {
    assert.equal(evaluatePurposeConsentRequirement([]), false, 'Empty policies array must return false');
    assert.equal(evaluatePurposeConsentRequirement(null), false, 'Null policies must return false');
  });

  test('evaluatePurposeConsentRequirement enforces pure consent rule (rejects mixed-basis pollution)', () => {
    const mixedPolicies = [
      { legalBasis: 'CONSENT', section26Condition: null, dataCategory: 'CONTACT_INFO' },
      { legalBasis: 'PUBLIC_TASK', section26Condition: null, dataCategory: 'GENERAL_IDENTITY' },
    ];
    assert.equal(
      evaluatePurposeConsentRequirement(mixedPolicies),
      false,
      'Mixed non-consent bases must never require/allow consent authorization'
    );
  });

  test('evaluatePurposeConsentRequirement requires EXPLICIT_CONSENT for sensitive categories', () => {
    const sensitiveConsentValid = [
      { legalBasis: 'CONSENT', section26Condition: 'EXPLICIT_CONSENT', dataCategory: 'SENSITIVE_HEALTH' },
    ];
    assert.equal(
      evaluatePurposeConsentRequirement(sensitiveConsentValid),
      true,
      'Sensitive data with EXPLICIT_CONSENT must return true'
    );

    const sensitiveConsentInvalid = [
      { legalBasis: 'CONSENT', section26Condition: null, dataCategory: 'SENSITIVE_HEALTH' },
    ];
    assert.equal(
      evaluatePurposeConsentRequirement(sensitiveConsentInvalid),
      false,
      'Sensitive data without EXPLICIT_CONSENT must return false'
    );
  });

  test('exports required ROPA resolution service functions', () => {
    assert.equal(typeof evaluatePurposeConsentRequirement, 'function');
    assert.equal(typeof isConsentApplicableForPurpose, 'function');
    assert.equal(typeof getPublicRopaSummary, 'function');
  });
});
