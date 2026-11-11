import assert from "node:assert/strict";
import test from "node:test";
import { adminUrl } from "@caulk.lol/env/urls";

test("legacy admin links stay in the current environment", () => {
  assert.equal(
    adminUrl("https://dev-api.caulk.lol", "/login"),
    "https://dev-admin.caulk.lol/login",
  );
  assert.equal(
    adminUrl("https://dev-api.caulk.lol", "/dashboard"),
    "https://dev-admin.caulk.lol/dashboard",
  );
  assert.equal(adminUrl("https://api.caulk.lol", "/login"), "https://admin.caulk.lol/login");
  assert.equal(adminUrl("http://localhost:3001", "/login"), "http://localhost:3002/login");
  assert.throws(() => adminUrl("https://unknown.example", "/login"), /Unknown API host/);
});
