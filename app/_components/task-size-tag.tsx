import { Tag } from "antd";
import type { TaskSize } from "@/http/models/task.model";

export const TaskSizeTag = ({ size }: { size: TaskSize }) => {
  const sizeColor = {
    XS: "cyan",
    S: "green",
    M: "lime",
    L: "orange",
    XL: "gold",
  };

  return <Tag variant="filled" color={sizeColor[size]}>{size}</Tag>;
};
