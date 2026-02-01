import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

type SiteInfo = {
  siteId: string;
  site: { slug: string };
};

type SiteFeatures = {
  planFeatures?: string[];
  effective?: string[];
};

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000/api/v1';
const siteSlug = process.env.PLAYWRIGHT_SITE_SLUG;
const siteIdEnv = process.env.PLAYWRIGHT_SITE_ID;
const pageIdEnv = process.env.PLAYWRIGHT_PAGE_ID;
const moduleKey = process.env.PLAYWRIGHT_MODULE_KEY || 'payments';
const requireGating = process.env.PLAYWRIGHT_REQUIRE_GATING === '1';
const forceDisableModule = process.env.PLAYWRIGHT_FORCE_DISABLE_MODULE === '1' || requireGating;

async function apiJson<T>(request: APIRequestContext, method: 'GET' | 'POST' | 'PATCH', url: string, token: string, data?: unknown): Promise<T> {
  const res = await request.fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data,
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`API ${method} ${url} failed: ${res.status()} ${body}`);
  }
  return (await res.json()) as T;
}

async function getAuthToken(request: APIRequestContext): Promise<string> {
  const envToken = process.env.PLAYWRIGHT_AUTH_TOKEN;
  if (envToken) return envToken;

  const email = process.env.PLAYWRIGHT_EMAIL;
  const password = process.env.PLAYWRIGHT_PASSWORD;
  if (!email || !password) {
    throw new Error('Missing PLAYWRIGHT_AUTH_TOKEN or PLAYWRIGHT_EMAIL/PLAYWRIGHT_PASSWORD.');
  }

  const res = await request.post(`${apiURL}/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Login failed: ${res.status()} ${body}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Login succeeded but access_token is missing.');
  return data.access_token;
}

async function getSuperAdminToken(request: APIRequestContext): Promise<string> {
  const envToken = process.env.PLAYWRIGHT_SUPER_ADMIN_TOKEN;
  if (envToken) return envToken;

  const email = process.env.PLAYWRIGHT_SUPER_ADMIN_EMAIL;
  const password = process.env.PLAYWRIGHT_SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    return getAuthToken(request);
  }

  const res = await request.post(`${apiURL}/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Super admin login failed: ${res.status()} ${body}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Super admin login succeeded but access_token is missing.');
  return data.access_token;
}

async function setAuthTokenForPage(page: Page, token: string) {
  await page.context().addCookies([
    {
      name: 'authToken',
      value: token,
      domain: 'localhost',
      path: '/',
    },
  ]);
  await page.addInitScript((authToken) => {
    localStorage.setItem('authToken', authToken);
  }, token);
}


async function resolveSiteId(request: APIRequestContext, token: string): Promise<string> {
  if (siteIdEnv) return siteIdEnv;
  if (!siteSlug) throw new Error('Missing PLAYWRIGHT_SITE_SLUG.');

  const sites = await apiJson<SiteInfo[]>(request, 'GET', `${apiURL}/sites`, token);
  const match = sites.find((site) => site.site?.slug === siteSlug);
  if (!match) throw new Error(`Site slug not found: ${siteSlug}`);
  return match.siteId;
}

async function getSiteToken(request: APIRequestContext, token: string, siteId: string): Promise<string> {
  const response = await apiJson<{ access_token: string }>(
    request,
    'POST',
    `${apiURL}/auth/site-token`,
    token,
    { siteId }
  );
  return response.access_token;
}

async function ensureDraftEnvironmentId(request: APIRequestContext, token: string, siteId: string): Promise<string> {
  const envs = await apiJson<Array<{ id: string; type: string }>>(
    request,
    'GET',
    `${apiURL}/site-panel/${siteId}/environments`,
    token
  );
  const draft = envs.find((env) => env.type?.toLowerCase() === 'draft');
  if (draft) return draft.id;

  const created = await apiJson<{ id: string }>(
    request,
    'POST',
    `${apiURL}/site-panel/${siteId}/environments`,
    token,
    { type: 'draft' }
  );
  return created.id;
}

async function ensurePage(
  request: APIRequestContext,
  token: string,
  siteId: string,
  slugPrefix: string
): Promise<{ id: string; slug: string; title: string }> {
  if (pageIdEnv) {
    const page = await apiJson<{ id: string; slug: string; title: string }>(
      request,
      'GET',
      `${apiURL}/site-panel/${siteId}/pages/${pageIdEnv}` ,
      token
    );
    return { id: page.id, slug: page.slug, title: page.title };
  }

  const envId = await ensureDraftEnvironmentId(request, token, siteId);
  const timestamp = Date.now();
  const slug = `${slugPrefix}-${timestamp}`;
  const title = `Playwright ${slugPrefix} ${timestamp}`;
  const page = await apiJson<{ id: string; slug: string; title: string }>(
    request,
    'POST',
    `${apiURL}/site-panel/${siteId}/pages`,
    token,
    {
      environmentId: envId,
      slug,
      title,
      status: 'draft',
      content: {},
    }
  );
  return { id: page.id, slug, title };
}

async function seedMissingAltContent(
  request: APIRequestContext,
  token: string,
  siteId: string,
  pageId: string
): Promise<void> {
  const content = {
    version: '1.0.0',
    rootId: 'root',
    nodes: {
      root: {
        id: 'root',
        type: 'root',
        parentId: null,
        childIds: ['image-1'],
        props: { content: {}, style: { base: {} } },
      },
      'image-1': {
        id: 'image-1',
        type: 'image',
        parentId: 'root',
        childIds: [],
        props: {
          content: {
            src: 'https://example.com/image.jpg',
            alt: '',
          },
          style: { base: {} },
        },
      },
    },
  };

  await apiJson(
    request,
    'PATCH',
    `${apiURL}/site-panel/${siteId}/pages/${pageId}/content`,
    token,
    { content }
  );
}

async function waitForFeaturesResponse(page: Page, siteId: string) {
  try {
    await page.waitForResponse(
      (resp) => resp.url().includes(`/sites/${siteId}/features`) && resp.status() === 200,
      { timeout: 15000 }
    );
  } catch {
    // Non-blocking: continue if feature request does not fire in time.
  }
}


async function loginViaUI(page: Page, email: string, password: string) {
  await page.addInitScript(() => {
    localStorage.setItem('nf-language', 'en');
  });
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.getByRole('button', { name: /log in|login|zaloguj/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 120000 });
}

async function openBuilderViaUI(page: Page, siteSlug: string, pageTitle: string) {
  await page.getByRole('link', { name: new RegExp(siteSlug, 'i') }).click();
  await page.waitForURL(`**/sites/${siteSlug}`, { timeout: 120000 });

  const editInBuilderLink = page.locator(`a[href="/sites/${siteSlug}/panel/pages"]`);
  await expect(editInBuilderLink).toBeVisible();
  await editInBuilderLink.click();

  await page.waitForURL(`**/sites/${siteSlug}/panel/pages`, { timeout: 120000 });
  const row = page.getByRole('row', { name: new RegExp(pageTitle, 'i') });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /builder|edytorze/i }).click();
  await page.waitForURL(`**/sites/${siteSlug}/panel/page-builder**`, { timeout: 120000 });
}


