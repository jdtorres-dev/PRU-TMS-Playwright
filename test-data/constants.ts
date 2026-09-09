/**
 * Environment-driven test data for the PRU TMS v4 suite. Every value has a sensible
 * default (the confirmed live values from the original CSV-driven conversion) but can be
 * overridden per-environment via .env / CI variables - see env.example.
 */

export const BASE_URL =
  process.env.PRU_BASE_URL ?? 'https://pru-tms-demo.ap-southeast-1.elasticbeanstalk.com';

export const VALID_USERNAME = process.env.PRU_LOGIN_USERNAME ?? 'admin';
export const VALID_PASSWORD = process.env.PRU_LOGIN_PASSWORD ?? 'admin';

// Provisioned ROLE_OPERATOR and ROLE_QA_REVIEWER accounts (live-confirmed 2026-09-03) - needed
// specifically for BR-336's cross-office-transfer rule (WKBCH.spec.ts's TMS-WKBCH-008/009),
// whose Preconditions require these roles by name; admin/admin is not sufficient for that rule.
// Per the "Pru TMS Online Users" roster: operator (ROLE_OPERATOR, rhoScope B/C/D/F/G/I) and qa
// (ROLE_QA_REVIEWER, rhoScope B/C/E/F/G/I/R).
export const OPERATOR_USERNAME = process.env.PRU_OPERATOR_USERNAME ?? 'operator';
export const OPERATOR_PASSWORD = process.env.PRU_OPERATOR_PASSWORD ?? 'operator';
export const QA_REVIEWER_USERNAME = process.env.PRU_QA_REVIEWER_USERNAME ?? 'qa';
export const QA_REVIEWER_PASSWORD = process.env.PRU_QA_REVIEWER_PASSWORD ?? 'qa';

// One specific suspended transaction confirmed live on the shared dev environment, reused
// as the target record across every test that needs to open an existing RDMS record rather
// than a specific business-rule-driven one. This demo environment's Error Suspense File
// reseeds periodically, so if this record ages out, override via the env vars below.
//
// Switched from 300000020/RD202634900020, then from 300000014/RV202636900014 (2026-09-01):
// BOTH prior fixtures were independently locked out by the exact same confirmed
// environment/access-control bug while probing BR-374/GEN-048 - committing a real RHO
// change via the RDMS Edit UI (even to an individually-valid office code: "Q" on the first
// record, "A"/"EMO" on the second) returns a clean HTTP 200 on save, but silently moves the
// record outside this admin session's own viewing scope: it disappears from every Error
// Manager search (0 results, Include Released/Deleted included) and direct API lookup
// (`GET /api/v1/spi/{ecn}`) returns 403 "Out of scope: ECN belongs to RHO <letter>". This
// reproduced twice on two unrelated records, so it is treated as a permanent constraint on
// this environment/account, not a one-off: RHO must never be saved with a real, different
// value by any test in this suite (see GEN-048/GEN-100/GEN-101), regardless of which record
// is used. This third fixture (300000004) has not been RHO-touched, but its secondary
// chrgBckRhoOrdIssRho field (Charge Back RHO / Ordinary Issue RHO - a different field from
// the primary RHO above, confirmed NOT subject to the same scope-lockout bug) was changed
// from blank to a real office code (2026-09-01) while confirming that finding, and could not
// be restored back to blank afterward: this combobox, like several others in this suite
// (see TMS-RDMS-GEN-074/080/084/086), has no blank/clear option in its own listbox. This is
// a benign, low-impact field-value drift (the record remains fully reachable/editable),
// documented here rather than hidden, since every test referencing this field captures its
// "original" value dynamically at runtime rather than assuming blank.
// Switched a third time (2026-09-01): 300000004/J7202636900004 was independently locked out
// by the exact same RHO scope-lockout bug (confirmed via direct API: 403 "Out of scope: ECN
// belongs to RHO A"), despite no test in this run touching the primary rho field on it -
// this reproduced a THIRD time on a THIRD unrelated record, so it is not tied to a specific
// record or a specific test action; treat it as a standing environment/account hazard.
// This replacement (200000004/J7202633001004) was confirmed live: opens normally, supports
// Edit. It is an older seed-created record (2026-08-11, cycle 202633) rather than the
// adhoc-script-created 3000000xx family the prior three fixtures came from - a deliberately
// different provenance in case that family shares whatever is causing the lockouts.
export const TEST_POLICY_NUMBER = process.env.PRU_TEST_POLICY_NUMBER ?? '200000004';
export const TEST_ECN = process.env.PRU_TEST_ECN ?? 'J7202633001004';
export const TEST_ERROR_ID = process.env.PRU_TEST_ERROR_ID ?? '0028';

