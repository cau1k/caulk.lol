alter table "user" add column "role" text;
alter table "user" add column "banned" integer;
alter table "user" add column "banReason" text;
alter table "user" add column "banExpires" date;
alter table "session" add column "impersonatedBy" text;

create table "passkey" (
  "id" text not null primary key,
  "name" text,
  "publicKey" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "credentialID" text not null,
  "counter" integer not null,
  "deviceType" text not null,
  "backedUp" integer not null,
  "transports" text,
  "createdAt" date,
  "aaguid" text
);

create table "deviceCode" (
  "id" text not null primary key,
  "deviceCode" text not null,
  "userCode" text not null,
  "userId" text,
  "expiresAt" date not null,
  "status" text not null,
  "lastPolledAt" date,
  "pollingInterval" integer,
  "clientId" text,
  "scope" text
);

create index "passkey_userId_idx" on "passkey" ("userId");
create index "passkey_credentialID_idx" on "passkey" ("credentialID");
