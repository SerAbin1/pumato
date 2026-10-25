/**
 * Browser sniffing for notification help. A page can't open the browser's
 * settings itself, so the best it can do is say where to tap.
 */

/** iPhones and iPads; iPadOS reports itself as a Mac, but with touch. */
export const isIOS = (userAgent: string, maxTouchPoints: number) =>
    /iPad|iPhone|iPod/.test(userAgent) || (userAgent.includes("Macintosh") && maxTouchPoints > 1);

/** Where to allow notifications again once this site is blocked, for this browser. */
export const unblockSteps = (userAgent: string, maxTouchPoints: number) => {
    // Only a home-screen app gets notifications on iOS, and it's managed like any app.
    if (isIOS(userAgent, maxTouchPoints)) {
        return "Open the Settings app → Notifications → Pumato → turn on Allow Notifications.";
    }
    if (userAgent.includes("Firefox")) {
        return "Tap the lock icon in the address bar, clear Notifications: Blocked, then reload.";
    }
    if (userAgent.includes("Edg/")) {
        return "Click the lock icon in the address bar → Site permissions → Notifications → Allow, then reload.";
    }
    if (userAgent.includes("Chrome") && userAgent.includes("Android")) {
        return "Tap the icon left of the address → Permissions → Notifications → Allow.";
    }
    if (userAgent.includes("Chrome")) {
        return "Click the icon left of the address → Site settings → Notifications → Allow, then reload.";
    }
    if (userAgent.includes("Safari")) {
        return "Open Safari → Settings → Websites → Notifications, and set this site to Allow.";
    }
    return "Allow notifications for this site in your browser's settings, then reload.";
};
