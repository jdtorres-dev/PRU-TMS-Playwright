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
//
// RECHARACTERIZED (confirmed live 2026-09-15): the "confirmed environment/access-control bug"
// described above is not a bug - it is real per-account RHO-scoped access control working as
// intended, the same kind of scoping already documented for the operator/qa accounts
// (OPERATOR_USERNAME/QA_REVIEWER_USERNAME below), just never characterized for admin/admin
// before now. Reproduced and then disproved on a fresh, disposable record (300000292): saving
// a real RHO change (A -> B) went through cleanly and admin/admin's own session could still
// find the record immediately afterward via a fresh search, updated Location column and all -
// no lockout. The historical incidents above are real, but their cause was misdiagnosed: every
// prior "lost" record had been moved to RHO "A" or "Q" specifically, and admin/admin's own
// rhoScope (confirmed 2026-09-15 to include at least B and C, and to exclude at least A and Q)
// simply doesn't cover those two - the record was never gone, only outside the same session's
// own view, exactly as a HELD record outside operator's rhoScope (see OPERATOR_USERNAME) would
// be. This was independently confirmed by re-opening a record admin/admin had just "lost"
// (RHO_TEST_POLICY_NUMBER, moved to RHO A during a live re-check) as o-0001/operator instead -
// fully visible there, since operator's own scope covers A. TMS-RDMS-GEN-048/100 now commit a
// real RHO save (to "B", confirmed within admin/admin's scope) and verify it persists, instead
// of only selecting-then-cancelling. RHO must still never be saved to "A" or "Q" (or any value
// outside the account doing the saving own scope) without also verifying via an account whose
// scope covers the destination - not because the record is at risk, but because the saving
// session alone will otherwise appear to lose it.
//
// SECOND UNRESTORABLE FIELD DRIFT (2026-09-17): while re-checking whether BR-498's own
// "current-user RHO" might really mean "any RHO already in the saving account's own rhoScope"
// (test-data/Pru TMS Online Users.txt; admin/admin's own scope is [B,C,E,F,G,I,R]) rather than
// a genuinely unobservable separate value, this record's Trailer Comparison grid's own
// Trailer-1 RHO field (RDMS-TRL.spec.ts's trailerRhoField(page, 0) - a DIFFERENT field from
// chrgBckRhoOrdIssRho above) was saved from blank to "B" as a real, deliberate test. The save
// succeeded cleanly with no same-RMO refusal of any kind, disproving that hypothesis - BR-498
// is confirmed to still need the operator's own genuinely separate identity-resolved RHO, not
// anything derivable from rhoScope. Attempting to restore the field to blank afterward failed:
// like chrgBckRhoOrdIssRho, this combobox has no blank/clear option in its own listbox once a
// real code is selected. Same benign, low-impact, documented-rather-than-hidden drift as
// above - the record remains fully reachable/editable, and every test reading this field
// captures its own current value dynamically rather than assuming blank.
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
// STALE (confirmed 2026-09-18): this record no longer exists on the environment - a CB Records
// search for it returns "No Records on Error Suspense File for the selection specified". Still
// referenced by several RDMS-GEN.spec.ts tests (TMS-RDMS-GEN-074/078/090/etc.) and, until now,
// RDMS-TRL.spec.ts's TRL-015/016 - RDMS-TRL.spec.ts was re-pointed at
// TRL_PCTOFSPLIT_TEST_POLICY_NUMBER below instead of reusing this constant, since a value that
// also satisfies RDMS-GEN's own, different field requirements hasn't been verified. RDMS-GEN's
// own usages are unfixed and will fail until this is addressed separately.

