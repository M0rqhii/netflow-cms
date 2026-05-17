#!/usr/bin/env node

const REQUIRED_VARS = ['DATABASE_URL', 'DIRECT_URL'];

function maskUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return raw.replace(/:([^:@/]+)@/, ':***@');
  }
}

function parseDatabaseUrl(name) {
  const value = process.env[name];
  if (!value) {
    return { name, value, error: `${name} is not set` };
  }

  try {
    return { name, value, url: new URL(value) };
  } catch (error) {
    return { name, value, error: `${name} is not a valid URL: ${error.message}` };
  }
}

function describeSupabaseUrl(entry) {
  if (entry.error) return [entry.error];

  const { name, url } = entry;
  const host = url.hostname;
  const port = url.port;
  const username = decodeURIComponent(url.username);
  const messages = [];

  if (host.endsWith('.pooler.supabase.com')) {
    const match = username.match(/^(.+)\.([a-z0-9]{20})$/);
    if (!match) {
      messages.push(
        `${name} uses a Supabase pooler host, so its user must look like "postgres.<project-ref>" or "prisma.<project-ref>". Current user is "${username || '<empty>'}".`,
      );
    }

    if (port !== '5432' && port !== '6543') {
      messages.push(`${name} uses a Supabase pooler host with unexpected port ${port || '<empty>'}. Use 5432 for Session mode or 6543 for Transaction mode.`);
    }

    if (name === 'DIRECT_URL' && port === '6543') {
      messages.push('DIRECT_URL points at Supabase Transaction pooler port 6543. Prisma migrations need Direct connection or Session pooler port 5432.');
    }
  }

  if (/^db\.[a-z0-9]{20}\.supabase\.co$/.test(host)) {
    if (username.includes('.')) {
      messages.push(`${name} uses a direct Supabase host, so its user should be "postgres" or another DB role, not "${username}".`);
    }

    if (port && port !== '5432') {
      messages.push(`${name} uses a direct Supabase host with unexpected port ${port}. Direct connections should use 5432.`);
    }
  }

  return messages;
}

const entries = REQUIRED_VARS.map(parseDatabaseUrl);
const errors = entries.flatMap(describeSupabaseUrl);

if (errors.length > 0) {
  console.error('Database URL validation failed before running Prisma migrations.');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error('');
  console.error('Current database URLs:');
  for (const entry of entries) {
    if (entry.value) console.error(`- ${entry.name}=${maskUrl(entry.value)}`);
  }
  console.error('');
  console.error('For Supabase, copy fresh connection strings from Dashboard -> Connect:');
  console.error('- DATABASE_URL: Transaction pooler on port 6543 for serverless/auto-scaling runtime, or Session pooler on port 5432 for long-lived containers.');
  console.error('- DIRECT_URL: Direct connection db.<project-ref>.supabase.co:5432 if IPv6 is available, otherwise Session pooler on port 5432.');
  console.error('If Prisma still reports "tenant/user ... not found", the pooler hostname/region or project ref in the username does not match an active Supabase project.');
  process.exit(1);
}

console.log('Database URL validation passed.');
