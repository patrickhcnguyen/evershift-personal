interface FollowUpDelayResponse {
  message: string;
}

interface FollowUpDelayError {
  error: string;
}

interface FollowUpResponse {
  message: string;
  processed: number;
  criteria: { delay_days: number };
}

interface FollowUpError {
  error: string;
}

// Update individual invoice follow-up delay
export const updateInvoiceFollowUpDelay = async (
  invoiceId: string, 
  delayDays: number
): Promise<FollowUpDelayResponse> => {
  try {
    const response = await fetch(`http://localhost:3001/api/invoices/${invoiceId}/follow-up-delay`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ follow_up_delay_days: delayDays }),
    });

    if (!response.ok) {
      const errorData: FollowUpDelayError = await response.json();
      throw new Error(errorData.error || 'Failed to update follow-up delay');
    }

    const data: FollowUpDelayResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Follow-up delay update error:', error);
    throw error;
  }
};

// Manually trigger follow-ups for invoices with specific delay
export const triggerFollowUpsByDelay = async (
  delayMinutes: number
): Promise<FollowUpResponse> => {
  try {
    const response = await fetch(`http://localhost:3001/api/admin/followups/trigger?delay_days=${delayMinutes}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData: FollowUpError = await response.json();
      throw new Error(errorData.error || 'Failed to trigger follow-ups');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Follow-up trigger error:', error);
    throw error;
  }
}; 