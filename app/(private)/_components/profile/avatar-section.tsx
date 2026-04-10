import { UploadOutlined } from "@ant-design/icons";
import { Button, Upload, type UploadProps } from "antd";
import ImgCrop from "antd-img-crop";
import { AvatarProfile } from "@/app/_components/avatar-profile";
import type { AuthUser } from "@/http/models/auth.model";

type AvatarSectionProps = {
  avatarUrl?: string | null;
  editing: boolean;
  currentUser?: AuthUser | null;
  handleAvatarChange: UploadProps["onChange"];
  handleRemoveAvatar: () => void;
};

export const AvatarSection = ({
  avatarUrl,
  editing,
  currentUser,
  handleAvatarChange,
  handleRemoveAvatar,
}: AvatarSectionProps) => (
  <div className="flex flex-col items-center gap-3 w-full">
    <AvatarProfile
      size={320}
      src={avatarUrl}
      className="shadow-sm border"
      userName={currentUser?.name}
      userEmail={currentUser?.email}
    />

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
