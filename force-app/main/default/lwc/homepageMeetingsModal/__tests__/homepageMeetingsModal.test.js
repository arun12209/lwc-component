import { createElement } from 'lwc';
import HomepageMeetingsModal from 'c/homepageMeetingsModal';

describe('c-homepage-meetings-modal', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  const mockMeetings = [
    {
      key: '1',
      eventId: '1',
      subject: 'Renewal Strategy Session',
      statusValue: 'Scheduled',
      isAllDay: false,
      startInstant: new Date('2026-09-22T10:00:00.000Z'),
      endInstant: new Date('2026-09-22T11:00:00.000Z'),
      opportunity: { id: 'opp1', name: 'Alpha Renewal' },
      topic: { label: 'Strategy' },
      category: { label: 'Client Meeting' },
      attendees: { items: [{ id: 'a1', name: 'Alice' }] }
    },
    {
      key: '2',
      eventId: '2',
      subject: 'Growth Intro Discussion',
      statusValue: 'Rescheduling',
      isAllDay: false,
      startInstant: new Date('2026-09-22T14:00:00.000Z'),
      endInstant: new Date('2026-09-22T15:00:00.000Z'),
      opportunity: { id: 'opp2', name: 'Beta Growth' },
      topic: { label: 'Intro' },
      category: { label: 'Discovery' },
      attendees: { items: [{ id: 'a2', name: 'Bob' }] }
    }
  ];

  test('renders modal with table columns and rows', () => {
    const element = createElement('c-homepage-meetings-modal', {
      is: HomepageMeetingsModal
    });
    element.meetings = mockMeetings;
    element.initialTab = 'today';
    document.body.appendChild(element);

    const table = element.shadowRoot.querySelector('.meetings-table');
    expect(table).not.toBeNull();

    const rows = table.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    expect(rows[0].textContent).toContain('Renewal Strategy Session');
    expect(rows[0].textContent).toContain('Alpha Renewal');
    expect(rows[1].textContent).toContain('Growth Intro Discussion');
    expect(rows[1].textContent).toContain('Rescheduling');
  });

  test('filters table rows via local client search input', async () => {
    const element = createElement('c-homepage-meetings-modal', {
      is: HomepageMeetingsModal
    });
    element.meetings = mockMeetings;
    element.initialTab = 'today';
    document.body.appendChild(element);

    const searchInput = element.shadowRoot.querySelector('.search-input');
    searchInput.value = 'Beta';
    searchInput.dispatchEvent(new CustomEvent('change'));
    await Promise.resolve();

    const rows = element.shadowRoot.querySelectorAll('.meetings-table tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Growth Intro Discussion');
  });
});
