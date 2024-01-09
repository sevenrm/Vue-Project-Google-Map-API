declare module 'googlemaps';
interface Window {
  tinymce: any
  google: typeof google
  Frames: {
    Events: any;
    init(options: string | Record<string, any>): void;
    addEventHandler(eventName: string, fn: (...params: any[]) => void): void;
    removeEventHandler(eventName: string, handler: any): void;
    removeAllEventHandler(eventName: string): void;
    submitCard(): Promise<{ token: string }>;
    isCardValid(): boolean;
  }
  MSStream: boolean
}
