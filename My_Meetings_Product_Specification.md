# My Meetings Product Specification

Product requirements and implementation contract for the Salesforce Actionable Homepage

Prepared for Arun Kumar and the Customer 360 team · 22 September 2026 · Version 2.0

## 1 Product and architecture decision

Create a new LWC named `homepageMyMeetings`, embedded in the existing `homepageContainer`. Use this plural name consistently in source, metadata, imports, tests, and documentation. There is no existing meetings component to modify. Inspect the real container before editing it; preserve its current responsibilities and sibling components.

Use a shared agenda component for Today and Tomorrow, with a date and data passed as properties. Use a separate Calendar component. Reuse meeting cards and attendee presentation across agenda surfaces. Use a supported expanded modal for View All and full calendar views. Do not create separate Today and Tomorrow LWCs containing identical markup, queries, or business rules. The useful boundaries are behavior and reuse, rather than the number of tabs. Salesforce’s component composition model supports this ownership pattern. [S25]

The component is a focused CRM meeting reader: eligible Renewal and Growth Opportunity meetings, preparation context, and access to Impact Assessment. It is not a complete personal calendar or an external availability system. Read meeting data using `lightning/graphql` in the current user’s security context. No Apex Event queries, REST SOQL substitution, or copied Event database are permitted.

The homepage displays at most three meetings per agenda tab. View All provides the full selected-day list. Calendar provides a compact month selector and an expanded week, workweek, month, and agenda workspace. The primary card action is Open Impact Assessment; Manage Meetings opens the existing dashboard. Custom scheduling, invitations, provider synchronization, and recurrence editing are outside this release.

## 2 Changes and evidence

This revision supersedes the previous broad meeting scope, generic compact rows, Join-first actions, and speculative client classification. The user’s company requirements now define eligibility and mandatory fields. Internal meetings, unlinked events, Account-linked events, and events linked to other Opportunity record types must not be fetched by the production meeting query or displayed.

| Requirement | Binding decision |
|---|---|
| New component | Create homepageMyMeetings inside existing homepageContainer |
| Status filter | Use Status__c values Schedules and Rescheduling after confirming stored API values |
| Opportunity filter | Only Renewal Opportunity and Growth Opportunity record types |
| Required content | Subject, StartDateTime, Topic__c, Opportunity, attendees, Interaction_Category__c |
| Homepage limit | Maximum three cards; no fourth card or hidden scroll list |
| Preparation action | Open Impact Assessment on every meeting card; dynamic URL built later by Arun |
| Management action | Manage Meetings in the top right, linked to the existing dashboard |
| Expanded list | All eligible meetings for the selected day, with explicit pagination |
| Source constraint | GraphQL meeting reads; no Apex fallback |

The original homepage photograph shows a narrow right column beside a wide To-Do area, with On My Radar below meetings. The new agenda photograph establishes the required information and preparation action. The second new photograph establishes an expanded table, tabs, close control, and scrollable list. These are rough layout references, not exact CSS measurements or approved typography. The expanded mockup includes different dates under Today; implement correct selected-day filtering instead of reproducing that sample inconsistency. Use the written label Manage Meetings, even though the mockup uses My Meetings Fasttrack.

No target org, source repository, schema, dashboard URL, or attendee relationship sample was supplied. Public Salesforce composition, GraphQL polymorphic filters, joins, metadata, field operators, adapter, and modal documentation were retrieved directly on 22 September 2026. The broader product comparison and native calendar research are retained from 17 September. Org-specific feasibility is unverified. The refreshed polymorphic documentation still labels Event and Task support as Beta starting with API v59.0; do not interpret general UI API object availability as a production support guarantee. Confirm the target release, relevant feature status, and company acceptance before deployment. [S01, S02, S26]

## 3 Eligibility and the meaning of My Meetings

An eligible event must satisfy every condition: it is readable by the current seller; it belongs to the agreed personal meeting scope; its Status__c is one of the two approved stored values; its What relationship is an Opportunity; that Opportunity has one of the two approved record types; and its occurrence intersects the selected date range. Apply the same predicate to lists, counts, calendar indicators, search, overflow, and expanded views.

The user supplied record type labels, not DeveloperNames or record type IDs. Resolve the actual Opportunity record types in the org. Do not invent `Renewal_Opportunity` or `Growth_Opportunity`, and do not hardcode sandbox IDs. Do not filter on the Event’s own RecordTypeId. Do not exclude closed Opportunities or add an Opportunity owner condition; neither was requested. Validate the exact status spelling Schedules. If metadata says the stored value differs, document the label-to-value mapping; do not silently correct it.

Proposed initial personal scope is `Event.OwnerId = currentUserId`, including readable child Event records where relevant. This is an explicit implementation assumption, not a confirmed business rule. Salesforce visibility is broader than ownership, and owning the Opportunity does not mean owning the meeting. Before release, reconcile with representative sellers and determine whether invited-only meetings are required. If they are, prove a supported invitee relationship or child-event route in GraphQL. Never switch to all visible company events to approximate My Meetings, and never label an owned-only implementation as including every invitation.

If an eligibility field is inaccessible or a mandatory predicate cannot be applied reliably, fail closed for the affected scope. Do not show unverified records. Optional presentation fields can degrade gracefully; eligibility fields cannot be removed to make the query pass.

## 4 Component structure and ownership

Use the following concrete structure. All bundles are siblings in the project’s `lwc` directory; nesting happens in templates. Only homepageMyMeetings is embedded in homepageContainer. Child bundles should not be exposed in App Builder. Standalone HomePage exposure of the parent is optional and must follow the existing project’s conventions.

| Bundle or module | Responsibility | Data access |
|---|---|---|
| homepageMyMeetings | Header, tabs, homepage state, modal launch, navigation integration | Hosts active data provider |
| homepageMeetingAgenda | One reusable Today, Tomorrow, or selected-date agenda | Immutable properties only |
| homepageMeetingCard | Required field layout and Impact Assessment intent | No query |
| homepageMeetingAttendees | Known people, completeness labels, overflow disclosure | No query; emits request for more |
| homepageMeetingCalendar | Mini month and expanded renderer, date navigation, overflow | No query; emits range and selection intents |
| homepageMeetingsModal | LightningModal shell, expanded tabs and list/calendar controls | Hosts provider while expanded |
| homepageMeetingsData | Reusable headless LWC using GraphQL wire, pagination, refresh | Only meeting wire owner per active surface |
| meetingsDomain and meetingsQueries | Pure date, eligibility, normalization, ordering, query definitions | No DOM or global mutable event store |

