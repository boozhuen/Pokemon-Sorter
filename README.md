# Pokémon Team Sorter

A simple two-page team allocation website that can be hosted on GitHub Pages.

## What it does

### Participant page
`index.html`

Participants enter:
- Name
- Group: Policy or Planning
- Department: RPL, TPA, etc.

They immediately receive a Pokémon-themed team assignment.

### Admin page
`admin.html`

The organiser can:
- Change the number of teams at any time
- See all participants live
- See each team's Policy / Planning split
- Rebalance everyone after changing the number of teams

The sorting tries to:
1. Keep team sizes even
2. Keep Policy / Planning roughly balanced
3. Spread people from the same department across teams

---

# SETUP

## 1. Create Firebase project

Go to:

https://console.firebase.google.com/

Create a new project.

You do NOT need Firebase Hosting because the website will be hosted on GitHub Pages.

## 2. Create Firestore database

Inside Firebase:

Build → Firestore Database → Create database

For an internal event, you can start in Production Mode and then paste the included rules.

## 3. Add a Firebase Web App

Project Settings → Your Apps → Web

Firebase will show something like:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Copy those values into:

`firebase-config.js`

## 4. Add Firestore rules

Firebase → Firestore Database → Rules

Replace the rules there with the contents of:

`firestore.rules`

Then click Publish.

IMPORTANT:
The included rules are deliberately simple for an internal welfare event.
Anyone who has access to the site can technically read/write the data.

If you want, you can later add proper admin authentication.

## 5. Upload to GitHub

Create a GitHub repository.

Upload all files in this folder.

Example structure:

```text
index.html
admin.html
styles.css
participant.js
admin.js
firebase-config.js
firestore.rules
README.md
```

## 6. Enable GitHub Pages

GitHub repository:

Settings → Pages

Under "Build and deployment":

Source:
Deploy from a branch

Branch:
main

Folder:
/

Save.

GitHub will provide a URL such as:

https://YOURUSERNAME.github.io/pokemon-team-sorter/

Participant page:

https://YOURUSERNAME.github.io/pokemon-team-sorter/

Admin page:

https://YOURUSERNAME.github.io/pokemon-team-sorter/admin.html

## Important admin note

The current admin page does NOT have a password.

Do not publicly advertise the admin URL.

For a stronger setup, add Firebase Authentication before using this for sensitive or public-facing events.

## Changing Pokémon team names

Open:

`participant.js`
and
`admin.js`

Edit the `POKEMON_TEAM_NAMES` list.

The first ten are currently:

1. Pikachu
2. Charmander
3. Squirtle
4. Bulbasaur
5. Eevee
6. Snorlax
7. Jigglypuff
8. Gengar
9. Dragonite
10. Lucario

## Notes on balancing

A perfect 50/50 Policy / Planning split is only mathematically possible when the participant counts allow it.

For example, if there are:
- 57 Policy
- 23 Planning

then every team obviously cannot be exactly half-and-half.

The sorter therefore aims for the closest practical balance.
