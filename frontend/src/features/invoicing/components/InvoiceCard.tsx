import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Request, Invoice, StaffRequirement as DisplayStaffRequirement } from "@/features/invoicing/types";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Mail, Printer, Save, Edit, X, Clock } from "lucide-react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCookie } from "@/hooks/useCookie";

import { PAYMENT_TERMS, STAFF_TYPES, CustomLineItem, StaffRequirement as EditorStaffRequirement } from "../types";

import { EmailModal } from "./EmailModal";
import { ScheduleEmailModal } from "./ScheduleEmailModal";

import { sendInvoiceEmail } from '../services/sendEmail';
import { refundInvoice } from '../services/refund';
import { useInvoicePrint } from '../services/print';
import { useInvoiceEditor } from '../services/edit';

// Convert UTC time to local timezone with clean formatting
const formatTimeToLocal = (utcTimeString: string, timezone = 'America/Los_Angeles') => {
  const date = new Date(utcTimeString);
  
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short'
  }).format(date);
};

const formatTimeToHHMM = (utcTimeString: string, timezone = 'America/Los_Angeles') => {
  const date = new Date(utcTimeString);
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    hour12: false
  }).format(date);
};

// Format time based on selected format preference
const formatTimeByPreference = (utcTimeString: string, format: '12hr' | '24hr', timezone = 'America/Los_Angeles') => {
  if (!utcTimeString) return 'N/A';
  
  const date = new Date(utcTimeString);
  
  if (format === '24hr') {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      hour12: false
    }).format(date);
  } else {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short'
    }).format(date);
  }
};

// Convert 12hr time string to 24hr format
const convertTo24Hour = (timeString: string) => {
  if (!timeString || timeString === 'N/A') return 'N/A';
  
  // Remove timezone info if present (e.g., "2:00 PM PST" -> "2:00 PM")
  const timeOnly = timeString.replace(/\s[A-Z]{3,4}$/, '');
  
  try {
    // Create a date object from the time string
    const today = new Date().toDateString();
    const fullDateTime = new Date(`${today} ${timeOnly}`);
    
    if (isNaN(fullDateTime.getTime())) return timeString; // Return original if parsing fails
    
    return fullDateTime.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return timeString; // Return original if conversion fails
  }
};