This is a small modular system, not a component for every label or cell. The attendee child is justified by reuse in cards, table rows, and details. A separate expanded table child is optional if its accessible rendering becomes substantial; do not extract it merely to increase component count.

Parent-to-child data uses `@api` properties. Children never mutate received arrays or objects. User intents use narrowly scoped custom events handled by the immediate owning component. Bubble or compose only when a verified boundary requires it. Pass record IDs and intent, not DOM nodes, callbacks embedded in event records, or GraphQL wire objects.

### 4.1 Data ownership across expansion

Homepage owns one data-provider instance for the compact surface. Today and Tomorrow share a two-day result set; switching between them does not create separate wires. Calendar requests its visible date range only when activated. Hidden tab children do not query.

Before opening the modal, retain the compact state and a normalized snapshot, then suspend or unmount the homepage provider. Pass configuration, initial selected day/view, and a copy of the permitted snapshot into the modal. The modal owns its provider and uses the same query and domain modules. Treat the snapshot as initial cached content; revalidate it. LDS may serve cached data, but do not promise zero network requests. The modal’s properties are initialization inputs, not a live parent-to-modal state channel. [S02, S23]

On close, the modal returns presentation state and a refresh-needed flag through its close result. Resume the homepage provider and refresh collection membership. Restore focus to the actual launcher, including after Escape dismissal or opening failure. Do not share a module-level mutable meeting array between page instances or users. Two component instances must remain isolated.

Use a child within LightningModal for any NavigationMixin behavior, following platform guidance. Impact Assessment intent can be forwarded through `.open({ onimpactassessment: handler })` when LWS and the project support modal events; verify this path. If modal event forwarding is unavailable, use a shared synchronous URL resolver imported by both action hosts or leave the action unconfigured. Do not introduce Lightning Message Service solely for this component. [S23]

## 5 Homepage design

### 5.1 Layout and density

Use the existing homepage surface, font, border, radius, and spacing tokens. Initial fallback values are white surface, #181818 text, #526171 secondary text, #D8DDE6 border, and #0B5CAB actions. Follow a 4 px spacing rhythm with 8, 12, and 16 px gaps. Design at 320, 360, and 420 CSS px, then measure the real region at 100 percent zoom. Avoid decorative glass, oversized icons, gradients, or large colored status pills.

Header: My Meetings at left and the text action Manage Meetings at right. Refresh is a secondary icon action with an accessible name. At narrow widths, allow a deliberate two-row header, keeping Manage Meetings aligned right; do not squeeze the title or turn the management action into an unexplained icon. Below it, place Today, Tomorrow, Calendar as real peer tabs. A small day/date and display-timezone line anchors the content.

Three full cards containing all requested fields cannot fit the original approximately 250 to 350 px card footprint. Budget roughly 180 to 210 px per card at 360 px width, plus about 130 px for header, tabs, date, and footer. Three cards therefore need approximately 670 to 760 px, with additional height for wrapping or zoom. These are starting layout budgets, not fixed heights. Default maxVisibleMeetings is three; allow the existing container to pass one, two, or three, capped at three. If the real homepage cannot accommodate three, use two and View All. Never hide mandatory information with clipping to meet a height budget.

No nested scroll region in the compact agenda. Let the card grow naturally up to the configured number of cards, reserving matching skeleton space during initial loading. View All is the continuation mechanism. Respect the layout needs of On My Radar below it.

### 5.2 Meeting card hierarchy

Each card shows, in this order: seller-local start and end time with a subtle temporal label; subject as a link; linked Opportunity name; category and topic with visible labels; attendee summary; Open Impact Assessment. Subject may wrap to two lines; Opportunity may wrap to two lines. Full values remain available in the accessible name and expanded detail. Do not put critical full text only in a hover tooltip.

Use compact labeled text for Category and Topic, rather than a large stack of generic pills. Show Rescheduling as a small text badge when applicable. Schedules does not need an attention badge. Null category or topic says Not specified. A field denied by permissions says Unavailable when needed; do not imply a blank business value.

Subject opens the native Event record using supported navigation. Opportunity opens the related Opportunity. These are distinct links; the whole card is not a clickable container with nested interactive controls. Calendar event selection may open an in-component detail region first, with Open event as a clear link.

The Impact Assessment button has the exact requested label. Prefer a full-width outline action in narrow cards; at least 32 px high for fine pointers and 44 px on touch. Until configured, retain the button disabled with visible nearby text Setup pending. Once configured, indicate that it opens an external tool in a new tab. Never route to a dummy domain.

### 5.3 Selection and counts

Today’s compact selection prioritizes all-day meetings, then in-progress timed meetings, then upcoming timed meetings by start time. If fewer than the configured maximum remain, fill from the most recent elapsed meetings. After selection, display all-day cards first and selected timed cards chronologically. This keeps preparation useful without losing access to earlier meetings. Label elapsed entries Earlier today. If all meetings have ended, show the most recent eligible meetings and do not claim the day is empty.

Tomorrow shows all-day items first, then the earliest timed meetings, up to the configured maximum. View All always includes every eligible meeting for the selected day, including earlier Today meetings. This card selection rule does not change tab totals.

When complete, show tab counts and footer text such as View all today (8). When loading or incomplete, omit the exact total or explicitly label a lower bound; never present the first page size as the total. Keep View All available whenever results exist, even when three or fewer exist, because it provides a readable table. For zero results, the footer can offer Open calendar instead. Empty copy is No eligible Opportunity meetings today, with a concise scope explanation available. Never say Your calendar is clear: other events are intentionally excluded.

## 6 View All experience

View All opens homepageMeetingsModal in list mode, on the originating date. The title is My Meetings, with Today, Tomorrow, and Calendar tabs, an explicit date heading, display timezone, refresh, and a platform-supported close control. Today and Tomorrow each show only their own local calendar day. A date opened from the mini month appears as a selected-date agenda within Calendar, rather than being mislabeled Today.

