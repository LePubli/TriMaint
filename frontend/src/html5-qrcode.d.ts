/* Type declarations for html5-qrcode (no built-in .d.ts) */
declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraIdOrConfig: string | { facingMode: string },
      configuration: {
        fps?: number;
        qrbox?: { width: number; height: number } | number;
        aspectRatio?: number;
        disableFlip?: boolean;
        verbose?: boolean;
        [key: string]: unknown;
      },
      qrCodeSuccessCallback: (decodedText: string, result: Html5QrcodeResult) => void,
      qrCodeErrorCallback: (errorMessage: string, error: Html5QrcodeError) => void,
    ): Promise<null>;
    stop(): Promise<null>;
    clear(): Promise<null>;
    getState(): number;
  }

  export interface Html5QrcodeResult {
    decodedText: string;
    result: {
      text?: string;
      format?: { format: number; formatName: string };
    };
  }

  export interface Html5QrcodeError {
    errorMessage: string;
  }

  export const Html5QrcodeSupportedFormats: {
    QR_CODE: number;
    AZTEC: number;
    CODABAR: number;
    CODE_39: number;
    CODE_93: number;
    CODE_128: number;
    DATA_MATRIX: number;
    MAXICODE: number;
    ITF: number;
    EAN_13: number;
    EAN_8: number;
    PDF_417: number;
    RSS_14: number;
    RSS_EXPANDED: number;
    UPC_A: number;
    UPC_E: number;
    UPC_EAN_EXTENSION: number;
  };
}