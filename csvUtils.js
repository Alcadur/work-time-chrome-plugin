import { getDateFromIso } from "./timeUtils.js";

const TEMPO_HEADER = ['Issue Key', 'Date Started', 'Time Spent', 'Comment'];
const ISSUE_KEY_REGEX = /[A-Z][A-Z0-9_]*-\d+/;
const COMMENT_KEY_REGEX = />>(.*)<</;

/**
 * Splits a task name (ex. "[XYZ-123] Summary") into Jira issue key and the remaining comment
 * @param {string} task
 * @returns {{ issueKey: string, comment: string }}
 */
export function parseTaskName(task = '') {
    const match = task.match(ISSUE_KEY_REGEX);
    const commentMatch = task.match(COMMENT_KEY_REGEX);

    if (!match) {
        return { issueKey: '', comment: task.trim() };
    }

    const comment = (commentMatch?.[1] ?? '')
        .trim();

    return { issueKey: match[0], comment };
}

// Tempo expects "YYYY-MM-DD HH:MM:SSZ" (UTC)
export function formatTempoDate(dateTimeLocalStr) {
    return new Date(dateTimeLocalStr).toISOString().substring(0, 19).replace('T', ' ') + 'Z';
}

function escapeCsvValue(value) {
    const str = String(value ?? '');

    return /[",\r\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
}

/**
 * @param {Array<{ task: string, date: string, time: string }>} logs
 * @param {string} from - YYYY-MM-DD (inclusive)
 * @param {string} to - YYYY-MM-DD (inclusive)
 * @returns {{ csv: string, exported: number, skipped: number }}
 */
export function buildTempoCsv(logs, from, to) {
    const rows = [TEMPO_HEADER];
    let skipped = 0;

    logs
        .filter(log => {
            const date = getDateFromIso(log.date);
            return log.endDate && (!from || date >= from) && (!to || date <= to);
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach(log => {
            const { issueKey, comment } = parseTaskName(log.task);

            if (!issueKey) {
                skipped++;
                return;
            }

            rows.push([issueKey, formatTempoDate(log.date), log.time, comment]);
        });

    return {
        csv: rows.map(row => row.map(escapeCsvValue).join(',')).join('\r\n'),
        exported: rows.length - 1,
        skipped
    };
}

export function downloadCsv(content, fileName) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
}
