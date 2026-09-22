import { LightningElement, api } from 'lwc';
import TIME_ZONE from '@salesforce/i18n/timeZone';
import LOCALE from '@salesforce/i18n/locale';
import homepageMeetingsModal from 'c/homepageMeetingsModal';
import {
  computeLocalMidnightBoundaries,
  APPROVED_OPPORTUNITY_RECORD_TYPES,
  APPROVED_STATUS_VALUES
} from 'c/meetingsDomain';

export default class HomepageMyMeetings extends LightningElement {
  @api maxVisibleMeetings = 3;
  @api manageMeetingsUrl = '';
  @api recordTypeIds = ['0125j000000NInLAAW', '0125j000000NInQAAW'];
  @api statusValues = APPROVED_STATUS_VALUES;

  activeTab = 'today'; // 'today' | 'tomorrow' | 'calendar'
  allMeetings = [];
  completeness = 'LOADING';
  isProviderMounted = true;
  isProviderEnabled = true;

  displayZone = TIME_ZONE;
  todayDateStr;
  tomorrowDateStr;
  rangeStartUtcIso;
  rangeEndUtcIso;

  connectedCallback() {
    this.calculateDatesAndRanges();
  }

  calculateDatesAndRanges() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDateStr = d => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    this.todayDateStr = formatDateStr(today);
    this.tomorrowDateStr = formatDateStr(tomorrow);

    // Compute exact UTC boundaries for 2 days (Today + Tomorrow)
    const todayBoundaries = computeLocalMidnightBoundaries(this.todayDateStr, this.displayZone);
    const tomorrowBoundaries = computeLocalMidnightBoundaries(this.tomorrowDateStr, this.displayZone);

    this.rangeStartUtcIso = new Date(todayBoundaries.startMs).toISOString();
    this.rangeEndUtcIso = new Date(tomorrowBoundaries.endExclusiveMs).toISOString();
  }

  get isTodayTab() {
    return this.activeTab === 'today';
  }

  get isTomorrowTab() {
    return this.activeTab === 'tomorrow';
  }

  get isCalendarTab() {
    return this.activeTab === 'calendar';
  }

  get todayTabClass() {
    return `tab-item ${this.isTodayTab ? 'tab-item_active' : ''}`;
  }

  get tomorrowTabClass() {
    return `tab-item ${this.isTomorrowTab ? 'tab-item_active' : ''}`;
  }

  get calendarTabClass() {
    return `tab-item ${this.isCalendarTab ? 'tab-item_active' : ''}`;
  }

  get currentDateDisplay() {
    const date = new Date();
    if (this.activeTab === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    }
    return new Intl.DateTimeFormat(LOCALE, {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  get todayMeetings() {
    return this.allMeetings.filter(m => {
      const mDate = m.activityDate || (m.startInstant ? m.startInstant.toISOString().slice(0, 10) : '');
      return mDate === this.todayDateStr;
    });
  }

  get tomorrowMeetings() {
    return this.allMeetings.filter(m => {
      const mDate = m.activityDate || (m.startInstant ? m.startInstant.toISOString().slice(0, 10) : '');
      return mDate === this.tomorrowDateStr;
    });
  }

  handleTabChange(event) {
    this.activeTab = event.currentTarget.dataset.tab;
  }

  handleOpenCalendarTab() {
    this.activeTab = 'calendar';
  }

  handleDataChange(event) {
    const { meetings, completeness } = event.detail;
    this.allMeetings = meetings || [];
    this.completeness = completeness || 'COMPLETE';
  }

  handleRefresh() {
    this.completeness = 'LOADING';
    const provider = this.template.querySelector('c-homepage-meetings-data');
    if (provider) {
      provider.refresh();
    }
  }

  async handleOpenViewAll(event) {
    const launcher = event.target;
    const initialTab = event.detail?.dateKey === 'tomorrow' ? 'tomorrow' : 'today';

    // Suspend home provider
    this.isProviderEnabled = false;

    try {
      await homepageMeetingsModal.open({
        size: 'large',
        description: 'My Meetings - Expanded View',
        meetings: this.allMeetings,
        initialTab,
        displayZone: this.displayZone,
        manageMeetingsUrl: this.manageMeetingsUrl,
        completeness: this.completeness
      });
    } finally {
      // Resume and restore focus
      this.isProviderEnabled = true;
      if (launcher && typeof launcher.focus === 'function') {
        launcher.focus();
      }
    }
  }

  async handleExpandCalendar(event) {
    const launcher = event.target;
    this.isProviderEnabled = false;

    try {
      await homepageMeetingsModal.open({
        size: 'large',
        description: 'My Meetings - Full Calendar',
        meetings: this.allMeetings,
        initialTab: 'calendar',
        displayZone: this.displayZone,
        manageMeetingsUrl: this.manageMeetingsUrl,
        completeness: this.completeness
      });
    } finally {
      this.isProviderEnabled = true;
      if (launcher && typeof launcher.focus === 'function') {
        launcher.focus();
      }
    }
  }
}