Use a large LightningModal. Respect its supported sizing rather than overriding private platform DOM. The table body scrolls within the modal; keep the header and essential controls available. On narrow containers, replace the table with the shared cards and a Load more action. Do not create horizontal page overflow to preserve a desktop table.

| Column | Contents |
|---|---|
| Start time | Local start and end, All day where appropriate; full date in date heading |
| Subject | Event link, up to two lines, temporal or Rescheduling label when useful |
| Attendees | Known participant summary with accessible overflow and completeness state |
| Related to | Opportunity link; full name available in detail |
| Category and topic | Two labeled values; meaningful null and access states |
| Action | Open Impact Assessment with the same configuration behavior as cards |

Start-time ascending is the default sort; all-day rows appear first. Permit ascending/descending start-time sorting when the full selected-day set is loaded. Search this day searches permitted loaded subject, Opportunity, topic, category, and known attendee names. While incomplete, label it Search loaded meetings and retain Load more; do not claim a global or exhaustive search. Search is local and does not alter server eligibility.

Provide a count, completeness state, and explicit Load more or Retry. A successful page is not proof of a complete day. Load initial pages automatically within the budget in section 12, then require continuation if needed. Sticky table headers, correct column labels, and visible focus are required. Prefer an accessible semantic table or a supported datatable implementation proven to handle participant overflow and the required action; do not force arbitrary custom content into unsupported cell APIs.

Do not open a second modal over the first for attendees or detail. Use an inline disclosure or a detail region within the same dialog. Escape closes a local disclosure before closing the dialog. Return from detail restores the row and scroll position. Manage Meetings remains available in the expanded header or action area.

## 7 Calendar experience

The compact Calendar tab is a six-row month picker, not a squeezed week grid. It shows month/year, previous/next, Today, weekday labels, a distinct today marker, a selected-date marker, and meeting dots. Use one to three dots, where three means three or more; accessible names provide an exact count only after complete loading. Blank indicators during loading do not mean no meetings.

Below the month, show the selected date and up to the configured maximum of shared meeting cards, with View all for this date and Expand calendar. This can be taller than the agenda tabs. For a constrained homepage, configure one selected-day preview card; full details remain in expansion. Do not compress date targets or mandatory field text to force the month into the original empty-state height.

Expanded Calendar provides Week, Workweek, Month, and Agenda. Workweek defaults to Monday to Friday unless the project’s locale or business configuration establishes otherwise. Week always exposes weekend meetings. Month provides titles, dates, and +N more overflow. Week uses a time grid, separate all-day lane, overlap columns, and a subtle current-time line. The entire 24-hour day must remain reachable; an initial scroll position at 08:00 is not a data filter.

Request the actual visible date span, including adjacent-month days in the month grid. A week view uses the locale’s first weekday. Navigation changes the range; selection changes the detail/agenda. Preserve selected date across mode changes. Detail shows the same required fields and action as the card, full date/time, duration if known, and Open event. There is no drag, resize, creation, or edit interaction in this release.

Below about 760 px available content width, prefer Agenda over a seven-column time grid. A docked detail area is allowed only when at least 720 px remains for the calendar itself; otherwise replace the body with detail and a Back action. Use container measurements, not browser width alone.

For expanded rendering, evaluate a maintained calendar library such as FullCalendar against the org’s LWS, CSP, accessibility, bundle size, and license requirements. Pin a verified version as a Salesforce static resource and lazy-load it on expansion. Do not fetch scripts from a runtime CDN. Do not assume an older library version is current or a commercial scheduler license is included. A failed library spike requires a documented accessible custom reader or staged delivery, not an untested production dependency. The mini month can be a small custom LWC with a tested date-grid model. [S19, S20]

## 8 Attendees and the Salesforce Name field

WhoId and its Who relationship represent the primary related person; they do not establish the complete attendee list. Owner is not automatically organizer. Related contacts are not automatically invited attendees, and a participant record does not prove acceptance. These distinctions matter when the business requests multiple names.

Discover the actual source in the target org: EventRelation, EventWhoRelation, another supported child relationship, and the org’s Shared Activities behavior. Verify both semantics and GraphQL availability. An object appearing in the general REST object reference does not establish UI API GraphQL support. Introspection, a bounded real query, and comparison with native Event attendees are required. EventRelation and EventWhoRelation support has not been proven for this project. [S03, S21, S28, S29]

Preferred implementation batches participant reads for the visible Event IDs, using a supported GraphQL connection or object. Fetch the attendee subset rather than every relationship to the Event. Paginate the relation connection independently. Deduplicate by verified participant identity, not display name. Preserve distinction among contact, lead, internal user, and other supported types. Do not invent unknown email identities, RSVP states, or external attendees that the source does not expose.

At 360 px, show the first known attendee as a quiet name chip or text link, followed by +N when the remaining distinct count is exact. At wider widths, allow two names. Name order is deterministic, using a verified primary attendee first, then localized name order with identity as tie-breaker. Initials are optional; photographs and a new avatar service are unnecessary. Long names truncate accessibly without pushing the overflow control offscreen.

Clicking +N reveals an accessible list of all loaded attendees within the current surface. Each readable person record may be linked. If more participant pages exist, provide Load more attendees and say More attendees rather than inventing N. Distinguish complete, partial, unavailable, and loading states. A complete empty attendee list says No attendees recorded.

If full attendees cannot be read through GraphQL, show the verified primary person as Primary contact, followed by Full attendee list unavailable and Open event. Do not label that person as the entire attendee list. This is a degraded mode requiring explicit business acceptance before release; multiple-attendee support remains unmet. Do not silently introduce Apex or REST attendee reads. Where the primary person is not a contact, use Primary related person instead of mislabeling their type.

## 9 Timezone and date rules

Default to the seller’s Salesforce user timezone, obtained through the appropriate Salesforce internationalization module for the Lightning context. Browser or operating-system timezone must not silently control this component. Use the user’s locale for date formatting and 12/24-hour conventions. Display a concise timezone label near the date, with its IANA identifier available in detail. Avoid ambiguous numeric dates like 3/11/2026; use 11 Mar 2026 or the locale’s equivalent. [S22]

