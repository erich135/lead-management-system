# ARS QR Code System User Guide

Version 1.0

Prepared for Air Rotory Services

Date: 2026-07-14

---

**Document purpose**

This guide explains how ARS staff and technicians use the QR Code system to capture and verify machine hour-meter readings. It is written for office users and field technicians and focuses on practical, step-by-step instructions.

[Screenshot placeholder: Title / overview screen]

---

**1. Purpose of the QR Code system**

- What it is: A secure, machine-specific QR label stuck to equipment that opens a mobile-friendly page for submitting hour-meter readings and optionally reporting faults.
- Business benefit: Makes it fast and reliable for technicians or customers to submit readings from site, reduces data entry errors, and provides an auditable, verifiable workflow so ARS can update machine records only after review.
- Where it fits: Printed QR labels live on machines; when scanned they open the ARS scan page where a reading + photo is submitted and later verified by office staff.

---

**2. User roles**

- Admin / Office user: Generates and prints QR labels from the Machines panel, views verification queue, approves/rejects submitted readings.
- Technician / Field user: Scans QR on the machine, confirms machine details, takes a photo of the hour-meter, and submits a reading.
- Verifier (Office staff with verification rights): Reviews pending submissions, checks the photo and data, approves or rejects submissions. (Often an admin or senior office user.)

---

**3. QR Code overview**

- What a QR code represents: Each QR is bound to a single machine and encodes a secure scan link that identifies that machine.
- Linked entities: The QR is linked directly to a machine record (make, model, serial, asset number, last known hours). It does not directly link to jobs or customers in the public view.
- What happens when scanned: Scanning opens a mobile-friendly public ARS scan page that shows a short, non-sensitive machine summary and a form to submit the current hour-meter reading and a photo.

---

**4. Admin / Office workflow**

Step-by-step (generate & print QR labels):

1. Open the Machines screen and select the machine you want to label.
2. On the machine panel find the `QR Label` or `QR Panel` section.
3. Click `Print QR Label` to generate the printable layout. The panel will fetch the secure scan link for that machine.
4. Choose printing method:
   - If Zebra Browser Print to a GK420t is available, the panel will try to send the label directly.
   - If not, use the browser print popup and print at actual size (80×80 mm label layout).
5. Affix the printed label to the machine in a visible, protected location.

[Screenshot placeholder: QR Code Management screen]

Notes for admin users:
- Only users with the appropriate machine management permission can generate tokens/labels.
- The printed QR is long-lived; once printed it does not need re-issuing unless damaged.
- Treat printed QR labels as official machine labels — do not copy or share them unnecessarily.

---

**5. Technician workflow**

How to scan and submit a reading:

1. Scan the QR with a smartphone camera or QR app. The QR opens the ARS scan page in the phone browser.
2. Confirm the machine details shown (make, model, serial #, asset # and customer/location if present).
3. Enter the current hour-meter reading. This is required.
4. Take a clear photo of the hour-meter using the page camera or choose from the gallery. A photo is required.
5. Optionally report a fault and add a short description.
6. Optionally provide your name, phone, and email (email is optional if you want an acknowledgement).
7. Submit the form. You will receive a short ARS reference (e.g. ARS-xxxxxx) on confirmation.

[Screenshot placeholder: Scan page capture form]

Important notes for technicians:
- The page is mobile-friendly and does not require a login.
- The form requires a photo and a valid non-negative reading.
- If the reading is lower than the machine’s current approved hours, the page will warn and prevent submission — re-check the meter before contacting the office.

---

**6. Machine readings (what is captured)**

- Required fields:
  - Hour-meter reading (numeric, non-negative)
  - Photo of the hour-meter (clear, readable)
- Optional fields:
  - Fault reported (checkbox) and a short fault description
  - Submitter name, phone, email (email used for optional acknowledgement)
- What happens after submission:
  - The reading is saved as a pending submission and does NOT immediately update the machine’s official hours.
  - The submitter sees a confirmation with a reference number.
  - Office staff review the submission and either approve or reject it.
- Constraints:
  - Submitted readings cannot be lower than the machine’s current recorded hours; such submissions are rejected at the submit step.

---

**7. Reading verification workflow (office)**

1. Office staff open the verification queue (Verify Readings) in the Machines area.
2. Select a pending submission to view the photo, submitted reading, previous reading snapshot and submitter details.
3. Decide to Approve or Reject:
   - Approve: Optionally edit the hours, add a verification note. Approving writes the approved hours to the machine record and marks the submission as approved. The submitter may receive an email when an address was provided.
   - Reject: Provide a rejection reason; the machine record is not updated and the submitter may receive an email informing them to resubmit.

Notes:
- Only staff with the proper verification permission can approve or reject readings.
- Approved submissions update the machine’s official hours and stamp the last-reading date.

---

**8. Job card / service workflow interaction**

- QR scanning is primarily for capturing machine hour readings and reporting faults. It links to the machine record and its reading history.
- Approved readings update the machine record and therefore can affect service due calculations and appear on future job cards or service schedules that reference machine hours.
- Limitations:
  - Scanning does not automatically create or link a job card. Any job allocation remains a separate process.
  - If you need a reading attached to a specific job, coordinate with the office to add the reading or create the job as needed.

---

**9. Label printing workflow**

- Label size: 80×80 mm print layout (default in the print preview). The QR panel uses a large QR graphic intended to be readable by phone cameras.
- Recommended printer: Zebra GK420t with Zebra Browser Print where available; the system attempts direct ZPL printing and falls back to browser print.
- Print steps recap for admin:
  1. From the Machine QR panel, click `Print QR Label`.
  2. If Zebra Browser Print is installed and running, the panel will try to send the label directly.
  3. If direct printing is not available, use the browser print popup and set Actual Size (no scaling) and the correct paper/label size.

---

**10. Common errors and troubleshooting**

- QR code does not scan
  - Check the label is not scratched, dirty or wrinkled. Try a different phone camera or QR app. If still failing, use the camera app to open the printed URL shown on the label.
  - If the printed URL is missing or truncated, escalate to admin to reprint.

- Scan page does not open
  - Check phone internet connection (cell data or Wi‑Fi).
  - If no internet, take a photo and record the reading manually and contact the office later.

- Wrong machine opens
  - Confirm you scanned the correct label on the correct machine. If label is on the wrong machine, remove the label and escalate to admin.
  - Admin: check that the printed label matches the machine serial/asset shown before printing.

- Camera permission issue
  - Ensure the browser has camera permission for the site. If denied, use the gallery upload option to select an existing photo.

- Photo upload fails
  - Ensure photo size is reasonable and image type is supported (JPEG/PNG/etc.). Try again on a stable connection.
  - If persistent, email or message the office with the photo and reading reference.

- Reading lower than current hours
  - The page prevents submitting a reading lower than the current machine hours. Re-check the meter and resubmit. If the meter was reset or faulty, contact the office for guidance.

- Poor internet connection
  - Take the photo and record the reading; submit when you have a stable connection or hand the info to office staff.

- Duplicate or damaged QR label
  - Replace damaged labels. If duplicates are found (same QR on multiple machines), remove duplicates and escalate to admin to investigate and reprint labels.

- Technician cannot submit
  - Ensure required fields (reading and photo) are provided and valid. Check camera permissions and internet. If error persists, capture the reference number displayed and contact the office.

- Admin cannot print label
  - Confirm you have the required permission in the Machines area. Ensure pop-ups are allowed (print opens a new window). If using Zebra, confirm Zebra Browser Print is installed and running.

- Submitted reading not yet visible on the machine
  - Submitted readings are saved as pending. They will only appear on the machine as an approved reading after a verifier approves it. Check the verification queue or contact verifier.

---

**11. Best practices**

- Label placement: Stick the QR label where it is protected from abrasion, oil and direct impact, but still visible and reachable for technicians.
- Protect labels: Use a clear laminate or plastic pouch where practical; avoid placing in high-heat / direct-sun areas where adhesive might fail.
- When to replace labels: Replace if scratched, faded, or detached. Replace immediately if a wrong label was applied to a different machine.
- Field use tips: Take a clear, well-lit photo of the hour-meter showing the digits. Use the camera viewfinder and steady the phone for a crisp image.

---

**12. Admin checklist**

Before printing labels:
1. Confirm machine record (Make, Model, Serial #, Asset #) is correct.
2. Open the Machine QR panel and verify the scan URL shown matches the machine details.
3. Print one label and check the on-label printed make/model/serial for accuracy.
4. Affix label and scan to verify the scan page shows the correct machine.
5. Record label application (date, location, printed by).

---

**13. Technician checklist**

Before submitting a reading:
1. Scan the QR on the machine and confirm the machine details.
2. Check the hour-meter is readable and stable.
3. Enter the reading (numeric) and take a clear photo of the meter digits.
4. Add fault description if required and optionally provide contact info.
5. Submit and note the ARS reference number shown on confirmation.

---

**14. Frequently asked questions (FAQ)**

Q: Do I need to log in to submit a reading?
A: No. The scan page is public and token-gated. Scanning the printed QR opens the page without login.

Q: Will my submission immediately change the machine hours?
A: No. Submissions are pending and must be verified by office staff. Approved submissions update the machine hours.

Q: What if I don’t have internet on site?
A: Record the meter value and take the photo. Submit later when you have a connection or send the photo and reading to the office by other means.

Q: Who approves readings?
A: Office staff with the verification permission review the verification queue and approve or reject readings.

---

**15. Items to confirm (To be confirmed)**

- Confirm preferred label stock and supplier for printed QR labels. — To be confirmed
- Confirm whether ARS uses Zebra GK420t printers in all locations or only some sites. — To be confirmed
- Confirm who in ARS is responsible for label printing and replacement (role/team). — To be confirmed
- Confirm expected SLA for verifying pending submissions (e.g., 24–48 hours). — To be confirmed
- Confirm whether the Android mobile app uses the same public web scan page or a separate native scan flow. — To be confirmed

---

**16. Technical Notes for Admin Support (short, for IT/Dev staff)**

- The printed QR encodes a signed, machine-specific scan link. The backend creates tokens tied to a single machine and the frontend serves a public route at `/scan/machine/:token`.
- Public scan endpoints return a limited, non-sensitive machine view and accept a multipart form submission containing the reading and photo.
- Submissions are saved as pending records with a snapshot of the previous machine hours to help verifiers judge plausibility.
- Photos are uploaded to long-term object storage and served to verifiers via short-lived links. Uploaded images are validated for type and size limits.
- Admin token generation is protected: only authenticated users with machine management permission can produce the token/scan link used for printing.

Avoid exposing secrets, keys, or private URLs when troubleshooting. If you need access to logs, S3 keys, or environment variables, contact DevOps.

---

Document history

- 2026-07-14 — Version 1.0 — Initial user guide created from code inspection.
