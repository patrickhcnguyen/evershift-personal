interface SendEmailResponse {
  message: string;
}

interface EmailHeaders {
  subject?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

interface SendEmailError {
  error: string;
}

interface CachedEmailData {
  content: string;
  headers: EmailHeaders;
  timestamp: number;
  requestId: string;
}

const EMAIL_CACHE_KEY = 'custom_email_cache';
const CACHE_DURATION = 72 * 60 * 60 * 1000; // 3 days cached in local storage 

export const saveDraftEmail = (requestId: string, content: string, headers: EmailHeaders = {}): void => {
  try {
    const cacheData: CachedEmailData = {
      content,
      headers,
      timestamp: Date.now(),
      requestId
    };
    localStorage.setItem(`${EMAIL_CACHE_KEY}_${requestId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to save draft email:', error);
  }
};

export const loadDraftEmail = (requestId: string): { content: string; headers: EmailHeaders } | null => {
  try {
    const cached = localStorage.getItem(`${EMAIL_CACHE_KEY}_${requestId}`);
    if (!cached) return null;

    const cacheData: CachedEmailData = JSON.parse(cached);
    
    const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION;
    if (isExpired) {
      localStorage.removeItem(`${EMAIL_CACHE_KEY}_${requestId}`);
      console.log(`Expired draft email removed for request ${requestId}`);
      return null;
    }
    
    return {
      content: cacheData.content,
      headers: cacheData.headers || {}
    };
  } catch (error) {
    console.error('Failed to load draft email:', error);
    return null;
  }
};

export const clearDraftEmail = (requestId: string): void => {
  try {
    localStorage.removeItem(`${EMAIL_CACHE_KEY}_${requestId}`);
    console.log(`Draft email cleared for request ${requestId}`);
  } catch (error) {
    console.error('Failed to clear draft email:', error);
  }
};

export const sendInvoiceEmail = async (requestId: string): Promise<SendEmailResponse> => {
  try {
    const response = await fetch(`https://evershift-personal.onrender.com/api/emails/send/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Server error (${response.status}): ${text}`);
    }

    if (!response.ok) {
      const errorData: SendEmailError = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    const data: SendEmailResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

export const sendCustomEmail = async (
  requestId: string, 
  emailContent: string, 
  headers: EmailHeaders = {},
  pdfFile?: File | null
): Promise<SendEmailResponse> => {
  try {
    const formData = new FormData();
    
    formData.append('emailContent', emailContent);
    formData.append('headers', JSON.stringify(headers));
    
    if (pdfFile) {
      formData.append('invoicePDF', pdfFile);
    }

    const response = await fetch(`https://evershift-personal.onrender.com/api/emails/send-custom/${requestId}`, {
      method: 'POST',
      body: formData,
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Server error (${response.status}): ${text}`);
    }

    if (!response.ok) {
      const errorData: SendEmailError = await response.json();
      throw new Error(errorData.error || 'Failed to send custom email');
    }

    clearDraftEmail(requestId);

    const data: SendEmailResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Custom email sending error:', error);
    throw error;
  }
};
