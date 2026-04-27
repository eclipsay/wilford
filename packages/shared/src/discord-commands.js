export const publicBotCommands = [
  {
    name: "-help / /help",
    access: "All staff",
    description: "Show the active command list for moderation and application handling.",
    usage: "-help"
  },
  {
    name: "-ping / /ping",
    access: "All staff",
    description: "Quick health check for the Wilford Discord bot.",
    usage: "-ping"
  },
  {
    name: "-apply / /apply",
    access: "Public",
    description: "Start a private DM application that gets posted into a staff review thread.",
    usage: "-apply"
  },
  {
    name: "-commands / /commands",
    access: "Public",
    description: "Get the public command reference page for Wilford bot operations.",
    usage: "-commands"
  },
  {
    name: "-userinfo / /userinfo",
    access: "Staff",
    description: "Show a quick profile for a mentioned member.",
    usage: "-userinfo @user"
  },
  {
    name: "-purge / /purge",
    access: "Manage Messages",
    description: "Bulk-delete recent messages in the current channel.",
    usage: "-purge 25"
  },
  {
    name: "-timeout / /timeout",
    access: "Moderate Members",
    description: "Temporarily restrict a member using a duration like 10m, 2h, or 3d.",
    usage: "-timeout @user 30m reason"
  },
  {
    name: "-untimeout / /untimeout",
    access: "Moderate Members",
    description: "Remove an active timeout from a member.",
    usage: "-untimeout @user reason"
  },
  {
    name: "-kick / /kick",
    access: "Kick Members",
    description: "Remove a member from the server with an optional reason.",
    usage: "-kick @user reason"
  },
  {
    name: "-ban / /ban",
    access: "Ban Members",
    description: "Ban a member and optionally remove up to 7 days of message history.",
    usage: "-ban @user 7 reason"
  }
];

export const staffApplicationCommands = [
  {
    name: "-r",
    access: "Review thread staff",
    description: "Reply to the applicant from inside the review thread.",
    usage: "-r Thanks. Can you clarify your timezone?"
  },
  {
    name: "-accept",
    access: "Review thread staff",
    description: "Accept an application, DM the applicant, and optionally grant the configured role.",
    usage: "-accept Approved for onboarding."
  },
  {
    name: "-deny",
    access: "Review thread staff",
    description: "Deny an application and DM the applicant with the decision.",
    usage: "-deny We are not moving forward right now."
  }
];

export const applicationQuestions = [
  "What name should Wilford staff use for you?",
  "How old are you?",
  "What timezone are you in and when are you usually active?",
  "Why do you want to serve the Wilford Panem Union?",
  "What skills, experience, or roles would you bring to the group?"
];
