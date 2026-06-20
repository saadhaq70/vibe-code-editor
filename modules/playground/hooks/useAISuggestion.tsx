import { useState, useCallback } from "react";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import { FileModification, AIModifyResponse } from "@/app/api/ai-modify/route";

interface AISuggestionsState {
  suggestion: string | null;
  isLoading: boolean;
  position: { line: number; column: number } | null;
  decoration: string[];
  isEnabled: boolean;
}

interface AIModifyState {
  isModifying: boolean;
  modifications: FileModification[];
  error: string | null;
}

interface UseAISuggestionsProps {
  templateData?: TemplateFolder;
  currentFilePath?: string;
}

interface UseAISuggestionsReturn extends AISuggestionsState {
  toggleEnabled: () => void;
  fetchSuggestion: (type: string, editor: any) => Promise<void>;
  acceptSuggestion: (editor: any, monaco: any) => void;
  rejectSuggestion: (editor: any) => void;
  clearSuggestion: (editor: any) => void;
  // New AI modification methods
  modifyState: AIModifyState;
  requestModification: (instruction: string, selectedCode?: string) => Promise<FileModification[]>;
  clearModifications: () => void;
}

export const useAISuggestions = (
  props?: UseAISuggestionsProps
): UseAISuggestionsReturn => {
  const [state, setState] = useState<AISuggestionsState>({
    suggestion: null,
    isLoading: false,
    position: null,
    decoration: [],
    isEnabled: true,
  });

  const [modifyState, setModifyState] = useState<AIModifyState>({
    isModifying: false,
    modifications: [],
    error: null,
  });

  const toggleEnabled = useCallback(() => {
    setState((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
  }, []);

  const fetchSuggestion = useCallback(
    async (type: string, editor: any) => {
      setState((currentState) => {
        if (!currentState.isEnabled) {
          return currentState;
        }

        if (!editor) {
          return currentState;
        }

        const model = editor.getModel();
        const cursorPosition = editor.getPosition();

        if (!model || !cursorPosition) {
          return currentState;
        }

        const newState = { ...currentState, isLoading: true };

        (async () => {
          try {
            const payload = {
              fileContent: model.getValue(),
              cursorLine: cursorPosition.lineNumber - 1,
              cursorColumn: cursorPosition.column - 1,
              suggestionType: type,
              // Include codebase context if available
              templateData: props?.templateData,
              filePath: props?.currentFilePath,
            };

            const response = await fetch("/api/code-completion", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              throw new Error(`API responded with status ${response.status}`);
            }

            const data = await response.json();

            if (data.suggestion) {
              const suggestionText = data.suggestion.trim();
              
              // Log codebase context usage
              if (data.codebaseContext) {
                console.log(
                  `✓ Context-aware suggestion using ${data.codebaseContext.relatedFilesCount} related files`
                );
              }

              setState((prev) => ({
                ...prev,
                suggestion: suggestionText,
                position: {
                  line: cursorPosition.lineNumber,
                  column: cursorPosition.column,
                },
                isLoading: false,
              }));
            } else {
              console.warn("No suggestion received from API.");
              setState((prev) => ({ ...prev, isLoading: false }));
            }
          } catch (error) {
            console.error("Error fetching code suggestion:", error);
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        })();

        return newState;
      });
    },
    [props?.templateData, props?.currentFilePath]
  );

  const acceptSuggestion = useCallback((editor: any, monaco: any) => {
    setState((currentState) => {
      if (
        !currentState.suggestion ||
        !currentState.position ||
        !editor ||
        !monaco
      ) {
        return currentState;
      }

      const { line, column } = currentState.position;
      const sanitizedSuggestion = currentState.suggestion.replace(
        /^\d+:\s*/gm,
        ""
      );

      editor.executeEdits("", [
        {
          range: new monaco.Range(line, column, line, column),
          text: sanitizedSuggestion,
          forceMoveMarkers: true,
        },
      ]);

      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }

      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  const rejectSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }

      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  const clearSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  // New: Request AI-powered code modification
  const requestModification = useCallback(
    async (
      instruction: string,
      selectedCode?: string
    ): Promise<FileModification[]> => {
      if (!props?.templateData) {
        throw new Error("Template data is required for AI modifications");
      }

      setModifyState({
        isModifying: true,
        modifications: [],
        error: null,
      });

      try {
        console.log(`🤖 Requesting AI modification: "${instruction}"`);

        const payload = {
          instruction,
          templateData: props.templateData,
          currentFilePath: props.currentFilePath,
          selectedCode,
        };

        const response = await fetch("/api/ai-modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        const data: AIModifyResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || "AI modification failed");
        }

        console.log(
          `✓ Received ${data.modifications.length} file modifications`
        );

        setModifyState({
          isModifying: false,
          modifications: data.modifications,
          error: null,
        });

        return data.modifications;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error requesting AI modification:", error);

        setModifyState({
          isModifying: false,
          modifications: [],
          error: errorMessage,
        });

        throw error;
      }
    },
    [props?.templateData, props?.currentFilePath]
  );

  const clearModifications = useCallback(() => {
    setModifyState({
      isModifying: false,
      modifications: [],
      error: null,
    });
  }, []);

  return {
    ...state,
    toggleEnabled,
    fetchSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestion,
    modifyState,
    requestModification,
    clearModifications,
  };
};