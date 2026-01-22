/**
 * [INPUT]: 无依赖
 * [OUTPUT]: 对外提供日期处理工具函数
 * [POS]: common/utils 的工具模块，被所有需要日期处理的 Service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/**
 * 日期工具类
 *
 * 提供统一的日期处理方法，避免代码重复
 */
export class DateUtil {
  // ============================================================
  // 日期边界
  // ============================================================

  /**
   * 获取一天的开始时间（00:00:00.000）
   *
   * @param date 输入日期，默认为当前时间
   * @returns 当天 00:00:00.000 的 Date 对象
   */
  static startOfDay(date?: Date): Date {
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * 获取一天的结束时间（23:59:59.999）
   *
   * @param date 输入日期
   * @returns 当天 23:59:59.999 的 Date 对象
   */
  static endOfDay(date?: Date): Date {
    const d = date ? new Date(date) : new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * 获取一天的开始时间和结束时间
   *
   * @param date 输入日期
   * @returns [startOfDay, endOfDay]
   */
  static dayRange(date?: Date): [Date, Date] {
    return [this.startOfDay(date), this.endOfDay(date)];
  }

  // ============================================================
  // 日期计算
  // ============================================================

  /**
   * 增加天数
   *
   * @param date 基准日期
   * @param days 增加的天数（可为负数）
   * @returns 新的 Date 对象
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 增加小时
   *
   * @param date 基准日期
   * @param hours 增加的小时数（可为负数）
   * @returns 新的 Date 对象
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * 增加秒数
   *
   * @param date 基准日期
   * @param seconds 增加的秒数（可为负数）
   * @returns 新的 Date 对象
   */
  static addSeconds(date: Date, seconds: number): Date {
    const result = new Date(date);
    result.setSeconds(result.getSeconds() + seconds);
    return result;
  }

  // ============================================================
  // 日期比较
  // ============================================================

  /**
   * 判断两个日期是否是同一天
   *
   * @param date1 第一个日期
   * @param date2 第二个日期
   * @returns 是否同一天
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    const d1 = this.startOfDay(date1);
    const d2 = this.startOfDay(date2);
    return d1.getTime() === d2.getTime();
  }

  /**
   * 判断日期是否在今天
   *
   * @param date 要判断的日期
   * @returns 是否在今天
   */
  static isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  /**
   * 判断日期是否在两个日期之间
   *
   * @param date 要判断的日期
   * @param start 开始日期（包含）
   * @param end 结束日期（包含）
   * @returns 是否在范围内
   */
  static isBetween(date: Date, start: Date, end: Date): boolean {
    const timestamp = date.getTime();
    return timestamp >= start.getTime() && timestamp <= end.getTime();
  }

  // ============================================================
  // 日期格式化
  // ============================================================

  /**
   * 格式化日期为 YYYY-MM-DD
   *
   * @param date 要格式化的日期
   * @returns 格式化后的字符串
   */
  static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
   *
   * @param date 要格式化的日期
   * @returns 格式化后的字符串
   */
  static formatDateTime(date: Date): string {
    const datePart = this.formatDate(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${datePart} ${hours}:${minutes}:${seconds}`;
  }

  // ============================================================
  // ISO 字符串处理
  // ============================================================

  /**
   * 获取日期的 ISO 字符串（去除时区信息）
   *
   * @param date 要转换的日期
   * @returns 本地日期的 ISO 格式字符串
   */
  static toISOString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  // ============================================================
  // 时区处理
  // ============================================================

  /**
   * 获取 UTC 时间戳（毫秒）
   *
   * @param date 输入日期
   * @returns UTC 时间戳
   */
  static getTimestamp(date: Date = new Date()): number {
    return date.getTime();
  }

  /**
   * 从时间戳创建 Date 对象
   *
   * @param timestamp UTC 时间戳（毫秒）
   * @returns Date 对象
   */
  static fromTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }
}

/**
 * 默认导出（兼容性）
 */
export default DateUtil;
