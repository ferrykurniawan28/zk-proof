// Company expense privacy example (Noir)
// Private inputs: q1, q2, q3, q4 (quarterly expenses)
// Public input: threshold (investor query value)
// Public outputs: gt (1 if sum >= threshold), lt (1 if sum <= threshold)

// This version uses a claim-style API:
// - Private: q1, q2, q3, q4 (expenses)
// - Public: op (0=>=, 1=<=), threshold
// The prover can produce a proof that the claimed relation between sum and threshold holds,
// without revealing the actual sum.

fn main(q1: u64, q2: u64, q3: u64, q4: u64, op: pub u64, threshold: pub u64) {
    let sum: u64 = q1 + q2 + q3 + q4;

    // op: 0 => prove sum >= threshold
    // op: 1 => prove sum <= threshold
    if op == 0 {
        assert(sum >= threshold);
    } else {
        assert(sum <= threshold);
    }
}

#[test]
fn test_claims() {
    // sum = 12
    main(3, 4, 5, 0, 0, 10); // prove sum > 10
    main(3, 4, 5, 1, 1, 15); // prove sum < 15
}
