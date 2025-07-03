import { Button } from "@/components/ui/button"

interface EmailDraftControlsProps {
  hasDraft: boolean;
  hasChanges: boolean;
  isSavingDraft: boolean;
  onSaveDraft: () => void;
  onClearDraft: () => void;
  disabled?: boolean;
}

export function EmailDraftControls({ 
  hasDraft, 
  hasChanges, 
  isSavingDraft, 
  onSaveDraft, 
  onClearDraft, 
  disabled = false 
}: EmailDraftControlsProps) {
  return (
    <>
      {hasDraft && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-blue-600">Draft available</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearDraft}
            className="text-xs h-6 px-2"
            disabled={disabled}
          >
            Clear Draft
          </Button>
        </div>
      )}
      
      <Button 
        variant="secondary"
        onClick={onSaveDraft}
        disabled={isSavingDraft || !hasChanges || disabled}
        className="px-4"
      >
        {isSavingDraft ? "Saving..." : "Save as Draft"}
      </Button>
    </>
  );
} 