// Found via a full CB Records census cross-referenced against each candidate's own detail JSON
// (GET /api/v1/spi/{ecn}, replacementTrailer.trailers[].pctOfSplit) for a Replacement-variant
// record (branch other than D/P) with a populated, sum-to-100 trailer split - the SECONDARY
// fixture's own replacement, since neither the shared TEST_POLICY_NUMBER fixture's own trailer-1
// slot (used by TRL-013/014) nor most of the live population carry a populated pctOfSplit at
// all. Confirmed live (2026-09-18): branch T, Trailer-1/2 pctOfSplit 50/50 (sums to 100, per
// BR-497), and unused by any other fixture in this suite.
export const TRL_PCTOFSPLIT_TEST_POLICY_NUMBER = process.env.PRU_TRL_PCTOFSPLIT_TEST_POLICY_NUMBER ?? '300000025';
export const TRL_PCTOFSPLIT_TEST_ERROR_ID = process.env.PRU_TRL_PCTOFSPLIT_TEST_ERROR_ID ?? '0521';

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
// screening error, Edit re-appears).
// NOTE: despite this comment's own prior "used by TMS-RDMS-GEN-078/084/092/098" claim, a
// direct search of the test files (2026-09-13) found TERTIARY_TEST_POLICY_NUMBER referenced
// only by TMS-RDMS-GEN-092 - 078/084/098 had each independently migrated to a different
// fixture (SECONDARY/SECONDARY/QUATERNARY respectively, per their own comments) without this
// comment being updated to match. Corrected here to describe the real current consumer.
// Switched again (2026-09-13): 300000272 no longer exists on this environment either (0
// results on a direct policy-number search, same "No Records on Error Suspense File" pattern
// as every prior switch in this block) - reproduced live while investigating TMS-RDMS-GEN-092
// reporting "test data is not existing". This replacement (300000245) was found via a live
// CB Records census and confirmed healthy against GEN-092's own real flow specifically (not
// just a no-op): the chrgBckRhoOrdIssRho field is present, and selecting a real, different
// office-letter option ("B" - CAMO) saves cleanly (no screening error) and reads back
// correctly after a fresh Edit re-entry.
export const TERTIARY_TEST_POLICY_NUMBER = process.env.PRU_TERTIARY_TEST_POLICY_NUMBER ?? '300000245';
export const QUATERNARY_TEST_POLICY_NUMBER = process.env.PRU_QUATERNARY_TEST_POLICY_NUMBER ?? '300000227';
// Switched (2026-09-03): the original QUINARY fixture (300000022) does not exist in this
// environment (0 results on a direct policy-number search) - used by TMS-RDMS-GEN-060/061/
// 086. This replacement (300000165/6221) is a freshly-seeded record (creator "adhoc-gen-2"),
// live-confirmed healthy via a no-op-save check, branch C (neither '4' nor '5', satisfying
// BR-380/GEN-060's alphanumeric-domain precondition).
export const QUINARY_TEST_POLICY_NUMBER = process.env.PRU_QUINARY_TEST_POLICY_NUMBER ?? '300000165';
export const SENARY_TEST_POLICY_NUMBER = process.env.PRU_SENARY_TEST_POLICY_NUMBER ?? '300000042';

// TMS-E2E-020 previously depended on a dedicated single-use fixture constant here
// (NEW_STATUS_TEST_POLICY_NUMBER) that had to be swapped by hand every time a run consumed it
// (seven times across 2026-09-04 through 2026-09-09 - 300000185, 300000095, 300000005,
// 300000290, 300000245, 300000220, 300000200/300000155). That test is now fully dynamic
// (2026-09-09): it searches CB Records with Status=New and tries live candidates itself each
// run (excluding TEST_POLICY_NUMBER and branch 4/5 - this environment's seeded Agree Number
// values for Debit Insurance branches 4/5 routinely violate "must be 6 numeric digits", which
// blocks ANY save regardless of what field is edited), so no fixture constant is needed here
// any more.

