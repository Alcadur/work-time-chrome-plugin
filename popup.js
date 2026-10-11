import { getWorklogs, saveWorklogs } from './storageUtils.js';
import './components/TrackerForm.js';
import './components/TrackerLogs.js';
import './components/TrackerFilter.js';
import { EventBus, EVENTS } from "./events.js";

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="popup.css">

  <h2>Jira Time Tracker</h2>

  <tracker-form id="addForm"></tracker-form>

  <tracker-filter></tracker-filter>

  <button type="button" id="openLogsBtn">Open log list in a new window</button>

  <tracker-logs id="logsTable"></tracker-logs>
`;

class JiraTimeTracker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.cacheDOM();
    this.bindEvents();
  }

  cacheDOM() {
    this.openLogsBtn = this.shadowRoot.getElementById('openLogsBtn');
  }

  bindEvents() {
    this.openLogsBtn.addEventListener('click', () => {
      chrome.windows.create({ url: 'logs.html', type: 'popup', width: 420, height: 600 });
    });

    EventBus.subscribe(EVENTS.logDelete, (index) => this.deleteLog(index));
  }

  deleteLog(index) {
    if (!confirm('Delete this entry?')) {
      return
    }
    const [editingTaskIndex] = EventBus.getLastEmissionArgs(EVENTS.logEdit);

    if (editingTaskIndex === Number(index)) {
      EventBus.emit(EVENTS.logCancelEdit);
    }

    const logs = getWorklogs();
    logs.splice(index, 1);
    saveWorklogs(logs);

    EventBus.emit(EVENTS.logReRender);
  }
}

customElements.define('jira-time-tracker', JiraTimeTracker);
