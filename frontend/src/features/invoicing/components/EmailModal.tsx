// Modal that pops up when the user wants to send an email, can also include follow up templated emails, as well as send the old formatted email with
// the invoice and the payment link attached in a basic text box and button to send 

// Example format:
/**
Hi, <n>,

<body text>

Attatched is the invoice

<invoice>

Best,
<admin name>

*/

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { sendCustomEmail, saveDraftEmail, loadDraftEmail, clearDraftEmail } from "../services/sendEmail"
import { generatePaymentUrl } from "../services/paymentUrl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmailHeadersSection } from "./shared/EmailHeadersSection"
import { EmailContentSection } from "./shared/EmailContentSection"
import { EmailDraftControls } from "./shared/EmailDraftControls"
import { PaymentButtonSection } from "./shared/PaymentButtonSection"
import { EmailHeaders } from "../types"

interface EmailModalProps {
  requestId: string
  clientName: string
  adminName: string
  onClose: () => void
}

export function EmailModal({ requestId, clientName, adminName, onClose }: EmailModalProps) {
  const defaultSubject = `Request #${requestId} from Evershift`;
  const defaultContent = `Hi ${clientName},

Nice to meet you, and thank you so much for reaching out! I've provided a preliminary quote for your review, and we can adjust it however you see fit. I've also attached our capabilities deck so you can get a feel for our team and experience.

If the quote looks good, just let me know if you prefer ACH or CC for payment, and I'll get everything set up for you.

Could you confirm the details we have below and fill in anything that's missing?

Best regards,
${adminName}`;

  const [emailContent, setEmailContent] = useState(defaultContent)
  const [emailHeaders, setEmailHeaders] = useState<EmailHeaders>({
    subject: defaultSubject,
    cc: [],
    bcc: [],
    replyTo: `${adminName} <support@evershift.co>`
  })
  const [isLoading, setIsLoading] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null)
  const [includePaymentButton, setIncludePaymentButton] = useState(false)

  useEffect(() => {
    const cachedData = loadDraftEmail(requestId);
    if (cachedData) {
      setEmailContent(cachedData.content);
      setEmailHeaders(prev => ({ ...prev, ...cachedData.headers }));
      setHasDraft(true);
      console.log('Loaded draft email from cache');
    }
  }, [requestId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedPDF(file);
    } else {
      alert('Please select a PDF file');
      event.target.value = ''; 
    }
  };

  const handleSendEmail = async () => {
    setIsLoading(true)
    
    try {
      let paymentUrl: string | undefined;
      
      // Generate payment URL if payment button is enabled
      if (includePaymentButton) {
        try {
          paymentUrl = await generatePaymentUrl(requestId);
        } catch (error) {
          console.error('Failed to generate payment URL:', error);
          alert('Failed to generate payment link. Email will be sent without payment button.');
        }
      }

      await sendCustomEmail(requestId, emailContent, emailHeaders, selectedPDF, paymentUrl);
      
      alert(`Email sent successfully!\n\nCustom email has been sent to ${clientName}${selectedPDF ? ' with PDF attached' : ''}${paymentUrl ? ' with payment button' : ''}.`)
      
      setTimeout(() => {
        onClose()
      }, 500)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred while sending the email"
      alert(`Failed to send email\n\n${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveDraft = () => {
    setIsSavingDraft(true)
    
    try {
      saveDraftEmail(requestId, emailContent, emailHeaders);
      setHasDraft(true);
      alert(`Draft saved!\n\nYour email has been saved as a draft for ${clientName}.`)
    } catch (error) {
      alert(`Failed to save draft\n\nAn error occurred while saving the draft.`)
    } finally {
      setIsSavingDraft(false)
    }
  };

  const handleClearDraft = () => {
    if (confirm('Are you sure you want to clear the saved draft?')) {
      clearDraftEmail(requestId);
      setEmailContent(defaultContent);
      setEmailHeaders({
        subject: defaultSubject,
        cc: [],
        bcc: [],
        replyTo: `${adminName} <support@evershift.co>`
      });
      setHasDraft(false);
    }
  };

  const hasChanges = emailContent !== defaultContent;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Send Custom Email</h2>
        <EmailDraftControls
          hasDraft={hasDraft}
          hasChanges={hasChanges}
          isSavingDraft={isSavingDraft}
          onSaveDraft={handleSaveDraft}
          onClearDraft={handleClearDraft}
          disabled={isLoading}
        />
      </div>
      
      {/* Email Headers Section - Using shared component */}
      <EmailHeadersSection
        headers={emailHeaders}
        onHeadersChange={setEmailHeaders}
        disabled={isLoading}
      />
      
      {/* Email Content - Using shared component */}
      <EmailContentSection
        content={emailContent}
        onContentChange={setEmailContent}
        placeholder="Enter your email message..."
        disabled={isLoading}
      />

      {/* Payment Button Section */}
      <PaymentButtonSection
        includePaymentButton={includePaymentButton}
        onTogglePaymentButton={setIncludePaymentButton}
        disabled={isLoading}
      />

      {/* PDF Attachment Section */}
      <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-sm font-medium">Attachments</h3>
        
        <div className="space-y-2">
          <Label htmlFor="pdfFile" className="text-sm">
            Attach Invoice PDF (optional)
          </Label>
          <Input
            id="pdfFile"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="text-sm"
          />
          {selectedPDF && (
            <p className="text-xs text-green-600">
              ✓ {selectedPDF.name} selected ({(selectedPDF.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          <p className="text-xs text-gray-500">
            First save your invoice as PDF using the print button, then select it here
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={handleSendEmail}
          disabled={isLoading || !emailContent.trim()}
          className="flex-1"
        >
          {isLoading ? "Sending..." : "Send Email"}
        </Button>
        
        <Button 
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}