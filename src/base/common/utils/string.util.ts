/**
 * StringUtils class.
 */
export class StringUtils {
  /**
   * Check string is empty or blank.
   *
   * @param str string
   */
  public static isEmptyOrBlank(str: string): boolean {
    if (!str) {
      return true;
    }
    str = str.trim();
    return str === '';
  }

  /**
   * Check value is string.
   *
   * @param value any type
   */
  public static isTypeString(value: any): boolean {
    return typeof value === 'string';
  }

  /**
   * Equals two string.
   *
   * @param str1 string
   * @param str2 string
   */
  public static equals(str1: string, str2: string): boolean {
    return str1 === str2;
  }

  public static snakeToCamel(snakeStr: string) {
    return snakeStr.replace(/(_\w)/g, (matches) => matches[1].toUpperCase());
  }

  public static camelToSnake(camelStr: string) {
    return camelStr.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }
}
