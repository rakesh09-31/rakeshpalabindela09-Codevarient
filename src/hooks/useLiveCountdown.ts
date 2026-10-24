import { useState, useEffect } from 'react';

export interface CountdownInfo {
  isOverdue: boolean;
  isDueNow: boolean;
  text: string;
  diffMs: number;
}

export function formatLiveCountdown(dateTimeIso?: string, nowMs: number = Date.now()): CountdownInfo {
  if (!dateTimeIso) {
    return { isOverdue: false, isDueNow: false, text: 'No due date', diffMs: 0 };
  }

  const dueMs = new Date(dateTimeIso).getTime();
  if (isNaN(dueMs)) {
    return { isOverdue: false, isDueNow: false, text: 'Invalid date', diffMs: 0 };
  }

  const diffMs = dueMs - nowMs;

  // Within 60 seconds of due date is considered "Due now"
  if (Math.abs(diffMs) < 60 * 1000) {
    return {
      isOverdue: false,
      isDueNow: true,
      text: 'Due now',
      diffMs,
    };
  }

  if (diffMs > 0) {
    // In the future
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);

    let text = 'Due in ';
    if (days > 0) {
      text += `${days} ${days === 1 ? 'day' : 'days'}`;
      if (hours > 0) {
        text += `, ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      }
    } else if (hours > 0) {
      text += `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      if (minutes > 0) {
        text += `, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
      }
    } else if (minutes > 0) {
      text += `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else {
      text = 'Due now';
    }

    return {
      isOverdue: false,
      isDueNow: false,
      text,
      diffMs,
    };
  } else {
    // In the past (Overdue)
    const absDiff = Math.abs(diffMs);
    const days = Math.floor(absDiff / 86400000);
    const hours = Math.floor((absDiff % 86400000) / 3600000);
    const minutes = Math.floor((absDiff % 3600000) / 60000);

    let text = 'Overdue by ';
    if (days > 0) {
      text += `${days} ${days === 1 ? 'day' : 'days'}`;
      if (hours > 0) {
        text += `, ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      }
    } else if (hours > 0) {
      text += `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      if (minutes > 0) {
        text += `, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
      }
    } else if (minutes > 0) {
      text += `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else {
      text = 'Due now';
    }

    return {
      isOverdue: true,
      isDueNow: false,
      text,
      diffMs,
    };
  }
}

/**
 * React hook that recalculates countdown state regularly and reacts to dateTime changes.
 */
export function useLiveCountdown(dateTimeIso?: string, refreshIntervalMs: number = 10000): CountdownInfo {
  const [currentMs, setCurrentMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!dateTimeIso) return;

    const intervalId = window.setInterval(() => {
      setCurrentMs(Date.now());
    }, refreshIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [dateTimeIso, refreshIntervalMs]);

  return formatLiveCountdown(dateTimeIso, currentMs);
}
