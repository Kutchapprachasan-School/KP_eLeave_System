"use server";

import {
  recordExpenseAction as _recordExpenseAction,
  settleReservedExpenseAction as _settleReservedExpenseAction,
  voidExpenseAction as _voidExpenseAction,
  type RecordExpenseInput,
  type SettleReservedExpenseInput,
  type VoidExpenseInput,
} from "@/actions/planning/expense-actions";

export type {
  RecordExpenseInput,
  SettleReservedExpenseInput,
  VoidExpenseInput,
};

export async function recordExpenseAction(input: RecordExpenseInput) {
  return await _recordExpenseAction(input);
}

export async function settleReservedExpenseAction(input: SettleReservedExpenseInput) {
  return await _settleReservedExpenseAction(input);
}

export async function voidExpenseAction(input: VoidExpenseInput) {
  return await _voidExpenseAction(input);
}
