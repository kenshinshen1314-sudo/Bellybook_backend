"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateUtil = void 0;
class DateUtil {
    static startOfDay(date) {
        const d = date ? new Date(date) : new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }
    static endOfDay(date) {
        const d = date ? new Date(date) : new Date();
        d.setHours(23, 59, 59, 999);
        return d;
    }
    static dayRange(date) {
        return [this.startOfDay(date), this.endOfDay(date)];
    }
    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    static addHours(date, hours) {
        const result = new Date(date);
        result.setHours(result.getHours() + hours);
        return result;
    }
    static addSeconds(date, seconds) {
        const result = new Date(date);
        result.setSeconds(result.getSeconds() + seconds);
        return result;
    }
    static isSameDay(date1, date2) {
        const d1 = this.startOfDay(date1);
        const d2 = this.startOfDay(date2);
        return d1.getTime() === d2.getTime();
    }
    static isToday(date) {
        return this.isSameDay(date, new Date());
    }
    static isBetween(date, start, end) {
        const timestamp = date.getTime();
        return timestamp >= start.getTime() && timestamp <= end.getTime();
    }
    static formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    static formatDateTime(date) {
        const datePart = this.formatDate(date);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${datePart} ${hours}:${minutes}:${seconds}`;
    }
    static toISOString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
    static getTimestamp(date = new Date()) {
        return date.getTime();
    }
    static fromTimestamp(timestamp) {
        return new Date(timestamp);
    }
}
exports.DateUtil = DateUtil;
exports.default = DateUtil;
//# sourceMappingURL=date.util.js.map