import { LightningElement } from 'lwc';

export default class LightningModal extends LightningElement {
  static open = jest.fn().mockResolvedValue({ refreshNeeded: false });
  close(result) {
    this.dispatchEvent(new CustomEvent('close', { detail: result }));
  }
}
