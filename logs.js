import { getWorklogs } from './storageUtils.js';
import { getDateFromIso, getTimeFromIso } from "./timeUtils.js";
import "./components/TrackerFilter.js"
import { EventBus, EVENTS } from "./events.js";

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="popup.css">
  <link rel="stylesheet" href="logs.css">

  <h2>Log history</h2>

  <tracker-filter></tracker-filter>

  <div class="filter-section">
    <label for="uniqueTasksToggle">Group by name:</label>
    <input type="checkbox" id="uniqueTasksToggle">
  </div>

  <div class="worklog-section">
  <table id="worklogTable">
    <thead>
      <tr>
        <th>Task</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody id="worklogBody">
      <!-- Finished entries will appear here -->
    </tbody>
  </table>
  </div>
`;

class JiraLogViewer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.filter = null;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.cacheDOM();
    this.bindEvents();

    this.renderTable();
  }

  cacheDOM() {
    this.groupByTaskToggle = this.shadowRoot.getElementById('uniqueTasksToggle');
    this.worklogBody = this.shadowRoot.getElementById('worklogBody');
  }

  bindEvents() {
    EventBus.subscribe(EVENTS.filterChanged, (filterDate) => {
      this.filter = filterDate;

      if (this.groupByTaskToggle.checked) {
        this.renderGroupedTable()
      } else {
        this.renderTable()
      }
    })

    this.groupByTaskToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.renderGroupedTable()
      } else {
        this.renderTable()
      }
    });
  }

  groupByTask(items) {
    const latestByTask = new Map();

    items.forEach(item => {
      const existing = latestByTask.get(item.log.task) ?? [];

      existing.push(item);
      latestByTask.set(item.log.task, existing);
    });

    return latestByTask;
  }

  getLogsToRender() {
    const allLogs = getWorklogs();
    const filterDate = this.filter;

    let logsToRender = allLogs.map((log, index) => ({ log, originalIndex: index }));

    if (filterDate) {
      logsToRender = logsToRender.filter(item => getDateFromIso(item.log.date) === filterDate);
    }

    return logsToRender;
  }

  renderTable() {
    this.worklogBody.innerHTML = '';

    const logsToRender = this.getLogsToRender()

    if (logsToRender.length === 0) {
      this.worklogBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #6b778c;">No logs for the selected date</td></tr>`;
    } else {
      logsToRender.forEach(item => {
        const row = document.createElement('tr');
        const startTime = getTimeFromIso(item.log.date);
        const endTime = getTimeFromIso(item.log.endDate);
        const rangeStr = endTime ? `${startTime}–${endTime}` : startTime;

        row.innerHTML = `
          <td><strong>${item.log.task}</strong><br><small style="color: #6b778c;">${getDateFromIso(item.log.date)}</small></td>
          <td><strong>${rangeStr}</strong><br><small style="color: #6b778c;">${item.log.time}</small></td>
        `;
        this.worklogBody.appendChild(row);
      });
    }
  }

  renderGroupedTable() {
    this.worklogBody.innerHTML = '';

    const logsToRender = this.groupByTask(this.getLogsToRender());

    if (logsToRender.size === 0) {
      this.worklogBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #6b778c;">No logs for the selected date</td></tr>`;
    } else {
      logsToRender.entries().forEach(([task, items]) => {
        const row = document.createElement('tr');


        const rangeStr = items.reduce((acc, item) => {
          const startTime = getTimeFromIso(item.log.date);
          const endTime = getTimeFromIso(item.log.endDate);

          const newRow = endTime ? `${startTime} - ${endTime}` : startTime;

          if (acc.trim() === '') {
            return `<strong>${newRow}</strong>`;
          }

          return `${acc}<br /><strong>${newRow}</strong>`;
        }, '')

        row.innerHTML = `
          <td><strong>${task}</strong><br><small style="color: #6b778c;">${getDateFromIso(items[0].log.date)}</small></td>
          <td>${rangeStr}</td>
        `;
        this.worklogBody.appendChild(row);
      });
    }
  }
}

customElements.define('jira-log-viewer', JiraLogViewer);
