import { createElement } from 'lwc';
import HomepageMeetingCalendar from 'c/homepageMeetingCalendar';

describe('c-homepage-meeting-calendar', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('renders 6-row (42 cells) mini month grid with weekday headers', () => {
    const element = createElement('c-homepage-meeting-calendar', {
      is: HomepageMeetingCalendar
    });
    element.isExpanded = false;
    document.body.appendChild(element);

    const weekdays = element.shadowRoot.querySelectorAll('.weekday-cell');
    expect(weekdays.length).toBe(7);

    const dayCells = element.shadowRoot.querySelectorAll('.day-cell');
    expect(dayCells.length).toBe(42);
  });

  test('selects date and dispatches selectdate event on click', () => {
    const element = createElement('c-homepage-meeting-calendar', {
      is: HomepageMeetingCalendar
    });
    element.isExpanded = false;
    document.body.appendChild(element);

    const handler = jest.fn();
    element.addEventListener('selectdate', handler);

    const dayCells = element.shadowRoot.querySelectorAll('.day-cell');
    dayCells[15].click();

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.dateStr).toBeDefined();
  });

  test('renders expanded view toolbar and mode buttons when isExpanded is true', () => {
    const element = createElement('c-homepage-meeting-calendar', {
      is: HomepageMeetingCalendar
    });
    element.isExpanded = true;
    document.body.appendChild(element);

    const modeBtns = element.shadowRoot.querySelectorAll('.mode-btn');
    expect(modeBtns.length).toBe(4); // Week, Workweek, Month, Agenda
  });
});
