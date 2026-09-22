# My Meetings AI Build Prompt

Version 2.0 · 22 September 2026 · Use with My_Meetings_Product_Specification.md

Copy this prompt into the implementing AI agent’s workspace with the specification, screenshots, and repository. This is an implementation contract. It does not claim that the target Salesforce schema has already been inspected.

## Mission

Act as a senior Salesforce LWC architect and a careful product designer. Build the new `homepageMyMeetings` component and embed it in the existing `homepageContainer`. The meetings component does not exist. Use the plural name consistently; do not search for an existing implementation and conclude the task is impossible. Inspect the container and its conventions before integrating.

Create a polished CRM meeting reader with Today, Tomorrow, and Calendar tabs, an expanded View All experience, and a fuller calendar. Reuse Salesforce styling and platform behavior. Precision means correct dates, predictable interactions, readable content, and accurate data coverage. Do not imitate Apple branding, glass, or decorative effects.

Read the product specification completely before making changes. The company-specific Version 2 requirements supersede the earlier All my meetings scope. Continue through all authorized implementation and verification work. Resolve routine choices from the repository and the specification. Report genuine missing dependencies precisely; do not invent metadata or quietly weaken requirements. No deployment to production is implied by this prompt.

## Nonnegotiable requirements

- Create `homepageMyMeetings` and embed it once in the existing `homepageContainer`. Preserve sibling components and unrelated behavior.
- Today and Tomorrow must share one `homepageMeetingAgenda` implementation and reusable cards. Do not build duplicate Today and Tomorrow bundles.
- Calendar is a separate `homepageMeetingCalendar` component. Expanded list/calendar lives in a supported modal, with shared domain and presentation components.
- Use `lightning/graphql` for meeting and related record reads. No Apex, REST SOQL, Event mirror object, elevated credentials, or production fixture fallback.
- Mandatory status filter is `Status__c` in the user-supplied values `Schedules` and `Rescheduling`. Verify stored API values; do not silently change Schedules to Scheduled.
- Event.What must be an Opportunity whose record type is Renewal Opportunity or Growth Opportunity. These are supplied labels. Resolve actual org IDs and verified DeveloperNames; never invent API names or sandbox IDs.
- Exclude unrelated Events server-side. Client-only filtering of unfiltered Events is not an authorized fallback. Do not fetch every Opportunity in the org to assemble a giant ID list.
- Personal scope must be explicit. Proposed initial assumption is Event.OwnerId equals current user. Validate invited-only needs and child Event representation; do not claim ownership equals all invitations or broaden to all visible events.
- Do not add Opportunity owner, open-stage, closed-status, or other business filters that were not requested.
- Show Subject, seller-local StartDateTime, Topic__c, linked Opportunity, people/attendees, and Interaction_Category__c. Add EndDateTime only for useful duration/time correctness, without replacing the required start.
- Homepage Today/Tomorrow show a maximum of three cards. `maxVisibleMeetings` accepts 1–3, default 3; tighter verified host layouts can use 2. No fourth card and no compact inner scrollbar.
- Every card has Open Impact Assessment. Dynamic URL creation is Arun’s later task; implement the safe extension point and honest unconfigured state now.
- Top-right Manage Meetings opens the existing dashboard through configuration, not an invented destination.
- View All lists every eligible meeting for the selected day through explicit pagination. Today must not contain tomorrow’s meetings despite mixed sample dates in the rough screenshot.
- Use the seller’s Salesforce timezone for display and date membership. Never silently use browser timezone or fixed 24-hour day arithmetic.
- Do not implement Event writes, drag/resizing, provider synchronization, RSVP, scheduling links, or custom recurrence editing in this release.

## Required first stage

Inspect repository guidance, source structure, homepageContainer, existing tokens, navigation, modal pattern, LWS/Locker context, API version, localization, configuration, test tooling, and dependencies. Measure the actual homepage region at 100 percent zoom. Do not assume the photographed width is a CSS measurement.

Produce a sanitized capability report covering:

1. Event availability and relevant release/Beta support status in the target org. The public polymorphic-filter page still labels Event/Task Beta; do not declare GA based only on an object list.
2. Actual Event filter schema, custom fields, readable/selectable/filterable fields, What union/filter types, and Opportunity RecordTypeId filtering.
3. Exact record-type metadata and status API-value mapping.
4. Personal scope and representative owned/invited/child-copy fixtures.
5. Complete attendee source semantics and GraphQL availability, including separate participant pagination.
6. All-day field conventions and recurring occurrence coverage, especially current occurrences from an older series.
7. Dashboard configuration and Impact Assessment resolver stub.
8. Calendar renderer compatibility inside LWS/CSP, supported license and bundle constraints.

Use minimal bounded real queries as an ordinary pilot seller and a restricted user, not only an administrator. Query syntax in the specification is a candidate until verified. Record exact capability failures without leaking meeting content. With no org access, continue reusable UI/domain work in isolated fixtures, but mark live integration unverified. Never turn fixtures into the production data fallback.

