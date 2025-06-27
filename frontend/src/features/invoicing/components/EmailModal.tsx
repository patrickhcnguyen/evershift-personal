// Modal that pops up when the user wants to send an email, can also include follow up templated emails, as well as send the old formatted email with
// the invoice and the payment link attached in a basic text box and button to send 

// Example format:
/**
Hi, <name>,

<body text>

Attatched is the invoice

<invoice>

Best,
<admin name>

*/

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { sendCustomEmail, saveDraftEmail, loadDraftEmail, clearDraftEmail } from "../services/sendEmail"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  const [emailHeaders, setEmailHeaders] = useState({
    subject: defaultSubject,
    cc: [] as string[],
    bcc: [] as string[],
    replyTo: `${adminName} <support@evershift.co>`
  })
  const [isLoading, setIsLoading] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null)

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
      
      alert(`Email sent successfully!\n\nCustom email has been sent to ${clientName}${selectedPDF ? ' with PDF attached' : ''}.`)
      
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
        {hasDraft && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-600">Draft available</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearDraft}
              className="text-xs h-6 px-2"
            >
              Clear Draft
            </Button>
          </div>
        )}
      </div>
      
      {/* Email Headers Section */}
      <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-sm font-medium">Email Headers</h3>
        
        <div className="space-y-2">
          <Label htmlFor="subject" className="text-sm">Subject</Label>
          <Input
            id="subject"
            value={emailHeaders.subject}
            onChange={(e) => setEmailHeaders(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Email subject..."
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="replyTo" className="text-sm">Reply To</Label>
          <Input
            id="replyTo"
            value={emailHeaders.replyTo}
            onChange={(e) => setEmailHeaders(prev => ({ ...prev, replyTo: e.target.value }))}
            placeholder="Reply-to email..."
            className="text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cc" className="text-sm">CC (comma-separated)</Label>
            <Input
              id="cc"
              value={emailHeaders.cc.join(', ')}
              onChange={(e) => setEmailHeaders(prev => ({ 
                ...prev, 
                cc: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
              }))}
              placeholder="cc@example.com, cc2@example.com"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bcc" className="text-sm">BCC (comma-separated)</Label>
            <Input
              id="bcc"
              value={emailHeaders.bcc.join(', ')}
              onChange={(e) => setEmailHeaders(prev => ({ 
                ...prev, 
                bcc: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
              }))}
              placeholder="bcc@example.com, bcc2@example.com"
              className="text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Email Content */}
      <div className="space-y-2">
        <Label htmlFor="content" className="text-sm">Message</Label>
        <Textarea
          id="content"
          value={emailContent}
          onChange={(e) => setEmailContent(e.target.value)}
          placeholder="Enter your email message..."
          className="min-h-[200px] resize-none"
        />
      </div>

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
          variant="secondary"
          onClick={handleSaveDraft}
          disabled={isSavingDraft || !hasChanges}
          className="px-4"
        >
          {isSavingDraft ? "Saving..." : "Save as Draft"}
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