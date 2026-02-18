# TODOs.md

List of miscellaneous TODOs for the project.

## Backlog

### General

- DEFER: Allow actual assets to be used for icons and logos, instead of preset ones. This would require s3 or r2 to be set up.
- DEFER: Investigate ways to clean up/condense/remove the "Teams" section in leagues.
- DEFER: Investigate ways to clean up/condense/remove the "Reporting" section in leagues.
- DEFER: Events server, events db, events validators, etc, should be broken up and not just in 1 file. Events service alreadt does this, but the other layers, like validators and db, need to be updated.

### Events

- DEFER: Event scoring for best scores should factor in a participant having multiple submissions. For example, if a person has the top 2, they only get awarded points for first, and then 3rd gets points for their placement in 2nd, and so on. This obviously applies to both participant types of individuals and teams. OR, is this no longer needed now that we'd be limiting the amonut of submissions that are valid for scoring?

### Tournaments

- DEFER: In general, we could use a better UI for the bracket view. Its satisfactory for now, but could be improved. Need to think about this more.
- DEFER: We can remove tournament icons entirely, they don't add much to the app in my opinion. Let's clea up any icon related code for tournaments. This applies to both events and leagues.
- DEFER: Allow for an optional 3rd place match/set of matches. Set up at tournament configuration. This is actually not needed in the short term so we can defer this. Rounds with multiple numbers of games is needed short term.

#### Game Types

- DEFER: We have renamed the concept of "high score" game type to "best score" in the UI. In the backend, codebase, and database, we need to rename. Let's plan out and execute that process.
- DEFER: Need to investigate storage options for game type configuration. The JSON is a bit hard to manage as we keep adjusting it.
- DEFER: There should be some visibility of game type settings and rules for normal members of leagues and events so that they know how to play. Need to think more about how to incorporate this into the app.
- DEFER: Technically, score label should be able to be adjusted on a game type even after being created, there is no harm in changing that. Very low priority though, so this can be deferred.
- DEFER: The ability to duplicate a game type, in both leageus and events, would be a nice and neat little feature.

#### Best Scores

- DEFER: Small tech debt, but "name" field for best score sessions should be required in the database schema. as well, not just on the form for creating one.
- DEFER: Best score matches could be configurable such that you can say only allow X submissions per user. This applies to both events and leagues.

#### Leagues

- DEFER: We may not actually need a home page for leagues. Want to think through what is hear and what is needed.

### UI/Asthetic

-

### Non Functional

- DEFER: Validate existing code quality for consistency, security issues, avoiding duplication, following standards in CLAUDE.md inconsistent business logic with what is in product vision doc, and unused code.
- DEFER: At some point reduce duplicated business logic, database schema, ui components that are shared between League and Events to enforce better consistency.
- DEFER: Perform analysis on existing service and db functions and evaluate areas for improvement in terms of performance.

## In progress

## Needs testing

- Should do a general testing of RBAC for events to make sure they match my expectations.

## Completed

Nothing goes here. Once testing is complete, we just delete the item.
