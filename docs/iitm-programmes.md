# IIT Madras online BS programmes: what exists and what NEXT GEN covers

Checked on 4 Nov 2026 against the official pages on study.iitm.ac.in and iitm.ac.in. Only course names, codes, credits and week-topic titles were taken from them; every note and question in this app is written independently. NEXT GEN is not affiliated with IIT Madras.

## The four online BS programmes

[study.iitm.ac.in](https://study.iitm.ac.in/) and IITM's [non-campus BS programmes page](https://www.iitm.ac.in/academics/study-at-iitm/non-campus-bs-programmes) list the same four.

| Programme | Levels | Credits | App id |
|---|---|---|---|
| [BS in Data Science and Applications](https://study.iitm.ac.in/ds/academics.html) | Foundation → Diploma in Programming and/or Diploma in Data Science → BSc → BS (→ PG Diploma / MTech in AI & ML) | 32 / 59 or 86 / 114 / 142 | `ds` |
| [BS in Electronic Systems](https://study.iitm.ac.in/es/academics.html) | Foundation → Diploma in Electronic Systems → BS | 43 / 86 / 142 | `es` |
| [BS in Aeronautics and Space Technology](https://study.iitm.ac.in/ae/academics.html) (launched online Feb 2026, [IITM news](https://www.iitm.ac.in/hi/node/17351)) | Foundation → Diploma in Aeronautics → BS | 32 / 84 / 142 | `ae` |
| [BS in Management and Data Science](https://study.iitm.ac.in/mg/academics.html) (new for 2026–27) | Foundation → Diploma in Data Analytics for Business → Diploma level → BS | 32 / 68 / 92 / 142 | `mg` |

The 2026 BS in Mathematics is an on-campus JEE / Olympiad programme ([admissions page](https://ugadmissions.iitm.ac.in/bsmath/)), so it isn't listed.

## Foundation courses by programme

**Data Science** (all 4 credits): BSMA1001 Mathematics for Data Science I, BSMA1002 Statistics for Data Science I, BSCS1001 Computational Thinking, BSHS1001 English I, BSMA1003 Mathematics for Data Science II, BSMA1004 Statistics for Data Science II, BSCS1002 Programming in Python, BSHS1002 English II.

**Electronic Systems** (43 credits: 9 theory courses of 4 credits + 5 labs). The ES site writes codes without the "BS" prefix; the Aeronautics site lists the same courses with it (BSEE1101 and so on).

| Code | Course | App subject |
|---|---|---|
| HS1101 | English I | `eng1` (shared with Data Science) |
| MA1101 | Math for Electronics I | `mfe1` |
| EE1101 | Electronic Systems Thinking and Circuits | `estc` |
| CS1101 | Introduction to C Programming | `cprog` |
| CS1102 | Introduction to Linux and Programming | `linux` |
| HS1102 | English II | `eng2` (shared with Data Science) |
| EE1102 | Digital Systems | `digital` |
| EE1103 | Electrical and Electronic Circuits | `eec` |
| CS2101 | Embedded C Programming | `embc` |
| EE1901, CS1901, CS1902, EE1902, CS2901 | Labs (1–3 credits) | Not covered: labs are hands-on, with no weekly theory |

English I and II have different codes in ES (HS1101 / HS1102) and DS (BSHS1001 / BSHS1002). English II's 12 weekly topics are identical in both. English I's are nearly the same, with a slightly different order in weeks 2–3 and 10–11. So the app shares one subject (one set of notes and one set of progress) and shows each programme its own code via `codes` in `content/programmes.json`.

**Aeronautics** (all 4 credits): BSHS1101 English I, BSMA1101 Math for Electronics I, BSCS1101 Introduction to C Programming, BSEE1101 Electronic Systems Thinking and Circuits, BSHS1102 English II, BSMA2101 Math for Electronics II, BSAS1000 Introduction to Aerospace Systems, BSAS1001 Engineering Mechanics. The first five are the Electronic Systems courses, so Aeronautics students get them as soon as ES has them.

**Management and Data Science** (all 4 credits): BSMA1001, BSMA1002, BSCS1001 and BSHS1001 (the Data Science courses, already covered), plus BSMS1201 Principles of Economics, BSMS1202 Financial Accounting, BSMS1203 Business Statistics and BSMS1204 Management Thought and Practice.

## Data Science Diploma (listed in the app as planned)

- **Diploma in Programming**: BSCS2001 DBMS, BSCS2002 PDSA, BSCS2003 MAD I (+ project), BSCS2005 Java, BSCS2006 MAD II (+ project), BSSE2001 System Commands.
- **Diploma in Data Science** (structure from the September 2025 term): BSCS2004 MLF, BSMS2001 BDM, BSCS2007 MLT, BSCS2008 MLP (+ project), BSSE2002 Tools in Data Science, then one track: BSMS2002 Business Analytics or BSDA2001 Introduction to Deep Learning and Generative AI (each + project).

Students can already choose a Diploma; its subjects show "Notes coming soon" until they are written.

## What the app covers (November 2026)

| Choice | Subjects with all 12 weeks of notes + 72 questions | Still to write |
|---|---|---|
| Data Science – Foundation | All 8 | — |
| Electronic Systems – Foundation | All 9 theory courses: English I, Math for Electronics I, Electronic Systems Thinking and Circuits, Introduction to C, Introduction to Linux, English II, Digital Systems, Electrical and Electronic Circuits, Embedded C | Labs aren't covered (no weekly theory) |
| Aeronautics – Foundation | All 8: the 5 shared with Electronic Systems, plus Math for Electronics II, Introduction to Aerospace Systems and Engineering Mechanics | — |
| Management & DS – Foundation | All 8: Maths I, Statistics I, Computational Thinking and English I (shared with Data Science), plus Principles of Economics, Financial Accounting, Business Statistics and Management Thought and Practice | — |
| Data Science – Diploma in Programming | 0 of 6 | DBMS, PDSA, MAD I, Java, MAD II, System Commands |
| Data Science – Diploma in Data Science | 0 of 7 | MLF, BDM, MLT, MLP, Tools in Data Science, Business Analytics, Deep Learning & GenAI |
| Qualifier exam | Data Science Foundation subjects, plus `/qualifier` (built on another branch) | — |

In all: 22 subjects × 12 weeks, 1,584 questions in Hinglish and English. All notes and questions are original. The official week-topic titles were used only to decide the order of topics.

- The Electronic Systems Python course (CS1002) is a Diploma course with the same weekly topics as Data Science's BSCS1002, so the existing `python` subject can be reused when the ES Diploma is added.
- The Coding Lab runs Python only. Electronic Systems students get a note pointing them to the C "what does this print?" questions, since C can't run in the browser yet.

## Not in the app yet

- The two Data Science Diplomas (13 subjects above): they can be chosen and show "Notes coming soon" everywhere until written.

- Electronic Systems Diploma (EE2101 Signals and Systems, EE2102 Analog Electronic Systems, CS1002 Python Programming, EE2103 Digital System Design, EE3101 DSP, EE3103 Sensors, EE4108 Testing and Measurement, EE2106 Computer Organisation, plus labs and projects) and Degree.
- The Aeronautics and Management Diploma and Degree levels.
- The Data Science BSc / BS level.

## Where this lives in the code

- `content/programmes.json`: programme → levels → subject ids, plus per-programme course codes.
- `content/subjects.json`: every subject once. `"status": "partial"` means weeks 1..n are written; `"planned"` means no notes yet ("Notes coming soon" in the app).
- `lib/programmes.ts`: choices and shared helpers. `lib/programme-choice.ts`: the student’s choice (`<programme>/<level>` or `qualifier`), stored as the `programme:<choice>` entry in the profile’s `subjects` for logged-in students, otherwise localStorage `nextgen-programme`, otherwise Data Science Foundation.