## Component design

Create these logical boundaries, adapting module placement to the existing project:

| Component or module | Responsibility |
|---|---|
| homepageMyMeetings | Compact header, tab/date state, action integration, expansion, provider ownership |
| homepageMeetingAgenda | Same list behavior for Today, Tomorrow, selected date; properties and events only |
| homepageMeetingCard | Required field hierarchy and action intent; no queries |
| homepageMeetingAttendees | Known people, overflow, and explicit completeness; no queries |
| homepageMeetingCalendar | Compact month and expanded calendar rendering; range/date intents |
| homepageMeetingsModal | LightningModal shell, expanded table/calendar, local view state and provider ownership |
| homepageMeetingsData | Headless reusable LWC containing GraphQL wires, paging and refresh |
| meetingsDomain and meetingsQueries | Pure normalization/date/filter/selection logic and validated query definitions |

Do not extract a component for every field. A separate table child is justified only if it materially simplifies a substantial reusable renderer. Expose only appropriate entry points in metadata; child bundles are private to composition.

Properties flow down as immutable snapshots. Events carry minimal intent upward. Do not mutate parent-provided objects, pass raw wire payloads to cards, or create module-global mutable meeting state.

Keep one active provider per surface. Homepage initially requests Today plus Tomorrow, so switching those tabs does not trigger separate data owners. When opening the modal, retain state/snapshot and suspend the home provider. The modal owns the same reusable provider for its range and revalidates its initial snapshot. Its open parameters are initialization values, not reactive parent bindings. On close, resume/refresh home and restore focus. Handle dismissal and opening failure. Use the modal promise for close results; validate platform constraints before forwarding live custom modal events.

Use the shared synchronous Impact Assessment resolver module by default, so compact and modal surfaces have one action contract without a live callback channel. If the existing architecture mandates parent-owned actions, use that consistently and prove modal forwarding under LWS. Never activate two handlers for one action.

## GraphQL implementation contract

Use named `gql` documents, reactive variables, `errors` plural, and the returned refresh function from `lightning/graphql`. Pin the API version to one actually tested. Do not assume Mobile Offline support. Follow LDS behavior, but do not assume individual cached record changes automatically recompute filtered collection membership.

Validate the preferred predicate `What: { Opportunity: { RecordTypeId: { in: $recordTypeIds } } }`. If unavailable, validate the documented reference semi-join pattern `WhatId: { inq: { Opportunity: { RecordTypeId: { in: $recordTypeIds } }, ApiName: "Id" } }`. Every predicate remains combined with status, personal scope, and date range. Respect actual join restrictions. If both routes fail, do not substitute a client-filtered full Event fetch; report the hard integration blocker.

Resolve metadata through supported GraphQL objectInfos where available or the project’s established metadata/configuration path. Keep meeting reads GraphQL-only. Activity custom fields are queried from Event using verified API names. Required filter fields cannot be omitted to make the query succeed. Optional-field directives require a supported API and do not fix missing filter schema.

Start with page size 100. Follow endCursor/hasNextPage, merge by actual occurrence identity, and track completeness. An initial client safety budget of 1,000 Event records per active range triggers a visible Continue loading state, not truncation. No more than two independent connections in flight. Attendee pagination is separate from Event pagination.

The sample timed query in the specification is not a complete all-day/zero-duration solution. Implement verified all-day date predicates and source-required zero-duration/invalid-end handling, retaining every business filter. Exact counts require complete eligible Event results. Exact attendee overflow counts require complete participant results. Do not use `first: 3` as the day query and pretend View All is complete.

Ignore obsolete responses after rapid navigation using a generation/range key. Key results by user, zone, date span, scope/config version, and query shape. Clear cursors on range or predicate changes. Manual and stale-on-resume refresh must re-evaluate membership, including new, moved, relinked, retyped, status-changed, deleted, and reassigned events.

## Data and time contract

Normalize to the logical Meeting and RangeResult interfaces in the specification. Views consume normalized records only. Preserve value/empty/unavailable distinctions, Event completeness, participant completeness, time quality, and source coverage. Do not write meeting content to localStorage or sessionStorage.

Use Salesforce user timezone and locale. Store timed events as instants. Compute each local midnight boundary independently with a tested timezone utility. Handle 23/25-hour days, ambiguous repeated hours, half-hour and quarter-hour offsets, cross-midnight events, and exact-midnight ends. A zero-duration event belongs to its starting date. Never invent an end time.

Preserve all-day values as date-only start and exclusive end after verifying native Salesforce semantics. Do not parse date-only values as browser-local appointments. The original organizer-entered timezone is unavailable from StartDateTime alone; do not infer it from the owner’s profile. One display zone is sufficient for P0.