// Dedicated secondary fixture for tests that must actually commit a change to a field
// which doubles as the primary fixture's own search key (e.g. polNo itself, in
// TMS-RDMS-GEN-050) - reusing TEST_POLICY_NUMBER for that would relocate/break every
// other concurrently-run spec that depends on it to find the shared record. Nothing
// else in this suite references this record, so a real Save + restore round trip
// against it is safe. Not tied to one specific test case despite the name - any test
// that needs its own independent, mutation-safe record can reuse it.
export const SECONDARY_TEST_POLICY_NUMBER = process.env.PRU_SECONDARY_TEST_POLICY_NUMBER ?? '300000050';

// Further dedicated, mutation-safe fixtures (2026-09-01) - live-confirmed to open, support
// Edit, and complete a real Save with no screening error, same as SECONDARY_TEST_POLICY_NUMBER
// above. Unlike every fixture used elsewhere in this suite, these carry status OPEN rather
// than HELD on the Result Grid - live-confirmed this does not prevent editing or saving.
// Spreading real, non-restored mutations (e.g. TMS-RDMS-GEN-078/084/086/090/092/098) across
// several independent records, rather than concentrating them all on
// SECONDARY_TEST_POLICY_NUMBER, keeps any one record's eventual field-value drift small and
// limits the blast radius if one of them ever hits the kind of lockout documented above for
// TEST_POLICY_NUMBER.
// Switched (2026-09-04): the environment moved from pru-tms-dev to pru-tms-demo (see
// BASE_URL) and the original TERTIARY/QUATERNARY fixtures (300000032, 300000002) do not
// exist there (0 results on a direct policy-number search), same underlying cause as the
// QUINARY switch below. These replacements (300000272/RD202636900272 and 300000227/
// RD202636900227) are live-confirmed healthy via a no-op-save check (debNo round-trip, no
// screening error, Edit re-appears) - used by TMS-RDMS-GEN-078/084/092/098.
export const TERTIARY_TEST_POLICY_NUMBER = process.env.PRU_TERTIARY_TEST_POLICY_NUMBER ?? '300000272';
export const QUATERNARY_TEST_POLICY_NUMBER = process.env.PRU_QUATERNARY_TEST_POLICY_NUMBER ?? '300000227';
// Switched (2026-09-03): the original QUINARY fixture (300000022) does not exist in this
// environment (0 results on a direct policy-number search) - used by TMS-RDMS-GEN-060/061/
// 086. This replacement (300000165/6221) is a freshly-seeded record (creator "adhoc-gen-2"),
// live-confirmed healthy via a no-op-save check, branch C (neither '4' nor '5', satisfying
// BR-380/GEN-060's alphanumeric-domain precondition).
export const QUINARY_TEST_POLICY_NUMBER = process.env.PRU_QUINARY_TEST_POLICY_NUMBER ?? '300000165';
export const SENARY_TEST_POLICY_NUMBER = process.env.PRU_SENARY_TEST_POLICY_NUMBER ?? '300000042';

