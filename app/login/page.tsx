import { PageHeading } from "@/components/page-heading";
import { WorkspaceLogin } from "@/components/workspace-login";

export const metadata = { title: "Workspace access" };

export default function LoginPage() {
  return (
    <>
      <PageHeading
        eyebrow="Secure access"
        title={<>Authorize the actions that <em>change a relationship.</em></>}
        description="Research ingestion, lifecycle changes, integration status, audit access, synchronization, and Instantly submission are role-protected."
      />
      <WorkspaceLogin />
    </>
  );
}
