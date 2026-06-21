import { useState, useEffect, useCallback, useRef } from "react";
import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

interface UseWebContainerProps {
  templateData: TemplateFolder;
}

interface UseWebContaierReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destory: () => void;
}

// Global singleton instance
let globalWebContainerInstance: WebContainer | null = null;
let initializationPromise: Promise<WebContainer> | null = null;

export const useWebContainer = ({
  templateData,
}: UseWebContainerProps): UseWebContaierReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function initializeWebContainer() {
      try {
        // Reuse existing instance if available
        if (globalWebContainerInstance) {
          if (mountedRef.current) {
            setInstance(globalWebContainerInstance);
            setIsLoading(false);
          }
          return;
        }

        // Reuse existing initialization promise if one is in progress
        if (initializationPromise) {
          const webcontainerInstance = await initializationPromise;
          if (mountedRef.current) {
            setInstance(webcontainerInstance);
            setIsLoading(false);
          }
          return;
        }

        // Start new initialization
        initializationPromise = WebContainer.boot();
        const webcontainerInstance = await initializationPromise;
        globalWebContainerInstance = webcontainerInstance;
        initializationPromise = null;

        if (mountedRef.current) {
          setInstance(webcontainerInstance);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to initialize WebContainer:", error);
        initializationPromise = null;
        if (mountedRef.current) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to initialize WebContainer"
          );
          setIsLoading(false);
        }
      }
    }

    initializeWebContainer();

    return () => {
      mountedRef.current = false;
      // Don't tear down the global instance on unmount
      // It will be reused by other components
    };
  }, []);

  const writeFileSync = useCallback(
    async (path: string, content: string): Promise<void> => {
      if (!instance) {
        throw new Error("WebContainer instance is not available");
      }

      try {
        const pathParts = path.split("/");
        const folderPath = pathParts.slice(0, -1).join("/");

        if (folderPath) {
          await instance.fs.mkdir(folderPath, { recursive: true }); // Create folder structure recursively
        }

        await instance.fs.writeFile(path, content);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to write file";
        console.error(`Failed to write file at ${path}:`, err);
        throw new Error(`Failed to write file at ${path}: ${errorMessage}`);
      }
    },
    [instance]
  );

  const destory = useCallback(()=>{
    if(instance){
        instance.teardown()
        // Clear global reference if we're destroying it
        if (globalWebContainerInstance === instance) {
          globalWebContainerInstance = null;
        }
        setInstance(null);
        setServerUrl(null)
    }
  },[instance])

  return {serverUrl , isLoading , error , instance , writeFileSync , destory}
};