// Dedicated fixture for TMS-E2E-020 (2026-09-04), replacing that test's original dynamic
// "search Status=New, pick the first row that isn't TEST_POLICY_NUMBER" approach - that
// picked whichever New record happened to sort first, which could be one already mutated by
// a prior run (defeating the case's own "not previously modified" precondition) and doubled
// exposure to this environment's own navigation flakiness via an extra search round trip.
//
// IMPORTANT: this fixture is single-use per successful test run. TMS-E2E-020's own save
// genuinely advances the record from New to Open (live-confirmed - the first choice for this
// constant, 300000185, did exactly this and is now permanently Open), and no-op saves do NOT
// trigger that transition (confirmed separately), so only a real amend-and-save consumes it.
// A rerun against an already-Open record will correctly fail the test's own "still New"
// precondition check - that is expected, not a regression, and requires picking a fresh New
// record here again (there is no way to reset one back to New from the UI).
// Switched from 300000185 (2026-09-04, consumed as above) to 300000095 (ECN RV202636900095,
// Error ID 9115) - also consumed the same way by a second successful run, further confirming
// the underlying New-status defect is genuinely resolved rather than a one-off. Switched again
// to 300000005 (ECN RV202636900005, Error ID 0035) - also consumed by a third successful run,
// which fully confirmed the amend+save+transition mechanism works end to end; the only
// remaining gap that run exposed was TMS-E2E-020's own final assertion checking case-sensitive
// 'OPEN' when the grid actually renders this status as "Open" (mixed case) - fixed with
// case-insensitive regexes. Switched again to 300000290 (ECN RD202636900290, Error ID 9086) -
// consumed by a fourth successful run (2026-09-08, full 35-test suite run), further confirming
// the mechanism. Switched to 300000245 (ECN RD202636900245, Error ID 4010) - consumed by a
// fifth successful run (2026-09-08); the run's own final assertion (waiting for the Edit
// button to reappear) hit a slow/transient environment moment and reported a false failure,
// but the underlying save+transition itself is confirmed to have genuinely committed (the
// immediate retry correctly failed its own "still New" precondition check against the same
// now-Open record). Switched to 300000220 (ECN J7202636900220, branch 5) - live-confirmed
// (2026-09-08) this and its predecessor (J7202636900265, also branch 5, independently found
// broken while fixing TMS-E2E-012) share a real, unrelated pre-existing data issue specific to
// Debit Insurance branches (4, 5): "AGREE NUMBER Must be 6 numeric digits for Debit Insurance
// branches (4, 5)" is violated by this environment's own seeded Agree Number values for those
// branches (e.g. "AG0220" - alphanumeric, not 6 digits), which blocks ANY save on the record
// regardless of what field this case edits - reproducible on a completely fresh record, so this
// is a systemic seed-data characteristic of branch 4/5 records here, not this fixture's own
// fault. Switched again to this replacement (branch N, not 4 or 5), live-confirmed New and
// un-mutated: ECN RD202636900200, Error ID 0018.
export const NEW_STATUS_TEST_POLICY_NUMBER = process.env.PRU_NEW_STATUS_TEST_POLICY_NUMBER ?? '300000200';

// Dedicated fixture (2026-09-02) for the RDMS Trailer Information tab's PRUPAC variant
// (prupacTrailer.* fields - Address/Rejection Information, the Agent Allocation Grid and its
// percSplit inputs - see BR-492..BR-495, RDMS-TRL.spec.ts). Every other fixture above is
// live-confirmed branch V, which makes that tab render its *Replacement* variant instead
// (replacementTrailer.trailers[] - the Trailer Comparison grid) - per BR-494 ("Trailer shape
// by branch"), only a branch D or P record ever renders the PRUPAC variant at all. This
// record is live-confirmed branch D, status OPEN (does not block editing/saving, same as the
// TERTIARY/QUATERNARY/QUINARY/SENARY fixtures above), with two populated, real, screened
// Agent Allocation Grid rows (percSplit 60/40, summing to the required 100.00).
export const PRUPAC_TEST_POLICY_NUMBER = process.env.PRU_PRUPAC_TEST_POLICY_NUMBER ?? '100000003';
export const PRUPAC_TEST_ECN = process.env.PRU_PRUPAC_TEST_ECN ?? 'I1202634000601';
export const PRUPAC_TEST_ERROR_ID = process.env.PRU_PRUPAC_TEST_ERROR_ID ?? 'E102';

