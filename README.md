# JuanWise 👋

An [Expo](https://expo.dev) app, backed by the JuanWise API (`juanwise-be`).

## Backend

The app talks to the deployed API at `https://juanwise-be.vercel.app`. Swagger for every endpoint is
at [`/api/docs`](https://juanwise-be.vercel.app/api/docs).

Point it somewhere else — a local `npm run dev`, or a Vercel preview — with either:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npx expo start
```

or by editing `expo.extra.apiUrl` in [app.json](app.json). On a physical device `localhost` is the
phone, not your laptop, so use the LAN address.

### How the app uses it

| Layer | What it does |
|---|---|
| [`src/shared/api`](src/shared/api) | Typed client — session storage with token refresh, one module per API area, an offline cache and a result outbox |
| `UserProvider` | `auth` + `users` — Firebase Auth session; the app never stores a password |
| `ClassProvider` | `classes` — class code, roster and assignment, so joining works across devices |
| `GameProgressProvider` | `progress` — unlock state, with the unlock rule owned by the server |
| `StudentResultsProvider` | `results` — attempts, scored server-side; the screens still compute their own leaderboard/trend views over them |
| `AdminContentProvider` | `content` + `media` — admin question/category edits reach every student |

Two behaviours worth knowing:

- **Points and medals come from the API.** `POST /results` derives them from what the client
  reports (correct count, time used, whether the clock ran out), so the score shown after an
  activity always matches the leaderboard.
- **Bundled content is the fallback, not the source.** A question or category picture is taken from
  the server only when an admin has actually authored it (`isOverride: true`); otherwise the app's
  own `quiz-content.ts` / `category-content.ts` is used. Seed the backend from those files and the
  fallback stops being reached.

An attempt finished while offline is queued in the outbox and replayed on the next successful
request, so a student never loses points to a dropped connection.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
