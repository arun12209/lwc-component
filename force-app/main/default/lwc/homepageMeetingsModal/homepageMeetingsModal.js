import { api } from 'lwc';
import LightningModal from 'lightning/modal';
import { NavigationMixin } from 'lightning/navigation';
import TIME_ZONE from '@salesforce/i18n/timeZone';
import LOCALE from '@salesforce/i18n/locale';
import {
  formatSellerTime,
  getMeetingTemporalState,
  resolveImpactAssessmentUrl,
  filterMeetingsBySearch
} from 'c/meetingsDomain';

export default class HomepageMeetingsModal extends NavigationMixin(LightningModal) {
  @api meetings = [];
  @api initialTab = 'today';
  @api displayZone = TIME_ZONE;
  @api manageMeetingsUrl = '';
  @api completeness = 'COMPLETE';

  activeTab = 'today';
  searchQuery = '';
  sortAscending = true;
  hasMore = false;

  connectedCallback() {
    this.activeTab = this.initialTab || 'today';
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

  get isListMode() {
    return this.activeTab === 'today' || this.activeTab === 'tomorrow';
  }

  get todayTabClass() {
    return `tab-btn ${this.isTodayTab ? 'tab-btn_active' : ''}`;
  }

  get tomorrowTabClass() {
    return `tab-btn ${this.isTomorrowTab ? 'tab-btn_active' : ''}`;
  }

  get calendarTabClass() {
    return `tab-btn ${this.isCalendarTab ? 'tab-btn_active' : ''}`;
  }

  get headerDateLabel() {
    const today = new Date();
    if (this.activeTab === 'tomorrow') {
      today.setDate(today.getDate() + 1);
    }
    return new Intl.DateTimeFormat(LOCALE, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(today);
  }

  get searchPlaceholder() {
    return this.completeness === 'COMPLETE' ? 'Search this day...' : 'Search loaded meetings...';
  }

  get countIndicatorLabel() {
    const count = this.filteredMeetings.length;
    const total = this.meetings.length;
    return `Showing ${count} of ${total} meetings`;
  }

  get sortDirectionIcon() {
    return this.sortAscending ? '▲' : '▼';
  }

  get filteredMeetings() {
    const enriched = (this.meetings || []).map(m => {
      const temporal = getMeetingTemporalState(m, new Date(), this.displayZone, LOCALE);
      const impactUrl = resolveImpactAssessmentUrl({
        eventId: m.eventId,
        opportunityId: m.opportunity?.id
      });
      return {
        ...m,
        temporalState: temporal,
        impactAssessmentUrl: impactUrl,
        isRescheduling: m.statusValue === 'Rescheduling',
        eventRecordUrl: m.eventId ? `/lightning/r/Event/${m.eventId}/view` : '#',
        opptyRecordUrl: m.opportunity?.id ? `/lightning/r/Opportunity/${m.opportunity.id}/view` : '#'
      };
    });

    const searched = filterMeetingsBySearch(enriched, this.searchQuery);

    searched.sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      const aTime = a.startInstant?.getTime() || 0;
      const bTime = b.startInstant?.getTime() || 0;
      return this.sortAscending ? aTime - bTime : bTime - aTime;
    });

    return searched;
  }

  get isTableEmpty() {
    return !this.filteredMeetings.length;
  }

  handleTabChange(event) {
    this.activeTab = event.currentTarget.dataset.tab;
    this.searchQuery = '';
  }

  handleSearchChange(event) {
    this.searchQuery = event.target.value;
  }

  handleSortByTime() {
    this.sortAscending = !this.sortAscending;
  }

  handleLoadMore() {
    this.dispatchEvent(new CustomEvent('loadmore'));
  }

  handleRecordNavigate(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.id;
    const objectApiName = event.currentTarget.dataset.object;
    if (id && objectApiName) {
      this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
          recordId: id,
          objectApiName,
          actionName: 'view'
        }
      });
    }
  }

  handleClose() {
    this.close({ refreshNeeded: false });
  }
}
