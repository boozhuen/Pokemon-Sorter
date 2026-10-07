import { firebaseConfig }
from "./firebase-config.js";


import {
  initializeApp
}
from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";


import {

  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch

}
from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";


// ======================================================
// FIREBASE
// ======================================================

const app =
  initializeApp(firebaseConfig);

const db =
  getFirestore(app);


// ======================================================
// PAGE ELEMENTS
// ======================================================

const teamCountInput =
  document.getElementById(
    "teamCount"
  );


const saveTeamCountBtn =
  document.getElementById(
    "saveTeamCount"
  );


const rebalanceBtn =
  document.getElementById(
    "rebalance"
  );


const clearAllBtn =
  document.getElementById(
    "clearAllParticipants"
  );


const adminStatus =
  document.getElementById(
    "adminStatus"
  );


const participantCount =
  document.getElementById(
    "participantCount"
  );


const participantTableBody =
  document.getElementById(
    "participantTableBody"
  );


const teamOverview =
  document.getElementById(
    "teamOverview"
  );


// ======================================================
// POKÉMON TEAM NAMES
//
// You can change these names whenever you want.
// ======================================================

const POKEMON_TEAM_NAMES = [

  "Ash Ketchum",
  "Misty",
  "Brock",
  "Gary Oak",
  "Professor Oak",
  "Jessie",
  "James",
  "Nemona",
  "Arven",
  "Leaf",

  "May",
  "Brendan",
  "Dawn",
  "Lucas",
  "Cynthia",
  "Serena",
  "Calem",
  "Hilbert",
  "Hilda",
  "N",

  "Rosa",
  "Nate",
  "Lillie",
  "Gladion",
  "Hau",
  "Gloria",
  "Victor",
  "Hop",
  "Leon",
  "Marnie"

];


// ======================================================
// CURRENT PARTICIPANTS
// ======================================================

let currentParticipants = [];


// ======================================================
// TEAM NAME
// ======================================================

function teamName(index) {

  const pokemon =
    POKEMON_TEAM_NAMES[
      index %
      POKEMON_TEAM_NAMES.length
    ];


  return (
    `Team ${index + 1} — ${pokemon}`
  );

}


// ======================================================
// LOAD TEAM COUNT
// ======================================================

async function loadTeamCount() {

  const ref =
    doc(
      db,
      "config",
      "settings"
    );


  const snap =
    await getDoc(ref);


  if (snap.exists()) {

    teamCountInput.value =
      snap.data().teamCount || 10;

  }

}


// ======================================================
// DEPARTMENT PENALTY
//
// Counts how many people from the same department
// are already in a particular team.
// ======================================================

function departmentPenalty(
  team,
  department
) {

  return team.members.filter(
    person =>
      (
        person.department || ""
      ).toLowerCase()
      ===
      department.toLowerCase()
  ).length;

}


// ======================================================
// PLACE PEOPLE INTO TEAMS
// ======================================================

function placePeople(
  people,
  teams
) {

  for (
    const person
    of people
  ) {

    const candidates =
      [...teams]
      .sort(
        (a, b) => {

          // ---------------------------------------------
          // PRIORITY 1:
          // Keep overall team sizes similar
          // ---------------------------------------------

          const sizeDiff =
            a.members.length
            -
            b.members.length;


          if (
            sizeDiff !== 0
          ) {

            return sizeDiff;

          }


          // ---------------------------------------------
          // PRIORITY 2:
          // Try to balance Policy / Planning
          // ---------------------------------------------

          const aSameGroup =
            a.members.filter(
              member =>
                member.group
                ===
                person.group
            ).length;


          const bSameGroup =
            b.members.filter(
              member =>
                member.group
                ===
                person.group
            ).length;


          if (
            aSameGroup
            !==
            bSameGroup
          ) {

            return (
              aSameGroup
              -
              bSameGroup
            );

          }


          // ---------------------------------------------
          // PRIORITY 3:
          // Spread departments
          // ---------------------------------------------

          const deptDiff =

            departmentPenalty(
              a,
              person.department
            )

            -

            departmentPenalty(
              b,
              person.department
            );


          if (
            deptDiff !== 0
          ) {

            return deptDiff;

          }


          // ---------------------------------------------
          // RANDOM TIE BREAK
          // ---------------------------------------------

          return (
            Math.random()
            -
            0.5
          );

        }
      );


    candidates[0]
      .members
      .push(person);

  }

}


// ======================================================
// REBALANCE ALGORITHM
// ======================================================