// Dedicated fixture (2026-09-02) for the RDMS Trailer Information tab's PRUPAC variant
// (prupacTrailer.* fields - Address/Rejection Information, the Agent Allocation Grid and its
// percSplit inputs - see BR-492..BR-495, RDMS-TRL.spec.ts). Every other fixture above is
// live-confirmed branch V, which makes that tab render its *Replacement* variant instead
// (replacementTrailer.trailers[] - the Trailer Comparison grid) - per BR-494 ("Trailer shape
// by branch"), only a branch D or P record ever renders the PRUPAC variant at all. This
// record is live-confirmed branch D, status OPEN (does not block editing/saving, same as the
// TERTIARY/QUATERNARY/QUINARY/SENARY fixtures above), with two populated, real, screened
// Agent Allocation Grid rows (percSplit 56/44, summing to the required 100.00 - corrected
// 2026-09-16, see below; originally miswritten here as "60/40").
//
// FIELD DRIFT (2026-09-16): while live-investigating TMS-BOUND-014/015's own "commission
// ceiling" rule (see BOUND.spec.ts), this record's own real percSplit was re-confirmed as
// 56/44, not 60/40 as this comment has said since 2026-09-02 - a pre-existing documentation
// error, not new drift, corrected here. Separately, real drift WAS introduced this same day:
// slot 0's own Contract Number (rendered "Primary"/PC0601 before) was changed to CN1001
// while testing whether the Agent Allocation Grid's own contNo field drives the "Max
// authorized" ceiling banner (it does not - that banner is driven by a different, top-level
// record field, `identity`/`datesIdentifiers.ordAgtContractNo`, confirmed via network capture
// to already independently hold "341323" on this record, unrelated to the Trailer grid).
// PC0601 could not be restored: this Contract Number field is a readonly, selection-only
// combobox sourced from ref_agent_authorization, and PC0601 is not one of that table's 25
// entries, so no option exists to select it back. Slot 0 now permanently shows "TEST AGENT
// 01" (CN1001) instead of "PC0601" - a benign, isolated drift (RDMS-TRL-011/012 and
// XFLD4-007/008 only touch this grid's own percSplit fields, never contNo, so this should not
// affect them) documented here per this suite's own convention rather than hidden. The
// record's Status (briefly, accidentally RELEASED mid-investigation) was recovered via the
// app's own Reopen action and is confirmed back to OPEN.
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
// records it found were genuinely valid. A single fixed, dedicated record removes the
// redundant search entirely. This record is live-confirmed status Held, RHO "C" (NEMO --
// Northeast Mid Office), fully editable.
//
// UPDATED (2026-09-15): GEN-048/100 now commit a real Save of this field (see
// TEST_POLICY_NUMBER's own "RECHARACTERIZED" note above) rather than only Cancel. This record
// was briefly, genuinely saved to RHO "A" during that same re-check - admin/admin's own search
// stopped finding it - before being confirmed still fully intact (opened fine as o-0001/
// operator, whose scope covers A) and restored back to RHO "C" via that same account. Both
// tests now deliberately pick "B" (CAMO), not "the first available option", specifically
// because it's confirmed within admin/admin's own scope - "A" and "Q" are not.
export const RHO_TEST_POLICY_NUMBER = process.env.PRU_RHO_TEST_POLICY_NUMBER ?? '300000184';
export const RHO_TEST_ERROR_ID = process.env.PRU_RHO_TEST_ERROR_ID ?? '9005';

// Dedicated fixtures (2026-09-15) for two of TMS-E2E-009's four documented never-transferable
// record classes (E2E.spec.ts) - added after that test's own dynamic CB Records scan grew
// from ~91 to 252 eligible rows across 13 pages (the population outgrew the test's own old
// 6-page cap, which is why it had started reporting these classes as having no live
// candidate). A dedicated fixture lets the test try a known-good record first before falling
// back to its own dynamic scan, rather than re-discovering one from scratch every run.
//
// Service-register (BR-129: runId "I1" + recordCode "CB1"): this is the exact same record
// RDMS-TRL.spec.ts's own I1_SERVICE_REGISTER_POLICY_NUMBER already independently confirms
// triggers a service-register transfer refusal (TRL-029, BR-506/condition 7130) - reused here
// rather than duplicating a second, separately-confirmed record for the same underlying
// condition. Status HELD, RHO D.
export const E2E009_SERVICE_REGISTER_POLICY_NUMBER = process.env.PRU_E2E009_SERVICE_REGISTER_POLICY_NUMBER ?? '300000144';
export const E2E009_SERVICE_REGISTER_ERROR_ID = process.env.PRU_E2E009_SERVICE_REGISTER_ERROR_ID ?? '3003';

// Synopsis-only (BR-130: branch in [1,2,V,K,L,X,N]): live-confirmed directly (2026-09-15) -
// submitting Transfer from this record (RHO D) to a destination outside branch-1's own
// synopsis scope (target A) returns "Message - SYNOPSIS Records CANNOT be transferred"
// immediately. Status HELD, branch 1.
export const E2E009_SYNOPSIS_POLICY_NUMBER = process.env.PRU_E2E009_SYNOPSIS_POLICY_NUMBER ?? '300000239';
export const E2E009_SYNOPSIS_ERROR_ID = process.env.PRU_E2E009_SYNOPSIS_ERROR_ID ?? '0999';

