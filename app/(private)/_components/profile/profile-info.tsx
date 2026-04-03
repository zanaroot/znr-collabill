import { ApartmentOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Divider, Space, Tag } from "antd";
import type { AuthUser } from "@/http/models/auth.model";

type ProfileInfoProps = {
  currentUser?: AuthUser | null;
  currentName?: string;
  currentEmail?: string;
  onEdit: () => void;
};

export const ProfileInfo = ({
  currentUser,
  currentName,
  currentEmail,
  onEdit,
}: ProfileInfoProps) => (
  <div className="flex flex-col items-center w-full gap-2 text-center mt-3">
    <div className="flex flex-col items-center">
      <span className="text-xl font-semibold">
        {currentName ?? currentUser?.name}
      </span>
      <span className="text-sm text-gray-500">
        {currentEmail ?? currentUser?.email}
      </span>
    </div>
    <div className="w-full mt-3">
      <Button block onClick={onEdit}>
        Edit profile
      </Button>
    </div>
    <Divider />
    <div className="w-full text-sm pt-2">
      <div className="flex justify-between py-1">
        <Space className="text-gray-500">
          <UserOutlined />
          <span>Role</span>
        </Space>
        <Tag color="blue">{currentUser?.organizationRole}</Tag>
      </div>
      <div className="flex justify-between py-1">
        <Space className="text-gray-500">
          <ApartmentOutlined />
          <span>Organization</span>
        </Space>
        <span>{currentUser?.organizationName || "N/A"}</span>
      </div>
    </div>
  </div>
);
