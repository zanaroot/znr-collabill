import { Tag } from "antd";
import type { InvoiceStatus } from "@/http/models/invoice.model";

export const StatusTagInvoice = ({
  status,
}: {
  status: InvoiceStatus | string | null | undefined;
}) => {
  const colorByStatus: Record<string, string> = {
    DRAFT: "geekblue",
    VALIDATED: "processing",
    PAID: "success",
  };

  const displayStatus = status || "DRAFT";
  const color = colorByStatus[displayStatus] || "default";

  return (
    <Tag
      color={color}
      className="mt-2 border-none px-3 py-1 font-semibold no-print text-center"
    >
      {displayStatus}
    </Tag>
  );
};
