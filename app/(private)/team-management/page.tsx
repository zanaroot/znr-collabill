import { InvitationList } from "./_components/invitation-list";
import { MemberList } from "./_components/member-list";

const TeamManagementPage = () => (
  <div style={{ padding: "24px" }}>
    <MemberList />
    <InvitationList />
  </div>
);

export default TeamManagementPage;
