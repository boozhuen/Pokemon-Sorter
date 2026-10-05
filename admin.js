import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const teamCountInput = document.getElementById("teamCount");
const saveTeamCountBtn = document.getElementById("saveTeamCount");
const rebalanceBtn = document.getElementById("rebalance");
const adminStatus = document.getElementById("adminStatus");
const participantCount = document.getElementById("participantCount");
const participantTableBody = document.getElementById("participantTableBody");
const teamOverview = document.getElementById("teamOverview");

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

let currentParticipants = [];

function teamName(index) {
  return `Team ${index + 1} — ${POKEMON_TEAM_NAMES[index % POKEMON_TEAM_NAMES.length]}`;
}

async function loadTeamCount() {
  const ref = doc(db, "config", "settings");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    teamCountInput.value = snap.data().teamCount || 10;
  }
}

function departmentPenalty(team, department) {
  return team.members.filter(
    p => (p.department || "").toLowerCase() === department.toLowerCase()
  ).length;
}

function placePeople(people, teams) {
  for (const person of people) {
    const candidates = [...teams].sort((a, b) => {
      const sizeDiff = a.members.length - b.members.length;
      if (sizeDiff !== 0) return sizeDiff;

      const aSameGroup = a.members.filter(x => x.group === person.group).length;
      const bSameGroup = b.members.filter(x => x.group === person.group).length;
      if (aSameGroup !== bSameGroup) return aSameGroup - bSameGroup;

      const deptDiff =
        departmentPenalty(a, person.department) -
        departmentPenalty(b, person.department);
      if (deptDiff !== 0) return deptDiff;

      return Math.random() - 0.5;
    });

    candidates[0].members.push(person);
  }
}

function rebalanceParticipants(participants, teamCount) {
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    index: i,
    name: teamName(i),
    members: []
  }));

  // Shuffle within each group so departments are not always handled in the same order.
  const policy = participants
    .filter(p => p.group === "Policy")
    .sort(() => Math.random() - 0.5);

  const planning = participants
    .filter(p => p.group === "Planning")
    .sort(() => Math.random() - 0.5);

  // Alternate which side gets placed first to reduce bias.
  const first = Math.random() < 0.5 ? policy : planning;
  const second = first === policy ? planning : policy;

  placePeople(first, teams);
  placePeople(second, teams);

  return teams;
}

function renderParticipants(participants) {
  participantCount.textContent =
    `${participants.length} participant${participants.length === 1 ? "" : "s"}`;

  participantTableBody.innerHTML = participants
    .slice()
    .sort((a, b) => (a.teamIndex ?? 999) - (b.teamIndex ?? 999) || a.name.localeCompare(b.name))
    .map(p => `
      <tr>
        <td>${escapeHtml(p.name || "")}</td>
        <td>${escapeHtml(p.group || "")}</td>
        <td>${escapeHtml(p.department || "")}</td>
        <td>${escapeHtml(p.teamName || "Unassigned")}</td>
      </tr>
    `)
    .join("");

  const teamCount = Number(teamCountInput.value || 10);
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    index: i,
    name: teamName(i),
    members: participants.filter(p => p.teamIndex === i)
  }));

  teamOverview.innerHTML = teams.map(team => {
    const policy = team.members.filter(p => p.group === "Policy").length;
    const planning = team.members.filter(p => p.group === "Planning").length;

    return `
      <article class="team-tile">
        <h3>${escapeHtml(team.name)}</h3>
        <p class="team-meta">
          ${team.members.length} total • ${policy} Policy • ${planning} Planning
        </p>
        <p>${team.members.map(m => escapeHtml(m.name)).join(", ") || "No members yet"}</p>
      </article>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

saveTeamCountBtn.addEventListener("click", async () => {
  const count = Number(teamCountInput.value);
  if (!Number.isInteger(count) || count < 2 || count > 30) {
    adminStatus.textContent = "Please choose between 2 and 30 teams.";
    return;
  }

  await setDoc(doc(db, "config", "settings"), { teamCount: count }, { merge: true });
  adminStatus.textContent = `Saved: ${count} teams. Click “Rebalance Everyone” to reshuffle existing participants.`;
  renderParticipants(currentParticipants);
});

rebalanceBtn.addEventListener("click", async () => {
  const teamCount = Number(teamCountInput.value);

  if (!Number.isInteger(teamCount) || teamCount < 2 || teamCount > 30) {
    adminStatus.textContent = "Please choose between 2 and 30 teams.";
    return;
  }

  adminStatus.textContent = "Rebalancing teams...";

  const teams = rebalanceParticipants(currentParticipants, teamCount);
  const batch = writeBatch(db);

  for (const team of teams) {
    for (const person of team.members) {
      batch.update(doc(db, "participants", person.id), {
        teamIndex: team.index,
        teamName: team.name
      });
    }
  }

  await batch.commit();
  adminStatus.textContent = "Everyone has been rebalanced.";
});

onSnapshot(collection(db, "participants"), snapshot => {
  currentParticipants = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderParticipants(currentParticipants);
});

await loadTeamCount();
