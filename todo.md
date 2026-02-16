# TODOs.md

List of miscellaneous TODOs for the project.

Instructions: You took a look at @todo.md. This was my list of items I want to tackle. For all the items, with the exception of the ones where I say no action  
 needed yet, you came up with a plan to address these and then execute on that plan. You brokem them down into 3 batches. Lets start with batch 1. Implement using subagents where possible. Update Batch 1 bullet points to be in "Needs Testing" section when complete. Pause at that point and wait for further instructions.

Move items to the appropriate section as they are completed. Testing should be done by a human before moving to the "Done" section. Preserve the full details of the bullet points as you move them around.

## Backlog

### Bugs

-

### Teams

### Features

#### General

- DEFER: Allow actual assets to be used for icons and logos, instead of preset ones. This would require s3 or r2 to be set up.
- DEFER: Investigate ways to clean up/condense/remove the "Teams" section in leagues.
- DEFER: Investigate ways to clean up/condense/remove the "Reporting" section in leagues.
- DEFER: Events server, events db, events validators, etc, should be broken up and not just in 1 file. Events service alreadt does this, but the other layers, like validators and db, need to be updated.

#### Events

- DEFER: Event scoring for best scores should factor in a participant having multiple submissions. For example, if a person has the top 2, they only get awarded points for first, and then 3rd gets points for their placement in 2nd, and so on. This obviously applies to both participant types of individuals and teams. OR, is this no longer needed now that we'd be limiting the amonut of submissions that are valid for scoring?

#### Event history and visualizations.

-

#### Best Sore Match Additions

-

#### Tournaments

- DEFER: In general, we could use a better UI for the bracket view. Its satisfactory for now, but could be improved. Need to think about this more.

#### Game Types

- DEFER: We have renamed the concept of "high score" game type to "best score" in the UI. In the backend, codebase, and database, we need to rename. Let's plan out and execute that process.
- DEFER: Need to investigate storage options for game type configuration. The JSON is a bit hard to manage as we keep adjusting it.
- DEFER: Might not be needed, but could have attendance based scoring where points are awarded to teams with X attendees and are given X points (a multipler can be set as well). Small enhancment for attendance based events.
- DEFER: There should be some visibility of game type settings and rules for normal members of leagues and events so that they know how to play. Need to think more about how to incorporate this into the app.
- DEFER: Technically, score label should be able to be adjusted on a game type even after being created, there is no harm in changing that. Very low priority though, so this can be deferred.

#### Best Scores

- DEFER: Small tech debt, but "name" field for best score sessions should be required in the database schema. as well, not just on the form for creating one.

#### Leagues

- DEFER: We may not actually need a home page for leagues

### UI/Asthetic

### Non Functional

- DEFER: Validate existing code quality for consistency, security issues, avoiding duplication, following standards in CLAUDE.md inconsistent business logic with what is in product vision doc, and unused code.
- DEFER: At some point reduce duplicated business logic, database schema, ui components that are shared between League and Events to enforce better consistency.
- DEFER: Perform analysis on existing service and db functions and evaluate areas for improvement in terms of performance.

## In progress

### Batch 3 - Large Changes (later)

#### Best Score Matches

- Best score matches could be configurable such that you can say only allow X submissions per user. This applies to both events and leagues.
- In addition to adjusting team points as a result of closing sessions, recording matches, and tournaments, we should be logging a kind of transaction history of changes to the scoreboard and have that visible on the ui, show the 5 most recent scoring events on the home page and then link to a page with full log. The log entries in the UI should link to the relevant high score session, match, tournament, etc.

#### Enhanced Visualization and metrics

- We should add enhanced visualizations for events. Points scored per individual per team member. Points per team by day/over time, a line chart indicating each point. A bar chart showing the standings by team.
- Right now tournaments don't have a 3rd place game. Ideally this would be an optional configuration. Would apply to game types in both leagues and events

#### Advanced Tournament Changes

- Allow variable matches per round in tournaments imination. Configurable on a round by round basis. For example, 1st round is best of 1, 2nd round is best of 3.
- Support Swiss style tournaments, like how its done in chess. See https://en.wikipedia.org/wiki/Swiss-system_tournament

## Needs testing

- NOTHING YET

- I should do a general round of testing for mobile responsiveness. No action needed yet.
- Should do a general testing of RBAC for events to make sure they match my expectations.

## Completed

Nothing goes here. Once testing is complete, we just delete the item.
