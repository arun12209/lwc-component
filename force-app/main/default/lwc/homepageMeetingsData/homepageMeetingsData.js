import { LightningElement, api, wire } from 'lwc';
import { graphql, refreshGraphQL } from 'lightning/graphql';
import USER_ID from '@salesforce/user/Id';
import TIME_ZONE from '@salesforce/i18n/timeZone';
import LOCALE from '@salesforce/i18n/locale';
import {
  TIMED_MEETINGS_POLYMORPHIC_QUERY,
  buildTimedQueryVariables
} from 'c/meetingsQueries';
import {
  normalizeMeeting,
  APPROVED_OPPORTUNITY_RECORD_TYPES,
  APPROVED_STATUS_VALUES
} from 'c/meetingsDomain';

export default class HomepageMeetingsData extends LightningElement {
  @api sellerId = USER_ID;
  @api recordTypeIds = ['0125j000000NInLAAW', '0125j000000NInQAAW'];
  @api statusValues = APPROVED_STATUS_VALUES;
  @api rangeStartUtcIso;
  @api rangeEndUtcIso;
  @api enabled = false;

  cursor = null;
  accumulatedMeetings = [];
  rawWireResult;
  isLoading = false;

  get queryVariables() {
    if (!this.enabled || !this.sellerId || !this.rangeStartUtcIso || !this.rangeEndUtcIso) {
      return undefined;
    }
    return buildTimedQueryVariables({
      sellerId: this.sellerId,
      recordTypeIds: this.recordTypeIds,
      statusValues: this.statusValues,
      rangeStartUtcIso: this.rangeStartUtcIso,
      rangeEndUtcIso: this.rangeEndUtcIso,
      after: this.cursor
    });
  }

  @wire(graphql, {
    query: TIMED_MEETINGS_POLYMORPHIC_QUERY,
    variables: '$queryVariables'
  })
  wiredGraphQL(result) {
    this.rawWireResult = result;
    const { data, errors } = result;

    if (errors && errors.length) {
      this.dispatchEvent(
        new CustomEvent('datachange', {
          detail: {
            meetings: this.accumulatedMeetings,
            completeness: 'FAILED',
            errors,
            hasMore: false,
            totalCount: this.accumulatedMeetings.length
          }
        })
      );
      return;
    }

    if (data && data.uiapi && data.uiapi.query && data.uiapi.query.Event) {
      const eventData = data.uiapi.query.Event;
      const edges = eventData.edges || [];
      const pageInfo = eventData.pageInfo || {};

      const newMeetings = edges
        .map(edge => normalizeMeeting(edge.node, TIME_ZONE, LOCALE))
        .filter(Boolean);

      // Merge and deduplicate by eventId
      const meetingMap = new Map();
      this.accumulatedMeetings.forEach(m => meetingMap.set(m.eventId, m));
      newMeetings.forEach(m => meetingMap.set(m.eventId, m));

      this.accumulatedMeetings = Array.from(meetingMap.values());
      const hasNextPage = Boolean(pageInfo.hasNextPage);
      const isOverBudget = this.accumulatedMeetings.length >= 1000;

      this.dispatchEvent(
        new CustomEvent('datachange', {
          detail: {
            meetings: this.accumulatedMeetings,
            completeness: hasNextPage && !isOverBudget ? 'PARTIAL' : 'COMPLETE',
            hasMore: hasNextPage && !isOverBudget,
            isOverBudget,
            totalCount: this.accumulatedMeetings.length
          }
        })
      );
    }
  }

  @api
  async refresh() {
    this.cursor = null;
    this.accumulatedMeetings = [];
    if (this.rawWireResult) {
      await refreshGraphQL(this.rawWireResult);
    }
  }
}
