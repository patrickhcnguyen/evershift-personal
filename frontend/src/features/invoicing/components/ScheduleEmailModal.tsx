import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Send, Mail, FileText } from "lucide-react";
import { 
  scheduleEmail, 
  scheduleEmailAtSpecificTime, 
  scheduleCustomEmail,
  saveScheduledEmailDraft,
  loadScheduledEmailDraft,
  clearScheduledEmailDraft
} from "../services/scheduleEmail";
import { generatePaymentUrl } from "../services/paymentUrl";
import { EmailHeadersSection } from "./shared/EmailHeadersSection";
import { EmailContentSection } from "./shared/EmailContentSection";
import { EmailDraftControls } from "./shared/EmailDraftControls";
import { PaymentButtonSection } from "./shared/PaymentButtonSection";
import { EmailHeaders } from "../types";

interface ScheduleEmailModalProps {
  requestId: string;
  clientName: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function ScheduleEmailModal({ 
  requestId, 
  clientName, 
  onClose, 
  onSuccess 
}: ScheduleEmailModalProps) {
  const [scheduleType, setScheduleType] = useState<'days' | 'specific'>('days');
  const [daysFromNow, setDaysFromNow] = useState<number>(7);
  const [specificDate, setSpecificDate] = useState<string>('');
  const [specificTime, setSpecificTime] = useState<string>('09:00');
  const [isScheduling, setIsScheduling] = useState(false);

  const [emailMode, setEmailMode] = useState<'default' | 'custom'>('default');
  const [emailContent, setEmailContent] = useState<string>('');
  const [emailHeaders, setEmailHeaders] = useState<EmailHeaders>({
    subject: `Scheduled: Request #${requestId} from Evershift`,
    cc: [],
    bcc: [],
    replyTo: "Evershift Support <support@evershift.co>"
  });

  const [hasDraft, setHasDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [includePaymentButton, setIncludePaymentButton] = useState(false);

  const defaultContent = `Hi ${clientName},

This is a scheduled reminder about your invoice request. Please review the details and let us know if you have any questions.

We appreciate your business and look forward to serving you.

Best regards,
The Evershift Team`;

  useEffect(() => {
    const cachedData = loadScheduledEmailDraft(requestId);
    if (cachedData) {
      setEmailContent(cachedData.content);
      setEmailHeaders(prev => ({ ...prev, ...cachedData.headers }));
      setScheduleType(cachedData.scheduleType);
      if (cachedData.daysFromNow) setDaysFromNow(cachedData.daysFromNow);
      if (cachedData.specificDate) setSpecificDate(cachedData.specificDate);
      if (cachedData.specificTime) setSpecificTime(cachedData.specificTime);
      setHasDraft(true);
      if (cachedData.content) setEmailMode('custom');
      console.log('Loaded scheduled email draft from cache');
    }
  }, [requestId, clientName]);

  useEffect(() => {
    if (emailMode === 'custom' && !emailContent) {
      setEmailContent(defaultContent);
    }
  }, [emailMode, emailContent, defaultContent]);

  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    
    try {
      saveScheduledEmailDraft(requestId, emailContent, emailHeaders, {
        scheduleType,
        daysFromNow: scheduleType === 'days' ? daysFromNow : undefined,
        specificDate: scheduleType === 'specific' ? specificDate : undefined,
        specificTime: scheduleType === 'specific' ? specificTime : undefined,
      });
      setHasDraft(true);
      alert(`Scheduled email draft saved!\n\nYour email draft has been saved for ${clientName}.`);
    } catch (error) {
      alert(`Failed to save draft\n\nAn error occurred while saving the draft.`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleClearDraft = () => {
    if (confirm('Are you sure you want to clear the saved draft?')) {
      clearScheduledEmailDraft(requestId);
      setEmailContent(defaultContent);
      setEmailHeaders({
        subject: `Scheduled: Request #${requestId} from Evershift`,
        cc: [],
        bcc: [],
        replyTo: "Evershift Support <support@evershift.co>"
      });
      setHasDraft(false);
    }
  };

  const getSendAtTime = (): string => {
    if (scheduleType === 'days') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysFromNow);
      return futureDate.toISOString();
    } else {
      const dateTime = new Date(`${specificDate}T${specificTime}`);
      return dateTime.toISOString();
    }
  };

  const handleScheduleDefault = async () => {
    setIsScheduling(true);
    try {
      let paymentUrl: string | undefined;
      
      // Generate payment URL if payment button is enabled
      if (includePaymentButton) {
        try {
          paymentUrl = await generatePaymentUrl(requestId);
        } catch (error) {
          console.error('Failed to generate payment URL:', error);
          alert('Failed to generate payment link. Email will be scheduled without payment button.');
        }
      }

      const sendAt = getSendAtTime();
      const response = scheduleType === 'days' 
        ? await scheduleEmail(requestId, daysFromNow)
        : await scheduleEmailAtSpecificTime(requestId, sendAt);
      
      const scheduledDate = new Date(response.send_at);
      const message = `Default email scheduled successfully for ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}${paymentUrl ? ' with payment button' : ''}`;
      
      if (onSuccess) {
        onSuccess(message);
      } else {
        alert(message);
      }
      onClose();
    } catch (error) {
      console.error('Failed to schedule email:', error);
      alert((error as Error).message || 'Failed to schedule email');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleScheduleCustom = async () => {
    if (!emailContent.trim()) {
      alert('Please enter email content');
      return;
    }

    if (scheduleType === 'specific' && !specificDate) {
      alert('Please select a date');
      return;
    }

    setIsScheduling(true);
    try {
      const sendAt = getSendAtTime();
      const dateTime = new Date(sendAt);
      const now = new Date();
      
      if (dateTime <= now) {
        alert('Please select a future date and time');
        return;
      }

      let paymentUrl: string | undefined;
      
      // Generate payment URL if payment button is enabled
      if (includePaymentButton) {
        try {
          paymentUrl = await generatePaymentUrl(requestId);
        } catch (error) {
          console.error('Failed to generate payment URL:', error);
          alert('Failed to generate payment link. Email will be scheduled without payment button.');
        }
      }

      const response = await scheduleCustomEmail(requestId, sendAt, emailContent, emailHeaders, paymentUrl);
      
      clearScheduledEmailDraft(requestId);
      
      const scheduledDate = new Date(response.send_at);
      const message = `Custom email scheduled successfully for ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString()}${paymentUrl ? ' with payment button' : ''}`;
      
      if (onSuccess) {
        onSuccess(message);
      } else {
        alert(message);
      }
      onClose();
    } catch (error) {
      console.error('Failed to schedule custom email:', error);
      alert((error as Error).message || 'Failed to schedule custom email');
    } finally {
      setIsScheduling(false);
    }
  };

  const getPreviewDate = () => {
    if (scheduleType === 'days') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysFromNow);
      return futureDate.toLocaleDateString() + ' at ' + futureDate.toLocaleTimeString();
    } else if (specificDate && specificTime) {
      const dateTime = new Date(`${specificDate}T${specificTime}`);
      return dateTime.toLocaleDateString() + ' at ' + dateTime.toLocaleTimeString();
    }
    return 'Select date and time';
  };

  const hasChanges = emailContent !== defaultContent;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Schedule Email</h3>
          <p className="text-sm text-muted-foreground">
            Schedule an invoice email to be sent to <strong>{clientName}</strong>
          </p>
        </div>
        <EmailDraftControls
          hasDraft={hasDraft}
          hasChanges={hasChanges && emailMode === 'custom'}
          isSavingDraft={isSavingDraft}
          onSaveDraft={handleSaveDraft}
          onClearDraft={handleClearDraft}
          disabled={isScheduling}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {emailMode === 'default' ? (
                <FileText className="h-5 w-5 text-blue-600" />
              ) : (
                <Mail className="h-5 w-5 text-purple-600" />
              )}
              <div>
                <Label htmlFor="email-mode" className="text-base font-medium">
                  {emailMode === 'default' ? 'Default Template' : 'Custom Content'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {emailMode === 'default' 
                    ? 'Use the standard invoice email template' 
                    : 'Create custom email content and headers'
                  }
                </p>
              </div>
            </div>
          </div>
          <Switch
            id="email-mode"
            checked={emailMode === 'custom'}
            onCheckedChange={(checked) => setEmailMode(checked ? 'custom' : 'default')}
            disabled={isScheduling}
          />
        </div>
      </div>

      {emailMode === 'custom' && (
        <div className="space-y-4">
          <EmailHeadersSection
            headers={emailHeaders}
            onHeadersChange={setEmailHeaders}
            disabled={isScheduling}
          />
          
          <EmailContentSection
            content={emailContent}
            onContentChange={setEmailContent}
            placeholder={`Hi ${clientName},\n\nEnter your custom email message here...\n\nBest regards,\nYour Name`}
            disabled={isScheduling}
            minHeight="min-h-[150px]"
          />
        </div>
      )}

      {/* Payment Button Section */}
      <PaymentButtonSection
        includePaymentButton={includePaymentButton}
        onTogglePaymentButton={setIncludePaymentButton}
        disabled={isScheduling}
      />

      <div className="space-y-4">
        <div>
          <Label htmlFor="schedule-type">Schedule Type</Label>
          <Select 
            value={scheduleType} 
            onValueChange={(value: 'days' | 'specific') => setScheduleType(value)}
            disabled={isScheduling}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select schedule type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Days from now
                </div>
              </SelectItem>
              <SelectItem value="specific">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Specific date & time
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scheduleType === 'days' ? (
          <div>
            <Label htmlFor="days">Days from now</Label>
            <Select 
              value={daysFromNow.toString()} 
              onValueChange={(value) => setDaysFromNow(parseInt(value))}
              disabled={isScheduling}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day (Tomorrow)</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days (1 week)</SelectItem>
                <SelectItem value="14">14 days (2 weeks)</SelectItem>
                <SelectItem value="30">30 days (1 month)</SelectItem>
                <SelectItem value="60">60 days (2 months)</SelectItem>
                <SelectItem value="90">90 days (3 months)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                disabled={isScheduling}
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={specificTime}
                onChange={(e) => setSpecificTime(e.target.value)}
                disabled={isScheduling}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 rounded-lg border">
        <div className="flex items-center gap-2 text-sm">
          <Send className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {emailMode === 'custom' ? 'Custom email' : 'Default template'} will be sent on:
          </span>
        </div>
        <p className="font-medium mt-1">{getPreviewDate()}</p>
        {includePaymentButton && (
          <p className="text-sm text-blue-600 mt-1">✓ Payment button will be included</p>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose} disabled={isScheduling}>
          Cancel
        </Button>
        <Button 
          onClick={emailMode === 'custom' ? handleScheduleCustom : handleScheduleDefault}
          disabled={isScheduling || (emailMode === 'custom' && !emailContent.trim())}
        >
          <Send className="mr-2 h-4 w-4" />
          {isScheduling ? 'Scheduling...' : `Schedule ${emailMode === 'custom' ? 'Custom' : 'Default'} Email`}
        </Button>
      </div>
    </div>
  );
} 