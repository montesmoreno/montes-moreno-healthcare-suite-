import crypto from "crypto";
import { json, signAdmin, handlerError } from "./_clock.js";

const same = (a, b) => {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function configuredAdmins() {
  return [
    {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
      name: "Administrator"
    },
    {
      username: process.env.ADMIN_USERNAME_2,
      password: process.env.ADMIN_PASSWORD_2,
      name: "Backup Administrator"
    }
  ].filter(admin => admin.username && admin.password);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const admins = configuredAdmins();
    if (!admins.length) throw new Error("Administrator credentials are not configured");

    const match = admins.find(admin =>
      same(req.body?.username, admin.username) && same(req.body?.password, admin.password)
    );

    if (!match) return json(res, 401, { error: "Invalid username or password" });

    return json(res, 200, {
      success: true,
      token: signAdmin(),
      admin: { username: match.username, name: match.name }
    });
  } catch (e) {
    return handlerError(res, e);
  }
}
