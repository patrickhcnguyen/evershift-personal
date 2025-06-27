import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { STAFF_TYPES, Invoice, StaffRequirement, CustomLineItem } from "../types";

// we need to update the fields for the request, invoice, staff requirements, and custom line items
interface UseInvoiceEditorProps {   
    initialInvoice: Invoice | null;
    initialStaffRequirements: StaffRequirement[];
    initialCustomLineItems: CustomLineItem[];
    editMode: boolean;
}

export const useInvoiceEditor = ({ 
    initialInvoice, 
    initialStaffRequirements,
    initialCustomLineItems,
    editMode,
}: UseInvoiceEditorProps) => {
    const { toast } = useToast();

    const [isSaving, setIsSaving] = useState(false);
    
    const [editedInvoice, setEditedInvoice] = useState<Invoice | null>(null);
    const [editedStaff, setEditedStaff] = useState<StaffRequirement[]>([]);
    const [customLineItems, setCustomLineItems] = useState<CustomLineItem[]>([]);
    
    const [deletedStaffUuids, setDeletedStaffUuids] = useState<string[]>([]);
    const [deletedCustomLineItemUuids, setDeletedCustomLineItemUuids] = useState<string[]>([]);

    const calculateStaffAmount = (staff: StaffRequirement) => {
        const { start_time, end_time, rate, count } = staff;
        if (!start_time || !end_time || !rate || !count) return 0;

        const startTime = new Date(`1970-01-01T${start_time}:00`);
        const endTime = new Date(`1970-01-01T${end_time}:00`);
        
        if (endTime <= startTime) return 0;
        
        const hours = (endTime.getTime() - startTime.getTime()) / 3600000;
        return rate * hours * count;
    };

    useEffect(() => {
        if (initialInvoice) {
            setEditedInvoice(initialInvoice);
            setEditedStaff(initialStaffRequirements || []);
            setCustomLineItems(initialCustomLineItems || []);
            setDeletedStaffUuids([]);
            setDeletedCustomLineItemUuids([]);
        }
    }, [initialInvoice, initialStaffRequirements, initialCustomLineItems]);

    useEffect(() => {
        if (!editMode && initialInvoice) {
            setEditedInvoice(initialInvoice);
            setEditedStaff(initialStaffRequirements || []);
            setCustomLineItems(initialCustomLineItems || []);
            setDeletedStaffUuids([]);
            setDeletedCustomLineItemUuids([]);
        }
    }, [editMode, initialInvoice, initialStaffRequirements, initialCustomLineItems]);

    const handleFieldChange = (field: keyof Invoice, value: any) => {
        setEditedInvoice(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleStaffChange = (index: number, field: keyof StaffRequirement, value: any) => {
        const updatedStaff = [...editedStaff];
        if (updatedStaff[index]) {
            const newStaff = {
                ...updatedStaff[index],
                [field]: value
            };
            newStaff.amount = calculateStaffAmount(newStaff);
            updatedStaff[index] = newStaff;
            setEditedStaff(updatedStaff);
        }
    };
    
    const addStaffRequirement = () => {
        if (!editedInvoice) return;
        
        const newStaff: StaffRequirement = {
            uuid: '',
            request_id: editedInvoice.request_id,
            position: STAFF_TYPES[0] || 'Staff',
            date: new Date().toISOString().split('T')[0],
            start_time: '09:00',
            end_time: '17:00',
            rate: 0,
            count: 1,
            amount: 0,
        };
        newStaff.amount = calculateStaffAmount(newStaff);
        setEditedStaff(prev => [...prev, newStaff]);
    };

    const removeStaffRequirement = (index: number) => {
        const staffToRemove = editedStaff[index];
        
        // If the staff requirement has a UUID (exists in backend), track it for deletion
        if (staffToRemove?.uuid && staffToRemove.uuid.trim() !== '') {
            setDeletedStaffUuids(prev => [...prev, staffToRemove.uuid!]);
        }
        
        setEditedStaff(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleCustomLineItemChange = (index: number, field: keyof CustomLineItem, value: any) => {
        const updatedItems = [...customLineItems];
        if (updatedItems[index]) {
            updatedItems[index] = {
                ...updatedItems[index],
                [field]: value
            };
            
            if (field === 'quantity' || field === 'rate') {
                const item = updatedItems[index];
                const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(String(item.quantity)) || 0;
                const rate = typeof item.rate === 'number' ? item.rate : parseFloat(String(item.rate)) || 0;
                updatedItems[index].total = quantity * rate;
            }
            
            setCustomLineItems(updatedItems);
        }
    };
    
    const addCustomLineItem = () => {
        if (!editedInvoice) return;
        
        const newItem = {
            request_id: editedInvoice.request_id,
            description: '',
            quantity: 1,
            rate: 0,
            total: 0
        } as CustomLineItem;
        setCustomLineItems(prev => [...prev, newItem]);
    };

    const removeCustomLineItem = (index: number) => {
        const itemToRemove = customLineItems[index];
        
        if (itemToRemove?.uuid && itemToRemove.uuid.trim() !== '') {
            setDeletedCustomLineItemUuids(prev => [...prev, itemToRemove.uuid]);
        }
        
        setCustomLineItems(prev => prev.filter((_, i) => i !== index));
    };
    
    const cancelEdit = () => {
        if (initialInvoice) {
            setEditedInvoice(initialInvoice);
            setEditedStaff(initialStaffRequirements || []);
            setCustomLineItems(initialCustomLineItems || []);
            setDeletedStaffUuids([]);
            setDeletedCustomLineItemUuids([]);
        }
    };

    const createCustomLineItemPayload = (item: CustomLineItem, isUpdate: boolean) => {
        if (isUpdate) {
            const { total, ...payload } = item;
            return payload;
        } else {
            const { uuid, total, ...payload } = item;
            return payload;
        }
    };

    const canEditPoNumber = (): boolean => {
        if (!editedInvoice) return false;
        const canEdit = (editedInvoice.po_edit_counter || 0) < 1;
        console.log('DEBUG: canEditPoNumber check:', {
            po_edit_counter: editedInvoice.po_edit_counter,
            canEdit,
            po_number: editedInvoice.po_number
        });
        return canEdit;
    };

    const handleSave = async () => {
        if (!editedInvoice) return;
        
        console.log('DEBUG: About to save invoice with PO number:', {
            current_po_number: editedInvoice.po_number,
            po_edit_counter: editedInvoice.po_edit_counter,
            canEdit: canEditPoNumber()
        });
        
        setIsSaving(true);
        try {
            // Step 1: Delete removed staff requirements
            const deleteStaffPromises = deletedStaffUuids.map(async (uuid) => {
                console.log(`Deleting staff requirement: ${uuid}`);
                const response = await fetch(`https://evershift-personal.onrender.com/api/staff-requirements/${uuid}`, {
                    method: 'DELETE',
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Failed to delete staff requirement ${uuid}:`, {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText
                    });
                    throw new Error(`Failed to delete staff requirement: ${response.status} ${response.statusText}`);
                }
                
                return response;
            });
            
            await Promise.all(deleteStaffPromises);

            // Step 2: Delete removed custom line items
            const deleteCustomLineItemPromises = deletedCustomLineItemUuids.map(async (uuid) => {
                console.log(`Deleting custom line item: ${uuid}`);
                const response = await fetch(`https://evershift-personal.onrender.com/api/custom-line-items/${uuid}`, {
                    method: 'DELETE',
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Failed to delete custom line item ${uuid}:`, {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText
                    });
                    throw new Error(`Failed to delete custom line item: ${response.status} ${response.statusText}`);
                }
                
                return response;
            });
            
            await Promise.all(deleteCustomLineItemPromises);

            // Step 3: Update/Create remaining staff requirements
            const staffPromises = editedStaff.map((staff, index) => {
                const baseUrl = 'https://evershift-personal.onrender.com/api/staff-requirements';
                const headers = { 'Content-Type': 'application/json' };
                
                const basePayload = {
                    request_id: editedInvoice.request_id,
                    position: staff.position,
                    date: `${staff.date}T00:00:00Z`,
                    start_time: `${staff.date}T${staff.start_time}:00Z`,
                    end_time: `${staff.date}T${staff.end_time}:00Z`,
                    rate: staff.rate,
                    count: staff.count,
                    amount: staff.amount || 0
                };
                
                if (staff.uuid && staff.uuid.trim() !== '') {
                    const updatePayload = {
                        ...basePayload,
                        uuid: staff.uuid
                    };
                    return fetch(`${baseUrl}/${staff.uuid}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify(updatePayload)
                    }).then(response => {
                        if (!response.ok) {
                            return response.text().then(errorText => {
                                console.error(`PUT error for ${staff.uuid}:`, {
                                    status: response.status,
                                    statusText: response.statusText,
                                    body: errorText
                                });
                                throw new Error(`Failed to update staff requirement: ${response.status} ${response.statusText}`);
                            });
                        }
                        return response;
                    });
                }

                return fetch(baseUrl, {
                    method: 'POST', 
                    headers,
                    body: JSON.stringify(basePayload)
                }).then(response => {
                    if (!response.ok) {
                        return response.text().then(errorText => {
                            console.error('POST error:', {
                                status: response.status,
                                statusText: response.statusText,
                                body: errorText,
                                payload: basePayload
                            });
                            throw new Error(`Failed to create staff requirement: ${response.status} ${response.statusText}`);
                        });
                    }
                    return response;
                });
            });
            
            await Promise.all(staffPromises);
            
            // Step 4: Update the core request fields (NO PO number - removed completely)
            const [firstName, ...lastNameParts] = (editedInvoice.client_name || '').split(' ');
            const lastName = lastNameParts.join(' ');
            
            const requestPayload = {
                first_name: firstName,
                last_name: lastName,
                email: editedInvoice.client_email,
                company_name: editedInvoice.company_name,
                event_location: editedInvoice.event_location
                // PO number removed - handled by invoice endpoint
            };

            const requestResponse = await fetch(`https://evershift-personal.onrender.com/api/requests/${editedInvoice.request_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload),
            });

            if (!requestResponse.ok) {
                throw new Error(`Failed to update request details: ${requestResponse.statusText}`);
            }
            
            // Step 5: Update the invoice (including PO number) 
            console.log('DEBUG: Sending invoice update with:', JSON.stringify(editedInvoice, null, 2));
            
            const invoiceResponse = await fetch(`https://evershift-personal.onrender.com/api/invoices/${editedInvoice.uuid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editedInvoice),
            });
            
            if (!invoiceResponse.ok) {
                const errorText = await invoiceResponse.text();
                console.error('DEBUG: Invoice update failed:', errorText);
                
                if (errorText.includes('PO number has already been edited')) {
                    throw new Error('PO number has already been modified and cannot be changed again.');
                }
                
                throw new Error(`Failed to update invoice: ${invoiceResponse.statusText}`);
            }

            const updatedInvoice = await invoiceResponse.json();
            console.log('DEBUG: Invoice update successful:', updatedInvoice);
            
            // Step 6: Update custom line items and calculate new totals
            try {
                const ratesResponse = await fetch(`https://evershift-personal.onrender.com/api/rates/${editedInvoice.request_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customLineItems),
                });
                
                if (!ratesResponse.ok) {
                    throw new Error(`Server responded with ${ratesResponse.status}: ${ratesResponse.statusText}`);
                }
                
                const calculatedTotals = await ratesResponse.json();
                
                // Update the invoice again with the new totals
                const updatedInvoiceWithTotals = {
                    ...editedInvoice,
                    subtotal: calculatedTotals.subtotal,
                    transaction_fee: calculatedTotals.transaction_fee,
                    service_fee: calculatedTotals.service_fee,
                    amount: calculatedTotals.amount,
                    balance: calculatedTotals.amount 
                };
                
                const finalInvoiceResponse = await fetch(`https://evershift-personal.onrender.com/api/invoices/${editedInvoice.uuid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedInvoiceWithTotals),
                });

                if (!finalInvoiceResponse.ok) {
                    throw new Error(`Failed to update invoice with new totals: ${finalInvoiceResponse.statusText}`);
                }
            } catch (calculationError) {
                console.warn("Could not recalculate invoice totals. The invoice was saved, but totals may be out of date.", calculationError);
                toast({
                    variant: "default",
                    title: "Invoice saved with a warning",
                    description: "Your changes have been saved, but totals could not be recalculated.",
                });
            }
            
            setDeletedStaffUuids([]);
            setDeletedCustomLineItemUuids([]);

            toast({
                title: "Invoice updated",
                description: "Your changes have been saved successfully."
            });
            
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

    return {
        isSaving,
        editedInvoice,
        editedStaff,
        customLineItems,
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
    };
};
