# Prepared answers

For walking the demo at a predictable pace. The interview is adaptive, so the
questions will not match one-for-one — pick the answer that fits what was asked.

These are written to be *mixed* on purpose: strong and specific on debugging and
ownership, thinner on system design, and one deliberately evasive answer. A demo
where every answer is excellent shows nothing, because the whole point of the
scoring is that it discriminates.

---

**On the reconciliation timezone bug (strong, specific)**

The nightly job pulled the processor statement for "yesterday" using the server's
local date, but the processor cut their day at 00:00 UTC and our servers were on
SGT. So for eight hours every night the two definitions of "yesterday" disagreed.
It surfaced as a mismatch that only appeared on transactions between midnight and
8am, which is why it took two days to see — the pattern looked random until I
plotted mismatches by hour and it was a perfect block. I fixed it by making every
boundary explicit UTC in the query and adding an assertion that the statement's
own declared window matches the window we asked for. That assertion has fired
twice since, both times when the processor changed their cutoff.

**On the double-charge incident (strong ownership)**

We had a retry-with-backoff on the payments client and no idempotency key. When
the processor got slow, our retries stacked, and 1,100 customers got charged
twice. That was my code. I had written the retry six months earlier and I did not
think about what a retry means when the first request actually succeeded but the
response was lost. We refunded within a day. The fix was idempotency keys
generated at the edge and stored for 24 hours, so a retry is a lookup. What I
would do differently is that I now treat "what does a duplicate of this request
do" as a question you answer before you add a retry, not after.

**On system design (deliberately thinner)**

We moved from one Postgres box to a primary with two read replicas. I did the
migration and wrote the runbook. Reads go to the replicas, writes to the primary.
It handled the load fine. I have not really had to think about what happens
beyond that — we were not close to the ceiling.

*(If pushed on replication lag or read-after-write:)* Honestly, I would need to
look at that properly. We had a case where a customer's dashboard showed a stale
balance right after a payment and we routed that specific query to the primary,
but I do not think we had a general rule for it. That is probably a gap.

**On testing and technical debt (has a position)**

I do not think coverage percentage is a useful target. On the settlement service
we have very heavy tests on the reconciliation arithmetic and almost none on the
admin CRUD, and that is deliberate — one of those can lose money silently. The
decision I would reverse is the integration test harness at Lumen: I made it
spin up real Postgres in Docker for every test, which was correct for
correctness and wrong for speed, and by the end the suite took eleven minutes and
people stopped running it locally.

**On a disagreement (fair to the other side)**

I wanted to put the settlement service behind Kafka and my tech lead wanted a
plain Postgres queue table. His argument was that we had one producer and one
consumer, no replay requirement, and nobody on the team had operated Kafka. I
thought we would need the throughput headroom. He was right — we are still at
maybe 3% of what a queue table handles, and I would have added an operational
burden for a problem we did not have. What I would say for my side is that the
decision was easy to reverse, and it turned out we never had to.

**On something they do not know (clean admission)**

I have not worked on anything with a real machine learning component. I have read
about the deployment side of it but I would be guessing if I said more than that.

**A deliberately evasive answer, if you want to see it caught**

*(Use this once, for a question asking for a specific number.)*

We improved latency significantly across the board and the team was really happy
with the results. It was a big win for the product and it came from a lot of
careful work on the query layer. Everyone contributed.