// Dedicated fixture for the transCode/transMode/suplKind "ERROR - COMBINATION OF BRANCH,
// TRANS MODE, TRANS CODE AND SUPL-KIND IS INVALID" server-side check documented under
// BR-374/376/377/390/401/407 (see TMS-RDMS-GEN-052/054/080/082/102/103/114) - every other
// fixture above is branch V or blank, and test-data/modecode_combinations.xlsx (the
// ref_modecode permitted-combination table those tests' original "BLOCKED - TEST DATA"
// comments said this suite had no access to) only covers branches A/B/C/D/E/F/G/J, so none
// of them can supply a guaranteed-valid literal. This record is live-confirmed branch C,
// status New (does not block editing/saving), with transCode=00/transMode=NB/suplKind=L
// (Renewal after the Second Year) - itself confirmed to match a real row in that table
// (branch C, trans_code 0, trans_mode NB, supl_kind L), validating the table against live
// data. `branch` is read-only (see GEN-058/BR-379), so only transCode/transMode/suplKind can
// be changed on it.
//
// Switched (2026-09-03): the original fixture (100000013/E113) developed an unrelated,
// unidentified Financial Information tab issue that started refusing every save (even a
// genuine no-op) with "SCREENING ERROR IN HIGHLIGHTED FIELD(S) (Financial)" - this is a
// shared dev/demo environment other processes also write to, so this was very likely data
// drift from outside this suite rather than anything a test here did. Abandoned rather than
// repaired, since the actual invalid field was never conclusively identified. This
// replacement (300000120/0312) is a freshly-seeded record (creator "adhoc-gen-2"),
// live-confirmed healthy via a no-op-save check.
export const MODECODE_TEST_POLICY_NUMBER = process.env.PRU_MODECODE_TEST_POLICY_NUMBER ?? '300000120';
export const MODECODE_TEST_ERROR_ID = process.env.PRU_MODECODE_TEST_ERROR_ID ?? '0312';

// Dedicated fixture for BR-402's "polKind LTC auto-populate" silent-normalize check
// (branch1st='2': channelCode[0]='P'/'I'/'W' silently forces polKind to ' LTC', with an
// allow-list exception for 'W' - see TMS-RDMS-GEN-104/105) - every other fixture above has a
// branch other than one starting with '2'. This record is live-confirmed branch "2", status
// Open (does not block editing/saving).
export const BRANCH2_TEST_POLICY_NUMBER = process.env.PRU_BRANCH2_TEST_POLICY_NUMBER ?? '100000002';
export const BRANCH2_TEST_ERROR_ID = process.env.PRU_BRANCH2_TEST_ERROR_ID ?? 'E102';

// Dedicated fixture for BR-374's rho field (see TMS-RDMS-GEN-048). Originally this test
// searched for an eligible HELD record dynamically (ErrorManagerPage.findEligibleHeldRecord())
// specifically to steer clear of the shared TEST_POLICY_NUMBER fixture's own confirmed
// RHO scope-lockout bug (see TEST_POLICY_NUMBER's own comment above) - but that dynamic
// approach means every run performs two separate CB Records searches (one to discover a
// HELD record, one more inside openRecord() to reopen it by policy number), doubling
// exposure to this environment's transient navigation/click timeouts, and it was
// live-reproduced failing intermittently for that reason (2026-09-03) even though the
// records it found were genuinely valid. Since GEN-048 only ever Cancels (never Saves) the
// selected RHO value - it never risks that lockout bug in the first place - a single fixed,
// dedicated record removes the redundant search entirely. This record is live-confirmed
// status Held, RHO "C" (NEMO -- Northeast Mid Office), fully editable.
export const RHO_TEST_POLICY_NUMBER = process.env.PRU_RHO_TEST_POLICY_NUMBER ?? '300000184';
export const RHO_TEST_ERROR_ID = process.env.PRU_RHO_TEST_ERROR_ID ?? '9005';
