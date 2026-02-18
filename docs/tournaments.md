# Tournament improvements

I am looking to implement the following improvement to tournaments, for both events and leagues.

## 1/2 COMPLETED the other half DEFERRED: 1st priority: Traditional Bracket Style Improvements

For traditional bracket elimination tournaments, I'd like to

1. DONE: ~Allow for rounds to have a different number of games. For example, the first round is best of 1, 2nd round best of 3, etc.~
2. DEFERRED: Allow for an optional 3rd place match/set of matches. Set up at tournament configuration. This is actually not needed in the short term so we can defer this. Rounds with multiple numbers of games is needed short term.

In both cases, these settings can be tweaked until the tournament starts.

## DONE: 2nd priority: Support for game types where individuals on teams

Right now when I create a tournment for a game type that requires teams of 2 instead of 1 on 1, the UI and backend still only generate a bracket where people are on teams of 1/competing individually.

Ultimately what I'm trying to support is the ability for partners to compete against other partners. Right now the only known use case is 2v2, but theoretically in the future we could support any arbitrary number of people vs any arbitrary number of people.

In a team event, we'd want to make sure only people on the same event team can be on the same tournment team.

## NOT STARTED: 3rd priority: Support for Swiss Style Tournament

Support for Swiss Style Tournaments, like there are in chess. See https://en.wikipedia.org/wiki/Swiss-system_tournament. In the immediate future, we want to support something that is non-elemination swiss system. Start with first alphabetically and then by points.

This is a complicated enough implementation where it should be deferred until its the last war week feature remaining.