Salesforce DateTime values represent instants. Parse their explicit UTC/offset values and format them in the seller’s zone. The timezone in which the organizer originally entered a meeting cannot be recovered from StartDateTime alone. If no verified source field stores it, do not invent Meeting timezone or convert using the organizer’s current User timezone. If an existing reliable field is later mapped, show the original scheduled zone secondarily in detail; the seller’s zone still governs tab membership.

Today is the seller’s current calendar date. Tomorrow is the next calendar date, including weekends. Compute the UTC instant corresponding to local midnight at each boundary independently; do not calculate tomorrow by adding 24 hours. A day may be 23 or 25 hours during daylight-saving transitions. Use an approved existing timezone utility or a pinned, tested library through the project’s supported packaging. Browser Intl formats instants but does not itself provide a complete arbitrary-zone midnight constructor. Do not write an untested offset guessing loop.

A timed meeting overlaps a day when start is before the day’s exclusive end and end is after its start. A meeting ending exactly at midnight belongs to the previous day only. A zero-duration event belongs to the date of its start; handle it through a separate start-in-range branch if the source permits it. Missing or invalid end times must be surfaced as incomplete time information; do not invent a duration. A cross-midnight event appears on each intersected day, with a continuation label and full date range in detail. Count it once per day, and once by Event occurrence identity in a multi-day unique total.

All-day events are calendar dates, not midnight appointments in the seller’s timezone. Keep an explicit date-only start and exclusive end in the domain model. Verify Salesforce ActivityDate and end-field semantics with native examples, including multi-day all-day events, before normalizing. Never pass a date-only string through browser-local Date parsing and shift it across timezones. The all-day query may need its own date predicate; it must retain the same status, Opportunity, record-type, and personal-scope filters.

On midnight, browser wake, and return to a stale visible tab, recalculate the seller’s date and refresh the active range. A minute timer updates In progress or Starts in 10 min locally and must not trigger minute-by-minute queries. Stop timers when hidden or disconnected. For repeated DST hours, distinguish both instants with explicit offset in the ambiguous time label. Do not use an ambiguous abbreviation such as CST by itself. Half-hour and quarter-hour offsets must work.

P0 needs one display timezone. A persistent timezone switcher, multiple parallel axes, timezone preferences database, and travel detection are not necessary. A secondary timezone is a later feature only if sellers demonstrate the need.

## 10 GraphQL feasibility and hard gates

Use the current `lightning/graphql` adapter, `gql`, reactive variables, and the returned refresh function, pinned to a tested org/API version. The adapter uses LDS and the current user’s object and field permissions. It exposes `errors` plural. It does not currently support Mobile Offline. Scope this release to connected Lightning use. [S02, S05]

Salesforce documents polymorphic filters for What and shows type-specific nested filters. This is the preferred route to filter Event.What to Opportunity and then Opportunity.RecordTypeId in the same query. Salesforce also documents semi-joins over reference fields, including polymorphic references. These are credible implementation routes; neither is certified for this org until the actual Event filter schema is inspected and queried. [S26, S27]

| Capability | Current assessment | Release requirement |
|---|---|---|
| Event reads and custom fields | Supported platform direction; exact schema and release status unverified | Query as ordinary seller and restricted user |
| Status predicate | Straightforward if exposed and filterable | Verify stored values and filter type |
| Opportunity record type predicate | Prefer polymorphic What filter; semi-join alternative | Server must exclude nonqualifying events |
| Multiple attendees | Main unresolved data capability | Prove GraphQL attendee source or disclose unmet requirement |
| Seller-local dates | Feasible in client/domain layer | DST and all-day fixtures pass |
| Full recurrence coverage | Source-dependent | Reconcile current occurrences from older series |
| Impact Assessment | UI and extension contract feasible now | Dynamic URL remains Arun’s integration task |
| Existing dashboard | Configuration-driven navigation | Obtain and validate real dashboard destination |

Do not query every eligible Opportunity in the org and put all IDs in a giant Event filter. Do not fetch unfiltered Events and discard non-Opportunity records client-side as a silent fallback: the user explicitly requested not bringing those events. A bounded candidate-fetch fallback would change that requirement and is therefore not authorized by this specification. If neither a polymorphic filter nor a supported semi-join works, report the exact schema error and leave the live data integration blocked while continuing isolated UI work.

Required gate evidence is a sanitized capability report with API version, Event filter type, What filter shape, available relationship union types, record-type metadata mapping, status values, mandatory custom field access, attendee coverage, recurrence coverage, all-day convention, and representative-user query outcomes. Tests with Jest fixtures do not prove live Salesforce capability. Do not log raw meeting data in the report.

## 11 Metadata and query contract

Read metadata before compiling production query documents. Activity custom fields are expected on Event as Status__c, Topic__c, and Interaction_Category__c; verify namespace prefixes and access. Do not query an invented generic Activity connection. GraphQL objectInfos can expose object, field, record-type, and supported picklist metadata; picklist metadata availability is API-version dependent. Prefer this route where supported. Existing project metadata tooling may provide build-time mappings without changing the GraphQL-only meeting-read rule. [S30]

Resolve the two Opportunity record types by the supplied labels during discovery, verify actual DeveloperNames, and persist a reviewed mapping in the project’s configuration. At runtime use org-specific IDs resolved by supported metadata, or a verified DeveloperName relationship filter. A record type being unavailable for creation does not mean existing records of that type must be excluded from reads. Never derive names by replacing spaces with underscores.

The following is a candidate timed-event query, not drop-in certified code. Introspection must confirm every field, scalar, filter, orderBy field, and inline-fragment type. It intentionally excludes all-day events, which require their verified date query. It illustrates an owned-only scope assumption; invited coverage must be resolved separately. [S03, S04, S26]

