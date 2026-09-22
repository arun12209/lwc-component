import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import TIME_ZONE from '@salesforce/i18n/timeZone';
import LOCALE from '@salesforce/i18n/locale';
import {
  getMeetingTemporalState,
  resolveImpactAssessmentUrl
} from 'c/meetingsDomain';

export default class HomepageMeetingCard extends NavigationMixin(LightningElement) {
  @api meeting;
  @api displayZone = TIME_ZONE;
  @api isCompact = false;

  get cardClass() {
    let cls = 'meeting-card';
    if (this.temporalState.isElapsed) {
      cls += ' meeting-card_elapsed';
    }
    if (this.temporalState.isInProgress) {
      cls += ' meeting-card_in-progress';
    }
    return cls;
  }

  get cardAriaLabel() {
    return `${this.meeting?.subject || 'Meeting'}, ${this.temporalState.timeDisplay}`;
  }

  get temporalState() {
    return getMeetingTemporalState(this.meeting, new Date(), this.displayZone, LOCALE);
  }

  get temporalBadgeClass() {
    if (this.temporalState.isInProgress) {
      return 'temporal-badge temporal-badge_in-progress';
    }
    if (this.temporalState.isElapsed) {
      return 'temporal-badge temporal-badge_elapsed';
    }
    return 'temporal-badge';
  }

  get isRescheduling() {
    return this.meeting?.statusValue === 'Rescheduling';
  }

  get eventRecordUrl() {
    return this.meeting?.eventId ? `/lightning/r/Event/${this.meeting.eventId}/view` : '#';
  }

  get opptyRecordUrl() {
    return this.meeting?.opportunity?.id
      ? `/lightning/r/Opportunity/${this.meeting.opportunity.id}/view`
      : '#';
  }

  get opportunityName() {
    return this.meeting?.opportunity?.name || 'Not linked';
  }

  get categoryLabel() {
    return this.meeting?.category?.label || 'Not specified';
  }

  get topicLabel() {
    return this.meeting?.topic?.label || 'Not specified';
  }

  get impactAssessmentUrl() {
    if (!this.meeting?.eventId || !this.meeting?.opportunity?.id) {
      return null;
    }
    return resolveImpactAssessmentUrl({
      eventId: this.meeting.eventId,
      opportunityId: this.meeting.opportunity.id
    });
  }

  get isImpactAssessmentConfigured() {
    return Boolean(this.impactAssessmentUrl);
  }

  handleEventClick(event) {
    if (this.meeting?.eventId) {
      event.preventDefault();
      this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
          recordId: this.meeting.eventId,
          objectApiName: 'Event',
          actionName: 'view'
        }
      });
    }
  }

  handleOpptyClick(event) {
    if (this.meeting?.opportunity?.id) {
      event.preventDefault();
      this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
          recordId: this.meeting.opportunity.id,
          objectApiName: 'Opportunity',
          actionName: 'view'
        }
      });
    }
  }
}
