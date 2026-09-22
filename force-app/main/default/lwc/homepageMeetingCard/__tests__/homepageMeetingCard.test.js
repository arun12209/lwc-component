import { createElement } from 'lwc';
import HomepageMeetingCard from 'c/homepageMeetingCard';

describe('c-homepage-meeting-card', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  const mockMeeting = {
    key: '00U1',
    eventId: '00U1',
    subject: 'Growth Pipeline Review',
    statusValue: 'Scheduled',
    isAllDay: false,
    startInstant: new Date('2026-09-22T10:00:00.000Z'),
    endInstant: new Date('2026-09-22T11:00:00.000Z'),
    opportunity: {
      id: '0061',
      name: 'Acme Growth Deal'
    },
    topic: {
      value: 'Pipeline',
      label: 'Pipeline'
    },
    category: {
      value: 'Sales Strategy',
      label: 'Sales Strategy'
    },
    attendees: {
      items: [{ id: '0031', name: 'John Doe', type: 'Contact' }]
    },
    primaryPerson: {
      id: '0031',
      name: 'John Doe',
      label: 'Primary contact'
    }
  };

  test('renders meeting card with required field hierarchy', () => {
    const element = createElement('c-homepage-meeting-card', {
      is: HomepageMeetingCard
    });
    element.meeting = mockMeeting;
    document.body.appendChild(element);

    const subjectLink = element.shadowRoot.querySelector('.subject-link');
    expect(subjectLink).not.toBeNull();
    expect(subjectLink.textContent).toContain('Growth Pipeline Review');

    const opptyLink = element.shadowRoot.querySelector('.oppty-link');
    expect(opptyLink).not.toBeNull();
    expect(opptyLink.textContent).toContain('Acme Growth Deal');

    const details = element.shadowRoot.querySelector('.card-details');
    expect(details.textContent).toContain('Category:');
    expect(details.textContent).toContain('Sales Strategy');
    expect(details.textContent).toContain('Topic:');
    expect(details.textContent).toContain('Pipeline');

    const impactBtn = element.shadowRoot.querySelector('.impact-btn');
    expect(impactBtn).not.toBeNull();
    expect(impactBtn.textContent).toContain('Open Impact Assessment');
    // Default is disabled with setup pending
    expect(impactBtn.disabled).toBe(true);
    const setupPending = element.shadowRoot.querySelector('.setup-pending-label');
    expect(setupPending).not.toBeNull();
    expect(setupPending.textContent).toContain('Setup pending');
  });

  test('shows Rescheduling badge when status is Rescheduling', () => {
    const element = createElement('c-homepage-meeting-card', {
      is: HomepageMeetingCard
    });
    element.meeting = {
      ...mockMeeting,
      statusValue: 'Rescheduling'
    };
    document.body.appendChild(element);

    const badge = element.shadowRoot.querySelector('.status-badge_rescheduling');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('Rescheduling');
  });

  test('does not show Rescheduling badge when status is Scheduled', () => {
    const element = createElement('c-homepage-meeting-card', {
      is: HomepageMeetingCard
    });
    element.meeting = mockMeeting;
    document.body.appendChild(element);

    const badge = element.shadowRoot.querySelector('.status-badge_rescheduling');
    expect(badge).toBeNull();
  });
});
