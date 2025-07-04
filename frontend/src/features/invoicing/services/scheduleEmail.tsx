import { 
  EmailHeaders, 
  ScheduleEmailResponse, 
  EmailError, 
  CachedScheduledEmailData 
} from "../types";

export const scheduleEmail = async (
  requestId: string, 
  daysFromNow: number
): Promise<ScheduleEmailResponse> => {
  try {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + daysFromNow);
    const sendAt = scheduledDate.toISOString();

    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/emails/schedule/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        send_at: sendAt
      }),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Server error (${response.status}): ${text}`);
    }

    if (!response.ok) {
      const errorData: EmailError = await response.json();
      throw new Error(errorData.error || 'Failed to schedule email');
    }

    const data: ScheduleEmailResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Email scheduling error:', error);
    throw error;
  }
};

export const scheduleEmailAtSpecificTime = async (
  requestId: string,
  sendAt: string
): Promise<ScheduleEmailResponse> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/emails/schedule/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        send_at: sendAt
      }),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Server error (${response.status}): ${text}`);
    }

    if (!response.ok) {
      const errorData: EmailError = await response.json();
      throw new Error(errorData.error || 'Failed to schedule email');
    }

    const data: ScheduleEmailResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Email scheduling error:', error);
    throw error;
  }
};

// New function for custom scheduled emails
export const scheduleCustomEmail = async (
  requestId: string,
  sendAt: string,
  emailContent: string,
  emailHeaders: EmailHeaders,
  paymentUrl?: string
): Promise<ScheduleEmailResponse> => {
  try {
    const requestBody: any = {
      send_at: sendAt,
      email_content: emailContent,
      email_subject: emailHeaders.subject,
      email_headers: emailHeaders
    };

    if (paymentUrl) {
      requestBody.payment_url = paymentUrl;
    }

    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/emails/schedule/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Server error (${response.status}): ${text}`);
    }

    if (!response.ok) {
      const errorData: EmailError = await response.json();
      throw new Error(errorData.error || 'Failed to schedule custom email');
    }

    const data: ScheduleEmailResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Custom email scheduling error:', error);
    throw error;
  }
};

// Draft management for scheduled emails (extending the existing pattern)
const SCHEDULED_EMAIL_CACHE_KEY = 'scheduled_email_cache';
const CACHE_DURATION = 72 * 60 * 60 * 1000; // 3 days

export const saveScheduledEmailDraft = (
  requestId: string, 
  content: string, 
  headers: EmailHeaders,
  scheduleData: {
    scheduleType: 'days' | 'specific';
    daysFromNow?: number;
    specificDate?: string;
    specificTime?: string;
  }
): void => {
  try {
    const cacheData: CachedScheduledEmailData = {
      content,
      headers,
      scheduleType: scheduleData.scheduleType,
      daysFromNow: scheduleData.daysFromNow,
      specificDate: scheduleData.specificDate,
      specificTime: scheduleData.specificTime,
      timestamp: Date.now(),
      requestId
    };
    localStorage.setItem(`${SCHEDULED_EMAIL_CACHE_KEY}_${requestId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to save scheduled email draft:', error);
  }
};

export const loadScheduledEmailDraft = (requestId: string): CachedScheduledEmailData | null => {
  try {
    const cached = localStorage.getItem(`${SCHEDULED_EMAIL_CACHE_KEY}_${requestId}`);
    if (!cached) return null;

    const cacheData: CachedScheduledEmailData = JSON.parse(cached);
    
    const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION;
    if (isExpired) {
      localStorage.removeItem(`${SCHEDULED_EMAIL_CACHE_KEY}_${requestId}`);
      console.log(`Expired scheduled email draft removed for request ${requestId}`);
      return null;
    }
    
    return cacheData;
  } catch (error) {
    console.error('Failed to load scheduled email draft:', error);
    return null;
  }
};

export const clearScheduledEmailDraft = (requestId: string): void => {
  try {
    localStorage.removeItem(`${SCHEDULED_EMAIL_CACHE_KEY}_${requestId}`);
    console.log(`Scheduled email draft cleared for request ${requestId}`);
  } catch (error) {
    console.error('Failed to clear scheduled email draft:', error);
  }
}; 