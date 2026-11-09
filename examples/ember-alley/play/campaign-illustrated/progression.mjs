import { createGame, begin } from "./combat.mjs";

export function createSession(campaign) {
  let game = createGame({ dungeon: campaign.index });
  let entry = structuredClone(game);
  const enter = () => {
    begin(game);
    return true;
  };
  return {
    get game() {
      return game;
    },
    start() {
      if (campaign.phase !== "playing" || game.phase !== "ready") return false;
      return enter();
    },
    finish() {
      return (
        game.phase === "clear" &&
        campaign.phase === "playing" &&
        campaign.finishStage()
      );
    },
    fail() {
      return (
        game.phase === "dead" &&
        campaign.phase === "playing" &&
        campaign.failStage()
      );
    },
    advance() {
      if (
        game.phase !== "clear" ||
        campaign.phase !== "between" ||
        !campaign.advance()
      )
        return false;
      game = createGame({ dungeon: campaign.index, progress: game });
      entry = structuredClone(game);
      return enter();
    },
    retry() {
      if (game.phase !== "dead" || !campaign.retry()) return false;
      game = structuredClone(entry);
      return enter();
    },
    restart() {
      campaign.restart();
      game = createGame({ dungeon: campaign.index });
      entry = structuredClone(game);
      return enter();
    },
  };
}
