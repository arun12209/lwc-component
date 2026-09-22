import { LightningElement, api } from 'lwc';
import TIME_ZONE from '@salesforce/i18n/timeZone';
import LOCALE from '@salesforce/i18n/locale';
import { formatSellerTime } from 'c/meetingsDomain';

export default class HomepageMeetingCalendar extends LightningElement {
  @api meetings = [];
  @api displayZone = TIME_ZONE;
  @api isExpanded = false;
  @api completeness = 'COMPLETE';

  currentYear;
  currentMonth; // 0-indexed
  selectedDateStr; // 'YYYY-MM-DD'
  viewMode = 'week'; // 'week' | 'workweek' | 'month' | 'agenda'
  previewMaxMeetings = 1; // Compact preview limit

  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  connectedCallback() {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    this.selectedDateStr = this.formatDateStr(today);
  }

  formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  get isCompactView() {
    return !this.isExpanded;
  }

  get calendarContainerClass() {
    return this.isExpanded ? 'calendar-wrapper calendar-wrapper_expanded' : 'calendar-wrapper';
  }

  get currentMonthYearLabel() {
    const date = new Date(this.currentYear, this.currentMonth, 1);
    return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(date);
  }

  get selectedDateDisplayLabel() {
    if (!this.selectedDateStr) return '';
    const [y, m, d] = this.selectedDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat(LOCALE, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  get selectedDayMeetings() {
    if (!this.selectedDateStr || !this.meetings) return [];
    return this.meetings.filter(m => {
      const mDate = m.activityDate || (m.startInstant ? this.formatDateStr(m.startInstant) : '');
      return mDate === this.selectedDateStr;
    });
  }

  get gridDays() {
    const days = [];
    const firstDayIndex = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(this.currentYear, this.currentMonth, 0).getDate();

    const todayStr = this.formatDateStr(new Date());

    // 6 rows * 7 columns = 42 cells
    for (let i = 0; i < 42; i++) {
      let dayNum;
      let isCurrentMonth = true;
      let cellDate;

      if (i < firstDayIndex) {
        dayNum = prevMonthDays - (firstDayIndex - 1 - i);
        isCurrentMonth = false;
        cellDate = new Date(this.currentYear, this.currentMonth - 1, dayNum);
      } else if (i >= firstDayIndex + totalDaysInMonth) {
        dayNum = i - (firstDayIndex + totalDaysInMonth) + 1;
        isCurrentMonth = false;
        cellDate = new Date(this.currentYear, this.currentMonth + 1, dayNum);
      } else {
        dayNum = i - firstDayIndex + 1;
        isCurrentMonth = true;
        cellDate = new Date(this.currentYear, this.currentMonth, dayNum);
      }

      const dateStr = this.formatDateStr(cellDate);
      const isSelected = dateStr === this.selectedDateStr;
      const isToday = dateStr === todayStr;

      // Count meetings for this date
      const dayMeetings = this.meetings.filter(m => {
        const mDate = m.activityDate || (m.startInstant ? this.formatDateStr(m.startInstant) : '');
        return mDate === dateStr;
      });

      const dotCount = Math.min(dayMeetings.length, 3);
      const dots = Array.from({ length: dotCount }, (_, k) => k);

      let cellClass = 'day-cell';
      if (!isCurrentMonth) cellClass += ' day-cell_adjacent';
      if (isSelected) cellClass += ' day-cell_selected';
      if (isToday) cellClass += ' day-cell_today';

      days.push({
        dateStr,
        dayNum,
        cellClass,
        isSelected,
        isTodayAria: isToday ? 'date' : undefined,
        ariaLabel: `${dayNum} ${cellDate.toLocaleString(LOCALE, { month: 'short' })}, ${dayMeetings.length} meetings`,
        hasDots: dotCount > 0,
        dots
      });
    }

    return days;
  }

  // Expanded View Getters
  get isExpandedAgenda() {
    return this.viewMode === 'agenda';
  }

  get isExpandedMonth() {
    return this.viewMode === 'month';
  }

  get weekBtnClass() {
    return `mode-btn ${this.viewMode === 'week' ? 'mode-btn_active' : ''}`;
  }

  get workweekBtnClass() {
    return `mode-btn ${this.viewMode === 'workweek' ? 'mode-btn_active' : ''}`;
  }

  get monthBtnClass() {
    return `mode-btn ${this.viewMode === 'month' ? 'mode-btn_active' : ''}`;
  }

  get agendaBtnClass() {
    return `mode-btn ${this.viewMode === 'agenda' ? 'mode-btn_active' : ''}`;
  }

  get periodHeading() {
    return this.currentMonthYearLabel;
  }

  get hourlySlots() {
    const hours = [];
    for (let h = 0; h < 24; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const disp = h % 12 === 0 ? 12 : h % 12;
      hours.push({ label: `${disp} ${ampm}` });
    }
    return hours;
  }

  get visibleWeekDays() {
    // Current week or workweek based on selected date
    const [y, m, d] = (this.selectedDateStr || this.formatDateStr(new Date())).split('-').map(Number);
    const center = new Date(y, m - 1, d);
    const dayOfWeek = center.getDay(); // 0 = Sun

    const startOffset = this.viewMode === 'workweek' ? 1 - dayOfWeek : -dayOfWeek;
    const numDays = this.viewMode === 'workweek' ? 5 : 7;

    const days = [];
    const todayStr = this.formatDateStr(new Date());

    for (let i = 0; i < numDays; i++) {
      const cur = new Date(center);
      cur.setDate(center.getDate() + startOffset + i);
      const dateStr = this.formatDateStr(cur);
      const isToday = dateStr === todayStr;

      const dayEvents = this.meetings.filter(ev => {
        const evDate = ev.activityDate || (ev.startInstant ? this.formatDateStr(ev.startInstant) : '');
        return evDate === dateStr;
      });

      days.push({
        dateStr,
        weekdayName: cur.toLocaleString(LOCALE, { weekday: 'short' }),
        dayNum: cur.getDate(),
        headerClass: `week-day-header ${isToday ? 'week-day-header_today' : ''}`,
        allDayEvents: dayEvents.filter(ev => ev.isAllDay),
        timedEvents: dayEvents.filter(ev => !ev.isAllDay)
      });
    }
    return days;
  }

  get agendaDateGroups() {
    const groups = new Map();
    this.meetings.forEach(m => {
      const dStr = m.activityDate || (m.startInstant ? this.formatDateStr(m.startInstant) : 'Unknown');
      if (!groups.has(dStr)) {
        groups.set(dStr, []);
      }
      groups.get(dStr).push(m);
    });

    const result = [];
    groups.forEach((meets, dStr) => {
      let label = dStr;
      try {
        const [y, m, d] = dStr.split('-').map(Number);
        label = new Date(y, m - 1, d).toLocaleDateString(LOCALE, {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        // use dStr
      }
      result.push({
        dateStr: dStr,
        dateLabel: label,
        meetings: meets
      });
    });

    return result.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }

  get isAgendaEmpty() {
    return !this.agendaDateGroups.length;
  }

  get expandedMonthDays() {
    return this.gridDays.map(d => {
      const dayEvents = this.meetings.filter(m => {
        const mDate = m.activityDate || (m.startInstant ? this.formatDateStr(m.startInstant) : '');
        return mDate === d.dateStr;
      });
      const previewEvents = dayEvents.slice(0, 2).map(ev => ({
        key: ev.key,
        subject: ev.subject,
        timeShort: ev.isAllDay ? 'All day' : formatSellerTime(ev.startInstant, this.displayZone, LOCALE, { hour: 'numeric', minute: '2-digit' })
      }));
      return {
        ...d,
        meetingCount: dayEvents.length,
        previewEvents,
        hasMoreEvents: dayEvents.length > 2,
        moreCount: dayEvents.length - 2
      };
    });
  }

  handlePrevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear -= 1;
    } else {
      this.currentMonth -= 1;
    }
  }

  handleNextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear += 1;
    } else {
      this.currentMonth += 1;
    }
  }

