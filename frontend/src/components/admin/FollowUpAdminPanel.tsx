import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Mail, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { triggerFollowUpsByDelay } from "@/features/invoicing/services/followUp";
import { EmailModal } from "@/features/invoicing/components/EmailModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function FollowUpAdminPanel() {
  const [delayMinutes, setDelayMinutes] = useState<number>(5);
  const [isTriggering, setIsTriggering] = useState(false);
  const [showCustomEmailModal, setShowCustomEmailModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const { toast } = useToast();

  const handleTriggerFollowUps = async () => {
    setIsTriggering(true);
    try {
      const result = await triggerFollowUpsByDelay(delayMinutes);
      toast({
        title: "Follow-ups Triggered Successfully",
        description: `Processed ${result.processed} invoices with ${delayMinutes}-minute delay setting.`,
      });
    } catch (error) {
      toast({
        title: "Error Triggering Follow-ups",
        description: (error as Error).message || "Failed to trigger follow-up emails",
        variant: "destructive",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleSendCustomFollowUp = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setShowCustomEmailModal(true);
  };

  const presetDelays = [1, 3, 7, 14, 30];

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Follow-up Email Management
        </CardTitle>
        <CardDescription>
          Manage automated follow-up emails for overdue invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Cron Schedule */}
        <div className="bg-blue-50 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">Automated Schedule</span>
          </div>
          <div className="text-sm text-blue-700">
            <p>• Daily check at 9:00 AM for overdue invoices</p>
            <p>• Hourly precision checks for immediate follow-ups</p>
            <p>• Subsequent follow-ups every 7 days after first email</p>
          </div>
        </div>

        {/* Manual Trigger Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Manual Follow-up Trigger</h3>
          
          {/* Preset Delay Buttons */}
          <div className="space-y-2">
            <Label>Quick Actions</Label>
            <div className="flex flex-wrap gap-2">
              {presetDelays.map((minutes) => (
                <Button
                  key={minutes}
                  variant="outline"
                  size="sm"
                  onClick={() => setDelayMinutes(minutes)}
                  className={delayMinutes === minutes ? "bg-primary text-primary-foreground" : ""}
                >
                  {minutes} MINUTES
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Delay Input */}
          <div className="space-y-2">
            <Label htmlFor="delay-minutes">Custom Delay (minutes)</Label>
            <div className="flex gap-2">
              <Input
                id="delay-minutes"
                type="number"
                min="1"
                max="60"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 1)}
                className="w-32"
              />
              <Button
                onClick={handleTriggerFollowUps}
                disabled={isTriggering || delayMinutes < 1}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {isTriggering ? "Triggering..." : "Trigger Follow-ups"}
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            This will send follow-up emails to all overdue invoices that have a {delayMinutes}-minute delay setting.
          </div>
        </div>

        {/* Custom Follow-up Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Custom Follow-up Emails</h3>
          <div className="bg-blue-50 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Use Existing Email System</span>
            </div>
            <div className="text-sm text-blue-700">
              <p>• Create custom follow-up emails using the same system as regular invoices</p>
              <p>• Templates are automatically cached for reuse</p>
              <p>• Full control over subject, content, and formatting</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowCustomEmailModal(true)}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Create Custom Follow-up Email
          </Button>
        </div>

        {/* Info Section */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-800">How It Works</span>
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Each invoice can have a custom follow-up delay setting</p>
            <p>• Follow-ups are sent after the specified number of minutes past due date</p>
            <p>• Default delay is 1 minute if no custom setting is specified</p>
            <p>• Edit individual invoice delays in the invoice details page</p>
          </div>
        </div>
      </CardContent>

      {/* Reuse your existing EmailModal */}
      <Dialog open={showCustomEmailModal} onOpenChange={setShowCustomEmailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Custom Follow-up Email</DialogTitle>
          </DialogHeader>
          <EmailModal
            requestId={selectedInvoiceId}
            clientName="Follow-up Email"
            adminName="Admin"
            onClose={() => setShowCustomEmailModal(false)}
            isFollowUp={true}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
} 