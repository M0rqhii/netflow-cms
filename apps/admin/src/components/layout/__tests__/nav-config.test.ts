import { buildShellNavSections } from '@/components/layout/nav-config';

describe('layout/nav-config', () => {
  it('hides development section for non-privileged users', () => {
    const sections = buildShellNavSections({
      siteCount: 3,
      orgId: 'org-1',
      isOwner: false,
      isPrivileged: false,
      canAccessOrgSettings: true,
      isDev: true,
    });

    const devSection = sections.find((section) => section.labelKey === 'navigation.development');
    expect(devSection).toBeUndefined();
  });

  it('shows development section with sub-navigation for privileged users', () => {
    const sections = buildShellNavSections({
      siteCount: 3,
      orgId: 'org-1',
      isOwner: false,
      isPrivileged: true,
      canAccessOrgSettings: true,
      isDev: true,
    });

    const devSection = sections.find((section) => section.labelKey === 'navigation.development');
    expect(devSection).toBeDefined();
    expect(devSection?.items[0].href).toBe('/dev');
    expect(devSection?.items[0].subItems).toHaveLength(5);
  });

  it('shows billing only for owners and org settings only when enabled', () => {
    const sections = buildShellNavSections({
      siteCount: 2,
      orgId: 'org-2',
      isOwner: true,
      isPrivileged: false,
      canAccessOrgSettings: true,
      isDev: false,
    });

    const business = sections.find((section) => section.labelKey === 'navigation.business');
    const hrefs = business?.items.map((item) => item.href) ?? [];

    expect(hrefs).toContain('/account');
    expect(hrefs).toContain('/billing');
    expect(hrefs).toContain('/org/org-2/settings/general');
  });
});
