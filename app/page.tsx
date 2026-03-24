import { redirect } from "next/navigation";
import { getCurrentUser } from "@/http/actions/get-current-user.action";
import LandingPage from "./_components/landing-page";

const Page = async () => {
  const user = await getCurrentUser();

  if (user?.organizationId) {
    return redirect("/task-board");
  }

  if (user && !user.organizationId) {
    return redirect("/create-organization");
  }

  return <LandingPage />;
};

export default Page;
