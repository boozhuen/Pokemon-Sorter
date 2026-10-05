import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById("participantForm");
const statusEl = document.getElementById("status");
const resultCard = document.getElementById("resultCard");
const teamNameEl = document.getElementById("teamName");
const teamDetailsEl = document.getElementById("teamDetails");

const POKEMON_TEAM_NAMES = [
  "Pikachu",
  "Charmander",
  "Squirtle",
  "Bulbasaur",
  "Eevee",
  "Snorlax",
  "Jigglypuff",
  "Gengar",
  "Dragonite",
  "Lucario",
  "Psyduck",
  "Meowth",
  "Togepi",
  "Vulpix",
  "Lapras",
  "Mimikyu",
  "Rowlet",
  "Cyndaquil",
  "Mudkip",
  "Piplup",
  "Riolu",
  "Scorbunny",
  "Sprigatito",
  "Fuecoco",
  "Quaxly",
  "Sylveon",
  "Umbreon",
  "Espeon",
  "Glaceon",
  "Leafeon"
];

function normalise(value) {
  return value.trim().replace(/\s+/g, " ");
}

async function getTeamCount() {
  const configRef = doc(db, "config", "settings");
  const snap = await getDoc(configRef);
  return snap.exists() ? Number(snap.data().teamCount || 10) : 10;
}

async function getParticipants() {
  const snap = await getDocs(collection(db, "participants"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function teamScore(team, incoming) {
  const targetGroup = incoming.group;
  const oppositeGroup = targetGroup === "Policy" ? "Planning" : "Policy";

  const groupCount = team.members.filter(m => m.group === targetGroup).length;
  const oppositeCount = team.members.filter(m => m.group === oppositeGroup).length;
  const sameDept = team.members.filter(
    m => (m.department || "").toLowerCase() === incoming.department.toLowerCase()
  ).length;

  // Lower score = better.
  // Strongly prefer fewer members overall.
  // Then prefer balancing Policy/Planning.
  // Then avoid putting too many people from the same department together.
  return (
    team.members.length * 100 +
    Math.max(0, groupCount - oppositeCount) * 30 +
    sameDept * 10 +
    Math.random()
  );
}

function chooseTeam(participants, teamCount, incoming) {
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    index: i,
    name: `Team ${i + 1} — ${POKEMON_TEAM_NAMES[i % POKEMON_TEAM_NAMES.length]}`,
    members: []
  }));

  for (const person of participants) {
    const index = Number.isInteger(person.teamIndex) ? person.teamIndex : null;
    if (index !== null && teams[index]) {
      teams[index].members.push(person);
    }
  }

  teams.sort((a, b) => teamScore(a, incoming) - teamScore(b, incoming));
  return teams[0];
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "Assigning your Pokémon team...";
  resultCard.classList.add("hidden");

  try {
    const participant = {
      name: normalise(document.getElementById("name").value),
      group: document.getElementById("group").value,
      department: normalise(document.getElementById("department").value)
    };

    if (!participant.name || !participant.group || !participant.department) {
      throw new Error("Please complete all fields.");
    }

    // Simple duplicate check by exact normalised name.
    const duplicateQuery = query(
      collection(db, "participants"),
      where("nameLower", "==", participant.name.toLowerCase())
    );
    const duplicateSnap = await getDocs(duplicateQuery);

    if (!duplicateSnap.empty) {
      const existing = duplicateSnap.docs[0].data();
      teamNameEl.textContent = existing.teamName || "Already assigned";
      teamDetailsEl.textContent =
        `${existing.name} • ${existing.group} • ${existing.department}`;
      resultCard.classList.remove("hidden");
      statusEl.textContent = "You were already registered, so I found your existing team.";
      return;
    }

    const teamCount = await getTeamCount();
    const participants = await getParticipants();
    const chosen = chooseTeam(participants, teamCount, participant);

    const record = {
      ...participant,
      nameLower: participant.name.toLowerCase(),
      teamIndex: chosen.index,
      teamName: chosen.name,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "participants"), record);

    teamNameEl.textContent = chosen.name;
    teamDetailsEl.textContent =
      `${participant.name} • ${participant.group} • ${participant.department}`;
    resultCard.classList.remove("hidden");
    statusEl.textContent = "Assignment complete!";
    form.reset();
  } catch (error) {
    console.error(error);
    statusEl.textContent =
      error?.message || "Something went wrong. Please try again.";
  }
});
