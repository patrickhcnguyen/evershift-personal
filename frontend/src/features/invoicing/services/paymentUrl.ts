// Service for generating payment URLs for invoices
export interface PaymentUrlResponse {
  url: string;
  session_id: string;
}

export interface PaymentUrlError {
  error: string;
}

export const generatePaymentUrl = async (requestId: string): Promise<string> => {
  try {
    const invoiceResponse = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/invoices/request/${requestId}`);
    
    if (!invoiceResponse.ok) {
      throw new Error('Failed to fetch invoice');
    }
    
    const invoice = await invoiceResponse.json();
    const invoiceUUID = invoice.UUID;
    
    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/stripe/create-checkout-session/${invoiceUUID}`, {
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
      const errorData: PaymentUrlError = await response.json();
      throw new Error(errorData.error || 'Failed to create payment URL');
    }

    const data = await response.json();
    return data.checkoutSession; 
  } catch (error) {
    console.error('Payment URL generation error:', error);
    throw error;
  }
}; 