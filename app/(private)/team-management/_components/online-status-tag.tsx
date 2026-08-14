import { Badge } from "antd";

type OnlineStatusTagProps = {
  isOnline: boolean;
};

export const OnlineStatusTag = ({ isOnline }: OnlineStatusTagProps) => (
  <Badge
    status={isOnline ? "success" : "default"}
    text={isOnline ? "Active now" : "Offline"}
  />
);