```graphql
query HomepageTimedMeetings(
  $sellerId: ID!
  $recordTypeIds: [ID!]!
  $rangeStart: DateTime!
  $rangeEnd: DateTime!
  $after: String
) {
  uiapi {
    query {
      Event(
        first: 100
        after: $after
        where: {
          and: [
            { OwnerId: { eq: $sellerId } }
            { Status__c: { in: ["Schedules", "Rescheduling"] } }
            { IsAllDayEvent: { eq: false } }
            { What: { Opportunity: {
                RecordTypeId: { in: $recordTypeIds }
            } } }
            { StartDateTime: { lt: { value: $rangeEnd } } }
            { EndDateTime: { gt: { value: $rangeStart } } }
          ]
        }
        orderBy: { StartDateTime: { order: ASC } }
      ) {
        edges {
          cursor
          node {
            Id
            Subject { value }
            StartDateTime { value }
            EndDateTime { value }
            IsAllDayEvent { value }
            Status__c { value }
            Topic__c { value }
            Interaction_Category__c { value }
            WhatId { value }
            WhoId { value }
            What {
              ... on Opportunity {
                Id
                Name { value }
                RecordTypeId { value }
              }
            }
          }
        }
        pageInfo { endCursor hasNextPage }
      }
    }
  }
}
```

Add the supported zero-duration and invalid-end handling explicitly if fixtures require it; the sample’s strict overlap branch alone does not cover those records. Resolve picklist display labels with supported returned metadata/label fields. Use stored values for eligibility. The primary Who name and attendee enrichment are separate schema-validated selections; their absence from this sample is not a claim that WhoId is sufficient.

If the polymorphic predicate is unavailable but the reference semi-join is supported, validate this replacement predicate in isolation, with all other filters retained:

```graphql
WhatId: {
  inq: {
    Opportunity: { RecordTypeId: { in: $recordTypeIds } }
    ApiName: "Id"
  }
}
```

Respect semi-join restrictions, including combinations with OR and other joins, rather than mechanically composing arbitrary predicates. Do not nest an additional record-type semi-join unnecessarily when resolved record-type IDs suffice. All queries remain bounded by date and personal scope. Use variables for dates, IDs, and cursors, never interpolated user text. Optional field directives are permitted only if supported by the pinned API; they do not make missing filter fields or unsupported objects safe. [S08, S27]

## 12 Pagination refresh and coverage

Homepage initially loads the two seller-local days required by Today and Tomorrow. Share these results across the tabs. Calendar loads only its visible span. Use cursor pagination and deduplicate repeated wire emissions by Event occurrence identity. Page size 100 is an initial tuning value, not a total limit. The three-card limit is applied after eligibility, normalization, and compact selection, not as `first: 3` on an incomplete query. [S07]

Automatically load up to an initial safety budget of 1,000 Event records per active range, with no more than two independent connections in flight. This is a configurable client budget, not a Salesforce platform limit. Stop with explicit partial status and Continue loading if more records exist. Do not silently truncate. Retain distinct completeness for Event results, all-day results, and attendee enrichment. Exact meeting counts require the Event scope to be complete; exact attendee counts require their relation scope to be complete.

Use an active range/request generation to ignore late responses after navigation. Key data by user, zone, date range, scope/configuration version, and query shape. Merge pages by ID; preserve deterministic ordering with a stable identity tie-breaker. Refresh resets cursors, re-evaluates membership, and replaces the range result after a successful consistent reload. Cached individual record updates do not guarantee the membership of the original filtered collection has been recalculated. [S06]

Manual refresh preserves current tab, date, search, and mode where possible. A record moved to a different date, switched to an excluded status, reassigned, relinked, or deleted must disappear after refresh. An inserted matching event must appear. Do not poll the full calendar on a minute timer. Resume refresh on visibility when the existing data is older than a configurable initial five-minute threshold, plus mandatory local-day rollover handling. Refresh reads Salesforce; it does not force Outlook, Google, or Einstein Activity Capture synchronization. [S13]

Do not drop all IsChild records, deduplicate by subject/time, or expand recurring masters into guessed occurrences. Validate owned and invited copies, materialized recurrence, rescheduled exceptions, deleted occurrences, and current meetings from series created long ago. If GraphQL returns only a master without a supported way to enumerate the required occurrences, recurrence coverage is a blocker, not a reason to silently invent RRULE logic.

## 13 Normalized data and component APIs

Normalize GraphQL nodes before rendering. Views must not navigate deeply through wire payloads or each implement their own filter. The following is a logical contract; use the project’s JavaScript conventions rather than introducing TypeScript solely for this feature.

```text
Meeting
  key, eventId, subject, statusValue
  startInstant, endInstant, isAllDay
  startDateOnly, endDateExclusive
  opportunity: id, name, recordTypeId
  topic: value, label, availability
  category: value, label, availability
  primaryPerson: id, name, objectApiName, availability
  attendees: items[], completeness, exactCountOrNull
  timeQuality, sourceCoverage

RangeResult
  key, startDate, endDateExclusive, displayZone
  meetings[], completeness, hasMore
  eventErrors[], enrichmentErrors[], lastCheckedAt
```

Availability differentiates value, empty, and unavailable. Range completeness differentiates loading, partial, complete, and failed. Do not serialize these records into localStorage or sessionStorage. User view preferences may be retained under a namespaced key without meeting content.

Agenda properties: meetings, dateKey, displayZone, maxVisibleMeetings, completeness, and totalCountOrNull. Card properties: meeting, displayZone, and actionState. Calendar properties: meetings, selectedDate, visibleRange, viewMode, and completeness. Data-provider properties: range, scopeConfig, displayZone, enabled; it emits normalized range data and status, and exposes a supported refresh method to its owner. Never expose raw wire cursors as user-facing props.

Intent events include selectdate, rangechange, viewall, openevent, openopportunity, requestattendees, and impactassessment. Event details carry IDs/date/view plus only the minimal context required. Contract tests verify that the same meeting action carries the same Opportunity ID in cards, table rows, and calendar detail.

## 14 Action and configuration contracts

### 14.1 Open Impact Assessment

Implement a clean extension point now; Arun will implement dynamic external URL construction later. Export a pure resolver contract such as `resolveImpactAssessmentUrl({ eventId, opportunityId })`, returning a URL string or null. It returns null until configured. The action host calls it synchronously from the user interaction or prepares a validated anchor when a URL is available. Do not invent external query parameter names, authentication, deck identifiers, or a custom Event URL field.

