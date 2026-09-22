import { createElement } from 'lwc';
import HomepageMyMeetings from 'c/homepageMyMeetings';

describe('c-homepage-my-meetings', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('renders header with title, Manage Meetings action, and refresh button', () => {
    const element = createElement('c-homepage-my-meetings', {
      is: HomepageMyMeetings
    });
    element.manageMeetingsUrl = 'https://salesforce.com/dashboard';
    document.body.appendChild(element);

    const title = element.shadowRoot.querySelector('.meetings-title');
    expect(title.textContent).toBe('My Meetings');

    const manageBtn = element.shadowRoot.querySelector('.manage-meetings-btn');
    expect(manageBtn).not.toBeNull();
    expect(manageBtn.textContent).toContain('Manage Meetings');
    expect(manageBtn.href).toBe('https://salesforce.com/dashboard');

    const refreshBtn = element.shadowRoot.querySelector('.refresh-icon-btn');
    expect(refreshBtn).not.toBeNull();
  });

  test('renders Today, Tomorrow, and Calendar tabs and switches active view', async () => {
    const element = createElement('c-homepage-my-meetings', {
      is: HomepageMyMeetings
    });
    document.body.appendChild(element);

    const tabs = element.shadowRoot.querySelectorAll('.tab-item');
    expect(tabs.length).toBe(3);
    expect(tabs[0].textContent).toBe('Today');
    expect(tabs[1].textContent).toBe('Tomorrow');
    expect(tabs[2].textContent).toBe('Calendar');

    // Default tab is Today
    expect(element.shadowRoot.querySelector('c-homepage-meeting-agenda')).not.toBeNull();

    // Click Tomorrow
    tabs[1].click();
    await Promise.resolve();

    const agenda = element.shadowRoot.querySelector('c-homepage-meeting-agenda');
    expect(agenda).not.toBeNull();
    expect(agenda.dateKey).toBe('tomorrow');

    // Click Calendar
    tabs[2].click();
    await Promise.resolve();

    const calendar = element.shadowRoot.querySelector('c-homepage-meeting-calendar');
    expect(calendar).not.toBeNull();
  });

  test('shows disabled Manage Meetings button when url is not configured', () => {
    const element = createElement('c-homepage-my-meetings', {
      is: HomepageMyMeetings
    });
    element.manageMeetingsUrl = '';
    document.body.appendChild(element);

    const manageBtn = element.shadowRoot.querySelector('.manage-meetings-btn_disabled');
    expect(manageBtn).not.toBeNull();
    expect(manageBtn.disabled).toBe(true);
  });
});
