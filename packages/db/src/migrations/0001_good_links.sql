create table "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" integer not null,
  "image" text,
  "createdAt" date not null,
  "updatedAt" date not null
);

create table "session" (
  "id" text not null primary key,
  "expiresAt" date not null,
  "token" text not null unique,
  "createdAt" date not null,
  "updatedAt" date not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" date,
  "refreshTokenExpiresAt" date,
  "scope" text,
  "password" text,
  "createdAt" date not null,
  "updatedAt" date not null
);

create table "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" date not null,
  "createdAt" date not null,
  "updatedAt" date not null
);

create table "apikey" (
  "id" text not null primary key,
  "configId" text not null,
  "name" text,
  "start" text,
  "referenceId" text not null,
  "prefix" text,
  "key" text not null,
  "refillInterval" integer,
  "refillAmount" integer,
  "lastRefillAt" date,
  "enabled" integer,
  "rateLimitEnabled" integer,
  "rateLimitTimeWindow" integer,
  "rateLimitMax" integer,
  "requestCount" integer,
  "remaining" integer,
  "lastRequest" date,
  "expiresAt" date,
  "createdAt" date not null,
  "updatedAt" date not null,
  "permissions" text,
  "metadata" text
);

create table good_links (
  id text primary key,
  url text not null unique,
  canonical_url text not null,
  title text not null,
  description text,
  reason text not null,
  tags text not null,
  status text not null default 'published',
  source text not null,
  created_at text not null,
  updated_at text not null
);

create index "session_userId_idx" on "session" ("userId");
create index "account_userId_idx" on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");
create index "apikey_configId_idx" on "apikey" ("configId");
create index "apikey_referenceId_idx" on "apikey" ("referenceId");
create index "apikey_key_idx" on "apikey" ("key");
create index good_links_created_at_idx on good_links(created_at desc);
create index good_links_status_idx on good_links(status);