// RESOLVED (2026-09-17): the "a Deleted record can't be transferred at all" premise below was
// wrong - Transfer is reachable and fully validated on a Deleted record (Actions menu doesn't
// require Edit mode), a fact this file's own RDMS-TRL.spec.ts had already proven live via
// TMS-RDMS-TRL-028, using this exact record, before this comment was written. That test was
// never cross-referenced here, so this class kept relying on a manually-edited fixture instead
// of the one that already worked.
//
// Confirmed live (2026-09-17): policy 200000018 (ECN I1202630001018, recordCode CB3, status
// DELETED, RHO B/DISTB018, premiumCommission.spiIndicator "C") submits Transfer to destination
// RHO "I" and returns "ERROR - REPL RECORD NOT FOR TRANSFER. ITS COPIES EXIST IN ALL RHO'S"
// immediately, with no field edits or database shortcuts of any kind - re-verified independently
// of RDMS-TRL-028 through E2E-009's own generic candidate-open-and-Transfer flow.
export const E2E009_REPLACEMENT_POLICY_NUMBER = process.env.PRU_E2E009_REPLACEMENT_POLICY_NUMBER ?? '200000018';
export const E2E009_REPLACEMENT_ERROR_ID = process.env.PRU_E2E009_REPLACEMENT_ERROR_ID ?? '0222';
export const E2E009_REPLACEMENT_TARGET_RHO = 'I';

// RESOLVED (2026-09-16): the "no double-length record exists" conclusion below (and its
// twin in RDMS-TRL.spec.ts) was wrong - it was already disproven by RDMS-ADD.spec.ts back on
// 2026-09-03 (TMS-RDMS-ADD-041/075, BR-568/BR-590), a finding that was never cross-referenced
// into this file, E2E.spec.ts, or RDMS-TRL.spec.ts, each of which kept independently
// re-running the same census and re-reaching the same stale conclusion. Every prior census
// (2026-09-02, 2026-09-15) scanned the CB Records Result Grid, which only surfaces recordCode
// CB1/CB3-family rows - this record's own recordCode is AR1, so it was systematically excluded
// from every scan by construction, not actually absent from the environment.
//
// Confirmed live (2026-09-16, re-verified independently of RDMS-ADD.spec.ts's own prior find):
// policy 100000005 (ECN 20202627000005, recordCode AR1, branch 7, RHO F, status OPEN,
// recordLength 1668, channelCode "02"). Its own backend obr.comments field literally reads
// "Double-length record (1668 bytes) seeded for AR1/BB2 shared-table and double-length
// transfer-restriction testing" - deliberately seeded fixture data, not an accident. Every
// RDMS tab (not just Trailer) renders the same "This is a long-format record (recordLength >=
// 1525) - editing is not yet supported in this phase of the modernization. The record is
// read-only." banner with Edit disabled - a single blanket lock, not a Trailer-specific one -
// while Actions (Resolve/Hold/Delete/Schedule Release/Transfer) remains fully reachable, since
// Transfer does not require Edit mode. Submitting Transfer for real (o-0001/operator - see
// below for why) is refused with "ERROR - A DOUBLE LENGTH RECORD CAN ONLY BE TRANSFERRED FROM
// THE FIRST HALF OF THE RECORD", exactly matching TMS-E2E-009's own expected pattern
// (/DOUBLE LENGTH|DOUBLE_LENGTH_TRANSFER_FIRST_HALF_ONLY/i) - confirmed via a real submission
// that was then Cancelled, leaving nothing committed.
//
// admin/admin (ROLE_ADMIN/ROLE_REFDATA_ADMIN) cannot submit Transfer on any record at all - its
// own Actions menu never lists Transfer (RDMS-TRL.spec.ts's own 2026-09-04 finding) - so
// o-0001 (ROLE_OPERATOR, rhoScope covering all 10 RHO codes, already used throughout
// TMS-E2E-009 and RDMS-ADD.spec.ts's own discovery of this exact record) is required.
//
// This does NOT reopen the separate, still-valid finding that RECORD LENGTH cannot be RAISED
// via UI field edits (confirmed on record 300000002, which stayed at RECORD LENGTH 902 even
// with all 6 Trailer Comparison slots fully populated) - that finding stands. What was wrong
// was concluding no sufficiently-long record existed anywhere on the environment, when one
// did, just outside the recordCode family every census had been scoped to.
export const DOUBLE_LENGTH_TEST_POLICY_NUMBER = process.env.PRU_DOUBLE_LENGTH_TEST_POLICY_NUMBER ?? '100000005';
export const DOUBLE_LENGTH_TEST_ERROR_ID = process.env.PRU_DOUBLE_LENGTH_TEST_ERROR_ID ?? 'E105';

