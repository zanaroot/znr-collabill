import { Tag } from "antd";
import type { InvoiceStatus } from "@/http/models/invoice.model";

export const StatusTagInvoice = ({ status }: { status: InvoiceStatus }) => {
  const colorByStatus = {
    DRAFT: "geekblue",
    VALIDATED: "processing",
    PAID: "success",
  };

  return (
    <Tag
      color={colorByStatus[status]}
      className="mt-2 border-none px-3 py-1 font-semibold no-print text-center"
    >
      {status}
    </Tag>
  );
};
