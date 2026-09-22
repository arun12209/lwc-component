/**
 * meetingsDomain.js
 * Pure domain logic for My Meetings LWC Suite: normalization, date/timezone math,
 * compact selection, temporal labels, URL validation, and attendee management.
 * Free of DOM dependencies for 100% testability.
 */

// Approved Opportunity record type DeveloperNames
export const APPROVED_OPPORTUNITY_RECORD_TYPES = ['Renewal', 'Growth'];

// Approved Status values (matching user-supplied "Schedules" and "Rescheduling", plus mapped "Scheduled")
export const APPROVED_STATUS_VALUES = ['Schedules', 'Rescheduling', 'Scheduled'];

// Allowed hosts for external URLs
export const ALLOWED_EXTERNAL_DOMAINS = [
  'salesforce.com',
  'force.com',
  'gartner.com'
];

/**
 * Validates external URL: must be HTTPS, contain no credentials, and match allowed domains.
 * @param {string} urlStr
 * @returns {boolean}
 */
export function validateExternalUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_EXTERNAL_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Extension point for Impact Assessment URL resolution.
 * Pure contract returning an HTTPS URL string or null.
 * Arun will implement dynamic URL construction in a future task.
 * @param {{ eventId: string, opportunityId: string }} context
 * @returns {string | null}
 */
export function resolveImpactAssessmentUrl({ eventId, opportunityId }) {
  if (!eventId || !opportunityId) {
    return null;
  }
  // Default unconfigured state: returns null so the UI can safely indicate "Setup pending"
  return null;
}

/**
 * Formats a Date instant in seller-local time with specified timezone and locale.
 * @param {Date | number} instant
 * @param {string} timeZone IANA timezone (e.g. 'Asia/Kolkata', 'America/New_York')
 * @param {string} locale e.g. 'en-US'
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {string}
 */
export function formatSellerTime(instant, timeZone, locale = 'en-US', options = {}) {
  if (!instant) return '';
  const date = instant instanceof Date ? instant : new Date(instant);
  if (isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

/**
 * Computes the UTC millisecond timestamp corresponding to local midnight (00:00:00.000)
 * in the specified IANA timezone for a given calendar date string 'YYYY-MM-DD'.
 * Handles DST shifts (23h / 25h days) and half/quarter-hour offsets accurately without fixed 24-hour arithmetic.
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} timeZone IANA timezone string
 * @returns {{ startMs: number, endExclusiveMs: number }}
 */
export function computeLocalMidnightBoundaries(dateStr, timeZone = 'UTC') {
  if (!dateStr || typeof dateStr !== 'string') {
    const now = new Date();
    dateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Calculate next day date string
  const nextDayDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDateStr = `${nextDayDate.getUTCFullYear()}-${String(nextDayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDayDate.getUTCDate()).padStart(2, '0')}`;

  function getLocalMidnightUtcMs(y, m, d, tz) {
    // Initial guess: UTC midnight of that date
    let guessMs = Date.UTC(y, m - 1, d, 0, 0, 0);
    // Refine with Intl.DateTimeFormat
    for (let i = 0; i < 3; i++) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      }).formatToParts(new Date(guessMs));
      
      const partMap = {};
      parts.forEach(p => (partMap[p.type] = p.value));
      const curHour = parseInt(partMap.hour === '24' ? '0' : partMap.hour, 10);
      const curMin = parseInt(partMap.minute, 10);
      const curSec = parseInt(partMap.second, 10);
      const curDay = parseInt(partMap.day, 10);

      // Difference in seconds to midnight
      let dayDiff = curDay - d;
      if (dayDiff > 1) dayDiff = 1;
      if (dayDiff < -1) dayDiff = -1;

      const offsetSec = dayDiff * 86400 + curHour * 3600 + curMin * 60 + curSec;
      if (offsetSec === 0) break;
      guessMs -= offsetSec * 1000;
    }
    return guessMs;
  }

  const startMs = getLocalMidnightUtcMs(year, month, day, timeZone);
  const [nextY, nextM, nextD] = nextDateStr.split('-').map(Number);
  const endExclusiveMs = getLocalMidnightUtcMs(nextY, nextM, nextD, timeZone);

  return { startMs, endExclusiveMs };
}

/**
 * Normalizes a raw GraphQL Event edge/node to the standard Meeting model.
 * Differentiates value, empty ("Not specified"), and unavailable ("Unavailable") states.
 * @param {object} node GraphQL Event node
 * @param {string} timeZone Seller's IANA timezone
 * @param {string} locale
 * @returns {object} Normalized Meeting object
 */
