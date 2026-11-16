import { useEffect, useRef } from "react";
import { alertPlayer } from "./alerts";
import { franchise, State } from "./engine";
import { formatMoney } from "./money";
import { getPlayer } from "./players";
import { getStars } from "./stars";

/** Watches an arena and raises a phone notification for each moment the player would not want to miss. */
export function useAuctionAlerts(state: State | null, myId: string, isHost: boolean) {
  const prev = useRef<State | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = state;
    if (!state || !before) return;
    const team = (id: string | null | undefined) => state.teams.find((t) => t.id === id);
    const teamName = (id: string | null | undefined) => { const t = team(id); return t ? franchise(t.fr)?.name ?? t.name : "A rival"; };

    if (isHost && state.phase === "lobby" && state.teams.length > before.teams.length) {
      const joined = state.teams[state.teams.length - 1];
      if (joined && !joined.isBot && joined.id !== myId) alertPlayer("A player joined your arena", `${joined.owner} is in as ${teamName(joined.id)} — ${state.teams.length} teams now.`);
    }
    if (before.phase === "lobby" && state.phase === "retention") alertPlayer("Retentions are open", "Choose the players you want to keep — you have 60 seconds.");
    if (before.phase !== "auction" && state.phase === "auction") alertPlayer("The auction has started", "The first player is on the block. Come and bid!");
    if (before.phase !== "done" && state.phase === "done") alertPlayer("The auction is over", "See the final table and every team's squad.");

    const lot = state.lot, was = before.lot;
    if (state.phase !== "auction" || !lot) return;
    const p = getPlayer(lot.pid);
    if (!was || was.pid !== lot.pid) {
      if (getStars().has(lot.pid)) alertPlayer(`★ ${p.name} is up now`, `On your shortlist — base price ${formatMoney(p.base)}.`);
      return;
    }
    if (was.bidder === myId && lot.bidder !== myId && lot.status === "open") alertPlayer(`Outbid on ${p.name}`, `${teamName(lot.bidder)} went to ${formatMoney(lot.bid)}.`);
    if (was.status !== "rtm" && lot.status === "rtm" && lot.rtmTeam === myId) alertPlayer("Right to Match — your call", `Match ${formatMoney(lot.bid)} to take ${p.name} back?`);
    if (was.status !== "sold" && lot.status === "sold" && lot.bidder === myId) alertPlayer(`You got ${p.name}!`, `Bought for ${formatMoney(lot.bid)}.`);
  }, [state, myId, isHost]);
}
