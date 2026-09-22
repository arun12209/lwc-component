import { LightningElement, api } from 'lwc';

export default class HomepageMeetingAttendees extends LightningElement {
  @api attendees;
  @api primaryPerson;
  @api isCompact = false;

  isPopoverOpen = false;

  get hasAttendees() {
    return (
      this.attendees &&
      this.attendees.items &&
      this.attendees.items.length > 0
    );
  }

  get attendeeItems() {
    return this.attendees?.items || [];
  }

  get maxChips() {
    return this.isCompact ? 1 : 2;
  }

  get visibleAttendees() {
    return this.attendeeItems.slice(0, this.maxChips);
  }

  get hasOverflow() {
    return this.attendeeItems.length > this.maxChips;
  }

  get overflowCount() {
    return this.attendeeItems.length - this.maxChips;
  }

  get overflowAriaLabel() {
    return `Show ${this.overflowCount} more attendees`;
  }

  get totalAttendeeCount() {
    return this.attendeeItems.length;
  }

  get attendeeIcon() {
    return 'standard:avatar';
  }

  get isFullListUnavailable() {
    return Boolean(this.attendees?.fullListUnavailable);
  }

  get primaryPersonName() {
    return this.primaryPerson?.name || null;
  }

  get primaryPersonLabel() {
    return this.primaryPerson?.label || 'Primary contact';
  }

  togglePopover(event) {
    event.stopPropagation();
    this.isPopoverOpen = !this.isPopoverOpen;
  }

  closePopover(event) {
    if (event) event.stopPropagation();
    this.isPopoverOpen = false;
  }
}
