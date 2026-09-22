import {
  validateExternalUrl,
  resolveImpactAssessmentUrl,
  formatSellerTime,
  computeLocalMidnightBoundaries,
  normalizeMeeting,
  getMeetingTemporalState,
  selectCompactTodayMeetings,
  selectCompactTomorrowMeetings,
  filterMeetingsBySearch,
  APPROVED_OPPORTUNITY_RECORD_TYPES,
  APPROVED_STATUS_VALUES
} from 'c/meetingsDomain';

describe('meetingsDomain Unit Tests', () => {
  describe('Constants and Criteria', () => {
    test('APPROVED_OPPORTUNITY_RECORD_TYPES contains Renewal and Growth', () => {
      expect(APPROVED_OPPORTUNITY_RECORD_TYPES).toContain('Renewal');
      expect(APPROVED_OPPORTUNITY_RECORD_TYPES).toContain('Growth');
    });

    test('APPROVED_STATUS_VALUES contains Schedules, Rescheduling, and Scheduled', () => {
      expect(APPROVED_STATUS_VALUES).toContain('Schedules');
      expect(APPROVED_STATUS_VALUES).toContain('Rescheduling');
      expect(APPROVED_STATUS_VALUES).toContain('Scheduled');
    });
  });

  describe('validateExternalUrl', () => {
    test('accepts valid HTTPS URLs from allowed domains', () => {
      expect(validateExternalUrl('https://salesforce.com/dashboard')).toBe(true);
      expect(validateExternalUrl('https://sub.force.com/path?q=1')).toBe(true);
      expect(validateExternalUrl('https://gartner.com/assessment')).toBe(true);
    });

    test('rejects non-HTTPS URLs', () => {
      expect(validateExternalUrl('http://salesforce.com')).toBe(false);
      expect(validateExternalUrl('ftp://salesforce.com')).toBe(false);
    });

    test('rejects URLs containing embedded credentials', () => {
      expect(validateExternalUrl('https://user:pass@salesforce.com')).toBe(false);
    });

    test('rejects unallowed domains', () => {
      expect(validateExternalUrl('https://malicious.com')).toBe(false);
      expect(validateExternalUrl('https://not-salesforce.com')).toBe(false);
    });

    test('handles invalid input gracefully', () => {
      expect(validateExternalUrl('')).toBe(false);
      expect(validateExternalUrl(null)).toBe(false);
      expect(validateExternalUrl('not-a-url')).toBe(false);
    });
  });

  describe('resolveImpactAssessmentUrl', () => {
    test('returns null by default in unconfigured state', () => {
      const url = resolveImpactAssessmentUrl({
        eventId: '00U000000000001',
        opportunityId: '006000000000001'
      });
      expect(url).toBeNull();
    });

    test('returns null if eventId or opportunityId is missing', () => {
      expect(resolveImpactAssessmentUrl({ eventId: null, opportunityId: '006' })).toBeNull();
      expect(resolveImpactAssessmentUrl({ eventId: '00U', opportunityId: null })).toBeNull();
    });
  });

  describe('computeLocalMidnightBoundaries', () => {
    test('computes local boundaries for a date in UTC', () => {
      const { startMs, endExclusiveMs } = computeLocalMidnightBoundaries('2026-09-22', 'UTC');
      expect(new Date(startMs).toISOString()).toBe('2026-09-22T00:00:00.000Z');
      expect(new Date(endExclusiveMs).toISOString()).toBe('2026-09-23T00:00:00.000Z');
    });

    test('handles half-hour and quarter-hour timezone offsets', () => {
      // Asia/Kolkata is UTC+05:30
      const { startMs } = computeLocalMidnightBoundaries('2026-09-22', 'Asia/Kolkata');
      // 00:00:00 IST on 2026-09-22 is 18:30:00 UTC on 2026-09-21
      expect(new Date(startMs).toISOString()).toBe('2026-09-21T18:30:00.000Z');
    });
  });

  describe('normalizeMeeting', () => {
    test('normalizes standard timed meeting with all required fields', () => {
      const rawNode = {
        Id: '00U1',
        Subject: { value: 'Renewal Discussion' },
        Status__c: { value: 'Scheduled' },
        IsAllDayEvent: { value: false },
        StartDateTime: { value: '2026-09-22T10:00:00.000Z' },
        EndDateTime: { value: '2026-09-22T11:00:00.000Z' },
        ActivityDate: { value: '2026-09-22' },
        Topic__c: { value: 'QBR' },
        Interaction_Category__c: { value: 'Customer Meeting' },
        WhatId: { value: '0061' },
        What: {
          Id: '0061',
          Name: { value: 'Acme Renewal' },
          RecordTypeId: { value: '0125j000000NInLAAW' }
        },
        WhoId: { value: '0031' },
        Who: {
          __typename: 'Contact',
          Id: '0031',
          Name: { value: 'Jane Doe' }
        }
      };

      const normalized = normalizeMeeting(rawNode, 'UTC');
      expect(normalized.eventId).toBe('00U1');
      expect(normalized.subject).toBe('Renewal Discussion');
      expect(normalized.statusValue).toBe('Scheduled');
      expect(normalized.isAllDay).toBe(false);
      expect(normalized.opportunity.name).toBe('Acme Renewal');
      expect(normalized.topic.value).toBe('QBR');
      expect(normalized.category.value).toBe('Customer Meeting');
      expect(normalized.primaryPerson.name).toBe('Jane Doe');
      expect(normalized.primaryPerson.label).toBe('Primary contact');
      expect(normalized.attendees.items.length).toBe(1);
      expect(normalized.timeQuality).toBe('EXACT');
    });

    test('normalizes all-day meeting', () => {
      const rawNode = {
        Id: '00U2',
        Subject: { value: 'All Day Offsite' },
        IsAllDayEvent: { value: true },
        ActivityDate: { value: '2026-09-22' }
      };

      const normalized = normalizeMeeting(rawNode, 'UTC');
      expect(normalized.isAllDay).toBe(true);
      expect(normalized.timeQuality).toBe('ALL_DAY');
    });

    test('handles null and missing fields gracefully', () => {
      const rawNode = {
        Id: '00U3',
        Subject: null
      };

      const normalized = normalizeMeeting(rawNode, 'UTC');
      expect(normalized.subject).toBe('Untitled Meeting');
      expect(normalized.topic.label).toBe('Not specified');
      expect(normalized.category.label).toBe('Not specified');
      expect(normalized.opportunity.name).toBe('Not linked');
    });
  });

  describe('getMeetingTemporalState', () => {
    test('returns "All day" for all-day meetings', () => {
      const state = getMeetingTemporalState({ isAllDay: true });
      expect(state.badgeLabel).toBe('All day');
      expect(state.timeDisplay).toBe('All day');
    });

    test('returns "In progress" when current time is between start and end', () => {
      const now = new Date('2026-09-22T10:30:00.000Z');
      const meeting = {
        isAllDay: false,
        startInstant: new Date('2026-09-22T10:00:00.000Z'),
        endInstant: new Date('2026-09-22T11:00:00.000Z')
      };

      const state = getMeetingTemporalState(meeting, now, 'UTC');
      expect(state.badgeLabel).toBe('In progress');
      expect(state.isInProgress).toBe(true);
    });

    test('returns "Starts in X min" when start is within 60 minutes', () => {
      const now = new Date('2026-09-22T09:45:00.000Z');
      const meeting = {
        isAllDay: false,
        startInstant: new Date('2026-09-22T10:00:00.000Z'),
        endInstant: new Date('2026-09-22T11:00:00.000Z')
      };

      const state = getMeetingTemporalState(meeting, now, 'UTC');
      expect(state.badgeLabel).toBe('Starts in 15 min');
    });

    test('returns "Earlier today" when meeting has ended', () => {
      const now = new Date('2026-09-22T12:00:00.000Z');
      const meeting = {
        isAllDay: false,
        startInstant: new Date('2026-09-22T10:00:00.000Z'),
        endInstant: new Date('2026-09-22T11:00:00.000Z')
      };

      const state = getMeetingTemporalState(meeting, now, 'UTC');
      expect(state.badgeLabel).toBe('Earlier today');
      expect(state.isElapsed).toBe(true);
    });
  });

  describe('selectCompactTodayMeetings', () => {
    test('prioritizes all-day, in-progress, upcoming, and elapsed fallback up to maxVisible', () => {
      const now = new Date('2026-09-22T12:00:00.000Z');
      const meetings = [
        {
          key: '1',
          isAllDay: false,
          startInstant: new Date('2026-09-22T08:00:00.000Z'),
          endInstant: new Date('2026-09-22T09:00:00.000Z') // elapsed
        },
        {
          key: '2',
          isAllDay: false,
          startInstant: new Date('2026-09-22T11:30:00.000Z'),
          endInstant: new Date('2026-09-22T12:30:00.000Z') // in-progress
        },
        {
          key: '3',
          isAllDay: true // all-day
        },
        {
          key: '4',
          isAllDay: false,
          startInstant: new Date('2026-09-22T14:00:00.000Z'),
          endInstant: new Date('2026-09-22T15:00:00.000Z') // upcoming
        }
      ];

      const selected = selectCompactTodayMeetings(meetings, 3, now);
      expect(selected.length).toBe(3);
      // All-day first
      expect(selected[0].key).toBe('3');
      // Then in-progress
      expect(selected[1].key).toBe('2');
      // Then upcoming
      expect(selected[2].key).toBe('4');
    });

    test('fills with most recent elapsed when upcoming is fewer than maxVisible', () => {
      const now = new Date('2026-09-22T15:00:00.000Z');
      const meetings = [
        {
          key: '1',
          isAllDay: false,
          startInstant: new Date('2026-09-22T08:00:00.000Z'),
          endInstant: new Date('2026-09-22T09:00:00.000Z') // older elapsed
        },
        {
          key: '2',
          isAllDay: false,
          startInstant: new Date('2026-09-22T11:00:00.000Z'),
          endInstant: new Date('2026-09-22T12:00:00.000Z') // more recent elapsed
        },
        {
          key: '3',
          isAllDay: false,
          startInstant: new Date('2026-09-22T16:00:00.000Z'),
          endInstant: new Date('2026-09-22T17:00:00.000Z') // upcoming
        }
      ];

      const selected = selectCompactTodayMeetings(meetings, 2, now);
      expect(selected.length).toBe(2);
      // Upcoming ('3') + most recent elapsed ('2') displayed chronologically
      expect(selected.map(m => m.key)).toEqual(['2', '3']);
    });
  });

  describe('selectCompactTomorrowMeetings', () => {
    test('selects all-day then earliest timed meetings up to maxVisible', () => {
      const meetings = [
        {
          key: '1',
          isAllDay: false,
          startInstant: new Date('2026-09-23T14:00:00.000Z')
        },
        {
          key: '2',
          isAllDay: true
        },
        {
          key: '3',
          isAllDay: false,
          startInstant: new Date('2026-09-23T09:00:00.000Z')
        }
      ];

      const selected = selectCompactTomorrowMeetings(meetings, 2);
      expect(selected.length).toBe(2);
      expect(selected[0].key).toBe('2'); // All-day
      expect(selected[1].key).toBe('3'); // 09:00
    });
  });

  describe('filterMeetingsBySearch', () => {
    const meetings = [
      {
        subject: 'Renewal Strategy Call',
        opportunity: { name: 'Acme Renewal Deal' },
        topic: { value: 'Strategy' },
        category: { value: 'Sales' },
        attendees: { items: [{ name: 'Alice Smith' }] }
      },
      {
        subject: 'Growth Intro Meeting',
        opportunity: { name: 'Beta Growth Project' },
        topic: { value: 'Intro' },
        category: { value: 'Client Meeting' },
        attendees: { items: [{ name: 'Bob Jones' }] }
      }
    ];

    test('searches by subject', () => {
      const res = filterMeetingsBySearch(meetings, 'Renewal');
      expect(res.length).toBe(1);
      expect(res[0].subject).toContain('Renewal');
    });

    test('searches by attendee name', () => {
      const res = filterMeetingsBySearch(meetings, 'Alice');
      expect(res.length).toBe(1);
      expect(res[0].subject).toContain('Renewal');
    });

    test('returns all meetings on empty query', () => {
      expect(filterMeetingsBySearch(meetings, '').length).toBe(2);
      expect(filterMeetingsBySearch(meetings, null).length).toBe(2);
    });
  });
});
