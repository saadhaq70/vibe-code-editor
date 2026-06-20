"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, X, FileCode, AlertCircle } from "lucide-react";
import { FileModification } from "@/app/api/ai-modify/route";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AIModifyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestModification: (instruction: string) => Promise<FileModification[]>;
  onApplyModifications: (modifications: FileModification[]) => Promise<void>;
  isLoading: boolean;
}

export function AIModifyPanel({
  isOpen,
  onClose,
  onRequestModification,
  onApplyModifications,
  isLoading,
}: AIModifyPanelProps) {
  const [instruction, setInstruction] = useState("");
  const [modifications, setModifications] = useState<FileModification[]>([]);
  const [selectedModifications, setSelectedModifications] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleRequest = async () => {
    if (!instruction.trim()) return;

    setError(null);
    setModifications([]);
    setSelectedModifications(new Set());

    try {
      const mods = await onRequestModification(instruction);
      setModifications(mods);
      // Select all modifications by default
      setSelectedModifications(new Set(mods.map((_, idx) => idx)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate modifications");
    }
  };

  const handleApply = async () => {
    const selectedMods = modifications.filter((_, idx) => selectedModifications.has(idx));
    
    if (selectedMods.length === 0) {
      setError("Please select at least one modification to apply");
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      await onApplyModifications(selectedMods);
      setModifications([]);
      setSelectedModifications(new Set());
      setInstruction("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply modifications");
    } finally {
      setIsApplying(false);
    }
  };

  const toggleModification = (index: number) => {
    const newSelected = new Set(selectedModifications);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedModifications(newSelected);
  };

  const selectAll = () => {
    setSelectedModifications(new Set(modifications.map((_, idx) => idx)));
  };

  const deselectAll = () => {
    setSelectedModifications(new Set());
  };

  const renderDiff = (original: string, modified: string) => {
    const originalLines = original.split("\n");
    const modifiedLines = modified.split("\n");
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    return (
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div className="border rounded p-2 bg-red-50 dark:bg-red-950/20">
          <div className="font-semibold mb-2 text-red-600 dark:text-red-400">Original</div>
          <ScrollArea className="h-64">
            {originalLines.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-all">
                {line || " "}
              </div>
            ))}
          </ScrollArea>
        </div>
        <div className="border rounded p-2 bg-green-50 dark:bg-green-950/20">
          <div className="font-semibold mb-2 text-green-600 dark:text-green-400">Modified</div>
          <ScrollArea className="h-64">
            {modifiedLines.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-all">
                {line || " "}
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Code Modifications
          </DialogTitle>
          <DialogDescription>
            Describe what you want to change, and AI will analyze your codebase and propose modifications
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Instruction Input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Example: Add error handling to all API calls, or Refactor user authentication logic, or Add TypeScript types to all functions..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              disabled={isLoading || isApplying}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleRequest}
                disabled={!instruction.trim() || isLoading || isApplying}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Modifications
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Modifications List */}
          {modifications.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    Proposed Changes ({modifications.length})
                  </h3>
                  <Badge variant="outline">
                    {selectedModifications.size} selected
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={selectAll}
                    disabled={isApplying}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={deselectAll}
                    disabled={isApplying}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded">
                <Accordion type="multiple" className="w-full">
                  {modifications.map((mod, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`}>
                      <div className="flex items-center gap-2 px-4">
                        <input
                          type="checkbox"
                          checked={selectedModifications.has(idx)}
                          onChange={() => toggleModification(idx)}
                          disabled={isApplying}
                          className="h-4 w-4"
                        />
                        <AccordionTrigger className="flex-1 hover:no-underline">
                          <div className="flex items-center gap-2 text-left">
                            <FileCode className="h-4 w-4 text-blue-500" />
                            <span className="font-mono text-sm">{mod.filePath}</span>
                            <Badge variant="secondary" className="ml-2">
                              {mod.changeType}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                          <div>
                            <span className="font-semibold text-sm">Description:</span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {mod.changeDescription}
                            </p>
                          </div>
                          {mod.changeType === "update" && (
                            <div>
                              <span className="font-semibold text-sm">Changes:</span>
                              <div className="mt-2">
                                {renderDiff(mod.originalContent, mod.modifiedContent)}
                              </div>
                            </div>
                          )}
                          {mod.changeType === "create" && (
                            <div>
                              <span className="font-semibold text-sm">New File Content:</span>
                              <ScrollArea className="h-64 mt-2 border rounded p-2 bg-green-50 dark:bg-green-950/20">
                                <pre className="text-xs whitespace-pre-wrap">
                                  {mod.modifiedContent}
                                </pre>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>

              {/* Apply Button */}
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleApply}
                  disabled={selectedModifications.size === 0 || isApplying}
                  className="flex-1"
                  variant="default"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying Changes...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Apply Selected Changes ({selectedModifications.size})
                    </>
                  )}
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  disabled={isApplying}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {modifications.length === 0 && !isLoading && !error && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <Sparkles className="h-12 w-12 mx-auto text-purple-300" />
                <p>Enter an instruction above to get started</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
