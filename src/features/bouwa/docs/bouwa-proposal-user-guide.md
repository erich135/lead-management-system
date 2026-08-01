# Bouwa Proposals — User Guide

**Audience:** anyone at ARS creating a compressed-air proposal
**Applies to:** the guided proposal wizard in the Bouwa module
**Written:** August 2026 (BOUWA-WIZARD-001)

This guide is short on purpose. The wizard is meant to be usable without it,
and if you find yourself reaching for this document to get through an ordinary
screen, that is a fault in the screen and worth reporting.

---

## 1. Starting a proposal

Open **Bouwa → Proposals**. You land on **Draft Proposals**, which lists
everything you or your colleagues are working on: the reference, the customer
and site, the type, the step it was left on, what is still outstanding, who owns
it and when it was last saved.

**New proposal** opens the wizard at step one. Every proposal gets a reference
of its own (for example BW-2026-0042) the moment it is created, so it exists and
can be found again even if you close the tab immediately.

From the list you can **Continue** a draft, **Duplicate** one (the answers are
copied; the logger file, the documents and the change trail are not, because a
second proposal has not measured anything), or **Archive** one you no longer
need. Archiving hides it;
nothing is deleted.

---

## 2. Air Audit or Manual Proposal

The first question is how you are creating the proposal, and it decides the rest
of the workflow.

**Air Audit Proposal** — you have an untouched logger export. The wizard will
read the file, take the measurement facts straight from it, and ask about the
logger and sensors that produced it.

**Manual Proposal** — you have no logger export. You then say what the proposal
is based on: a site survey, information the customer supplied, manufacturer
information, or a preliminary estimate. There is no file upload on this path and
no logger questions, because there is no logger. Your figures keep their real
provenance: an estimate is recorded as an estimate and never presented as a
measurement.

A manual proposal is a first-class proposal. It simply cannot produce the
outputs that need a measurement, and it says so plainly rather than inventing
one.

---

## 3. Saving and resuming

**Save & Continue** stores what is on the screen, confirms the store succeeded,
and then moves on. If the save fails you stay where you are with your answers
intact.

**Back** saves first, then goes back. You never lose the screen you are leaving.

**Save & Exit** stores the whole draft and returns you to Draft Proposals.

The wizard also saves on its own a second or two after you stop typing, and
after any selection or upload. The indicator beside the reference tells you
which of these is true: *Saving…*, *All changes saved*, *Unsaved changes* or
*Save failed*.

Saving means the ARS backend, not the browser. You can close the tab, go home,
come back next week, sign in on another machine and **Continue** — the same
step, the same answers, the same uploaded file. If a save genuinely fails, you
will be warned before you navigate away, and offered **Retry save**.

If two people (or two of your own tabs) edit the same proposal, the second save
is refused rather than quietly overwriting the first. You are shown what
happened and can either load the stored version or keep yours and save again.
Nothing is lost silently.

---

## 4. Answering "Unknown"

Every question can be answered **Unknown — confirmation required**, and some can
be answered **Not applicable** or **Not listed**.

Unknown is a real answer. It lets you get on with the rest of the proposal, and
it keeps everything that depends on it blocked until somebody confirms a value.
It is offered precisely so that nobody has to invent a plausible number to get
past a screen.

A blank box is not an answer, and the wizard will not treat it as one. If you
cannot continue, the footer will tell you which question is holding the screen.

---

## 5. Uploading the audit and its evidence

On the Air Audit path, step three takes the untouched export exactly as the
logger wrote it. Do not open it in Excel and save it again first.

Once it is read, the wizard fills in and locks what the file itself states: the
filename, the SHA-256 of the bytes, the first and last timestamps, the audit
dates, the sample interval, the channels and their units, the gaps, the
duplicate timestamps, the coverage and the recognised export format. These are
shown as **Detected from the uploaded file** and cannot be typed over, because
they are facts about the file rather than opinions about the site.

Supporting documents — tariff invoices, datasheets, part-load curves, quotations
— are attached on the tariff and evidence step. Each one is stored with its own
hash and stays with the proposal.

---

## 6. Readiness stages

The wizard reports four stages, and it reports them once:

| Stage | What it means |
|---|---|
| File analysis | The export has been read and its identity recorded. |
| Measured audit | The measurement can be presented as a measurement. |
| Engineering comparison | The existing and proposed machines may be compared. |
| Commercial proposal | Costs, savings and payback may be stated. |

Each stage shows either **Ready** or how many items it still needs, along with
the next few. Outstanding documents are grouped — logger and sensor evidence,
existing machine documents, tariff documents and so on — with a count on each
group. Open a group to see the exact item, why it matters, what it blocks, which
document is needed, who is responsible and when it is expected.

---

## 7. Why an output is blocked

Missing information blocks only the outputs that depend on it. It never blocks
the proposal, and it is never quietly filled in with a default.

- No tariff evidence: the measured demand still stands; the cost and the ROI do not.
- No annual operating hours: the period results still stand; the annual figures do not.
- No manufacturer part-load curve for a proposed VSD: the measurement still stands; the trusted saving does not.
- Flow basis unknown: the raw observations still stand; the like-for-like comparison does not.
- No investment figure: the engineering comparison may still stand; payback and ROI do not.

The review step lists what the proposal can release today and what is waiting,
with the reason attached to each.

---

## 8. Advanced Technical Review

At the bottom of the review step, **Advanced Technical Review** opens the full
engineering picture of the same proposal: every backend field code, the complete
ordered list of readiness reasons, stage eligibility, the like-for-like
comparison checks, the source hash and the facts read from the file, the
evidence register and the change trail.

It is a separate screen, and it scrolls, because it is an inspection rather than
a workflow. Nothing on it is calculated in the browser; it is what the backend
concluded, printed in full. The standalone air-audit workspace is reachable from
there too — it is its own tool with its own working copy, and it does not read
or write the saved proposal.

---

## Reporting a problem

If a screen makes you guess, asks the same thing twice, or asks for something
ARS already knows, that is a defect worth raising. The wizard's whole purpose is
that an honest proposal should be the easy one to produce.
