import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreditCard, Info } from "lucide-react";

interface PaymentButtonSectionProps {
  includePaymentButton: boolean;
  onTogglePaymentButton: (enabled: boolean) => void;
  disabled?: boolean;
}

export function PaymentButtonSection({ 
  includePaymentButton, 
  onTogglePaymentButton, 
  disabled = false 
}: PaymentButtonSectionProps) {
  return (
    <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <div>
            <Label htmlFor="payment-button" className="text-base font-medium">
              Include Payment Button
            </Label>
            <p className="text-sm text-muted-foreground">
              Add a secure payment button to the email
            </p>
          </div>
        </div>
        <Switch
          id="payment-button"
          checked={includePaymentButton}
          onCheckedChange={onTogglePaymentButton}
          disabled={disabled}
        />
      </div>

      {includePaymentButton && (
        <div className="flex items-start space-x-2 p-3 bg-blue-100 rounded-md">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Payment button will be automatically generated</p>
            <p>A secure Stripe payment link will be created and included in the email, allowing the client to pay the invoice online.</p>
          </div>
        </div>
      )}
    </div>
  );
} 