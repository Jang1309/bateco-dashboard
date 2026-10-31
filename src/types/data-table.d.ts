import "@querycn/table-react";

declare module "@querycn/table-react" {
  interface DataTableColumnMeta {
    /** Giới hạn riêng cho "Vừa nội dung" (px); kéo tay vẫn theo `maxSize`. */
    fitMaxSize?: number;
  }
}
