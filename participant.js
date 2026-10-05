console.log("participant.js loaded");

import { firebaseConfig } from "./firebase-config.js";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";


// ======================================================
// FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ======================================================
// PAGE ELEMENTS
// ======================================================

const form = document.getElementById("participantForm");

const statusEl = document.getElementById("status");

const waitingCard = document.getElementById("waitingCard");

const resultCard = document.getElementById("resultCard");

const teamNameEl = document.getElementById("teamName");

const teamDetailsEl = document.getElementById("teamDetails");


// Holds the active Firestore listener for this participant.
let unsubscribeParticipant = null;


// ======================================================
// NORMALISE TEXT
// ======================================================

function normalise(value) {

  return value
    .trim()
    .replace(/\s+/g, " ");

}


// ======================================================
// SHOW WAITING SCREEN
// ======================================================

function showWaitingScreen(participant) {

  form.classList.add("hidden");

  resultCard.classList.add("hidden");

  waitingCard.classList.remove("hidden");

  statusEl.textContent =
    `${participant.name}, your registration has been received.`;

}


// ======================================================
// SHOW TEAM
// ======================================================

function showTeam(participant) {

  form.classList.add("hidden");

  waitingCard.classList.add("hidden");

  teamNameEl.textContent =
    participant.teamName || "Team assigned";

  teamDetailsEl.textContent =
    `${participant.name} • ${participant.group} • ${participant.department}`;

  resultCard.classList.remove("hidden");

  statusEl.textContent =
    "Your grouping has been released!";

}


// ======================================================
// LISTEN FOR ADMIN TEAM ASSIGNMENT
// ======================================================

function listenForTeam(participantRef) {

  // Remove an old listener if one already exists.
  if (unsubscribeParticipant) {
    unsubscribeParticipant();
  }


  unsubscribeParticipant = onSnapshot(

    participantRef,

    snapshot => {

      if (!snapshot.exists()) {

        statusEl.textContent =
          "Your registration could not be found.";

        return;

      }


      const participant = {
        id: snapshot.id,
        ...snapshot.data()
      };


      // The admin has assigned and released a team.
      if (
        participant.teamName &&
        Number.isInteger(participant.teamIndex)
      ) {

        showTeam(participant);

      }

      else {

        showWaitingScreen(participant);

      }

    },

    error => {

      console.error(error);

      statusEl.textContent =
        "Unable to check your grouping. Please inform the emcee.";

    }

  );

}


// ======================================================
// FORM SUBMISSION
// ======================================================

form.addEventListener(

  "submit",

  async event => {

    event.preventDefault();


    statusEl.textContent =
      "Registering you...";

    waitingCard.classList.add("hidden");

    resultCard.classList.add("hidden");


    try {

      const participant = {

        name:
          normalise(
            document.getElementById("name").value
          ),

        group:
          document.getElementById("group").value,

        department:
          normalise(
            document.getElementById("department").value
          )

      };


      // --------------------------------------------------
      // VALIDATION
      // --------------------------------------------------

      if (
        !participant.name ||
        !participant.group ||
        !participant.department
      ) {

        throw new Error(
          "Please complete all fields."
        );

      }


      // --------------------------------------------------
      // DUPLICATE CHECK
      // --------------------------------------------------

      const duplicateQuery = query(

        collection(
          db,
          "participants"
        ),

        where(
          "nameLower",
          "==",
          participant.name.toLowerCase()
        )

      );


      const duplicateSnap =
        await getDocs(duplicateQuery);


      // --------------------------------------------------
      // ALREADY REGISTERED
      // --------------------------------------------------

      if (!duplicateSnap.empty) {

        const existingDoc =
          duplicateSnap.docs[0];

        statusEl.textContent =
          "You are already registered.";

        listenForTeam(
          existingDoc.ref
        );

        return;

      }


      // --------------------------------------------------
      // CREATE PARTICIPANT
      //
      // IMPORTANT:
      // No team is assigned here.
      // The admin will assign the team later.
      // --------------------------------------------------

      const record = {

        ...participant,

        nameLower:
          participant.name.toLowerCase(),

        teamIndex:
          null,

        teamName:
          null,

        createdAt:
          serverTimestamp()

      };


      const participantRef =
        await addDoc(

          collection(
            db,
            "participants"
          ),

          record

        );


      // --------------------------------------------------
      // WAIT FOR ADMIN
      // --------------------------------------------------

      showWaitingScreen(participant);

      listenForTeam(
        participantRef
      );

    }

    catch (error) {

      console.error(error);

      statusEl.textContent =
        error?.message ||
        "Something went wrong. Please try again.";

    }

  }

);