export function normalizeMeeting(node, timeZone = 'UTC', locale = 'en-US') {
  if (!node || !node.Id) return null;

  const eventId = node.Id;
  const subject = node.Subject?.value || 'Untitled Meeting';
  const statusValue = node.Status__c?.value || 'Scheduled';
  const isAllDay = Boolean(node.IsAllDayEvent?.value);
  const startRaw = node.StartDateTime?.value;
  const endRaw = node.EndDateTime?.value;
  const activityDate = node.ActivityDate?.value;

  let startInstant = startRaw ? new Date(startRaw) : null;
  let endInstant = endRaw ? new Date(endRaw) : null;
  let timeQuality = 'EXACT';

  if (isAllDay) {
    timeQuality = 'ALL_DAY';
  } else if (!startInstant || isNaN(startInstant.getTime())) {
    timeQuality = 'INVALID_START';
  } else if (!endInstant || isNaN(endInstant.getTime())) {
    timeQuality = 'MISSING_END';
  } else if (endInstant.getTime() < startInstant.getTime()) {
    timeQuality = 'INVALID_END';
  }

  // Related Opportunity
  const what = node.What || {};
  const opportunity = {
    id: what.Id || node.WhatId?.value || null,
    name: what.Name?.value || (what.Id ? 'View Opportunity' : 'Not linked'),
    recordTypeId: what.RecordTypeId?.value || null,
    availability: what.Id ? 'AVAILABLE' : 'NOT_SPECIFIED'
  };

  // Topic
  const topicVal = node.Topic__c?.value || node.Event_Topic__c?.value || null;
  const topic = {
    value: topicVal,
    label: topicVal || 'Not specified',
    availability: topicVal ? 'AVAILABLE' : (node.Topic__c !== undefined || node.Event_Topic__c !== undefined ? 'NOT_SPECIFIED' : 'UNAVAILABLE')
  };

  // Interaction Category
  const catVal = node.Interaction_Category__c?.value || null;
  const category = {
    value: catVal,
    label: catVal || 'Not specified',
    availability: catVal ? 'AVAILABLE' : (node.Interaction_Category__c !== undefined ? 'NOT_SPECIFIED' : 'UNAVAILABLE')
  };

  // Primary Person (Who)
  const who = node.Who || {};
  const whoId = node.WhoId?.value || who.Id || null;
  const whoName = who.Name?.value || null;
  const isContact = who.__typename === 'Contact' || (whoId && whoId.startsWith('003'));
  const isLead = who.__typename === 'Lead' || (whoId && whoId.startsWith('00Q'));

  const primaryPerson = {
    id: whoId,
    name: whoName || (whoId ? 'Primary Attendee' : null),
    objectApiName: isContact ? 'Contact' : (isLead ? 'Lead' : 'Name'),
    label: isContact ? 'Primary contact' : 'Primary related person',
    availability: whoId ? 'AVAILABLE' : 'NOT_SPECIFIED'
  };

  // Attendees list
  const attendeeItems = [];
  if (primaryPerson.id && primaryPerson.name) {
    attendeeItems.push({
      id: primaryPerson.id,
      name: primaryPerson.name,
      type: primaryPerson.objectApiName,
      isPrimary: true
    });
  }

  const attendees = {
    items: attendeeItems,
    completeness: 'PARTIAL', // Since UI API GraphQL does not expose EventRelation/EventWhoRelation
    exactCountOrNull: attendeeItems.length,
    fullListUnavailable: true
  };

  return {
    key: eventId,
    eventId,
    subject,
    statusValue,
    isAllDay,
    startInstant,
    endInstant,
    activityDate: activityDate || (startInstant ? startInstant.toISOString().slice(0, 10) : ''),
    opportunity,
    topic,
    category,
    primaryPerson,
    attendees,
    timeQuality,
    sourceCoverage: 'GRAPHQL'
  };
}

/**
 * Computes dynamic temporal labels for a meeting:
 * "All day", "In progress", "Starts in X min", "Earlier today", or time span.
 * @param {object} meeting Normalized Meeting
 * @param {Date} now Current instant
 * @param {string} timeZone Seller's IANA timezone
 * @param {string} locale
 * @returns {{ badgeLabel: string, timeDisplay: string, isElapsed: boolean, isInProgress: boolean }}
 */
export function getMeetingTemporalState(meeting, now = new Date(), timeZone = 'UTC', locale = 'en-US') {
  if (!meeting) return { badgeLabel: '', timeDisplay: '', isElapsed: false, isInProgress: false };

  if (meeting.isAllDay) {
    return {
      badgeLabel: 'All day',
      timeDisplay: 'All day',
      isElapsed: false,
      isInProgress: false
    };
  }

  const startMs = meeting.startInstant ? meeting.startInstant.getTime() : 0;
  const endMs = meeting.endInstant ? meeting.endInstant.getTime() : startMs;
  const nowMs = now.getTime();

  const startTimeStr = formatSellerTime(meeting.startInstant, timeZone, locale, {
    hour: 'numeric',
    minute: '2-digit'
  });
  const endTimeStr = meeting.endInstant
    ? formatSellerTime(meeting.endInstant, timeZone, locale, { hour: 'numeric', minute: '2-digit' })
    : '';

  const timeDisplay = endTimeStr ? `${startTimeStr} – ${endTimeStr}` : startTimeStr;

  if (nowMs >= startMs && nowMs < endMs) {
    return {
      badgeLabel: 'In progress',
      timeDisplay,
      isElapsed: false,
      isInProgress: true
    };
  }

  if (nowMs < startMs) {
    const diffMins = Math.round((startMs - nowMs) / 60000);
    if (diffMins <= 60 && diffMins > 0) {
      return {
        badgeLabel: `Starts in ${diffMins} min`,
        timeDisplay,
        isElapsed: false,
        isInProgress: false
      };
    }
    return {
      badgeLabel: '',
      timeDisplay,
      isElapsed: false,
      isInProgress: false
    };
  }

  // Meeting has ended
  return {
    badgeLabel: 'Earlier today',
    timeDisplay,
    isElapsed: true,
    isInProgress: false
  };
}

