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
    name: "-petition / /petition",
    access: "Public",
    description: "File an appeal, pardon request, complaint, dispute, or legal question with the Supreme Court.",
    usage: "-petition appeal Case-001 I request review because..."
  },
  {
    name: "-court / /court",
    access: "Court staff",
    description: "Post start, end, statement, summon, evidence, or recess notices to active hearings.",
    usage: "-court start Hearing is now in session."
  },
  {
    name: "-commands / /commands",
    access: "Public",
    description: "Get the public command reference page for Wilford bot operations.",
    usage: "-commands"
  },
  {
    name: "/help-economy, /help-market, /help-inventory, /help-stocks, /help-citizen, /help-mss",
    access: "Public",
    description: "Beginner help menus with simple next steps for economy, market, inventory, stocks, citizen services, and MSS alerts.",
    usage: "/help-economy"
  },
  {
    name: "-userinfo / /userinfo",
    access: "Staff",
    description: "Show a quick profile for a mentioned member.",
    usage: "-userinfo @user"
  },
  {
    name: "/balance, /pay, /transactions, /daily",
    access: "Citizens",
    description: "Use the Panem Credit wallet for balances, payments, ledger history, daily stipends, and streak rewards.",
    usage: "/pay @user 50"
  },
  {
    name: "/work, /overtime, /crime, /rob, /gamble, /lottery, /invest",
    access: "Citizens",
    description: "Earn, risk, wager, and invest Panem Credits through the gamified state economy.",
    usage: "/work job:Power Plant Shift"
  },
  {
    name: "/inventory, /fish, /mine, /farm, /scavenge, /log, /extract, /inspect, /lootbox, /crate",
    access: "Citizens",
    description: "Gather resources, discover rare items, inspect values, open crates, and manage inventory.",
    usage: "/inventory"
  },
  {
    name: "/stocks, /stock, /buy-stock, /sell-stock, /portfolio, /watchlist, /market-news, /dividends",
    access: "Citizens",
    description: "Trade fictional PSE shares, follow stock news, track dividends, and manage stock watchlists.",
    usage: "/stock LBE"
  },
  {
    name: "/tax, /market, /prices, /buy, /sell, /list, /portfolio, /viewholdings, /market-alerts, /district, /leaderboard",
    access: "Citizens",
    description: "Review taxes, trade district goods, check production, manage holdings, and view Panem Credit rankings.",
    usage: "/buy grain-sack 2"
  },
  {
    name: "/grant, /issue-grant, /fine, /freeze-wallet, /unfreeze-wallet, /wanted, /clear, /trigger-event, /set-tax, /run-tax, /economy-report",
    access: "Economy admins",
    description: "Ministry and MSS command set for grants, fines, freezes, warrants, events, rates, taxation, and reports.",
    usage: "/economy-report"
  },
  {
    name: "/market-event, /set-stock-price, /suspend-stock, /issue-dividend, /stock-report",
    access: "Economy admins",
    description: "Administer the Panem Stock Exchange with events, price controls, suspensions, dividends, and reports.",
    usage: "/stock-report"
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
