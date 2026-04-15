import { Flex } from "antd";
import { InviteUserModal } from "@/app/(private)/team-management/_components/invite-user-modal";
import { InvitationList } from "./_components/invitation-list";
import { MemberList } from "./_components/member-list";

const TeamManagementPage = () => (
  <div style={{ padding: "24px" }}>
    <Flex
      justify="space-between"
      align="center"
      style={{ marginBottom: "24px" }}
    >
      <InviteUserModal />
    </Flex>
    <MemberList />
    <InvitationList />
  </div>
);

export default TeamManagementPage;
