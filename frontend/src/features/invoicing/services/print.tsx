import React from 'react';
import { useReactToPrint } from 'react-to-print';
import { Invoice } from '../types';

interface UseInvoicePrintProps {
  componentRef: React.RefObject<HTMLElement>;
  invoice: Invoice | null;
}

export const useInvoicePrint = ({ componentRef, invoice }: UseInvoicePrintProps) => {
  return useReactToPrint({
    contentRef: componentRef,
    documentTitle: invoice?.uuid ? `Invoice ${invoice.uuid}` : 'Invoice',
    onAfterPrint: () => console.log('Printing complete'),
    onPrintError: (error) => console.error('Printing error:', error),
  });
};