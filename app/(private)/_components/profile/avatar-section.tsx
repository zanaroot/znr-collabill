import { UploadOutlined } from "@ant-design/icons";
import { Avatar, Button, Upload, type UploadProps } from "antd";
import ImgCrop from "antd-img-crop";
import type { AuthUser } from "@/http/models/auth.model";

type AvatarSectionProps = {
  avatarUrl: string;
  initials: string;
  editing: boolean;
  currentUser?: AuthUser | null;
  handleAvatarChange: UploadProps["onChange"];
  handleRemoveAvatar: () => void;
};

export const AvatarSection = ({
  avatarUrl,
  initials,
  editing,
  currentUser,
  handleAvatarChange,
  handleRemoveAvatar,
}: AvatarSectionProps) => (
  <div className="flex flex-col items-center gap-3 w-full">
    <Avatar size={320} src={avatarUrl} className="shadow-sm border">
      {initials}
    </Avatar>

    {editing ? (
      <div className="flex flex-col items-center gap-2">
        <ImgCrop rotationSlider>
          <Upload onChange={handleAvatarChange} showUploadList={false}>
            <Button size="small" icon={<UploadOutlined />}>
              Change avatar
            </Button>
          </Upload>
        </ImgCrop>
        {currentUser?.avatar && (
          <Button size="small" type="text" danger onClick={handleRemoveAvatar}>
            Remove avatar
          </Button>
        )}
      </div>
    ) : null}
  </div>
);
