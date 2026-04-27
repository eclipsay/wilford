export const bulletinAccessCookieName = "wpu_bulletin_access";

export function getBulletinAccessKey() {
  return (
    process.env.GOVERNMENT_ACCESS_KEY ||
    process.env.ADMIN_API_KEY ||
    process.env.PANEL_SESSION_SECRET ||
    "WPU-BULLETIN-CONTROL"
  );
}
