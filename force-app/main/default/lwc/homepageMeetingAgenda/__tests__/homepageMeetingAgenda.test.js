import { createElement } from 'lwc';
import HomepageMeetingAgenda from 'c/homepageMeetingAgenda';

describe('c-homepage-meeting-agenda', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  const mockMeetings = [
    { key: '1', subject: 'Meeting 1', isAllDay: true },
    { key: '2', subject: 'Meeting 2', isAllDay: false, startInstant: new Date('2026-09-22T10:00:00.000Z'), endInstant: new Date('2026-09-22T11:00:00.000Z') },
    { key: '3', subject: 'Meeting 3', isAllDay: false, startInstant: new Date('2026-09-22T14:00:00.000Z'), endInstant: new Date('2026-09-22T15:00:00.000Z') },
    { key: '4', subject: 'Meeting 4', isAllDay: false, startInstant: new Date('2026-09-22T16:00:00.000Z'), endInstant: new Date('2026-09-22T17:00:00.000Z') }
  ];

  test('renders at most maxVisibleMeetings cards (default 3)', () => {
    const element = createElement('c-homepage-meeting-agenda', {
      is: HomepageMeetingAgenda
    });
    element.meetings = mockMeetings;
    element.dateKey = 'today';
    element.maxVisibleMeetings = 3;
    document.body.appendChild(element);

    const cards = element.shadowRoot.querySelectorAll('c-homepage-meeting-card');
    expect(cards.length).toBe(3);

    const footerBtn = element.shadowRoot.querySelector('.view-all-btn');
    expect(footerBtn).not.toBeNull();
    expect(footerBtn.textContent).toContain('View all today (4)');
  });

  test('renders empty state when there are 0 meetings', () => {
    const element = createElement('c-homepage-meeting-agenda', {
      is: HomepageMeetingAgenda
    });
    element.meetings = [];
    element.dateKey = 'today';
    document.body.appendChild(element);

    const emptyTitle = element.shadowRoot.querySelector('.empty-title');
    expect(emptyTitle).not.toBeNull();
    expect(emptyTitle.textContent).toBe('No eligible Opportunity meetings today');
  });

  test('dispatches viewall event when clicking footer button', () => {
    const element = createElement('c-homepage-meeting-agenda', {
      is: HomepageMeetingAgenda
    });
    element.meetings = mockMeetings;
    element.dateKey = 'today';
    document.body.appendChild(element);

    const handler = jest.fn();
    element.addEventListener('viewall', handler);

    const footerBtn = element.shadowRoot.querySelector('.view-all-btn');
    footerBtn.click();

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.dateKey).toBe('today');
  });
});
