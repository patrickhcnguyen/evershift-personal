import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Mail, Settings, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateInvoiceFollowUpDelay, triggerFollowUpsByDelay } from "../services/followUp";
import { EmailModal } from "./EmailModal";

interface FollowUpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  requestId: string;
  clientName: string;
  clientEmail: string;
  dueDate: string;
  invoiceAmount: number;
}

export function FollowUpPanel({
  isOpen,
  onClose,
  invoiceId,
  requestId,
  clientName,
  clientEmail,
  dueDate,
  invoiceAmount
}: FollowUpPanelProps) {
  const [delayMinutes, setDelayMinutes] = useState<number>(5);
  const [isUpdatingDelay, setIsUpdatingDelay] = useState(false);
  const [isTriggeringFollowUp, setIsTriggeringFollowUp] = useState(false);
  const [showCustomEmailModal, setShowCustomEmailModal] = useState(false);

  const presetDelays = [1, 3, 7, 14, 30];

  const handleUpdateDelay = async () => {
    setIsUpdatingDelay(true);
    try {
      await updateInvoiceFollowUpDelay(invoiceId, delayMinutes);
      alert(`Follow-up delay updated to ${delayMinutes} minutes for this invoice.`);
    } catch (error) {
      alert(`Failed to update delay: ${(error as Error).message}`);
    } finally {
      setIsUpdatingDelay(false);
    }
  };

  const handleTriggerSingleFollowUp = async () => {
    setIsTriggeringFollowUp(true);
    try {
      const result = await triggerFollowUpsByDelay(delayMinutes);
      alert(`Follow-up triggered successfully! Processed ${result.processed} invoices with ${delayMinutes}-minute delay setting.`);
    } catch (error) {
      alert(`Failed to trigger follow-up: ${(error as Error).message}`);
    } finally {
      setIsTriggeringFollowUp(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Follow-Up Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure automated follow-up emails for {clientName}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Schedule Info */}
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

          {/* Individual Invoice Delay Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Invoice Follow-up Settings</h3>
            
            {/* Preset Delay Buttons */}
            <div className="space-y-2">
              <Label>Quick Settings</Label>
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
                  onClick={handleUpdateDelay}
                  disabled={isUpdatingDelay || delayMinutes < 1}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {isUpdatingDelay ? "Updating..." : "Update Delay"}
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              This invoice will automatically send follow-up emails {delayMinutes} minutes after the due date.
            </div>
          </div>

          {/* Manual Trigger Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Manual Follow-up Actions</h3>
            
            <div className="flex gap-2">
              <Button
                onClick={handleTriggerSingleFollowUp}
                disabled={isTriggeringFollowUp}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Mail className="h-4 w-4" />
                {isTriggeringFollowUp ? "Triggering..." : "Send Follow-up Now"}
              </Button>
              
              <Button
                onClick={() => setShowCustomEmailModal(true)}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Mail className="h-4 w-4" />
                Custom Follow-up Email
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Manually trigger follow-up emails or create custom follow-up messages.
            </div>
          </div>

          {/* How It Works Section */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-800">How It Works</span>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• Each invoice can have a custom follow-up delay setting</p>
              <p>• Follow-ups are sent after the specified number of minutes past due date</p>
              <p>• Default delay is 1 minute if no custom setting is specified</p>
              <p>• Manual triggers work with all invoices sharing the same delay setting</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Email Modal */}
      <Dialog open={showCustomEmailModal} onOpenChange={setShowCustomEmailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Custom Follow-up Email</DialogTitle>
          </DialogHeader>
          <EmailModal
            requestId={requestId}
            clientName={clientName}
            adminName="Admin"
            onClose={() => setShowCustomEmailModal(false)}
            isFollowUp={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 