  handleGoToToday() {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    this.selectedDateStr = this.formatDateStr(today);
  }

  handleDateSelect(event) {
    const dateStr = event.currentTarget.dataset.date;
    if (dateStr) {
      this.selectedDateStr = dateStr;
      this.dispatchEvent(
        new CustomEvent('selectdate', {
          detail: { dateStr }
        })
      );
    }
  }

  handleGridKeyDown(event) {
    // Accessible keyboard grid navigation
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' '];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    const [y, m, d] = (this.selectedDateStr || this.formatDateStr(new Date())).split('-').map(Number);
    const date = new Date(y, m - 1, d);

    switch (event.key) {
      case 'ArrowLeft':
        date.setDate(date.getDate() - 1);
        break;
      case 'ArrowRight':
        date.setDate(date.getDate() + 1);
        break;
      case 'ArrowUp':
        date.setDate(date.getDate() - 7);
        break;
      case 'ArrowDown':
        date.setDate(date.getDate() + 7);
        break;
      case 'Home':
        date.setDate(1);
        break;
      case 'End':
        date.setMonth(date.getMonth() + 1, 0);
        break;
      case 'PageUp':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'PageDown':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'Enter':
      case ' ':
        // Selection is already made on navigation
        break;
      default:
        break;
    }

    this.selectedDateStr = this.formatDateStr(date);
    this.currentYear = date.getFullYear();
    this.currentMonth = date.getMonth();
  }

  handleExpandCalendar() {
    this.dispatchEvent(
      new CustomEvent('expandcalendar', {
        bubbles: true,
        composed: true,
        detail: {
          selectedDateStr: this.selectedDateStr,
          viewMode: this.viewMode
        }
      })
    );
  }

  handleViewAllForSelected(event) {
    this.dispatchEvent(
      new CustomEvent('viewall', {
        bubbles: true,
        composed: true,
        detail: {
          dateKey: 'selected',
          dateStr: this.selectedDateStr,
          totalCount: event.detail.totalCount
        }
      })
    );
  }

  handleModeChange(event) {
    this.viewMode = event.currentTarget.dataset.mode;
  }

  handlePrevPeriod() {
    this.handlePrevMonth();
  }

  handleNextPeriod() {
    this.handleNextMonth();
  }
}