function rebalanceParticipants(
  participants,
  teamCount
) {

  // ---------------------------------------------
  // CREATE EMPTY TEAMS
  // ---------------------------------------------

  const teams =
    Array.from(
      {
        length:
          teamCount
      },

      (_, i) => ({

        index:
          i,

        name:
          teamName(i),

        members:
          []

      })

    );


  // ---------------------------------------------
  // SEPARATE POLICY AND PLANNING
  // ---------------------------------------------

  const policy =
    participants
    .filter(
      person =>
        person.group
        ===
        "Policy"
    )
    .sort(
      () =>
        Math.random()
        -
        0.5
    );


  const planning =
    participants
    .filter(
      person =>
        person.group
        ===
        "Planning"
    )
    .sort(
      () =>
        Math.random()
        -
        0.5
    );


  // ---------------------------------------------
  // RANDOMISE WHICH GROUP IS PLACED FIRST
  // ---------------------------------------------

  const first =
    Math.random()
    <
    0.5

    ?

    policy

    :

    planning;


  const second =
    first === policy

    ?

    planning

    :

    policy;


  // ---------------------------------------------
  // PLACE PARTICIPANTS
  // ---------------------------------------------

  placePeople(
    first,
    teams
  );


  placePeople(
    second,
    teams
  );


  return teams;

}


// ======================================================
// RENDER PARTICIPANTS
// ======================================================

function renderParticipants(
  participants
) {

  // ---------------------------------------------
  // PARTICIPANT COUNT
  // ---------------------------------------------

  participantCount.textContent =

    `${participants.length} participant${
      participants.length === 1
      ? ""
      : "s"
    }`;


  // ---------------------------------------------
  // PARTICIPANT TABLE
  // ---------------------------------------------

  participantTableBody.innerHTML =

    participants

    .slice()

    .sort(
      (a, b) => {

        const teamDifference =

          (
            a.teamIndex
            ??
            999
          )

          -

          (
            b.teamIndex
            ??
            999
          );


        if (
          teamDifference !== 0
        ) {

          return teamDifference;

        }


        return (
          (
            a.name
            ||
            ""
          )

          .localeCompare(
            b.name
            ||
            ""
          )
        );

      }
    )


    .map(
      person => `

        <tr>

          <td>

            ${escapeHtml(
              person.name
              ||
              ""
            )}

          </td>


          <td>

            ${escapeHtml(
              person.group
              ||
              ""
            )}

          </td>


          <td>

            ${escapeHtml(
              person.department
              ||
              ""
            )}

          </td>


          <td>

            ${escapeHtml(
              person.teamName
              ||
              "Unassigned"
            )}

          </td>


          <td>

            <button

              class="
                remove-participant-btn
              "

              data-id="
                ${person.id}
              "

              data-name="
                ${escapeHtml(
                  person.name
                  ||
                  ""
                )}
              "

            >

              Remove

            </button>

          </td>

        </tr>

      `
    )

    .join("");


  // ---------------------------------------------
  // ADD REMOVE BUTTON EVENTS
  // ---------------------------------------------

  document
    .querySelectorAll(
      ".remove-participant-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              button.dataset.id;


            const name =
              button.dataset.name;


            const confirmed =
              confirm(

                `Remove ${name} from the participant list?`

              );


            if (
              !confirmed
            ) {

              return;

            }


            try {

              await deleteDoc(

                doc(
                  db,
                  "participants",
                  id
                )

              );


              adminStatus.textContent =
                `${name} has been removed.`;

            }

            catch (
              error
            ) {

              console.error(
                error
              );


              adminStatus.textContent =
                "Could not remove participant.";

            }

          }
        );

      }
    );


  // ---------------------------------------------
  // RENDER TEAM OVERVIEW
  // ---------------------------------------------

  const teamCount =
    Number(
      teamCountInput.value
      ||
      10
    );


  const teams =
    Array.from(

      {
        length:
          teamCount
      },

      (_, i) => ({

        index:
          i,

        name:
          teamName(i),

        members:

          participants.filter(

            person =>
              person.teamIndex
              ===
              i

          )

      })

    );


  teamOverview.innerHTML =

    teams

    .map(
      team => {

        const policy =
          team.members.filter(
            person =>
              person.group
              ===
              "Policy"
          ).length;


        const planning =
          team.members.filter(
            person =>
              person.group
              ===
              "Planning"
          ).length;


        const memberNames =
          team.members
          .map(
            person =>
              escapeHtml(
                person.name
              )
          )
          .join(", ");


        return `

          <article
            class="team-tile"
          >

            <h3>

              ${escapeHtml(
                team.name
              )}

            </h3>


            <p
              class="team-meta"
            >

              ${team.members.length}
              total

              •

              ${policy}
              Policy

              •

              ${planning}
              Planning

            </p>


            <p>

              ${
                memberNames
                ||
                "No members yet"
              }

            </p>

          </article>

        `;

      }
    )

    .join("");

}


// ======================================================
// ESCAPE HTML
//
// Prevents names entered by participants from being
// interpreted as HTML.
// ======================================================