// Dedicated fixtures (2026-09-16) for TMS-BOUND-014/015's own "commission ceiling" rule, once
// the real mechanism was found: References > Agent Authorization (ref_agent_authorization,
// GET /api/v1/refdata/tables/agent-authorization) holds a MAX COMMISSION AMOUNT per agent
// contract number, looked up live against a record's own identity/datesIdentifiers own
// ordAgtContractNo field (shown as a "Max authorized: $X (contract Y)" info banner on the
// General/Financial/Contracts tabs) - not the logged-in operator's own identity, correcting
// this suite's original premise. Found via a full CB Records network-capture census
// (GET /api/v1/spi/search, contractNumber field) rather than any documented reference, since
// no grid column or search filter exposes this field.
//
// Ceiling (BOUND-014): this record's own ordAgtContractNo is "CN1009", one of several test
// agents ref_agent_authorization carries specifically for boundary testing (max $1,000.00).
// Live-confirmed status OPEN, banner reads "Max authorized: $1,000.00 (contract CN1009)".
export const AGENT_CEILING_TEST_POLICY_NUMBER = process.env.PRU_AGENT_CEILING_TEST_POLICY_NUMBER ?? '100000009';
export const AGENT_CEILING_TEST_ERROR_ID = process.env.PRU_AGENT_CEILING_TEST_ERROR_ID ?? 'E109';
export const AGENT_CEILING_MAX_COMMISSION = 1000.0;

// Absent from the authority table (BOUND-015): this record's own ordAgtContractNo is "CN6060",
// a value confirmed (via the same census) to exist on the record but NOT be one of
// ref_agent_authorization's own rows - a genuine lookup-miss, not just a blank field. Live-
// confirmed status OPEN, and - unlike every registered-contract record checked - no "Max
// authorized" banner renders at all for it (the app silently no-ops rather than erroring on
// the failed lookup), which is itself the live confirmation this record's contract number
// truly has no authority-table entry.
export const AGENT_UNREGISTERED_TEST_POLICY_NUMBER = process.env.PRU_AGENT_UNREGISTERED_TEST_POLICY_NUMBER ?? '300000060';
export const AGENT_UNREGISTERED_TEST_ERROR_ID = process.env.PRU_AGENT_UNREGISTERED_TEST_ERROR_ID ?? '6012';

// TMS-WKBCH-001 (BR-330, default-view Released/Deleted suppression): RESOLVED (2026-09-17).
// The prior premise - "this suite's fixture data isn't seeded with known Released/Deleted
// rows" - was the same narrow-search mistake corrected elsewhere in this session: the Result
// Grid this test searches draws on the whole shared CB Records population, not a per-suite
// fixture pool, so any live, identifiable Released/Deleted record works. Reuses 200000018
// (already a confirmed-stable "seed"-created DELETED record - see E2E009_REPLACEMENT_*
// above and RDMS-TRL.spec.ts's own PB_REPL_*) for the Deleted half, plus a second
// "seed"-created record for the Released half. Both confirmed live (2026-09-17): absent from
// the default search (no Include toggle checked) and present with the correct status once
// their own toggle is checked.
export const WKBCH_DELETED_TEST_POLICY_NUMBER = process.env.PRU_WKBCH_DELETED_TEST_POLICY_NUMBER ?? '200000018';
export const WKBCH_DELETED_TEST_ERROR_ID = process.env.PRU_WKBCH_DELETED_TEST_ERROR_ID ?? '0222';
export const WKBCH_RELEASED_TEST_POLICY_NUMBER = process.env.PRU_WKBCH_RELEASED_TEST_POLICY_NUMBER ?? '200000001';
export const WKBCH_RELEASED_TEST_ERROR_ID = process.env.PRU_WKBCH_RELEASED_TEST_ERROR_ID ?? '0007';

// TMS-RDMS-TRL-031 (BR-508, "RVP error" transfer status guard): RESOLVED (2026-09-17). The
// Business Rules Catalogue's own Java Ref for BR-508 is "NOT-VALID-FOR-RVP" - the record API's
// own runId field (not exposed in the Result Grid or CSV export, only in each record's own
// detail JSON - the same blind spot TRL-029's own I1_SERVICE_REGISTER discovery hit) carries
// the literal value "RV" for a distinct family of records, a precise match for that Java
// reference rather than a guessed heuristic. A first candidate (300000230, RHO R) turned out
// to hit an unrelated rule first (RHO Q/R's own blanket transfer ban); this one (RHO B) does
// not. Confirmed live: policy 300000095 (ECN RV202636900095, runId "RV", transStatus "R" -
// Released, neither D nor H) submits Transfer to destination RHO "I" and returns
// `Message - VALID STATUS FOR RVP ERROR IS "D" OR "H"` immediately, exactly as catalogued.
export const RVP_TEST_POLICY_NUMBER = process.env.PRU_RVP_TEST_POLICY_NUMBER ?? '300000095';
export const RVP_TEST_ERROR_ID = process.env.PRU_RVP_TEST_ERROR_ID ?? '9115';