function blockItemLocator(page: Page, title: string) {
  const titleLocator = page.getByText(title, { exact: true });
  return titleLocator.locator('xpath=ancestor::div[contains(@class, "group")]').first();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nf-language', 'en');
  });
});

test.describe('Page builder - module gating & publish validation', () => {
  test.describe.configure({ timeout: 120000 });
  test('module gating shows locked state for disabled module blocks', async ({ page, request }) => {
    if (!siteSlug) test.skip(true, 'Set PLAYWRIGHT_SITE_SLUG.');

    const authToken = await getAuthToken(request);
    const siteId = await resolveSiteId(request, authToken);
    const siteToken = await getSiteToken(request, authToken, siteId);

    let gatingExpected = false;
    let overrideApplied = false;

    if (forceDisableModule) {
      try {
        const superAdminToken = await getSuperAdminToken(request);
        await apiJson(
          request,
          'PATCH',
          `${apiURL}/sites/${siteId}/features/override`,
          superAdminToken,
          { featureKey: moduleKey, enabled: false }
        );
        overrideApplied = true;
        gatingExpected = true;
      } catch (error) {
        if (requireGating) throw error;
        test.skip(true, 'Feature override failed; enable with SUPER_ADMIN or set PLAYWRIGHT_REQUIRE_GATING=0.');
      }
    }

    if (!overrideApplied) {
      const features = await apiJson<SiteFeatures>(
        request,
        'GET',
        `${apiURL}/sites/${siteId}/features`,
        authToken
      );
      const inPlan = Boolean(features.planFeatures?.includes(moduleKey));
      const enabled = Boolean(features.effective?.includes(moduleKey));
      gatingExpected = !inPlan || !enabled;

      if (requireGating && !gatingExpected) {
        throw new Error(`Module ${moduleKey} is enabled and in plan. Use PLAYWRIGHT_FORCE_DISABLE_MODULE=1 to enforce gating.`);
      }
    }

    const pageInfo = await ensurePage(request, siteToken, siteId, 'gating');
    const pageId = pageInfo.id;
    await setAuthTokenForPage(page, authToken);
    await page.goto(`${baseURL}/sites/${siteSlug}/panel/page-builder?pageId=${pageId}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForFeaturesResponse(page, siteId);

    const searchInput = page.locator('input[placeholder*="Szukaj"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Payment');

    const blockItem = blockItemLocator(page, 'Payment Button');
    await expect(blockItem).toBeVisible();

    if (gatingExpected) {
      await expect(blockItem).toContainText(/Wymagany plan|Modu/);
    } else {
      await expect(blockItem).not.toContainText(/Wymagany plan|Modu/);
    }
  });

  
  test('publish validation via UI navigation blocks publish when image alt is missing', async ({ page, request }) => {
    if (!siteSlug) test.skip(true, 'Set PLAYWRIGHT_SITE_SLUG.');

    const email = process.env.PLAYWRIGHT_EMAIL;
    const password = process.env.PLAYWRIGHT_PASSWORD;
    if (!email || !password) {
      test.skip(true, 'Set PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD.');
    }

    const authToken = await getAuthToken(request);
    const siteId = await resolveSiteId(request, authToken);
    const siteToken = await getSiteToken(request, authToken, siteId);
    const pageInfo = await ensurePage(request, siteToken, siteId, 'publish-ui');
    const pageId = pageInfo.id;
    const pageTitle = pageInfo.title;

    await seedMissingAltContent(request, siteToken, siteId, pageId);

    await loginViaUI(page, email!, password!);
    await openBuilderViaUI(page, siteSlug!, pageTitle);

    const publishButton = page.getByRole('button', { name: /publikuj|publish/i }).first();
    await expect(publishButton).toBeVisible();
    await publishButton.click();

    const modalPublishButton = page.getByRole('button', { name: /publish/i });
    await expect(modalPublishButton).toBeVisible();
    await modalPublishButton.click();

    await expect(page.getByText(/Dodaj ALT|Add ALT/i)).toBeVisible();
  });

  test('publish validation blocks publish when image alt is missing', async ({ page, request }) => {
    if (!siteSlug) test.skip(true, 'Set PLAYWRIGHT_SITE_SLUG.');

    const authToken = await getAuthToken(request);
    const siteId = await resolveSiteId(request, authToken);
    const siteToken = await getSiteToken(request, authToken, siteId);
    const pageInfo = await ensurePage(request, siteToken, siteId, 'publish');
    const pageId = pageInfo.id;

    await seedMissingAltContent(request, siteToken, siteId, pageId);

    await setAuthTokenForPage(page, authToken);
    await page.goto(`${baseURL}/sites/${siteSlug}/panel/page-builder?pageId=${pageId}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForFeaturesResponse(page, siteId);

    const publishButton = page.getByRole('button', { name: 'Publikuj' });
    await expect(publishButton).toBeVisible();
    await publishButton.click();

    const modalPublishButton = page.getByRole('button', { name: 'Publish' });
    await expect(modalPublishButton).toBeVisible();
    await modalPublishButton.click();

    await expect(page.getByText(/Dodaj ALT/)).toBeVisible();
  });
});

