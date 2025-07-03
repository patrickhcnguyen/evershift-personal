import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface EmailContentSectionProps {
  content: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

export function EmailContentSection({ 
  content, 
  onContentChange, 
  placeholder = "Enter your email message...",
  disabled = false,
  minHeight = "min-h-[200px]"
}: EmailContentSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="content" className="text-sm">Message</Label>
      <Textarea
        id="content"
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={placeholder}
        className={`${minHeight} resize-none`}
        disabled={disabled}
      />
    </div>
  );
} 