export function InvoiceCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  // const { toast } = useToast();
  const [request, setRequest] = useState<Request | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [staffRequirements, setStaffRequirements] = useState<DisplayStaffRequirement[]>([]);
  const [rawStaffRequirements, setRawStaffRequirements] = useState<EditorStaffRequirement[]>([]);
  const [customLineItems, setCustomLineItems] = useState<CustomLineItem[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [editMode, setEditMode] = useState(false);
  
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isScheduleEmailModalOpen, setIsScheduleEmailModalOpen] = useState(false);
  const [scheduleEmailMessage, setScheduleEmailMessage] = useState<string>('');
  const [showLogo, setShowLogo] = useState(true);
  const [timeFormat, setTimeFormat] = useState<'12hr' | '24hr'>('12hr');
  
  const handlePrint = useInvoicePrint({ componentRef, invoice });
  
  const fetchInvoiceData = useCallback(async () => {
    const requestId = params.id || location.pathname.split("/").pop();

    if (!requestId) {
      console.error("No request ID found in URL");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [
        invoiceData,
        staffRequirementsData,
        customLineItemsData,
        requestData,
      ] = await Promise.all([
        fetch(`http://localhost:3001/api/invoices/request/${requestId}`),
        fetch(
          `http://localhost:3001/api/staff-requirements/request/${requestId}`
        ),
        fetch(
          `http://localhost:3001/api/custom-line-items/request/${requestId}`
        ),
        fetch(`http://localhost:3001/api/requests/${requestId}`),
      ]);

      if (
        !invoiceData.ok ||
        !staffRequirementsData.ok ||
        !requestData.ok
      ) {
        throw new Error(`Failed to fetch critical invoice data`);
      }

      const requestRes = await requestData.json();
      setRequest(requestRes);

      const invoiceRes = await invoiceData.json();
      const staffRequirementsRes = await staffRequirementsData.json();
      const customLineItemsRes = customLineItemsData.ok ? await customLineItemsData.json() : [];

      const mappedInvoice: Invoice =   {
        uuid: invoiceRes.UUID,
        request_id: invoiceRes.RequestID,
        branch: requestRes.ClosestBranchName || "N/A",
        client_name: `${requestRes.FirstName} ${requestRes.LastName}` || "N/A",
        client_email: requestRes.Email || "N/A",
        company_name: requestRes.CompanyName || null,
        due_date: invoiceRes.DueDate,
        subtotal: invoiceRes.Subtotal || 0,
        amount: invoiceRes.Amount || 0,
        balance: invoiceRes.Balance || 0,
        status: invoiceRes.Status,
        payment_terms: invoiceRes.PaymentTerms,
        notes: invoiceRes.Notes,
        ship_to: invoiceRes.ShipTo,
        po_number: invoiceRes.po_number,
        po_edit_counter: invoiceRes.po_edit_counter,
        event_location: requestRes.EventLocation || invoiceRes.ShipTo,
        amount_paid: invoiceRes.AmountPaid || 0,
        transaction_fee: invoiceRes.TransactionFee || 0,
        payment_intent_id: invoiceRes.PaymentIntent,
        service_fee: invoiceRes.ServiceFee || 0,
        discount_type: invoiceRes.DiscountType,
        discount_value: invoiceRes.DiscountValue || 0,
        type_of_event: requestRes.TypeOfEvent || "N/A",
        terms_and_conditions: invoiceRes.terms_and_conditions || "",
      };

      const editorStaffReqs: EditorStaffRequirement[] =
        staffRequirementsRes.map((req: any) => ({
          uuid: req.uuid || req.UUID,
          request_id: req.request_id || req.RequestID,
          position: req.position || req.Position,
          date: req.date ? new Date(req.date).toISOString().split('T')[0] : 
                req.Date ? new Date(req.Date).toISOString().split('T')[0] : '',
          start_time: req.start_time ? formatTimeToHHMM(req.start_time) : 
                      req.StartTime ? formatTimeToHHMM(req.StartTime) : '00:00',
          end_time: req.end_time ? formatTimeToHHMM(req.end_time) : 
                    req.EndTime ? formatTimeToHHMM(req.EndTime) : '00:00',
          rate: req.rate || req.Rate || 0,
          count: req.count || req.Count || 0,
          amount: req.amount || req.Amount || 0,
        }));
      
      const editorCustomLineItems: CustomLineItem[] = customLineItemsRes.map(
        (item: any) => ({
          uuid: item.uuid || item.UUID || '',
          request_id: item.request_id || item.RequestID || '',
          description: item.description || item.Description || '',
          quantity: item.quantity || item.Quantity || 0,
          rate: item.rate || item.Rate || 0,
          total: item.total || item.Total || 0,
        })
      );

      
      setInvoice(mappedInvoice);
      setRawStaffRequirements(editorStaffReqs);
      setCustomLineItems(editorCustomLineItems);
      
      const mappedStaffRequirements: DisplayStaffRequirement[] = staffRequirementsRes.map(
        (req: any) => ({
          date: req.date || req.Date,
          rate: req.rate || req.Rate || 0,
          count: req.count || req.Count || 0,
          start_time: (req.start_time || req.StartTime) ? 
            formatTimeToLocal((req.start_time || req.StartTime).toString()) : 'N/A',
          end_time: (req.end_time || req.EndTime) ? 
            formatTimeToLocal((req.end_time || req.EndTime).toString()) : 'N/A',
          position: req.position || req.Position || '',
          amount: req.amount || req.Amount || 0,
        })
      );

      setStaffRequirements(mappedStaffRequirements);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id, location.pathname]);

  useEffect(() => {
    fetchInvoiceData();
  }, [fetchInvoiceData]);

  const {
    isSaving,
    editedInvoice,
    editedStaff,
    customLineItems: editedCustomLineItems,
    canEditPoNumber,
    handleFieldChange,
    handleStaffChange,
    addStaffRequirement,
    removeStaffRequirement,
    handleCustomLineItemChange,
    addCustomLineItem,
    removeCustomLineItem,
    cancelEdit,
    handleSave,
  } = useInvoiceEditor({
    initialInvoice: invoice,
    initialStaffRequirements: rawStaffRequirements,
    initialCustomLineItems: customLineItems,
    editMode,        
  });

  const handleSendEmail = async () => {
    if (!invoice?.request_id) {
      console.error('No request ID available');
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendInvoiceEmail(invoice.request_id);
      alert('Invoice email sent successfully!');
    } catch (error) {
      console.error('Failed to send email:', error);
      alert((error as Error).message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const adminName = useCookie('user_name') || 'Admin';

  if (isLoading) {
    return <div className="container mx-auto py-8 text-center">Loading invoice data...</div>;
  }
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4" 
          onClick={() => navigate('/invoicing')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
        {/* <h1 className="text-xl font-bold text-center">Invoice Details</h1> */}
        
        <div className="ml-auto flex gap-2">
          {editMode ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  cancelEdit();
                  setEditMode(false);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={async () => {
                  await handleSave();
                  await fetchInvoiceData();
                  setEditMode(false);
                }}
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditMode(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowLogo(!showLogo)}
              >
                {showLogo ? 'Hide Logo' : 'Show Logo'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setTimeFormat(timeFormat === '12hr' ? '24hr' : '12hr')}
              >
                {timeFormat === '12hr' ? '24hr Time' : '12hr Time'}
              </Button>
              <Button variant="outline" size="sm" 
              onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSendEmail}
                disabled={isSendingEmail}
              >
                <Mail className="mr-2 h-4 w-4" />
                {isSendingEmail ? "Sending..." : "Email"}
              </Button>
              
              <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Mail className="mr-2 h-4 w-4" />
                    Custom Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Send Custom Email</DialogTitle>
                  </DialogHeader>
                  {invoice && (
                    <EmailModal
                      requestId={invoice.request_id}
                      clientName={invoice.client_name}
                      adminName={adminName}
                      onClose={() => setIsEmailModalOpen(false)}
                    />
                  )}
                </DialogContent>
              </Dialog>
              
              <Dialog open={isScheduleEmailModalOpen} onOpenChange={setIsScheduleEmailModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Clock className="mr-2 h-4 w-4" />
                    Schedule Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Schedule Email</DialogTitle>
                  </DialogHeader>
                  {invoice && (
                    <ScheduleEmailModal
                      requestId={invoice.request_id}
                      clientName={invoice.client_name}
                      onClose={() => setIsScheduleEmailModalOpen(false)}
                      onSuccess={(message) => {
                        setScheduleEmailMessage(message);
                        setTimeout(() => setScheduleEmailMessage(''), 5000);
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {scheduleEmailMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md mb-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            <span>{scheduleEmailMessage}</span>
          </div>
        </div>
      )}

      <Card ref={componentRef} className="pr-8">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start gap-6 w-full">
          {showLogo && (
            <div className="flex-shrink-0">
              <img 
                src="/eleven8logo.svg" 
                alt="eleven8 Logo" 
                className="h-28 w-auto object-contain"
              />
            </div>
          )}
          
          {/* Invoice Title and Branch Info */}
          <div className="flex-grow mt-2">
            <CardTitle className="text-xl">
              <span>Request #{(editMode ? editedInvoice?.request_id : invoice?.request_id) || 'N/A'}</span>
            </CardTitle>
            <CardDescription>
              Branch: {(editMode ? editedInvoice?.branch : invoice?.branch) || 'N/A'}
            </CardDescription>
          </div>
        </div>

        {/* Status section - moved to the right */}
        <div className="flex-shrink-0 mt-2">
          {editMode ? (
            <Select 
              value={editedInvoice?.status || ''} 
              onValueChange={value => handleFieldChange('status', value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <Badge className={`${
                invoice?.status === 'paid' ? 'bg-green-500' : 
                invoice?.status === 'unpaid' ? 'bg-red-500' : 
                invoice?.status === 'partially_paid' ? 'bg-yellow-500' : 
                'bg-gray-500'
              }`}>
                {invoice?.status && typeof invoice.status === 'string' 
                  ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace('_', ' ') 
                  : 'N/A'
                }
              </Badge>

              {invoice?.status === 'paid' && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={async () => {
                    if (!invoice?.uuid) return;
                    try {
                      const refund = await refundInvoice(invoice.uuid);
                      if ('refund' in refund) {
                        alert(`Refund successful: ${refund.refund}`);
                      } else {
                        alert('An error occurred while refunding');
                      }
                    } catch (error) {
                      console.error('Refund error:', error);
                      alert((error as Error).message || 'An error occurred while refunding');
                    }
                  }}
                >
                  Refund
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-medium mb-2">Client Information</h3>
              {editMode && editedInvoice ? (
                <>
                  <div className="mb-2">
                    <label className="text-sm text-muted-foreground">Company Name</label>
                    <Input 
                      value={editedInvoice.company_name || ''} 
                      onChange={e => handleFieldChange('company_name', e.target.value)} 
                      className="mt-1"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="text-sm text-muted-foreground">Client Name</label>
                    <Input 
                      value={editedInvoice.client_name || ''} 
                      onChange={e => handleFieldChange('client_name', e.target.value)} 
                      className="mt-1"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="text-sm text-muted-foreground">Email</label>
                    <Input 
                      value={editedInvoice.client_email || ''} 
                      onChange={e => handleFieldChange('client_email', e.target.value)} 
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <>
                  {invoice?.company_name && (
                    <p className="text-sm font-semibold">{invoice.company_name}</p>
                  )}
                  <p className="text-sm">{invoice?.client_name || 'N/A'}</p>
                  <p className="text-sm">{invoice?.client_email || 'N/A'}</p>
                </>
              )}
              
              <h3 className="font-medium mt-4 mb-2">Bill To</h3>
              {editMode && editedInvoice ? (
                <Textarea 
                  value={editedInvoice.ship_to || ''} 
                  onChange={e => handleFieldChange('ship_to', e.target.value)} 
                  className="mt-1"
                />
              ) : (
                <p className="text-sm">{invoice?.ship_to || "Not specified"}</p>
              )}
              <h3 className="font-medium mt-4 mb-2">Event Location</h3>
              {editMode && editedInvoice ? (
                <Input 
                  value={editedInvoice.event_location || ''} 
                  onChange={e => handleFieldChange('event_location', e.target.value)} 
                  className="mt-1"
                />
              ) : (
                <p className="text-sm">{invoice?.event_location || "Not specified"}</p>
              )}
            </div>
            
            <div>
              <h3 className="font-medium mt-4 mb-2">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Due Date:</div>
                {editMode && editedInvoice ? (
                  <Input 
                    type="date" 
                    value={editedInvoice.due_date ? new Date(editedInvoice.due_date).toISOString().split('T')[0] : ''}
                    onChange={e => handleFieldChange('due_date', e.target.value)} 
                  />
                ) : (
                  <div>{invoice?.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</div>
                )}
                
                <div className="text-muted-foreground">Payment Terms:</div>
                {editMode && editedInvoice ? (
                  <Select 
                    value={editedInvoice.payment_terms || "Due on receipt"} 
                    onValueChange={value => handleFieldChange('payment_terms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map(term => (
                        <SelectItem key={term} value={term}>{term}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>{invoice?.payment_terms || "Due on receipt"}</div>
                )}
                
                <div className="text-muted-foreground">Transaction fee</div>
                <div>{formatCurrency(invoice?.transaction_fee || 0)}</div>
                
                <div className="text-muted-foreground">Invoice Number:</div>
                {editMode && editedInvoice ? (
                  <Input 
                    value={editedInvoice.po_number || ''} 
                    onChange={(e) => handleFieldChange('po_number', e.target.value)}
                    disabled={!canEditPoNumber()}
                    placeholder="Enter Invoice Number"
                  />
                ) : (
                  <div>{invoice?.po_number || "Not specified"}</div>
                )}

                {!canEditPoNumber() && (
                  <p className="text-sm text-gray-500">
                    PO number has already been set and cannot be changed.
                  </p>
                )}

                {editMode && editedInvoice && (
                  <>
                    <div className="text-muted-foreground">Discount Type:</div>
                    <Select 
                      value={editedInvoice.discount_type || 'none'} 
                      onValueChange={value => handleFieldChange('discount_type', value === 'none' ? null : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Discount</SelectItem>
                        <SelectItem value="flat">Flat Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>

                    {editedInvoice.discount_type && editedInvoice.discount_type !== 'none' && (
                      <>
                        <div className="text-muted-foreground">
                          Discount Value {editedInvoice.discount_type === 'percentage' ? '(%)' : '($)'}:
                        </div>
                        <Input 
                          type="number"
                          value={editedInvoice.discount_value || ''}
                          onChange={e => handleFieldChange('discount_value', parseFloat(e.target.value) || 0)}
                          placeholder={editedInvoice.discount_type === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />
          
          {/* Custom Requirements Section */}
          {request?.CustomRequirementsText && request.CustomRequirementsText.trim() && !editMode &&
           (rawStaffRequirements.length === 0 || rawStaffRequirements.every(req => req.count === 0)) && (
            <div className="mb-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-orange-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-orange-800 mb-2">⚠️ Custom Requirements - Manual Processing Required</h3>
                    <div className="bg-white border border-orange-200 rounded p-3 mb-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.CustomRequirementsText}</p>
                    </div>
                    <div className="text-sm text-orange-700">
                      <p className="font-medium mb-1">Action Required:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Review the custom requirements above</li>
                        <li>Add appropriate line items using the "Edit" button</li>
                        <li>Set correct quantities, rates, and descriptions</li>
                        <li>Update invoice total and send to client</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="font-medium mb-2">Notes</h3>
            {editMode && editedInvoice ? (
              <Textarea 
                value={editedInvoice.notes || ''} 
                onChange={e => handleFieldChange('notes', e.target.value)} 
                className="w-full"
                placeholder="Enter any additional notes here"
                rows={4}
              />
            ) : (
              <p className="text-sm">{invoice?.notes || "No notes added"}</p>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {editMode && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {editMode 
                ? editedStaff.map((requirement, index) => {
                  const startTime = requirement.start_time ? new Date(`1970-01-01T${requirement.start_time}:00`) : null;
                  const endTime = requirement.end_time ? new Date(`1970-01-01T${requirement.end_time}:00`) : null;
                  let hours = 0;
                  if (startTime && endTime && endTime > startTime) {
                    hours = (endTime.getTime() - startTime.getTime()) / 3600000;
                  }
                  // const amount = (requirement.rate || 0) * hours * (requirement.count || 0);

                  return (
                    <TableRow key={requirement.uuid || `staff-${index}`}>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Select
                            value={requirement.position}
                            onValueChange={(newValue) => handleStaffChange(index, 'position', newValue)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select staff type" />
                            </SelectTrigger>
                            <SelectContent>
                              {STAFF_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex flex-col gap-2">
                            <Input 
                              type="date" 
                              value={requirement.date || ''}
                              onChange={e => handleStaffChange(index, 'date', e.target.value)}
                              className="w-full"
                            />
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={requirement.start_time || ''}
                                onChange={e => handleStaffChange(index, 'start_time', e.target.value)}
                                className="w-28"
                              />
                              <span>to</span>
                              <Input
                                type="time"
                                value={requirement.end_time || ''}
                                onChange={e => handleStaffChange(index, 'end_time', e.target.value)}
                                className="w-28"
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number"
                          min="0"
                          value={requirement.count || 0}
                          onChange={e => handleStaffChange(index, 'count', parseInt(e.target.value) || 0)}
                          className="w-16 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          $<Input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={requirement.rate || 0}
                            onChange={e => handleStaffChange(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-20 text-right"
                          />
                          <span>/ hr</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${(requirement.amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStaffRequirement(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              : staffRequirements?.map((requirement, index) => (
                <TableRow key={`${requirement.position}-${requirement.date}-${index}`}>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <span className="font-medium">{requirement.position}</span>
                      <div className="flex flex-col gap-2">
                        <span className="text-sm text-muted-foreground">
                          {(requirement.date ? new Date(requirement.date).toLocaleDateString() : 'N/A')} ({
                            timeFormat === '12hr' 
                              ? (requirement.start_time || 'N/A')
                              : convertTo24Hour(requirement.start_time || 'N/A')
                          } - {
                            timeFormat === '12hr' 
                              ? (requirement.end_time || 'N/A')
                              : convertTo24Hour(requirement.end_time || 'N/A')
                          })
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{requirement.count || 0}</TableCell>
                  <TableCell className="text-right">
                      {`$${(requirement.rate || 0).toFixed(2)} / hr`}
                  </TableCell>
                  <TableCell className="text-right">${(requirement.amount || 0).toFixed(2)}</TableCell>
                  {editMode && <TableCell></TableCell>}
                </TableRow>
              ))
              }

              {editMode && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addStaffRequirement}
                      className="w-full"
                    >
                      Add Staff Requirement
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              
              {(editMode ? editedCustomLineItems : customLineItems)?.map((item, index) => (
                  <TableRow key={item.uuid || `custom-${index}`}>
                    <TableCell>
                      {editMode ? (
                        <Input
                          value={item.description}
                          onChange={(e) => handleCustomLineItemChange(index, 'description', e.target.value)}
                          placeholder="Item description"
                        />
                      ) : (
                        item.description
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editMode ? (
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleCustomLineItemChange(index, 'quantity', parseInt(e.target.value, 10) || 0)}
                          className="w-20 text-right"
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editMode ? (
                        <div className="flex items-center justify-end gap-1">
                          $
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleCustomLineItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-24 text-right"
                          />
                        </div>
                      ) : (
                        `$${(item.rate || 0).toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(item.total || 0).toFixed(2)}
                    </TableCell>
                    {editMode && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomLineItem(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}

              {editMode && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCustomLineItem}
                      className="w-full"
                    >
                      Add Custom Line Item
                    </Button>
                  </TableCell>
                </TableRow>
              )}

              <TableRow className="border-t-2">
                <TableCell colSpan={3} className="text-right font-medium">
                  Subtotal
                </TableCell>
                <TableCell className="text-right">
                  ${(editMode && editedInvoice ? editedInvoice.subtotal : invoice?.subtotal || 0).toFixed(2)}
                </TableCell>
                {editMode && <TableCell></TableCell>}
              </TableRow>

              {(editMode && editedInvoice ? editedInvoice.discount_value : invoice?.discount_value || 0) > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Discount ({(editMode && editedInvoice ? editedInvoice.discount_type : invoice?.discount_type) === 'percentage' 
                      ? `${(editMode && editedInvoice ? editedInvoice.discount_value : invoice?.discount_value) || 0}%` 
                      : 'Flat'})
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    -${((editMode && editedInvoice ? editedInvoice.discount_type : invoice?.discount_type) === 'flat' 
                      ? ((editMode && editedInvoice ? editedInvoice.discount_value : invoice?.discount_value) || 0)
                      : (((editMode && editedInvoice ? editedInvoice.subtotal : invoice?.subtotal) || 0) * (((editMode && editedInvoice ? editedInvoice.discount_value : invoice?.discount_value) || 0) / 100))).toFixed(2)}
                  </TableCell>
                  {editMode && <TableCell></TableCell>}
                </TableRow>
              )}

              {(editMode && editedInvoice ? editedInvoice.shipping_cost : invoice?.shipping_cost || 0) > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Shipping Cost
                  </TableCell>
                  <TableCell className="text-right">
                    ${((editMode && editedInvoice ? editedInvoice.shipping_cost : invoice?.shipping_cost) || 0).toFixed(2)}
                  </TableCell>
                  {editMode && <TableCell></TableCell>}
                </TableRow>
              )}

              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Service Fee
                </TableCell>
                <TableCell className="text-right">
                  ${((editMode && editedInvoice ? editedInvoice.service_fee : invoice?.service_fee) || 0).toFixed(2)}
                </TableCell>
                {editMode && <TableCell></TableCell>}
              </TableRow>
              
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Transaction Fee (3.5%) 
                </TableCell>
                <TableCell className="text-right">
                  ${((editMode && editedInvoice ? editedInvoice.transaction_fee : invoice?.transaction_fee) || 0).toFixed(2)}
                </TableCell>
                {editMode && <TableCell></TableCell>}
              </TableRow>

              <TableRow className="border-t-2">
                <TableCell colSpan={3} className="text-right font-medium">
                  Total Amount
                </TableCell>
                <TableCell className="text-right font-bold">
                  ${((editMode && editedInvoice ? editedInvoice.amount : invoice?.amount) || 0).toFixed(2)}
                </TableCell>
                {editMode && <TableCell></TableCell>}
              </TableRow>

              {(invoice?.amount_paid || 0) > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Amount Paid
                  </TableCell>
                  <TableCell className="text-right">
                    ${(invoice?.amount_paid || 0).toFixed(2)}
                  </TableCell>
                  {editMode && <TableCell></TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="flex flex-col items-end space-y-2 pt-6">
          <div className="flex w-full max-w-[200px] justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice?.subtotal || 0)}</span>
          </div>
          
          <div className="flex w-full max-w-[200px] justify-between">
            <span>Transaction Fee:</span>
            <span>{formatCurrency(invoice?.transaction_fee || 0)}</span>
          </div>

          <div className="flex w-full max-w-[200px] justify-between">
            <span>Service Fee:</span>
            <span>{formatCurrency(invoice?.service_fee || 0)}</span>
          </div>

          {(invoice?.amount_paid || 0) > 0 && (
            <div className="flex w-full max-w-[200px] justify-between">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice?.amount_paid || 0)}</span>
            </div>
          )}
          
          <div className="flex w-full max-w-[200px] justify-between font-bold">
            <span>Balance Due:</span>
            <span>{formatCurrency(invoice?.balance || 0)}</span>
          </div>
        </CardFooter>
        {invoice?.terms_and_conditions && invoice.terms_and_conditions.length > 0 && (
          <div className="mt-12 border-t-2 border-gray-200">
            <div className="pt-8 px-8">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-1 h-8 bg-blue-500 rounded mr-4"></div>
                  Terms and Conditions
                </h3>
                

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">
                      Please review the following terms and conditions for this invoice
                    </p>
                  </div>
                  
                  <div className="p-8">
                    <div 
                      className="text-sm text-gray-800 leading-loose whitespace-pre-line"
                      style={{ 
                        lineHeight: '1.8',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                        letterSpacing: '0.01em'
                      }}
                    >
                      {invoice.terms_and_conditions
                        .split('\n')
                        .map((line, index) => {
                          if (line.trim().endsWith(':') && line.trim().length > 0) {
                            return (
                              <div key={index} className="font-semibold text-gray-900 mt-4 mb-2 text-base">
                                {line.trim()}
                              </div>
                            );
                          }
                          // Regular content
                          return line.trim() ? (
                            <div key={index} className="mb-3 pl-4 border-l-2 border-gray-100">
                              {line.trim()}
                            </div>
                          ) : (
                            <div key={index} className="mb-2"></div>
                          );
                        })
                      }
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 text-center italic">
                      By proceeding with payment, you acknowledge that you have read and agree to these terms and conditions.
                    </p>
                  </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}