Recompute Today/Tomorrow on seller-local midnight, wake, and return to a stale visible page. Minute labels are local computations, not queries. Clear timers on disconnect/hidden state. Do not manufacture recurrence occurrences, deduplicate different meetings by subject/time, or blindly exclude IsChild.

## Visual and interaction contract

Use existing homepage tokens, with restrained Salesforce-compatible blue actions, neutral text, and a 4 px spacing rhythm. Test 320, 360, and 420 px widths, zoom, and real container height. Three fully detailed cards need approximately 670–760 px total at 360 px width; configure two when host space requires it. Do not promise the original small empty card can contain three full records without growing.

Header has My Meetings, Manage Meetings aligned right, and a secondary refresh control. Tabs are Today, Tomorrow, Calendar. Allow a deliberate two-row header on narrow widths. Show the selected date and timezone.

Card hierarchy is time, subject link, Opportunity link, labeled category/topic, attendee summary, Impact Assessment action. Allow two-line subject/Opportunity text; expose full values in accessible detail. Rescheduling is a small status badge. Null values say Not specified; permission-denied values are not falsely presented as null. The whole card is not an interactive wrapper around nested links.

Today compact selection: all-day first, then in-progress, then upcoming; fill remaining slots from the most recent elapsed meetings. Display selected timed cards chronologically and label elapsed entries. Tomorrow uses all-day first then earliest start. View All always includes all eligible day meetings, including past Today entries. Counts cover the full day, not selected cards. Empty text must say no eligible Opportunity meetings, never Calendar clear.

Attendees: show one known name at narrow widths, up to two when space permits, then +N only for an exact remainder. Accessible inline overflow lists readable people, with Load more attendees if needed. WhoId is a primary related person, not a full attendee list. If the full source is unavailable, show Primary contact/person with Full attendee list unavailable and Open event; explicitly report incomplete requirements. No invented RSVP, organizer, hidden name, or attendee count.

View All uses LightningModal and an accessible table with Start time, Subject, Attendees, Related to, Category and topic, and Action. Correct selected day and timezone remain visible. Use a scrolling expanded body, explicit continuation, and card fallback at narrow width. Search this day becomes Search loaded meetings while incomplete. Do not create stacked modals; use inline attendee/detail surfaces. Restore focus and scroll on return.

Compact Calendar uses a six-row month picker with accessible date counts and selected-day agenda. Default to one preview card if needed to control height. Expanded Calendar has Week, Workweek, Month, and Agenda. Keep weekends and all 24 hours reachable. Month overflow opens the correct day; overlaps remain individually accessible. Narrow expanded layouts use Agenda. No drag affordance without an authorized write contract.

Lazy-load a pinned, tested calendar static resource only on expansion. No runtime CDN, unsafe record HTML injection, unverified library version, or unsupported Shadow DOM overrides. Calendar selection and view changes must preserve the correct range and return context.

## Action contracts

Implement `resolveImpactAssessmentUrl({ eventId, opportunityId })` as a documented pure integration point returning a URL or null. Default null, with disabled Open Impact Assessment and Setup pending. Arun will add dynamic link construction. Do not create fake deck data, parameter names, custom fields, credentials, or a placeholder live URL.

Validate external HTTPS URLs, reject credentials and deceptive domains, use a reviewed exact host/true-subdomain allowlist, and open only on click with noopener/noreferrer. Later parameters must use URL/URLSearchParams encoding. No attendee PII in URL construction unless explicitly required by the real integration. Configure the dashboard via `manageMeetingsUrl`; test the actual same-org destination and supported navigation. Unconfigured Manage Meetings is disabled with a clear message.

## Verification and completion

Implement all applicable A01–A28 criteria in the specification. Focus tests on eligibility, query shape, dates/DST/all-day, card selection, completeness, paging/races, URL validation, shared action IDs, component events, access states, and lifecycle. Use meaningful LWC Jest and domain tests; actual-org schema, FLS, sharing, navigation, and LWS require real validation.

Specifically test Schedules spelling, other statuses, both approved record types, other Opportunity types, Account/null What, more than three records, more than 100/1,000 records, multiple attendee pages, restricted people, moved/deleted events, recurring exceptions, and unrelated browser timezone. Verify keyboard/screen reader, focus restore, 200 percent zoom, 320 px width, and no clipped required fields. Validate that a partial response never becomes a false empty day or exact total.

Measure actual performance against the specification; report results rather than claiming targets were achieved. Confirm the expanded engine is absent from initial home loading. No minute polling or one-query-per-card attendee pattern. No production Event writes or unrelated repository changes.

Deliver source and metadata, focused tests and results, sanitized capability report, setup/mapping instructions, actual configuration dependencies, dependency license details, screenshots at agreed widths, performance measurements, and known limitations. Identify live queries that were tested and anything still unverified. State explicitly if full attendees, recurrence, personal scope, or server filtering is blocked. Distinguish the intentionally unconfigured Impact Assessment URL from a defect. A fixture demo, guessed query, or primary-contact-only display must not be presented as full production completion.
