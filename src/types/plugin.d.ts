declare global {
  interface Window {
    Jupiter: {
      init: (options: any) => void;
      syncProps?: (options: any) => void;
    };
  }
}
export {};