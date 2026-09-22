import { LightningElement, api } from 'lwc';
import TIME_ZONE from '@salesforce/i18n/timeZone';
import {
  selectCompactTodayMeetings,
  selectCompactTomorrowMeetings
} from 'c/meetingsDomain';

export default class HomepageMeetingAgenda extends LightningElement {
  @api meetings = [];
  @api dateKey = 'today';
  @api displayZone = TIME_ZONE;
  @api maxVisibleMeetings = 3;
  @api completeness = 'COMPLETE';
  @api totalCountOrNull = null;
  @api isCompact = false;

  get isLoading() {
    return this.completeness === 'LOADING';
  }

  get skeletonItems() {
    const count = Math.min(Math.max(Number(this.maxVisibleMeetings) || 3, 1), 3);
    return Array.from({ length: count }, (_, i) => i);
  }

  get hasMeetings() {
    return this.visibleMeetings && this.visibleMeetings.length > 0;
  }

  get visibleMeetings() {
    if (!this.meetings || !this.meetings.length) return [];
    const limit = Math.min(Math.max(Number(this.maxVisibleMeetings) || 3, 1), 3);

    if (this.dateKey === 'today') {
      return selectCompactTodayMeetings(this.meetings, limit, new Date());
    }
    if (this.dateKey === 'tomorrow') {
      return selectCompactTomorrowMeetings(this.meetings, limit);
    }
    return this.meetings.slice(0, limit);
  }

  get viewAllLabel() {
    const total = this.totalCountOrNull !== null ? this.totalCountOrNull : this.meetings.length;
    if (this.dateKey === 'today') {
      return `View all today (${total})`;
    }
    if (this.dateKey === 'tomorrow') {
      return `View all tomorrow (${total})`;
    }
    return `View all (${total})`;
  }

  get viewAllAriaLabel() {
    return `Open expanded view for all meetings (${this.meetings.length} meetings)`;
  }

  get emptyTitle() {
    if (this.dateKey === 'today') {
      return 'No eligible Opportunity meetings today';
    }
    if (this.dateKey === 'tomorrow') {
      return 'No eligible Opportunity meetings tomorrow';
    }
    return 'No eligible Opportunity meetings for this date';
  }

  get canOpenCalendar() {
    return this.dateKey === 'today' || this.dateKey === 'tomorrow';
  }

  handleViewAll() {
    this.dispatchEvent(
      new CustomEvent('viewall', {
        bubbles: true,
        composed: true,
        detail: {
          dateKey: this.dateKey,
          totalCount: this.totalCountOrNull || this.meetings.length
        }
      })
    );
  }

  handleOpenCalendar() {
    this.dispatchEvent(
      new CustomEvent('opencalendar', {
        bubbles: true,
        composed: true
      })
    );
  }
}
