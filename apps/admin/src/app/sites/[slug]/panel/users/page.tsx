import { redirect } from "next/navigation";

export default function SitePanelUsersRedirectPage({ params }: { params: { slug: string } }) {
  redirect(`/sites/${encodeURIComponent(params.slug)}/users`);
}
