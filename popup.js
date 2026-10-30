import { getWorklogs, saveWorklogs } from './storageUtils.js';
import './components/TrackerForm.js';
import './components/TrackerLogs.js';
import './components/TrackerFilter.js';
import "./components/TrackerExport.js"
import { EventBus, EVENTS } from "./events.js";

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="popup.css">

  <h2>Jira Time Tracker</h2>

  <div id="viewContainer" class="view-container">
    <div id="mainView" class="view">
      <tracker-form id="addForm"></tracker-form>
    
      <tracker-filter></tracker-filter>
    
      <button type="button" id="openLogsBtn">Open log list in a new window</button>
      <button type="button" id="csvViewBtn" title="CSV view">CSV</button>
    
      <tracker-logs id="logsTable"></tracker-logs>
    </div>
    <div id="extraView"  class="view">
        <button type="button" class="link-btn" id="backToMainView" title="Back to main view button">🔙 Back</button>
        <div id="extraViewContent">
        
        </div>
    </div>
  </div>
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
    this.csvViewBtn = this.shadowRoot.getElementById('csvViewBtn');
    this.mainView = this.shadowRoot.getElementById('mainView');
    this.backToMainViewBtn = this.shadowRoot.getElementById('backToMainView');
    this.extraViewContent = this.shadowRoot.getElementById('extraViewContent');
  }

  bindEvents() {
    this.openLogsBtn.addEventListener('click', () => {
      chrome.windows.create({ url: 'logs.html', type: 'popup', width: 420, height: 600 });
    });

    this.csvViewBtn.addEventListener('click', () => {
      this.mainView.classList.add('extra-view');
      this.extraViewContent.innerHTML = `
        <tracker-export></tracker-export>
      `;
    });

    this.backToMainViewBtn.addEventListener('click', () => {
      this.mainView.classList.remove('extra-view');
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