If the existing homepage architecture prefers parent-owned actions, emit an impactassessment intent with eventId and opportunityId and let the parent supply the integration. Use one integration pattern consistently across compact and modal surfaces, including the modal event forwarding described in section 4. Do not implement both resolver and parent handler so that one click opens two tabs. The default recommended implementation is the shared resolver module, because the same contract works in both surfaces without a live callback channel.

Require HTTPS for external URLs, no embedded credentials, and an administrator-reviewed exact host or true subdomain allowlist. Build parameters later with URL and URLSearchParams; never concatenate unencoded record values. Do not include attendee names, emails, or sensitive meeting text in the link unless the integration explicitly requires them. Open only on user action, in a new tab with noopener and noreferrer. An unconfigured or rejected URL leaves the button disabled with an honest explanatory message. Technical inability to build the URL is not evidence that no assessments exist.

### 14.2 Manage Meetings

Expose a `manageMeetingsUrl` configuration property or use the existing homepage configuration mechanism. Supply the actual existing dashboard URL at deployment. Use the project’s supported Salesforce navigation pattern; a verified relative Salesforce route or same-org HTTPS URL is acceptable. Do not guess a Dashboard record ID or assume a particular dashboard page-reference type without testing it. A new tab preserves the seller’s homepage context; label that behavior accessibly. If no destination is configured, show a disabled action with Dashboard link not configured rather than a broken link.

### 14.3 Configuration boundaries

The existing container passes maximum visible cards, dashboard destination, display options, and feature flag using its established conventions. Validate maxVisibleMeetings to 1–3. Keep business predicates in one reviewed configuration module; end users cannot broaden them to all Events. Required field API names are explicit constants. Resolve record type IDs per org. Keep the actual URL resolver as a separate integration module. No new Custom Metadata object is required unless the project already uses a supported configuration path.

## 15 Accessibility and security

Target WCAG 2.2 AA for the custom experience. Use platform base components where they fit: tab behavior, buttons, tooltips, icons, and LightningModal. Test keyboard navigation, visible focus, screen reader announcements, 200 percent zoom, reduced motion, and effective 320 px content width. Calendar date navigation follows an established accessible grid pattern with arrow keys, Home/End, Page Up/Down, and Enter/Space selection. Provide a full date and truthful count in each date’s accessible name. Agenda is the equivalent accessible calendar representation. [S24]

Use text as well as color for selected date, today, Rescheduling, In progress, overlap, and errors. No essential hover-only information. Attendee overflow is a button with expanded state and keyboard-reachable contents. Close local disclosures before the modal, restore focus, and do not trap focus outside the active dialog. Do not announce a countdown every minute.

All record text is untrusted. Use escaped templates or supported formatted components; never insert subject, participant, or Opportunity strings through innerHTML. Enforce platform sharing, CRUD, and FLS through the current-user GraphQL context. Do not use elevated credentials or expose hidden names through counts, search, tooltip, telemetry, or cached snapshots. A denied Opportunity relationship means the event cannot be verified against mandatory eligibility and must not render.

P0 performs no Event writes. Do not attach updateRecord to drag callbacks, implement RSVP writes, or create Tasks as a surprise feature. External actions require clicks and the validated URL contract. Log sanitized error categories and timings rather than meeting subjects, participant names, URLs, or sensitive GraphQL payloads.

## 16 Small enhancements and later scope

The useful surprises should save a seller time without requiring another backend or inventing business conclusions.

| Enhancement | Release | Boundaries |
|---|---|---|
| Next and In progress labels | P0 | Derived from verified times in seller zone; no minute query |
| Rescheduling badge | P0 | Driven only by Status__c, not timing guesses |
| Context preserved on expansion | P0 | Same day, filters, and return focus |
| Search within the day or range | P0 | Clearly label partial loaded-data search |
| Overlap hint | P1 | Only among loaded eligible meetings; never claim full availability |
| Copy meeting summary | P1 | User-triggered plain text with permitted fields; no automatic sharing |
| Native Meeting Digest link | P1 | Enable only if useful and available in the org |
| Secondary timezone | Later | Add only after a concrete seller need is validated |
| Join link | Later | Requires a real verified source and URL validation |
| Create edit drag invitations sync | Separate scope | Requires write, recurrence, provider, and permission contracts |

A safe overlap label is Overlaps another Opportunity meeting shown here. Do not use Free time, No conflicts, or Calendar clear when the component deliberately excludes other meetings. Preparation completeness scores, AI summaries, risk scores, and attendee acceptance indicators are not inferred from the six requested fields.

## 17 Product research and native Salesforce gaps

There is no objective world’s best designed calendar. For this CRM homepage, Fantastical is the strongest compact agenda-to-calendar interaction reference; Apple Calendar is a useful reference for restraint and temporal clarity; Notion Calendar is useful for contextual detail and fast navigation. This is a design judgment based on public product materials, not a comparative usability study or award claim. Google Calendar provides a familiar model for week grids and scheduling conventions; Morgen suggests later connections between preparation tasks and time planning. [S14–S18]

Salesforce already provides day, week, month, and table views, previews, coworker calendars, public/resource calendars, and printable views. Object calendars can display Opportunity business dates. These are not missing features. Meeting Digest already supplies meeting context and preparation/follow-up capabilities in supported configurations. The opportunity here is a precise, consistently filtered homepage experience connected to this company’s Impact Assessment workflow. [S09, S11, S12]

| Documented native limitation or workflow gap | Proposed benefit |
|---|---|
| Native Calendar does not offer hiding weekends in the documented view | Workweek plus full Week, with weekends always reachable |
| Preview fields and other-user/public/resource details are limited | Consistent permitted Opportunity, category, topic, and attendee context |
| Native view has configuration-dependent item display limits | Explicit pagination and truthful completeness rather than silent omission |
| Object-calendar filter/sharing restrictions | One deployed and maintained business predicate for the pilot |
| Narrow homepage lacks full calendar space | Compact agendas and month navigation with purposeful expansion |
| Company-specific assessment preparation requires another tool | Stable Opportunity-aware action beside each eligible meeting |

The native limitations above were reviewed on 17 September against S10 and S11; confirm them against the target org’s release before describing them in launch materials. Native item limits vary, including documented 150/500 behavior; do not advertise a universal 150 limit or that this component is unlimited. Consistent pagination is a correctness requirement, not an excuse to query unbounded history.

