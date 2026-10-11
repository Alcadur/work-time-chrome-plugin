import { EventBus, EVENTS } from "../events.js";
import { getWorklogs } from "../storageUtils.js";
import { getDateFromIso, getTimeFromIso } from "../timeUtils.js";

const template = document.createElement('template');
template.innerHTML = `
  <link rel="stylesheet" href="popup.css">
  <style>
    :host {
      width: auto;
      padding: 0;
    }
  </style>

  <div class="worklog-section">
  <table id="worklogTable">
    <thead>
      <tr>
        <th>Task</th>
        <th>Time</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="worklogBody">
      <!-- Logs container -->
    </tbody>
  </table>
  </div>
`;

class TrackerLogs extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.worklogBody = this.shadowRoot.getElementById('worklogBody');
        this.bindEvents();
    }

    connectedCallback() {
        this.filter = ''
        this.render();
    }

    bindEvents() {
        this.worklogBody.addEventListener('click', (e) => {
            const { index, event } = e.target.dataset;

            EventBus.emit(event, Number(index))
        });

        EventBus.subscribe(EVENTS.filterChanged, (filterDate) => {
            this.filter = filterDate;
            this.render();
        });

        EventBus.subscribe(EVENTS.logReRender, () => {
            this.render();
        })
    }

    getLogsToRender() {
        const allLogs = getWorklogs();
        const filterDate = this.filter ?? '';

        let logsToRender = allLogs.map((log, index) => ({ log, originalIndex: index }));

        if (filterDate) {
            logsToRender = logsToRender.filter(item => getDateFromIso(item.log.date) === filterDate);
        }

        return logsToRender;
    }

    render() {
        this.worklogBody.innerHTML = '';
        const logsToRender = this.getLogsToRender();

        if (logsToRender.length === 0) {
            this.worklogBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #6b778c;">No entries.</td></tr>`;
            return;
        }

        logsToRender.forEach(item => {
            const row = document.createElement('tr');
            const startTime = getTimeFromIso(item.log.date);
            const endTime = getTimeFromIso(item.log.endDate);
            const rangeStr = endTime ? `${startTime} - ${endTime}` : startTime;

            row.innerHTML = `
        <td>
          <strong 
            class="task-name" 
            data-index="${item.originalIndex}" 
            data-event="${EVENTS.logSelect}" 
            title="Click to copy name to 'Task' field"
          >
            ${item.log.task}
          </strong>
          <br>
          <small 
            style="color: #6b778c;"
          >
            ${getDateFromIso(item.log.date)}
          </small>
        </td>
        <td>
            <strong>${rangeStr}</strong><br><small style="color: #6b778c;">${item.log.time}</small></td>
        <td class="actions-cell">
          <button 
            class="action-btn edit-btn" 
            data-index="${item.originalIndex}" 
            data-event="${EVENTS.logEdit}" 
            title="Edit"
          >
            🖊️
          </button>
          <button 
            class="action-btn delete-btn" 
            data-index="${item.originalIndex}" 
            data-event="${EVENTS.logDelete}"
            title="Delete"
          >
            🗑
          ️</button>
        </td>
      `;
            this.worklogBody.appendChild(row);
        });
    }
}

customElements.define('tracker-logs', TrackerLogs);
