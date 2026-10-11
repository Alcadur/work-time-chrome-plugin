const ISO_LENGTH_WITHOUT_MS = 16

export function getDateTimeFieldFormat(date) {
    return clearSeconds(date).toLocaleString('sv').replace(' ', 'T').substring(0, ISO_LENGTH_WITHOUT_MS);
}

/**
 * @param {Date} date
 * @returns {Date}
 */
export function clearSeconds (date) {
    const copyDate = new Date(date.getTime());
    copyDate.setSeconds(0);
    copyDate.setMilliseconds(0);

    return copyDate;
}

export function getDateFromIso(dateTimeLocalStr) {
    return dateTimeLocalStr ? dateTimeLocalStr.split('T')[0] : '';
}

export function getTimeFromIso(dateTimeLocalStr) {
    return dateTimeLocalStr ? dateTimeLocalStr.split('T')[1] : '';
}

export function formatFinalTime (ms) {
    const totalMinutes = Math.max(1, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (hours > 0) {
        return `${hours}h`;
    }

    return `${minutes}m`;
}

export function formatLocalDateOnly(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(n) {
    return String(n).padStart(2, '0');
}

export function getDateWithoutS (initDate = new Date()) {
    const date = new Date(initDate.getTime());
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
}