/**
 * Compact Today selection algorithm:
 * 1. All-day meetings first
 * 2. In-progress meetings
 * 3. Upcoming meetings sorted chronologically by start
 * 4. If total < maxVisible, fill from most recent elapsed meetings
 * 5. Display selected timed meetings chronologically
 * @param {object[]} meetings Array of normalized meetings
 * @param {number} maxVisible Maximum visible cards (1-3)
 * @param {Date} now Current instant
 * @returns {object[]} Selected meetings
 */
export function selectCompactTodayMeetings(meetings = [], maxVisible = 3, now = new Date()) {
  if (!meetings || !meetings.length) return [];
  const limit = Math.min(Math.max(Number(maxVisible) || 3, 1), 3);

  const allDay = [];
  const inProgress = [];
  const upcoming = [];
  const elapsed = [];

  const nowMs = now.getTime();

  for (const m of meetings) {
    if (m.isAllDay) {
      allDay.push(m);
    } else {
      const startMs = m.startInstant ? m.startInstant.getTime() : 0;
      const endMs = m.endInstant ? m.endInstant.getTime() : startMs;

      if (nowMs >= startMs && nowMs < endMs) {
        inProgress.push(m);
      } else if (nowMs < startMs) {
        upcoming.push(m);
      } else {
        elapsed.push(m);
      }
    }
  }

  // Sort upcoming chronologically ascending
  upcoming.sort((a, b) => (a.startInstant?.getTime() || 0) - (b.startInstant?.getTime() || 0));
  // Sort elapsed descending (most recent first) for filling
  elapsed.sort((a, b) => (b.startInstant?.getTime() || 0) - (a.startInstant?.getTime() || 0));

  const selected = [];

  // 1. All-day first
  for (const m of allDay) {
    if (selected.length < limit) selected.push(m);
  }
  // 2. In-progress
  for (const m of inProgress) {
    if (selected.length < limit) selected.push(m);
  }
  // 3. Upcoming
  for (const m of upcoming) {
    if (selected.length < limit) selected.push(m);
  }
  // 4. Fill from most recent elapsed
  for (const m of elapsed) {
    if (selected.length < limit) selected.push(m);
  }

  // Separate all-day and timed for final chronological display
  const finalAllDay = selected.filter(m => m.isAllDay);
  const finalTimed = selected.filter(m => !m.isAllDay);
  finalTimed.sort((a, b) => (a.startInstant?.getTime() || 0) - (b.startInstant?.getTime() || 0));

  return [...finalAllDay, ...finalTimed];
}

/**
 * Compact Tomorrow selection algorithm:
 * 1. All-day meetings first
 * 2. Earliest start time up to maxVisible
 * @param {object[]} meetings
 * @param {number} maxVisible
 * @returns {object[]}
 */
export function selectCompactTomorrowMeetings(meetings = [], maxVisible = 3) {
  if (!meetings || !meetings.length) return [];
  const limit = Math.min(Math.max(Number(maxVisible) || 3, 1), 3);

  const allDay = meetings.filter(m => m.isAllDay);
  const timed = meetings.filter(m => !m.isAllDay);

  timed.sort((a, b) => (a.startInstant?.getTime() || 0) - (b.startInstant?.getTime() || 0));

  const selected = [...allDay, ...timed].slice(0, limit);
  return selected;
}

/**
 * Filters meetings by search query across subject, Opportunity name, topic, category, and attendees.
 * @param {object[]} meetings
 * @param {string} query
 * @returns {object[]}
 */
export function filterMeetingsBySearch(meetings = [], query = '') {
  if (!query || !query.trim()) return meetings;
  const q = query.toLowerCase().trim();

  return meetings.filter(m => {
    if (m.subject && m.subject.toLowerCase().includes(q)) return true;
    if (m.opportunity?.name && m.opportunity.name.toLowerCase().includes(q)) return true;
    if (m.topic?.value && m.topic.value.toLowerCase().includes(q)) return true;
    if (m.category?.value && m.category.value.toLowerCase().includes(q)) return true;
    if (m.attendees?.items?.some(a => a.name && a.name.toLowerCase().includes(q))) return true;
    return false;
  });
}
