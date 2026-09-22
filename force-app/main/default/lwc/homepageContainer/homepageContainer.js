import { LightningElement, api, wire } from "lwc";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import USER_ID from "@salesforce/user/Id";
import FIRST_NAME_FIELD from "@salesforce/schema/User.FirstName";
import logEngagement from "@salesforce/apex/HomepageItemController.logEngagement";

const MEETINGS_FEATURES = [
  "Today and tomorrow's agenda at a glance",
  "One-tap into the meeting record and impact assessment",
  "Interaction category and topic surfaced inline"
];

const RADAR_FEATURES = [
  "Account moves and invitational nominations",
  "Pending approvals you are sitting with",
  "Time-sensitive items routed to you"
];

export default class HomepageContainer extends LightningElement {
  @api includeDelegated = false;
  @api recordType = "Research_Sales";
  // Single flag to re-enable grouped to-do rows; default off for the pilot.
  @api enableGrouping = false;
  @api maxVisibleMeetings = 3;
  @api manageMeetingsUrl = "";

  focusMode = false;
  taskCount;
  countLoaded = false;

  meetingsFeatures = MEETINGS_FEATURES;
  radarFeatures = RADAR_FEATURES;

  @wire(getRecord, { recordId: USER_ID, fields: [FIRST_NAME_FIELD] })
  userRecord;

  connectedCallback() {
    logEngagement({
      component: "homepageContainer",
      recordType: this.recordType
    }).catch(() => {});
  }

  get firstName() {
    return getFieldValue(this.userRecord?.data, FIRST_NAME_FIELD);
  }

  get timeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good morning";
    }
    if (hour < 18) {
      return "Good afternoon";
    }
    return "Good evening";
  }

  get greetingTitle() {
    return this.firstName
      ? `${this.timeGreeting}, ${this.firstName}!`
      : `${this.timeGreeting}!`;
  }

  // Subline reacts to the live workload the to-do list reports up, so the
  // greeting feels personal and current rather than static boilerplate.
  get greetingSubtitle() {
    if (!this.countLoaded) {
      return "Let's make the most of your work day.";
    }
    if (this.taskCount === 0) {
      return "You're all caught up — enjoy the clear runway.";
    }
    if (this.taskCount === 1) {
      return "Just one high-priority to-do today. Let’s close it out.";
    }
    return `You have ${this.taskCount} high-priority to-dos today. Let’s make them count.`;
  }

  get shellClass() {
    return this.focusMode
      ? "homepage-shell homepage-shell_focus"
      : "homepage-shell";
  }

  get focusIcon() {
    return this.focusMode ? "utility:contract_alt" : "utility:expand_alt";
  }

  get focusTitle() {
    return this.focusMode
      ? "Exit focus mode"
      : "Focus mode — hide everything but your to-dos";
  }

  handleCountChange(event) {
    this.taskCount = event.detail.count;
    this.countLoaded = true;
  }

  toggleFocus() {
    this.focusMode = !this.focusMode;
  }

  handleRefresh() {
    const list = this.template.querySelector("c-priority-to-do-list");
    if (list) {
      list.refresh();
    }
  }
}
