# TODOs.md

List of miscellaneous TODOs for the project.

## Backlog

### Project Management

- Develop a "ways of working" document for Claude/other ai agents to use when working on things. In general make the project more ai friendly to navigate.

### Long Term Features

- Allow actual assets to be used for icons and logos, instead of preset ones. This would require s3 or r2 to be set up.

### Large Tech Debt

- Validate existing code quality for consistency, security issues, avoiding duplication, following standards in CLAUDE.md inconsistent business logic with what is in product vision doc, and unused code.
- At some point reduce duplicated business logic, database schema, ui components that are shared between League and Events to enforce better consistency.
- Perform analysis on existing service and db functions and evaluate areas for improvement in terms of performance.

### Feature Cleanup

- Remove the "Teams" feature in leagues. It doesn't have any known/desired uses. Remove it from product-vison as well.
- Remove the "Reporting" feature in leagues. Remove it from product-vison as well.
- We can remove tournament icons entirely, they don't add much to the app in my opinion. Let's clean up any icon related code for tournaments. This applies to both events and leagues.

### Small Feature Improvements

- The ability to add "notes" to matches, high scores, and tournaments. Could be a nice touch
- Event scoring for best scores should factor in a participant/pairing/team having multiple submissions. For example, if a person has the top 2, they only get awarded points for first, and then 3rd gets points for their placement in 2nd, and so on. This obviously applies to both participant types of individuals and teams.
- Allow for an optional 3rd place match/set of matches. Set up at tournament configuration. This is actually not needed in the short term so we can defer this. Rounds with multiple numbers of games is needed short term.
- There should be some visibility of game type settings and rules for normal members of leagues and events so that they know how to play. I think we can let them SEE the game types and their details, just not edit. We should also have the game type names LINK to the relevent details page to people can jump from matches to game type. This applies to events. Will defer rethinking this for Leagues.
- Score label should be able to be adjusted on a game type even after being created, there is no harm in changing that.
- For H2H and Free for all game types we should display the score labels on the settings page for that game type. This applies to both leagues and events
- Best score matches could be configurable such that you can say only allow X submissions per user. This applies to both events and leagues.

### Small Tech Debt

- Events server, events db, events validators, etc, should be broken up and not just in 1 file. Events service alreadt does this, but the other layers, like validators and db, need to be updated.
- We have renamed the concept of "high score" game type to "best score" in the UI. In the backend, codebase, and database, we need to rename. Let's plan out and execute that process.
- The "name" field for best score sessions should be required in the database schema. as well, not just on the form for creating one.
-

### Need Evaluation

- A user guide on the app itself inside of the app.
- Need to investigate storage options for game type configuration. The JSON is a bit hard to manage as we keep adjusting it.
- We may not actually need a home page for leagues. Want to think through what is hear and what is needed.

## In Progress

-

## Needs Testing

-

## Completed

Nothing goes here. Once testing is complete, we just delete the item.
