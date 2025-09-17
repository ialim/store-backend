declare module 'pdf-parse' {
  export interface PdfParseResult {
    text?: string;
  }

  const pdfParse: (buffer: Buffer) => Promise<PdfParseResult>;
  export default pdfParse;
}

declare module 'pdfjs-dist' {
  export interface PDFTextItem {
    str?: string;
  }

  export interface PDFTextContent {
    items: PDFTextItem[];
  }

  export interface PDFPageProxy {
    getTextContent(): Promise<PDFTextContent>;
  }

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export function getDocument(params: {
    data: Buffer | Uint8Array;
    isEvalSupported?: boolean;
    disableFontFace?: boolean;
    verbosity?: number;
  }): {
    promise: Promise<PDFDocumentProxy>;
  };
}

declare module 'tesseract.js' {
  export interface RecognizeData {
    text?: string;
  }

  export interface RecognizeResult {
    data?: RecognizeData;
  }

  export function recognize(
    image: Buffer | ArrayBuffer | string,
    lang: string,
    options?: Record<string, unknown>,
  ): Promise<RecognizeResult>;
}

declare module '@aws-sdk/client-textract' {
  export interface ExpenseFieldType {
    Text?: string;
  }

  export interface ExpenseFieldValueDetection {
    Text?: string;
    NormalizedValue?: { Value?: string };
  }

  export interface ExpenseField {
    Type?: ExpenseFieldType;
    ValueDetection?: ExpenseFieldValueDetection;
  }

  export interface ExpenseLineItem {
    LineItemExpenseFields?: ExpenseField[];
  }

  export interface ExpenseLineItemGroup {
    LineItems?: ExpenseLineItem[];
  }

  export interface ExpenseDocument {
    SummaryFields?: ExpenseField[];
    LineItemGroups?: ExpenseLineItemGroup[];
  }

  export interface AnalyzeExpenseResponse {
    ExpenseDocuments?: ExpenseDocument[];
  }

  export class TextractClient {
    constructor(config: Record<string, unknown>);
    send<T = AnalyzeExpenseResponse>(command: AnalyzeExpenseCommand): Promise<T>;
  }

  export class AnalyzeExpenseCommand {
    readonly input: Record<string, unknown>;
    constructor(input: { Document: { Bytes: Buffer } });
  }
}
