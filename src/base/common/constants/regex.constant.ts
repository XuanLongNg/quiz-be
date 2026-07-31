/**
 * RegexConstants.
 */
export class RegexConstants {
  public static readonly DATE_YYYYMMDD = /^\d{4}\d{2}\d{2}$/;
  public static readonly OFFSET_TIMESTAMP =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/;
  public static readonly EMAIL =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
}
