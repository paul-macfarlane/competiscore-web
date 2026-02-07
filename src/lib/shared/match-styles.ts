import { MatchResult } from "@/lib/shared/constants";

export function getResultBadgeClasses(result: string): string {
  switch (result) {
    case MatchResult.WIN:
      return "bg-win-bg text-win border-win/20";
    case MatchResult.LOSS:
      return "bg-loss-bg text-loss border-loss/20";
    case MatchResult.DRAW:
      return "bg-draw-bg text-draw border-draw/20";
    default:
      return "";
  }
}
