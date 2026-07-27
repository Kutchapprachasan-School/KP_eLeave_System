export class WeeklyTimetable {
  constructor(containerElement, onSlotClickCallback) {
    this.containerElement = containerElement;
    this.onSlotClick = onSlotClickCallback;
    this.days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    this.dayLabels = {
      MONDAY: 'วันจันทร์',
      TUESDAY: 'วันอังคาร',
      WEDNESDAY: 'วันพุธ',
      THURSDAY: 'วันพฤหัสบดี',
      FRIDAY: 'วันศุกร์'
    };
  }

  render(slotsData = []) {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'timetable-container';

    const grid = document.createElement('div');
    grid.className = 'timetable-grid';

    // 1. Header row
    const cornerCell = document.createElement('div');
    cornerCell.className = 'timetable-header-cell';
    cornerCell.innerHTML = '<span>วัน \\ คาบ</span>';
    grid.appendChild(cornerCell);

    for (let p = 1; p <= 8; p++) {
      const headerCell = document.createElement('div');
      headerCell.className = 'timetable-header-cell';
      headerCell.innerHTML = `<span>คาบ ${p}</span>`;
      grid.appendChild(headerCell);
    }

    // 2. Day rows
    for (const day of this.days) {
      const dayCell = document.createElement('div');
      dayCell.className = 'timetable-day-cell';
      dayCell.innerHTML = `<span>${this.dayLabels[day] || day}</span>`;
      grid.appendChild(dayCell);

      for (let p = 1; p <= 8; p++) {
        const slotData = slotsData.find((s) => {
          const sDay = String(s.day_of_week || s.day || '').toUpperCase();
          const sPeriod = Number(s.period_number || s.period);
          return sDay === day && sPeriod === p;
        });

        const slotElem = document.createElement('div');
        slotElem.className = 'timetable-slot' + (slotData ? '' : ' empty-slot');
        slotElem.dataset.day = day;
        slotElem.dataset.period = String(p);

        if (slotData) {
          const sessionId = slotData.session_id || slotData.sessionId || slotData.id || null;
          if (sessionId) {
            slotElem.dataset.sessionId = sessionId;
          }

          const isOnline = slotData.supervision_type === 'ONLINE';
          const iconHtml = isOnline ? '🎥 ' : '';
          const subjectCode = slotData.subject_code || '';
          const classLevel = slotData.class_level ? ` (${slotData.class_level})` : '';

          const statusKey = slotData.status_flow?.current_status || slotData.status;
          const badgeInfo = this.getBadgeInfo(statusKey);

          slotElem.innerHTML = `
            <div class="slot-subject">${iconHtml}${this.escapeHtml(subjectCode)}${this.escapeHtml(classLevel)}</div>
            ${slotData.room_number ? `<div class="slot-room">ห้อง: ${this.escapeHtml(slotData.room_number)}</div>` : ''}
            ${slotData.teacher_name ? `<div class="slot-teacher">${this.escapeHtml(slotData.teacher_name)}</div>` : ''}
            <div class="badge-wrapper"><span class="${badgeInfo.className}">${badgeInfo.text}</span></div>
          `.trim();
        } else {
          slotElem.innerHTML = '<span class="empty-plus">+</span>';
        }

        slotElem.addEventListener('click', () => {
          if (typeof this.onSlotClick === 'function') {
            const sessionId = slotData ? (slotData.session_id || slotData.sessionId || slotData.id || null) : null;
            this.onSlotClick({ sessionId, day, period: p });
          }
        });

        grid.appendChild(slotElem);
      }
    }

    container.appendChild(grid);
    this.containerElement.appendChild(container);
  }

  getBadgeInfo(status) {
    const s = String(status || 'SCHEDULED').toUpperCase();
    if (s === 'COMPLETED') {
      return { className: 'badge-completed', text: 'เสร็จสิ้น' };
    }
    if (s.includes('WAITING') || s === 'PENDING') {
      return { className: 'badge-waiting', text: 'รอรับรอง' };
    }
    return { className: 'badge-scheduled', text: 'นัดหมายแล้ว' };
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
