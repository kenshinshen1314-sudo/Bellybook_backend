export declare class DateUtil {
    static startOfDay(date?: Date): Date;
    static endOfDay(date?: Date): Date;
    static dayRange(date?: Date): [Date, Date];
    static addDays(date: Date, days: number): Date;
    static addHours(date: Date, hours: number): Date;
    static addSeconds(date: Date, seconds: number): Date;
    static isSameDay(date1: Date, date2: Date): boolean;
    static isToday(date: Date): boolean;
    static isBetween(date: Date, start: Date, end: Date): boolean;
    static formatDate(date: Date): string;
    static formatDateTime(date: Date): string;
    static toISOString(date: Date): string;
    static getTimestamp(date?: Date): number;
    static fromTimestamp(timestamp: number): Date;
}
export default DateUtil;
