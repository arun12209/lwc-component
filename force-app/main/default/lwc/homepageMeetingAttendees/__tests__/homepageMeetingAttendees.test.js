import { createElement } from 'lwc';
import HomepageMeetingAttendees from 'c/homepageMeetingAttendees';

describe('c-homepage-meeting-attendees', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('renders 1 attendee chip in compact mode and overflow', async () => {
    const element = createElement('c-homepage-meeting-attendees', {
      is: HomepageMeetingAttendees
    });
    element.isCompact = true;
    element.attendees = {
      items: [
        { id: '1', name: 'Alice Smith', type: 'Contact' },
        { id: '2', name: 'Bob Jones', type: 'Lead' },
        { id: '3', name: 'Charlie Brown', type: 'Contact' }
      ]
    };
    document.body.appendChild(element);

    const chips = element.shadowRoot.querySelectorAll('.attendee-chip');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toContain('Alice Smith');

    const overflowBtn = element.shadowRoot.querySelector('.overflow-pill');
    expect(overflowBtn).not.toBeNull();
    expect(overflowBtn.textContent).toBe('+2');

    // Click overflow to open popover
    overflowBtn.click();
    await Promise.resolve();

    const popover = element.shadowRoot.querySelector('.attendees-popover');
    expect(popover).not.toBeNull();
    const items = popover.querySelectorAll('.popover-item');
    expect(items.length).toBe(3);
  });

  test('renders degraded fallback when full list is unavailable', () => {
    const element = createElement('c-homepage-meeting-attendees', {
      is: HomepageMeetingAttendees
    });
    element.attendees = {
      items: [],
      fullListUnavailable: true
    };
    element.primaryPerson = {
      name: 'Sarah Connor',
      label: 'Primary contact'
    };
    document.body.appendChild(element);

    const fallback = element.shadowRoot.querySelector('.attendees-fallback');
    expect(fallback).not.toBeNull();
    expect(fallback.textContent).toContain('Primary contact:');
    expect(fallback.textContent).toContain('Sarah Connor');
    expect(fallback.textContent).toContain('Full attendee list unavailable');
  });
});
