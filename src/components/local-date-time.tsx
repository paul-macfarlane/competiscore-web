"use client";

import { format } from "date-fns";

type LocalDateTimeProps = {
  date: Date | string;
  formatString: string;
  className?: string;
};

export function LocalDateTime({
  date,
  formatString,
  className,
}: LocalDateTimeProps) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return <span className={className}>{format(dateObj, formatString)}</span>;
}
