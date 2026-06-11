import { Tag } from "antd";
import type { TaskSize } from "@/http/models/task.model";

export const TaskSizeTag = ({ size }: { size: TaskSize }) => {
  const sizeConfig: Record<
    TaskSize,
    { color: string; bg: string; text: string }
  > = {
    XS: { color: "cyan", bg: "bg-cyan-50", text: "text-cyan-600" },
    S: { color: "green", bg: "bg-emerald-50", text: "text-emerald-600" },
    M: { color: "blue", bg: "bg-blue-50", text: "text-blue-600" },
    L: { color: "orange", bg: "bg-orange-50", text: "text-orange-600" },
    XL: { color: "volcano", bg: "bg-red-50", text: "text-red-600" },
  };

  const config = sizeConfig[size] || sizeConfig.M;

  return (
    <Tag
      variant="filled"
      color={config.color}
      className={`m-0 border-none px-2 py-0.5 text-[11px] font-medium uppercase tracking-tight`}
      style={{ borderRadius: "4px" }}
    >
      {size}
    </Tag>
  );
};