function escapeHtml(
  value
) {

  return String(
    value
  )

  .replaceAll(
    "&",
    "&amp;"
  )

  .replaceAll(
    "<",
    "&lt;"
  )

  .replaceAll(
    ">",
    "&gt;"
  )

  .replaceAll(
    '"',
    "&quot;"
  )

  .replaceAll(
    "'",
    "&#039;"
  );

}


// ======================================================
// SAVE TEAM COUNT
// ======================================================

saveTeamCountBtn.addEventListener(

  "click",

  async () => {

    const count =
      Number(
        teamCountInput.value
      );


    if (

      !Number.isInteger(
        count
      )

      ||

      count < 2

      ||

      count > 30

    ) {

      adminStatus.textContent =
        "Please choose between 2 and 30 teams.";

      return;

    }


    try {

      await setDoc(

        doc(
          db,
          "config",
          "settings"
        ),

        {

          teamCount:
            count

        },

        {

          merge:
            true

        }

      );


      adminStatus.textContent =

        `Saved: ${count} teams. Click “Rebalance Everyone” if you want to reshuffle existing participants.`;


      renderParticipants(
        currentParticipants
      );

    }

    catch (
      error
    ) {

      console.error(
        error
      );


      adminStatus.textContent =
        "Could not save team count.";

    }

  }

);


// ======================================================
// REBALANCE EVERYONE
// ======================================================

rebalanceBtn.addEventListener(

  "click",

  async () => {

    const teamCount =
      Number(
        teamCountInput.value
      );


    if (

      !Number.isInteger(
        teamCount
      )

      ||

      teamCount < 2

      ||

      teamCount > 30

    ) {

      adminStatus.textContent =
        "Please choose between 2 and 30 teams.";

      return;

    }


    if (
      currentParticipants.length
      ===
      0
    ) {

      adminStatus.textContent =
        "There are no participants to rebalance.";

      return;

    }


    const confirmed =
      confirm(
        `Assign ${currentParticipants.length} participants into ${teamCount} teams and release the groupings now?`
      );


    if (
      !confirmed
    ) {

      return;

    }


    adminStatus.textContent =
      "Assigning teams and releasing groupings...";";


    try {

      const teams =
        rebalanceParticipants(

          currentParticipants,

          teamCount

        );


      const batch =
        writeBatch(db);


      // Save team count too

      batch.set(

        doc(
          db,
          "config",
          "settings"
        ),

        {

          teamCount:
            teamCount

        },

        {

          merge:
            true

        }

      );


      // Update every participant

      for (
        const team
        of teams
      ) {

        for (
          const person
          of team.members
        ) {

          batch.update(

            doc(
              db,
              "participants",
              person.id
            ),

            {

              teamIndex:
                team.index,

              teamName:
                team.name

            }

          );

        }

      }


      await batch.commit();


      adminStatus.textContent =
        "Groupings released successfully! Participants can now see their teams.";

    }

    catch (
      error
    ) {

      console.error(
        error
      );


      adminStatus.textContent =
        "Something went wrong while rebalancing.";

    }

  }

);


// ======================================================
// CLEAR ALL PARTICIPANTS
// ======================================================

clearAllBtn.addEventListener(

  "click",

  async () => {

    if (
      currentParticipants.length
      ===
      0
    ) {

      adminStatus.textContent =
        "There are no participants to clear.";

      return;

    }


    // ---------------------------------------------
    // FIRST CONFIRMATION
    // ---------------------------------------------

    const confirmed =
      confirm(

        `Are you sure you want to delete all ${currentParticipants.length} participants?`

      );


    if (
      !confirmed
    ) {

      return;

    }


    // ---------------------------------------------
    // SECOND CONFIRMATION
    // ---------------------------------------------

    const secondConfirmation =
      confirm(

        "Final confirmation: delete ALL participant records? This cannot be undone."

      );


    if (
      !secondConfirmation
    ) {

      return;

    }


    adminStatus.textContent =
      "Clearing participants...";


    try {

      const batch =
        writeBatch(db);


      currentParticipants
        .forEach(
          person => {

            batch.delete(

              doc(
                db,
                "participants",
                person.id
              )

            );

          }
        );


      await batch.commit();


      adminStatus.textContent =
        "All participants have been cleared.";

    }

    catch (
      error
    ) {

      console.error(
        error
      );


      adminStatus.textContent =
        "Could not clear participants.";

    }

  }

);


// ======================================================
// LIVE PARTICIPANT LIST
//
// Firestore automatically updates this whenever
// someone submits or is removed.
// ======================================================

onSnapshot(

  collection(
    db,
    "participants"
  ),

  snapshot => {

    currentParticipants =

      snapshot.docs.map(
        document => ({

          id:
            document.id,

          ...document.data()

        })
      );


    renderParticipants(
      currentParticipants
    );

  },

  error => {

    console.error(
      error
    );


    adminStatus.textContent =
      "Unable to load participants.";

  }

);


// ======================================================
// START
// ======================================================

await loadTeamCount();

renderParticipants(
  currentParticipants
);
