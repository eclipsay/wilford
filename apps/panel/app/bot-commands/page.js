import { PanelShell } from "../../components/PanelShell";
import { requireAuth } from "../../lib/auth";
import {
  publicBotCommands,
  staffApplicationCommands
} from "@wilford/shared";

export default async function BotCommandsPage() {
  await requireAuth();

  return (
    <PanelShell
      title="Bot Commands"
      description="First-pass Discord moderation commands now tracked inside the Wilford panel."
    >
      <section className="panel-card panel-card--wide">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Moderation Suite</p>
            <h2>Current Command Set</h2>
          </div>
        </div>
        <p>
          These commands are the initial moderation rollout for the Discord bot.
          Slash commands register on startup, and matching `-` prefix commands
          stay available for staff who prefer typed moderation shortcuts.
        </p>
        <div className="command-grid">
          {publicBotCommands.map((command) => (
            <article className="command-card" key={command.name}>
              <div className="command-card__header">
                <strong>{command.name}</strong>
                <span className="status-badge">{command.access}</span>
              </div>
              <p>{command.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Next Up</p>
              <h2>Panel Integration</h2>
            </div>
          </div>
          <p>
            Review staff can answer applicants from inside the generated thread
            with `-r`, `-accept`, and `-deny`.
          </p>
          <div className="simple-list">
            {staffApplicationCommands.map((command) => (
              <article className="simple-list__item" key={command.name}>
                <strong>{command.name}</strong>
                <p>{command.description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Deployment Note</p>
              <h2>Registration</h2>
            </div>
          </div>
          <p>
            Slash commands sync when the bot starts. After a bot restart, expect
            the `/` command list to refresh automatically while the `-` prefix
            commands remain available immediately.
          </p>
        </article>
      </section>
    </PanelShell>
  );
}
