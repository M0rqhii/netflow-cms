import { redirect } from 'next/navigation';

export default function OrgSettingsIndex({ params }: { params: { orgId: string } }) {
  redirect(`/org/${params.orgId}/settings/roles`);
}
