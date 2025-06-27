interface RefundResponse {
    refund: string;
}

interface RefundError {
    error: string;
}

export const refundInvoice = async (invoiceId: string): Promise<RefundResponse | RefundError> => {
    try {
        const response = await fetch(`https://evershift-personal.onrender.com/api/stripe/refund-payment/${invoiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        return { error: error.message };
    }
}