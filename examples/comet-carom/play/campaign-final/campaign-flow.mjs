import { createGame, enterStage } from "./combat.mjs";

export function createRun(campaign) {
  let game = enterStage(createGame(), campaign.stage.id);
  let checkpoint = structuredClone(game);
  return {
    get game() {
      return game;
    },
    settle() {
      if (campaign.phase !== "playing") return false;
      if (game.phase === "won") return campaign.finishStage();
      if (game.phase === "lost") return campaign.failStage();
      return false;
    },
    advance() {
      if (!campaign.advance()) return false;
      game = enterStage(game, campaign.stage.id);
      checkpoint = structuredClone(game);
      return true;
    },
    retry() {
      if (!campaign.retry()) return false;
      game = structuredClone(checkpoint);
      return true;
    },
    restart() {
      if (!campaign.restart()) return false;
      game = enterStage(createGame(), campaign.stage.id);
      checkpoint = structuredClone(game);
      return true;
    },
  };
}