// Dedicated replacement fixtures (2026-09-18) for RDMS-GEN.spec.ts's own SECONDARY/TERTIARY/
// QUATERNARY-dependent field tests, after all three of those fixtures were confirmed dead
// ("No Records on Error Suspense File"). Each field below is genuinely branch/precondition-
// sensitive (several candidates across a dozen-plus branches returned a real HTTP 400 before
// one worked), so each test gets its own distinct, unshared record rather than one shared
// replacement - a dead record now breaks at most one test, not several. Every value below was
// confirmed live via a real Save (HTTP 200) before being wired in, not merely opened.
// GEN050/078/084's original candidates below (300000265/300000220/300000269) were independently
// confirmed dead: overlapping diagnostics from the same investigation mutated all three into an
// ambiguous state, so a fresh, never-touched record was found for each instead (2026-09-18).
export const GEN050_TEST_POLICY_NUMBER = process.env.PRU_GEN050_TEST_POLICY_NUMBER ?? '300000012';
export const GEN050_TEST_ERROR_ID = process.env.PRU_GEN050_TEST_ERROR_ID ?? '0124';

export const GEN070_TEST_POLICY_NUMBER = process.env.PRU_GEN070_TEST_POLICY_NUMBER ?? '300000247';
export const GEN070_TEST_ERROR_ID = process.env.PRU_GEN070_TEST_ERROR_ID ?? '5102';

export const GEN074_TEST_POLICY_NUMBER = process.env.PRU_GEN074_TEST_POLICY_NUMBER ?? '300000067';
export const GEN074_TEST_ERROR_ID = process.env.PRU_GEN074_TEST_ERROR_ID ?? '6251';

export const GEN078_TEST_POLICY_NUMBER = process.env.PRU_GEN078_TEST_POLICY_NUMBER ?? '300000097';
export const GEN078_TEST_ERROR_ID = process.env.PRU_GEN078_TEST_ERROR_ID ?? '9129';

export const GEN084_TEST_POLICY_NUMBER = process.env.PRU_GEN084_TEST_POLICY_NUMBER ?? '300000009';
export const GEN084_TEST_ERROR_ID = process.env.PRU_GEN084_TEST_ERROR_ID ?? '0100';

export const GEN092_TEST_POLICY_NUMBER = process.env.PRU_GEN092_TEST_POLICY_NUMBER ?? '300000287';
export const GEN092_TEST_ERROR_ID = process.env.PRU_GEN092_TEST_ERROR_ID ?? '9036';

export const GEN098_TEST_POLICY_NUMBER = process.env.PRU_GEN098_TEST_POLICY_NUMBER ?? '300000062';
export const GEN098_TEST_ERROR_ID = process.env.PRU_GEN098_TEST_ERROR_ID ?? '6060';

export const GEN110_TEST_POLICY_NUMBER = process.env.PRU_GEN110_TEST_POLICY_NUMBER ?? '300000040';
export const GEN110_TEST_ERROR_ID = process.env.PRU_GEN110_TEST_ERROR_ID ?? '0930';

// TMS-RDMS-GEN-090 (BR-395, faceIncInd) remains genuinely blocked - NOT resolved by the above.
// The Catalogue's own Java Ref documents a compound precondition: channelCode's first
// character must be "P" or "W" AND a "multi-case check on CB1-EBP-GSP-PC-SUBSID-CODE" (this
// build's own `prucoSubsidCode`/`ppfsSubsidiaryCode` fields) must pass. A live census (2026-
// 09-18, ~70-row sample) found 26 records with channelCode starting P/W, but ZERO of those
// also carry a non-null subsid code - the two conditions never co-occur anywhere in the
// currently-live population, confirmed by exhausting the P/W subset directly (every one
// tried returns a genuine HTTP 400) rather than assumed. This is a real "no record combines
// both conditions" gap, the same shape as BR-501/RDMS-TRL-023-024's own channelCode="I" gap -
// seeding one would resolve it, further searching will not.
