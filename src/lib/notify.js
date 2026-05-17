import { supabase } from "./supabase";

export async function createNotification({ userId, title, message, type = "info", link = null }) {
  if (!userId) {
    console.warn("[notify] No userId — skipping");
    return;
  }

  console.log("[notify] Inserting notification for:", userId);

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link,
    })
    .select();

  if (error) {
    console.error("[notify] INSERT FAILED:", error.code, error.message, error.details);
  } else {
    console.log("[notify] INSERT SUCCESS:", data);
  }
}

export async function triggerNotification({
  recipientId,
  recipientEmail,
  eventType,
  employeeName,
  note,
  link,
}) {
  console.log("[notify] triggerNotification called:", { recipientId, eventType });

  const appUrl = window.location.origin;

  const templates = {
    goal_submitted: {
      title:   `Goals Submitted — ${employeeName}`,
      message: `${employeeName} submitted goals for your approval.`,
      type:    "warning",
      link:    link || "/approve",
    },
    goal_approved: {
      title:   "Your Goals Are Approved ✅",
      message: "Goals approved and locked. Log achievements each quarter.",
      type:    "success",
      link:    link || "/my-goals",
    },
    goal_rejected: {
      title:   "Goals Returned for Rework ↩️",
      message: note ? `Manager note: "${note}"` : "Please revise and resubmit.",
      type:    "error",
      link:    link || "/my-goals",
    },
    checkin_done: {
      title:   `Check-in Done — ${employeeName}`,
      message: `${employeeName} logged quarterly achievements.`,
      type:    "info",
      link:    link || "/team",
    },
    checkin_reminder: {
      title:   "Check-in Due ⏰",
      message: "Log your actual achievements for this quarter.",
      type:    "info",
      link:    link || "/quarterly-update",
    },
  };

  const t = templates[eventType];
  if (!t) {
    console.warn("[notify] Unknown eventType:", eventType);
    return;
  }

  await createNotification({
    userId:  recipientId,
    title:   t.title,
    message: t.message,
    type:    t.type,
    link:    t.link,
  });

  // Email — fire and forget, skip demo addresses
  const skipDomains = ["demo.com"];
  const domain = recipientEmail?.split("@")[1];
  if (recipientEmail && !skipDomains.includes(domain)) {
    sendEmailSilently(recipientEmail, t.title, employeeName, appUrl, t.link);
  }

  // Teams — fire and forget
  sendTeamsSilently(t.title, t.message, employeeName, appUrl, t.link);
}

async function sendEmailSilently(to, subject, employeeName, appUrl, link) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
        "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        to,
        subject,
        html: `<div style="font-family:sans-serif;padding:32px;background:#f5f4ef;">
          <h2 style="color:#1e293b;">${subject}</h2>
          <p style="color:#64748b;">Employee: ${employeeName}</p>
          <a href="${appUrl}${link}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
            Open in AtomQuest →
          </a>
        </div>`,
      }),
    });
  } catch (e) {
    console.warn("[notify] Email failed:", e.message);
  }
}

async function sendTeamsSilently(title, message, employeeName, appUrl, link) {
  const webhookUrl = import.meta.env.VITE_TEAMS_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        themeColor: "f59e0b",
        summary: title,
        sections: [{
          activityTitle: `⚡ AtomQuest — ${title}`,
          facts: [
            { name: "Employee", value: employeeName },
            { name: "Details",  value: message },
          ],
        }],
        potentialAction: [{
          "@type": "OpenUri",
          name: "Open AtomQuest →",
          targets: [{ os: "default", uri: `${appUrl}${link}` }],
        }],
      }),
    });
  } catch (e) {
    console.warn("[notify] Teams failed:", e.message);
  }
}