# Competiscore Web

Competiscore is the best way to keep score of all the different games you play with your friends. Whether it’s Ping Pong, Pool, Pacman, Poker, or any other competition, Competiscore lets you track records, calculate rankings, run tournaments, and build friendly rivalries within your community.

See [docs/product-vision.md](docs/product-vision.md) for more details.

## Codebase Standards

See the [.cursor/rules](.cursor/rules) directory for the codebase standards. While these are meant for agents to read, they are also meant to be used as a guide for the developer to follow.

Right now the repo just uses 1 big rule file, but as the codebase grows, it may be split into multiple files.

## Running Locally

### Prerequisites

- [Turso CLI](https://turso.tech/docs/cli/install)
- [Node.js](https://nodejs.org/en/download/)
- [pnpm](https://pnpm.io/installation)

### Running the Application

First, copy the `.env.example` file to `.env` and fill in the values:

```bash
cp .env.example .env
```

Then, install the dependencies:

```bash
pnpm install
```

On your first run, you'll want to execute the database migrations to populate the database with the initial schema:

```bash
pnpm run db:migrate
```

Then, run the database and leave it running in the background:

```bash
pnpm run db:local
```

Then, in another terminal, run the application:

```bash
pnpm run dev
```
