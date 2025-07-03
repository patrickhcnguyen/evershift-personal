import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmailHeaders } from "../../types"

interface EmailHeadersSectionProps {
  headers: EmailHeaders;
  onHeadersChange: (headers: EmailHeaders) => void;
  disabled?: boolean;
}

export function EmailHeadersSection({ headers, onHeadersChange, disabled = false }: EmailHeadersSectionProps) {
  const updateHeaders = (key: keyof EmailHeaders, value: string | string[]) => {
    onHeadersChange({ ...headers, [key]: value });
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-sm font-medium">Email Headers</h3>
      
      <div className="space-y-2">
        <Label htmlFor="subject" className="text-sm">Subject</Label>
        <Input
          id="subject"
          value={headers.subject || ''}
          onChange={(e) => updateHeaders('subject', e.target.value)}
          placeholder="Email subject..."
          className="text-sm"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="replyTo" className="text-sm">Reply To</Label>
        <Input
          id="replyTo"
          value={headers.replyTo || ''}
          onChange={(e) => updateHeaders('replyTo', e.target.value)}
          placeholder="Reply-to email..."
          className="text-sm"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cc" className="text-sm">CC (comma-separated)</Label>
          <Input
            id="cc"
            value={(headers.cc || []).join(', ')}
            onChange={(e) => updateHeaders('cc', e.target.value.split(',').map(email => email.trim()).filter(Boolean))}
            placeholder="cc@example.com, cc2@example.com"
            className="text-sm"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bcc" className="text-sm">BCC (comma-separated)</Label>
          <Input
            id="bcc"
            value={(headers.bcc || []).join(', ')}
            onChange={(e) => updateHeaders('bcc', e.target.value.split(',').map(email => email.trim()).filter(Boolean))}
            placeholder="bcc@example.com, bcc2@example.com"
            className="text-sm"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
} 