## 18 States performance and operations

Initial loading preserves header and tab geometry and shows skeleton cards. A complete empty day shows the scoped empty message. A failed query shows Could not load meetings with Retry. A refresh failure preserves last known permitted results with Could not refresh and last-checked time. Unsupported configuration or mandatory field access shows a specific unavailable message, without raw schema internals in the seller UI. Participant enrichment errors do not erase otherwise valid meetings; they change attendee completeness.

GraphQL may return data and errors together. Classify errors by required eligibility, required display data, and optional enrichment. Never mark the affected range complete merely because some records arrived. Suppress records whose eligibility cannot be verified. Preserve verified records with a visible partial state when the response supports doing so safely.

Initial performance targets, to measure rather than claim achieved: warm useful agenda within 1.5 seconds and cold within 3 seconds at p95 on an agreed test network; cached Today/Tomorrow switching under 100 ms; no expanded calendar library in the initial homepage bundle path. Avoid one participant query per card. Enrich visible cards in batches and hydrate more rows on demand. Pin dependencies, release timers/listeners/renderer instances, and measure repeated open/close behavior.

Use existing telemetry only. Suggested measurements are load duration, query/page count, partial/error category, View All use, calendar expansion, and action click. Exclude record content and full external URLs. A feature flag in the existing container permits rollback without a data migration.

## 19 Acceptance criteria

| ID | Scenario | Required result |
|---|---|---|
| A01 | Component creation | New plural homepageMyMeetings embedded once in existing homepageContainer |
| A02 | Shared agenda | Today and Tomorrow use one agenda/card implementation and no tab-specific queries |
| A03 | Status values | Schedules and Rescheduling included; all other values excluded using verified API values |
| A04 | Related record | Only the two Opportunity record types; Account, null, other objects/types excluded server-side |
| A05 | Personal scope | Agreed owner/invitee fixtures reconcile; no broadening to all visible events |
| A06 | Required fields | Subject, time, topic, Opportunity, people, and category present with correct null/access states |
| A07 | Card limit | 0, 1, 2, 3, 4, and 8 events never show more than configured maximum of three |
| A08 | Today selection | In-progress/upcoming selection and elapsed fallback follow section 5; full history in View All |
| A09 | Counts | Exact only after complete eligibility scope; three cards may correctly accompany total eight |
| A10 | Impact action | Same Event/Opportunity IDs across surfaces; null resolver is disabled, valid link opens once |
| A11 | Management | Actual configured dashboard opens; missing destination is honest and nonclickable |
| A12 | View All | Origin day preserved; selected-day table complete through continuation; no mixed dates under Today |
| A13 | Attendees | 0, 1, 2, 10, duplicate names, restricted names, and paginated people handled without invented counts |
| A14 | Attendee fallback | Primary person never mislabeled full attendees; unmet requirement clearly reported |
| A15 | Timezone | Seller in Kolkata, browser in New York, event entered elsewhere still assigned/displayed correctly |
| A16 | DST | New York spring/fall transitions and repeated hour labels pass; no fixed 24-hour bounds |
| A17 | Date edges | Midnight end, cross-midnight, zero duration, invalid end, and quarter-hour zone fixtures pass |
| A18 | All-day | Date-only single/multi-day meetings match native display in positive and negative offsets |
| A19 | Recurrence | Old series with current occurrence, exceptions, child copies, and cancellations reconcile |
| A20 | Pagination | More than 100 and 1,000 records remain reachable with truthful partial state and no duplicates |
| A21 | Refresh | Moved, relinked, retyped, status-changed, deleted, and new Events update membership |
| A22 | Race and lifecycle | Rapid range changes, close while loading, and repeated expansion do not leak or overwrite state |
| A23 | Calendar | Dates, weekends, overflow, overlaps, selected day, and all-day lane agree with agenda |
| A24 | Access and safety | Ordinary/restricted users, malicious text, and deceptive URLs do not expose or execute content |
| A25 | Accessibility | Keyboard, screen reader, 200 percent zoom, 320 px width, focus restore, and touch targets pass |
| A26 | Data boundary | Production reads use GraphQL; no Apex, REST SOQL, runtime fixture, or client-filter-only fallback |
| A27 | Incomplete/error | No false empty calendar, exact count, or full attendee claim from partial data |
| A28 | Host fit | Mandatory fields readable, no fourth card, no clipping or compact inner scroll; adjacent home content usable |

Use focused unit tests for temporal boundaries, compact selection, deduplication, completeness, URL validation, and state transitions. Use LWC Jest for properties, events, adapters, and DOM behavior. Use the existing browser test framework in the real Lightning/LWS container for focus, layout, navigation, and renderer lifecycle. Validate actual queries as an ordinary pilot seller and a restricted user; administrator-only success is insufficient. Use authorized sandbox fixtures, never modify real meetings merely to test.

## 20 Implementation sequence

First inspect repository guidance, homepageContainer, styling, modal/navigation patterns, API version, localization, configuration, test tools, and dependencies. Record actual region width and height. Create the capability report and metadata mapping before asserting live feasibility. Resolve personal scope, query predicates, attendee source, recurrence, and all-day representation with minimal bounded queries.

Next implement pure domain functions, validated query documents, normalized range states, and the reusable data provider. Prove server eligibility and pagination before applying the homepage card limit. Then implement parent, shared agenda, card, attendees, action resolver stub, and dashboard configuration. Add View All with shared components and accessible navigation. Add the mini month and expanded calendar after the renderer spike. Finish error, partial, refresh, midnight, and lifecycle behavior.

Finally reconcile fixtures, run meaningful automated and actual-org checks, visually inspect the agreed widths, and report measured performance. Deliver source, metadata, tests, sanitized capability evidence, configuration instructions, dependency licenses, visual captures, and known limitations. When org access is absent, UI and test fixtures can proceed in isolated development stories, but live GraphQL integration must remain clearly unverified. No production mock fallback is permitted.

## 21 Decisions still requiring org information

