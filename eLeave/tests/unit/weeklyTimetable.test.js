import test from 'node:test';
import assert from 'node:assert/strict';

// Mock DOM environment for Node testing
class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.className = '';
    this._innerHTML = '';
    this.children = [];
    this.listeners = {};
    this.dataset = {};
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = String(val);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  click() {
    const callbacks = this.listeners['click'] || [];
    callbacks.forEach((cb) => cb({ type: 'click' }));
  }

  querySelectorAll(selector) {
    const results = [];
    const search = (node) => {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        if (node.className && node.className.split(/\s+/).includes(cls)) {
          results.push(node);
        }
      }
      for (const child of node.children) {
        search(child);
      }
    };
    search(this);
    return results;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tagName) => new MockElement(tagName)
  };
}

import { WeeklyTimetable } from '../../src/components/WeeklyTimetable.js';

test('WeeklyTimetable - Renders matrix grid structure (5 days x 8 periods)', (t) => {
  const container = new MockElement('div');
  const timetable = new WeeklyTimetable(container, () => {});

  timetable.render([]);

  const grid = container.querySelector('.timetable-grid');
  assert.ok(grid, 'Grid element should be rendered');

  const slots = grid.querySelectorAll('.timetable-slot');
  assert.equal(slots.length, 40, 'Should render 40 slots (5 days x 8 periods)');

  const dayCells = grid.querySelectorAll('.timetable-day-cell');
  assert.equal(dayCells.length, 5, 'Should render 5 day header cells');
});

test('WeeklyTimetable - Populates slot cards with data and status badges', (t) => {
  const container = new MockElement('div');
  const timetable = new WeeklyTimetable(container, () => {});

  const sampleSlots = [
    {
      session_id: 'SUP-001',
      day_of_week: 'MONDAY',
      period_number: 2,
      subject_code: 'ว23101',
      class_level: 'ม.3/1',
      room_number: '324',
      teacher_name: 'นายเดชาธร ศรีสุข',
      supervision_type: 'ONLINE',
      status_flow: { current_status: 'SCHEDULED' }
    },
    {
      session_id: 'SUP-002',
      day_of_week: 'WEDNESDAY',
      period_number: 5,
      subject_code: 'ค21101',
      class_level: 'ม.1/2',
      room_number: '112',
      teacher_name: 'นางสาวสมหญิง มีสุข',
      supervision_type: 'ONSITE',
      status_flow: { current_status: 'WAITING_TEACHER_ACK' }
    },
    {
      session_id: 'SUP-003',
      day_of_week: 'FRIDAY',
      period_number: 8,
      subject_code: 'อ32101',
      class_level: 'ม.5/4',
      room_number: '415',
      teacher_name: 'Mr. John Doe',
      supervision_type: 'ONSITE',
      status_flow: { current_status: 'COMPLETED' }
    }
  ];

  timetable.render(sampleSlots);

  const grid = container.querySelector('.timetable-grid');
  const slots = grid.querySelectorAll('.timetable-slot');

  // Monday Period 2 slot (index in slots for Monday Period 2 is p=2, index=1 in Monday's 8 slots)
  const mondayP2Slot = slots.find((s) => s.dataset.day === 'MONDAY' && s.dataset.period === '2');
  assert.ok(mondayP2Slot, 'Monday P2 slot should exist');
  assert.ok(mondayP2Slot.innerHTML.includes('🎥'), 'Online slot should include camera emoji icon');
  assert.ok(mondayP2Slot.innerHTML.includes('ว23101'), 'Should contain subject code');
  assert.ok(mondayP2Slot.innerHTML.includes('ม.3/1'), 'Should contain class level');
  assert.ok(mondayP2Slot.innerHTML.includes('ห้อง: 324'), 'Should contain room number');
  assert.ok(mondayP2Slot.innerHTML.includes('นายเดชาธร ศรีสุข'), 'Should contain teacher name');
  assert.ok(mondayP2Slot.innerHTML.includes('badge-scheduled'), 'Should contain badge-scheduled class');

  // Wednesday Period 5 slot
  const wedP5Slot = slots.find((s) => s.dataset.day === 'WEDNESDAY' && s.dataset.period === '5');
  assert.ok(wedP5Slot, 'Wednesday P5 slot should exist');
  assert.ok(!wedP5Slot.innerHTML.includes('🎥'), 'Onsite slot should not contain camera emoji');
  assert.ok(wedP5Slot.innerHTML.includes('badge-waiting'), 'Should contain badge-waiting class for WAITING_TEACHER_ACK');

  // Friday Period 8 slot
  const friP8Slot = slots.find((s) => s.dataset.day === 'FRIDAY' && s.dataset.period === '8');
  assert.ok(friP8Slot, 'Friday P8 slot should exist');
  assert.ok(friP8Slot.innerHTML.includes('badge-completed'), 'Should contain badge-completed class for COMPLETED');
});

test('WeeklyTimetable - Invokes onSlotClick callback with correct parameters when clicked', (t) => {
  const container = new MockElement('div');
  const clickedData = [];

  const timetable = new WeeklyTimetable(container, (eventData) => {
    clickedData.push(eventData);
  });

  const sampleSlots = [
    {
      session_id: 'SUP-999',
      day_of_week: 'TUESDAY',
      period_number: 3,
      subject_code: 'ท22101'
    }
  ];

  timetable.render(sampleSlots);

  const grid = container.querySelector('.timetable-grid');
  const slots = grid.querySelectorAll('.timetable-slot');

  // Click on populated slot (Tuesday Period 3)
  const tueP3Slot = slots.find((s) => s.dataset.day === 'TUESDAY' && s.dataset.period === '3');
  tueP3Slot.click();

  assert.equal(clickedData.length, 1);
  assert.deepEqual(clickedData[0], {
    sessionId: 'SUP-999',
    day: 'TUESDAY',
    period: 3
  });

  // Click on empty slot (Thursday Period 1)
  const thuP1Slot = slots.find((s) => s.dataset.day === 'THURSDAY' && s.dataset.period === '1');
  thuP1Slot.click();

  assert.equal(clickedData.length, 2);
  assert.deepEqual(clickedData[1], {
    sessionId: null,
    day: 'THURSDAY',
    period: 1
  });
});
