// types for the invoicing

export interface Request {
  id: string;
  is_company: boolean;
  first_name: string; 
  last_name: string;
  company_name: string;
  email: string;
  phone_number: string;
  due_date: string;
  branch_name: string;
  branch_id: string; 
  type_of_event: string;
  amount: number;
  balance: number;
  status: string; 
  invoice: Invoice;
  custom_line_items: CustomLineItem[];
  staff_requirements: StaffRequirement[];
}
export interface Invoice {
  uuid: string;
  request_id: string;
  branch?: string;
  client_name?: string;
  client_email?: string;
  company_name?: string | null;
  event_location?: string | null;
  shipping_cost?: number;
  amount_paid?: number;
  payment_intent_id?: string | null;
  due_date: string;
  subtotal: number;
  discount_type: string | null;
  discount_value: number | null;
  type_of_event: string;
  transaction_fee: number;
  service_fee: number;
  amount: number;
  balance: number;
  status: string;
  payment_terms: string | null;
  notes: string | null;
  ship_to: string | null;
  po_edit_counter: number | null;
  po_number: string | null;
  terms_and_conditions: string;
}

export interface StaffRequirement {
  uuid?: string;
  request_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  position: string;
  rate: number;
  count: number;
  amount?: number;
}

export interface CustomLineItem {
  uuid: string;
  request_id: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface InvoiceItem {
  description: string;
  startTime?: string;
  endTime?: string;
  hours?: number;
  quantity: number;
  rate: number;
  amount: number;
  date?: string;
  address?: string;
}

export const STAFF_TYPES = [
  'Brand Ambassadors',
  'Bartenders',
  'Production Assistants',
  'Catering Staff',
  'Model Staff',
  'Registration Staff',
  'Convention Staff'
]

export const PAYMENT_TERMS = [
  "Net 30",
  "Net 10",
  "Due on receipt"
]