| Input | Default or next step |
|---|---|
| Personal ownership/invitation scope | Proposed OwnerId current user; validate whether invitee coverage is required |
| Exact record-type identity | Resolve the supplied labels to actual org IDs and verified DeveloperNames |
| Status API values | Confirm Schedules and Rescheduling without silent spelling changes |
| Attendee source | Prove GraphQL relation availability and business semantics |
| Existing dashboard | Supply actual destination through existing configuration |
| External integration | Arun implements URL resolver later; default returns null |
| Real homepage dimensions | Measure and choose two or three cards without hiding mandatory content |
| Event support and recurrence | Confirm target release policy and representative source coverage |

These are discovery/configuration tasks, not reasons to invent missing metadata or stop all useful UI work. Attendee support and server-side eligibility can become genuine release blockers under the GraphQL-only constraint. Dashboard and Impact Assessment actions remain explicitly unconfigured until their destinations are supplied.

## 22 Definition of done

The release is complete when the new component works inside the existing container, business eligibility is enforced server-side, all required fields and actions have correct states, the selected-day View All and calendar agree, timezone/recurrence cases reconcile, and applicable acceptance criteria pass under representative permissions. Full multiple-attendee support must either be proven or recorded as an unmet requirement with an explicitly accepted reduced scope.

A fixture-only demonstration is not a live integration. A primary-contact chip is not complete attendee support. A three-record response is not a full-day count. A visually polished calendar cannot override these data requirements. The handoff must name any remaining unconfigured actions and capability limits without claiming completion of them.

## 23 AI implementation handoff

Use My_Meetings_AI_Build_Prompt.md with this specification and the three screenshots. Version 2 supersedes conflicting Version 1 behavior. Create the new plural component and reuse one agenda for Today and Tomorrow. Latest explicit user instructions govern conflicts; otherwise follow this specification and report discrepancies without silently reducing mandatory scope.

## 24 Research sources

Platform pages S02–S04, S23, and S25–S27/S30 were retrieved directly on 22 September 2026. S01 and S05–S22/S24 retain the 17 September review. S28/S29 are object-reference pointers whose current rendered contents were not retrieved in this update; they do not prove GraphQL support. All target-org claims remain subject to schema and user validation.

S01 · Salesforce UI API All Supported Objects. Event and Task were visible in the current rendered list; the page also cautions that the list can lag support. https://developer.salesforce.com/docs/atlas.en-us.uiapi.meta/uiapi/ui_api_all_supported_objects.htm

S02 · Salesforce lightning graphql adapter reference. https://developer.salesforce.com/docs/platform/lwc/guide/reference-graphql-wire.html

S03 · Salesforce GraphQL Query Objects. https://developer.salesforce.com/docs/platform/graphql/guide/query-record-objects.html

S04 · Salesforce GraphQL Field Operators. https://developer.salesforce.com/docs/platform/graphql/guide/filter-fields.html

S05 · Salesforce GraphQL Wire Adapter Limitations. https://developer.salesforce.com/docs/platform/graphql/guide/graphql-wire-lwc-limitations.html

S06 · Salesforce Update Cached Query Results. https://developer.salesforce.com/docs/platform/graphql/guide/graphql-wire-lwc-refresh.html

S07 · Salesforce Paginate Results. https://developer.salesforce.com/docs/platform/graphql/guide/paginate.html

S08 · Salesforce GraphQL Query Limitations. https://developer.salesforce.com/docs/platform/graphql/guide/query-limits.html

S09 · Salesforce Calendar Views in Lightning Experience. https://help.salesforce.com/s/articleView?id=sales.activities_using_calendar_icons_lex.htm&language=en_US&type=5

S10 · Salesforce Considerations for Using Calendars in Lightning Experience. https://help.salesforce.com/s/articleView?id=sales.creating_calendars_lex.htm&language=en_US&type=5

S11 · Salesforce Considerations for Calendars Created from a Salesforce Object. https://help.salesforce.com/s/articleView?id=sales.calendar_create_limitations.htm&language=en_US&type=5

S12 · Salesforce Meeting Preparation and Follow Up with Meeting Digest. https://help.salesforce.com/s/articleView?id=sales.meetings_use_digest_parent.htm&language=en_US&type=5

S13 · Salesforce How Events Sync with Einstein Activity Capture. https://help.salesforce.com/s/articleView?id=sales.aac_event_sync_how_it_works.htm&language=en_US&type=5

S14 · Apple Calendar User Guide for Mac. https://support.apple.com/en-euro/guide/calendar/welcome/mac

S15 · Google Calendar product overview. https://workspace.google.com/products/calendar/

S16 · Fantastical product overview. https://flexibits.com/fantastical

S17 · Notion Calendar product overview. https://www.notion.com/product/calendar

S18 · Morgen product overview. https://www.morgen.so/

S19 · FullCalendar documentation and license. https://fullcalendar.io/docs and https://fullcalendar.io/license

S20 · Salesforce Use Third Party JavaScript Libraries. https://developer.salesforce.com/docs/platform/lwc/guide/js-third-party-library.html

S21 · Salesforce Event Object Reference. Field semantics were reviewed in the rendered documentation. https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_event.htm

S22 · Salesforce scoped module reference including user and internationalization imports. https://developer.salesforce.com/docs/platform/lwc/guide/reference-salesforce-modules.html

S23 · Salesforce Lightning Modal reference. https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-modal.html

S24 · W3C WAI ARIA Date Picker Dialog Example. https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/

S25 · Salesforce Compose Components. https://developer.salesforce.com/docs/platform/lwc/guide/create-components-compose.html

S26 · Salesforce Polymorphic Relationship Filters. Includes What type filters and a page-level Event/Task Beta note. https://developer.salesforce.com/docs/platform/graphql/guide/filter-polymorphic.html

S27 · Salesforce Semi Join and Anti Join Filters. https://developer.salesforce.com/docs/platform/graphql/guide/filter-joins.html

S28 · Salesforce EventRelation object reference. Reference pointer only for this update; GraphQL exposure unverified. https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_eventrelation.htm

S29 · Salesforce EventWhoRelation object reference. Reference pointer only for this update; GraphQL exposure unverified. https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_eventwhorelation.htm

S30 · Salesforce GraphQL Get Object Metadata. https://developer.salesforce.com/docs/platform/graphql/guide/query-objectinfo.html
