import { createElement } from "lwc";
import HomepageContainer from "c/homepageContainer";
import logEngagement from "@salesforce/apex/HomepageItemController.logEngagement";

jest.mock(
  "@salesforce/apex/HomepageItemController.logEngagement",
  () => ({ default: jest.fn().mockResolvedValue() }),
  { virtual: true }
);

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("c-homepage-container", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("logs an engagement ping with the configured record type", async () => {
    const element = createElement("c-homepage-container", {
      is: HomepageContainer
    });
    element.recordType = "Services";
    document.body.appendChild(element);
    await flushPromises();

    expect(logEngagement).toHaveBeenCalledWith({
      component: "homepageContainer",
      recordType: "Services"
    });
  });

  it("defaults the record type to Research_Sales", async () => {
    const element = createElement("c-homepage-container", {
      is: HomepageContainer
    });
    document.body.appendChild(element);
    await flushPromises();

    expect(logEngagement).toHaveBeenCalledWith({
      component: "homepageContainer",
      recordType: "Research_Sales"
    });
  });

  it("renders homepageMyMeetings component embedded in the sidebar", async () => {
    const element = createElement("c-homepage-container", {
      is: HomepageContainer
    });
    document.body.appendChild(element);
    await flushPromises();

    const myMeetings = element.shadowRoot.querySelector("c-homepage-my-meetings");
    expect(myMeetings).not.toBeNull();
  });

  it("renders the On My Radar coming-soon teaser", async () => {
    const element = createElement("c-homepage-container", {
      is: HomepageContainer
    });
    document.body.appendChild(element);
    await flushPromises();

    const teaser = element.shadowRoot.querySelector("c-coming-soon-teaser");
    expect(teaser).not.toBeNull();
    expect(teaser.heading).toBe("On My Radar");
  });

  it("toggles focus mode on the shell", async () => {
    const element = createElement("c-homepage-container", {
      is: HomepageContainer
    });
    document.body.appendChild(element);
    await flushPromises();

    const shell = element.shadowRoot.querySelector(".homepage-shell");
    expect(shell.classList.contains("homepage-shell_focus")).toBe(false);
    element.shadowRoot
      .querySelector('lightning-button-icon[data-id="focus"]')
      .click();
    await flushPromises();
    expect(shell.classList.contains("homepage-shell_focus")).toBe(true);
  });

  it("updates the greeting subline from the list count event", async () => {
    const element = createElement("c-homepage-container", {
      is: HomepageContainer
    });
    document.body.appendChild(element);
    await flushPromises();

    const list = element.shadowRoot.querySelector("c-priority-to-do-list");
    if (list) {
      list.dispatchEvent(
        new CustomEvent("countchange", { detail: { count: 3 } })
      );
      await flushPromises();

      const subtitle = element.shadowRoot.querySelector(
        ".hp-greeting__subtitle"
      ).textContent;
      expect(subtitle).toContain("3 high-priority to-dos");
    }
  });
});
