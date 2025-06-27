import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/pages/Invoicing";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Mail, Printer, Save, Edit, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import supabase from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";

export function InvoiceCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [staffRequirements, setStaffRequirements] = useState<StaffRequirement[]>([]);
  const componentRef = useRef<HTMLDivElement>(null);
  const [editingDates, setEditingDates] = useState<{[key: string]: string}>({});
  const [editingTimes, setEditingTimes] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: invoice?.id ? `Invoice ${invoice.id}` : 'Invoice',
    onAfterPrint: () => console.log('Printing complete'),
    onPrintError: (error) => console.error('Printing error:', error),
  });

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      const initialInvoiceFromState = location.state?.invoice as Invoice; 
      if (!initialInvoiceFromState?.id) {
        console.error("No invoice ID found in location state.");
        setInvoice(null);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/invoices/${initialInvoiceFromState.id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch invoice details: ${response.statusText}`);
        }
        const data: Invoice = await response.json(); 

        setInvoice(data);
        if (data.staff_requirements_with_rates && Array.isArray(data.staff_requirements_with_rates)) {
          setStaffRequirements(data.staff_requirements_with_rates as StaffRequirement[]);
        } else {
          setStaffRequirements([]);
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
        setInvoice(null);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch invoice details." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [location.state, toast]);

  useEffect(() => {
    if (!editMode) {
      setEditingDates({});
      setEditingTimes({});
    }
  }, [editMode]);

  if (isLoading) {
    return <div className="flex justify-center items-center p-4">Loading invoice details...</div>;
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-semibold mb-2">Invoice not found</h2>
        <p className="text-muted-foreground mb-4">The invoice you're looking for could not be found.</p>
        <Button onClick={() => navigate('/invoicing')}>Return to Invoices</Button>
      </div>
    );
  }

  const statusColor = 
    invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
    invoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' : 
    'bg-red-100 text-red-800';

  const handleChange = (field: string, value: any, index?: number) => {
    if (field === 'staff_requirements_with_rates' && typeof index === 'number') {
      const updatedRequirements = [...staffRequirements];
      if (index >= 0 && index < updatedRequirements.length) {
        if (typeof value === 'object' && value.field) {
          updatedRequirements[index] = {
            ...updatedRequirements[index],
            [value.field]: value.value
          };
        } else if (typeof value !== 'object') { 
          updatedRequirements[index] = {
            ...updatedRequirements[index],
            count: parseInt(value) 
          };
        }
        setStaffRequirements(updatedRequirements);
        setInvoice(prev => prev ? ({
          ...prev,
          staff_requirements_with_rates: updatedRequirements,
        }) : null);
      }
    } else {
      setInvoice(prev => prev ? ({ ...prev, [field]: value }) : null);
    }
  };

  const handleSave = async () => {
    if (!invoice) return;
    setIsSaving(true);
    try {
      const paymentTermsValue = typeof invoice.payment_terms === 'number' 
        ? PaymentTerms[invoice.payment_terms as number] || "Due on receipt"
        : invoice.payment_terms;
      
      const originalInvoiceFromState = location.state?.invoice as Invoice;
      const shouldIncrementPOCounter = originalInvoiceFromState && invoice.po_number !== originalInvoiceFromState.po_number;

      const updatePayload = {
        ...invoice,
        payment_terms: paymentTermsValue,
        staff_requirements_with_rates: staffRequirements, 
        po_edit_counter: shouldIncrementPOCounter ? (invoice.po_edit_counter || 0) + 1 : (invoice.po_edit_counter || 0),
      };

      const response = await fetch(`http://localhost:3001/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update invoice: ${response.statusText}`);
      }

      const updatedInvoiceFromBackend: Invoice = await response.json();

      setInvoice(updatedInvoiceFromBackend);
      if (updatedInvoiceFromBackend.staff_requirements_with_rates && Array.isArray(updatedInvoiceFromBackend.staff_requirements_with_rates)) {
          setStaffRequirements(updatedInvoiceFromBackend.staff_requirements_with_rates as StaffRequirement[]);
      } else {
          setStaffRequirements([]);
      }

      toast({
        title: "Invoice updated",
        description: "Your changes have been saved successfully."
      });
      setEditMode(false);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Failed to update invoice. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice.client_email) {
      toast({
        variant: "destructive",
        title: "Missing Email",
        description: "This invoice doesn't have a client email address."
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to send emails');
      }

      const adminEmail = session.user.email;
      const adminName = session.user.user_metadata?.name || 'Evershift Admin';

      if (!adminEmail) {
        throw new Error('Admin email not found in session');
      }

      const { subtotal, serviceFee, transactionFee, fullAmount } = recalculateInvoiceTotals(staffRequirements);

      const stripeResponse = await fetch('https://huydudorftiektexxpei.supabase.co/functions/v1/stripePayments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amount: fullAmount,
          client_email: invoice.client_email,
          company_name: invoice.company_name || invoice.client_name,
          invoiceId: invoice.id,
          subtotal: subtotal,
          serviceFee: serviceFee,
          transactionFee: transactionFee,
          staff_requirements_with_rates: staffRequirements,
          admin_email: adminEmail
        })
      });

      if (!stripeResponse.ok) {
        throw new Error('Failed to create payment link');
      }

      const { url: paymentUrl } = await stripeResponse.json();

      const emailResponse = await fetch('https://huydudorftiektexxpei.supabase.co/functions/v1/sendInvoiceEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          invoiceId: invoice.id,
          paymentUrl,
          subtotal: subtotal,
          serviceFee: serviceFee,
          transactionFee: transactionFee,
          fullAmount: fullAmount,
          staff_requirements_with_rates: staffRequirements,
          adminEmail,
          adminName
        })
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          subtotal,
          service_fee: serviceFee,
          transaction_fee: transactionFee,
          amount: fullAmount,
          balance: fullAmount,
          staff_requirements_with_rates: staffRequirements
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      toast({
        title: "Email Sent",
        description: `Invoice with payment link has been sent to ${invoice.client_email}`
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Failed to Send Email",
        description: error.message || "An error occurred"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleAddStaff = () => {
    const newStaffRequirement: StaffRequirement = {
      position: STAFF_TYPES[0],
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      rate: 0,
      count: 1,
      hours: 0,
      subtotal: 0
    };
    
    const updatedRequirements = [...staffRequirements, newStaffRequirement];
    setStaffRequirements(updatedRequirements);
    setInvoice(prev => prev ? ({
      ...prev,
      staff_requirements_with_rates: updatedRequirements,
    }) : null);
  };

  const handleRemoveStaff = (index: number) => {
    const updatedRequirements = staffRequirements.filter((_, i) => i !== index);
    setStaffRequirements(updatedRequirements);
    setInvoice(prev => prev ? ({
      ...prev,
      staff_requirements_with_rates: updatedRequirements,
    }) : null);
  };
  
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
        <h1 className="text-2xl font-bold">Invoice Details</h1>
        
        <div className="ml-auto flex gap-2">
          {editMode ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditMode(false)}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={handleSave}
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
              <Button variant="outline" size="sm" onClick={handlePrint}>
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
            </>
          )}
        </div>
      </div>

      <Card ref={componentRef}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">
            <span>Request #{invoice.request_id}</span>
          </CardTitle>
          <CardDescription>
            Branch: {invoice.branch}
          </CardDescription>
        </div>

        {editMode ? (
          <Select 
            value={invoice.status || ''} 
            onValueChange={value => handleChange('status', value)}
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
            <Badge className={statusColor}>
              {invoice.status && typeof invoice.status === 'string' ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace('_', ' ') : 'N/A'}
            </Badge>

            {invoice.status === 'paid' && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={async () => {
                  try {
                    if (!invoice.payment_intent_id) {
                      throw new Error('No Payment Intent ID found on invoice');
                    }

                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                      throw new Error('Must be logged in');
                    }

                    const refundResponse = await fetch('https://huydudorftiektexxpei.supabase.co/functions/v1/stripeRefund', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                      },
                      body: JSON.stringify({
                        payment_intent_id: invoice.payment_intent_id,
                        amount: Math.round((invoice.amount || 0) * 100) // refund full amount
                      })
                    });

                    if (!refundResponse.ok) {
                      throw new Error('Failed to process refund');
                    }

                    const refundData = await refundResponse.json();
                    console.log('Refund successful:', refundData);

                    const { error } = await supabase
                      .from('invoices')
                      .update({ status: 'refunded' })
                      .eq('id', invoice.id);

                    if (error) throw error;

                    window.location.reload(); 

                  } catch (error) {
                    console.error('Refund error:', error);
                    alert(error.message || 'An error occurred while refunding');
                  }
                }}
              >
                Refund
              </Button>
            )}
          </div>
        )}
      </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-medium mb-2">Client Information</h3>
              {editMode ? (
                <>
                  <div className="mb-2">
                    <label className="text-sm text-muted-foreground">Company Name</label>
                    <Input 
                      value={invoice.company_name || ''} 
                      onChange={e => handleChange('company_name', e.target.value)} 
                      className="mt-1"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="text-sm text-muted-foreground">Client Name</label>
                    <Input 
                      value={invoice.client_name || ''} 
                      onChange={e => handleChange('client_name', e.target.value)} 
                      className="mt-1"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="text-sm text-muted-foreground">Email</label>
                    <Input 
                      value={invoice.client_email || ''} 
                      onChange={e => handleChange('client_email', e.target.value)} 
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <>
                  {invoice.company_name && (
                    <p className="text-sm font-semibold">{invoice.company_name}</p>
                  )}
                  <p className="text-sm">{invoice.client_name || 'N/A'}</p>
                  <p className="text-sm">{invoice.client_email || 'N/A'}</p>
                </>
              )}
              
              <h3 className="font-medium mt-4 mb-2">Ship To</h3>
              {editMode ? (
                <Textarea 
                  value={invoice.ship_to || ''} 
                  onChange={e => handleChange('ship_to', e.target.value)} 
                  className="mt-1"
                />
              ) : (
                <p className="text-sm">{invoice.ship_to || "Not specified"}</p>
              )}
              <h3 className="font-medium mt-4 mb-2">Event Location</h3>
              {editMode ? (
                <Input 
                  value={invoice.event_location || ''} 
                  onChange={e => handleChange('event_location', e.target.value)} 
                  className="mt-1"
                />
              ) : (
                <p className="text-sm">{invoice.event_location || "Not specified"}</p>
              )}
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Due Date:</div>
                {editMode ? (
                  <Input 
                    type="date" 
                    value={invoice.due_date ? invoice.due_date.split('T')[0] : ''}
                    onChange={e => handleChange('due_date', e.target.value)} 
                  />
                ) : (
                  <div>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</div>
                )}
                
                <div className="text-muted-foreground">Payment Terms:</div>
                {editMode ? (
                  <Select 
                    value={invoice.payment_terms || "Due on receipt"} 
                    onValueChange={value => handleChange('payment_terms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PaymentTerms.map(term => (
                        <SelectItem key={term} value={term}>{term}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>{invoice.payment_terms || "Due on receipt"}</div>
                )}
                
                <div className="text-muted-foreground">Transaction fee</div>
                <div>{formatCurrency(invoice.transaction_fee || 0)}</div>
                
                <div className="text-muted-foreground">PO Number:</div>
                {editMode ? (
                  (invoice.po_edit_counter || 0) >= 1 ? (
                    <div>{invoice.po_number || "Not specified"}</div>
                  ) : (
                    <Input 
                      value={invoice.po_number || ''} 
                      onChange={e => handleChange('po_number', e.target.value)}
                      placeholder="Enter PO Number"
                    />
                  )
                ) : (
                  <div>{invoice.po_number || "Not specified"}</div>
                )}

                {editMode && (
                  <>
                    <div className="text-muted-foreground">Discount Type:</div>
                    <Select 
                      value={invoice.discount_type || 'none'} 
                      onValueChange={value => handleChange('discount_type', value === 'none' ? null : value)}
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

                    {invoice.discount_type && invoice.discount_type !== 'none' && (
                      <>
                        <div className="text-muted-foreground">
                          Discount Value {invoice.discount_type === 'percentage' ? '(%)' : '($)'}:
                        </div>
                        <Input 
                          type="number"
                          value={invoice.discount_value || ''}
                          onChange={e => handleChange('discount_value', parseFloat(e.target.value) || 0)}
                          placeholder={invoice.discount_type === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                        />
                      </>
                    )}

                    <div className="text-muted-foreground">Shipping Cost:</div>
                    <Input 
                      type="number"
                      value={invoice.shipping_cost || 0}
                      onChange={e => handleChange('shipping_cost', parseFloat(e.target.value) || 0)}
                      placeholder="Enter shipping cost"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />
          
          <div className="mb-6">
            <h3 className="font-medium mb-2">Notes</h3>
            {editMode ? (
              <Textarea 
                value={invoice.notes || ''} 
                onChange={e => handleChange('notes', e.target.value)} 
                className="w-full"
                placeholder="Enter any additional notes here"
                rows={4}
              />
            ) : (
              <p className="text-sm">{invoice.notes || "No notes added"}</p>
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
              {staffRequirements?.map((requirement, index) => (
                <TableRow key={`${requirement.position}-${requirement.date}-${index}`}>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      {editMode ? (
                        <Select
                          value={requirement.position}
                          onValueChange={(newValue) => {
                            handleChange('staff_requirements_with_rates', {
                              field: 'position',
                              value: newValue
                            }, index);
                          }}
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
                      ) : (
                        <span className="font-medium">{requirement.position}</span>
                      )}
                      <div className="flex flex-col gap-2">
                        {editMode ? (
                          <>
                            <Input 
                              type="date" 
                              defaultValue={requirement.date ? requirement.date.split('T')[0] : ''}
                              onBlur={e => handleChange('staff_requirements_with_rates', {
                                field: 'date',
                                value: e.target.value
                              }, index)}
                              className="w-full"
                            />
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={editingTimes[`${index}-startTime`] || (requirement.startTime ? requirement.startTime.split(' ')[0] : '')}
                                onChange={e => {
                                  setEditingTimes(prev => ({
                                    ...prev,
                                    [`${index}-startTime`]: e.target.value
                                  }));
                                  handleChange('staff_requirements_with_rates', {
                                    field: 'startTime',
                                    value: e.target.value
                                  }, index);
                                }}
                                className="w-28"
                              />
                              <span>to</span>
                              <Input
                                type="time"
                                value={editingTimes[`${index}-endTime`] || (requirement.endTime ? requirement.endTime.split(' ')[0] : '')}
                                onChange={e => {
                                  setEditingTimes(prev => ({
                                    ...prev,
                                    [`${index}-endTime`]: e.target.value
                                  }));
                                  handleChange('staff_requirements_with_rates', {
                                    field: 'endTime',
                                    value: e.target.value
                                  }, index);
                                }}
                                className="w-28"
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {(requirement.date ? new Date(requirement.date).toLocaleDateString() : 'N/A')} ({requirement.startTime || 'N/A'} - {requirement.endTime || 'N/A'})
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {editMode ? (
                      <Input 
                        type="number"
                        min="0"
                        value={requirement.count || 0}
                        onChange={e => handleChange('staff_requirements_with_rates', { field: 'count', value: parseInt(e.target.value) || 0 }, index)}
                        className="w-16 text-right"
                      />
                    ) : (requirement.count || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {editMode ? (
                      <div className="flex items-center justify-end gap-1">
                        $<Input 
                          type="number"
                          min="0"
                          value={requirement.rate || 0}
                          onChange={e => handleChange('staff_requirements_with_rates', {
                            field: 'rate',
                            value: parseFloat(e.target.value) || 0
                          }, index)}
                          className="w-16 text-right"
                        />
                        <span>/ hr</span>
                      </div>
                    ) : (
                      `$${(requirement.rate || 0).toFixed(2)} / hr`
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    ${(requirement.subtotal || 0).toFixed(2)}
                  </TableCell>
                  {editMode && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStaff(index)}
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
                      onClick={handleAddStaff}
                      className="w-full"
                    >
                      Add Staff Requirement
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="border-t-2">
                <TableCell colSpan={3} className="text-right font-medium">
                  Subtotal
                </TableCell>
                <TableCell className="text-right">
                  ${(invoice.subtotal || 0).toFixed(2)}
                </TableCell>
              </TableRow>

              {invoice.discount_type && (invoice.discount_value || 0) > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Discount ({invoice.discount_type === 'percentage' ? `${invoice.discount_value || 0}%` : 'Flat'})
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    -${(invoice.discount_type === 'flat' 
                      ? (invoice.discount_value || 0)
                      : ((invoice.subtotal || 0) * ((invoice.discount_value || 0) / 100))).toFixed(2)}
                  </TableCell>
                </TableRow>
              )}

              {(invoice.shipping_cost || 0) > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Shipping Cost
                  </TableCell>
                  <TableCell className="text-right">
                    ${(invoice.shipping_cost || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              )}

              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Service Fee
                </TableCell>
                <TableCell className="text-right">
                  ${(invoice.service_fee || 0).toFixed(2)}
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Transaction Fee (3.5%) 
                </TableCell>
                <TableCell className="text-right">
                  ${(invoice.transaction_fee || 0).toFixed(2)}
                </TableCell>
              </TableRow>

              <TableRow className="border-t-2">
                <TableCell colSpan={3} className="text-right font-medium">
                  Total Amount
                </TableCell>
                <TableCell className="text-right font-bold">
                  ${(invoice.amount || 0).toFixed(2)}
                </TableCell>
              </TableRow>

              {(invoice.amount_paid || 0) > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Amount Paid
                  </TableCell>
                  <TableCell className="text-right">
                    ${(invoice.amount_paid || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="flex flex-col items-end space-y-2 pt-6">
          <div className="flex w-full max-w-[200px] justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice.subtotal || 0)}</span>
          </div>
          
          <div className="flex w-full max-w-[200px] justify-between">
            <span>Transaction Fee:</span>
            <span>{formatCurrency(invoice.transaction_fee || 0)}</span>
          </div>
          
          {(invoice.amount_paid || 0) > 0 && (
            <div className="flex w-full max-w-[200px] justify-between">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.amount_paid || 0)}</span>
            </div>
          )}

          <div className="flex w-full max-w-[200px] justify-between">
            <span>Service Fee:</span>
            <span>{formatCurrency(invoice.service_fee || 0)}</span>
          </div>
          
          <div className="flex w-full max-w-[200px] justify-between font-bold">
            <span>Balance Due:</span>
            <span>{formatCurrency(invoice.balance || 0)}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}